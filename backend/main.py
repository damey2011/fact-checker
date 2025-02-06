from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from pathlib import Path
import logging
import traceback
from fastapi.responses import JSONResponse
from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_openai import ChatOpenAI
from langchain.output_parsers import PydanticOutputParser
import json
from models import URLInput, FactCheckResponse, ContentInput, CommentCreate, Comment, CommentResponse
from datetime import datetime
import re
from database import get_db, WebsiteComment
from sqlalchemy.orm import Session
from sqlalchemy import func
import tldextract
from fastapi import Depends
from urllib.parse import unquote

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Load environment variables from root .env
root_dir = Path(__file__).resolve().parent.parent
load_dotenv(root_dir / '.env')

# Verify OpenAI API key is loaded
if not os.getenv('OPENAI_API_KEY'):
    raise ValueError("OPENAI_API_KEY not found in environment variables")

app = FastAPI(debug=True)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize LangChain components
llm = ChatOpenAI(
    model_name="gpt-4",
    temperature=0.7,
    max_tokens=2000
)

# Initialize the Pydantic parser
parser = PydanticOutputParser(pydantic_object=FactCheckResponse)

def load_prompt(content: str, is_url: bool) -> ChatPromptTemplate:
    """Load and format the appropriate fact-checking prompt."""
    try:
        # Choose the appropriate prompt template
        prompt_path = Path("prompts/fact_check_prompt.md" if is_url else "prompts/text_check_prompt.md")
        
        with open(prompt_path, "r") as f:
            template = f.read()
            
        # Create the system message template
        system_template = template.replace("{format_instructions}", "{format}")
        
        # Use different message templates based on input type
        if is_url:
            user_message = "Please analyze the content at {input_url} and provide a response following the format above."
        else:
            user_message = "Please analyze this text content and provide a response following the format above:\n\n{input_text}"
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_template),
            ("user", user_message)
        ])
        
        return prompt
    except Exception as e:
        logger.error(f"Error loading prompt: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def extract_json_from_response(text: str) -> str:
    """Extract JSON from the response text."""
    try:
        # Try to find JSON between triple backticks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            return json_match.group(1)
        
        # If no JSON found between backticks, try to find the first { and last }
        start_idx = text.find('{')
        end_idx = text.rfind('}')
        if start_idx != -1 and end_idx != -1:
            return text[start_idx:end_idx + 1]
        
        raise ValueError("No JSON found in response")
    except Exception as e:
        logger.error(f"Error extracting JSON: {str(e)}")
        logger.error(f"Original text: {text}")
        raise

def analyze_with_langchain(content: str) -> FactCheckResponse:
    """Analyze URL or text content using LangChain and OpenAI."""
    try:
        # Determine if content is URL or text
        content_input = ContentInput(content=content)
        is_url = content_input.is_url()
        
        # Get the appropriate prompt template
        prompt = load_prompt(content, is_url)
        
        # Create the chain
        chain = (
            prompt 
            | llm 
            | StrOutputParser()
        )

        # Execute the chain
        try:
            # Get format instructions from the parser
            format_instructions = parser.get_format_instructions()
            
            # Prepare input variables based on content type
            input_vars = {
                "format": format_instructions,
                "input_url" if is_url else "input_text": content
            }
            
            result = chain.invoke(input_vars)
            
            # Parse the result into a FactCheckResponse
            try:
                json_str = extract_json_from_response(result)
                json_data = json.loads(json_str)
                
                # Ensure the analyzed_url/content is properly set
                if "metadata" in json_data:
                    json_data["metadata"]["analyzed_url"] = content
                    json_data["metadata"]["analysis_date"] = datetime.now().isoformat()
                
                return FactCheckResponse.model_validate(json_data)
            except json.JSONDecodeError as je:
                logger.error(f"Failed to parse response as JSON: {str(je)}")
                logger.error(f"Raw response: {result}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to parse the AI response as JSON"
                )
            
        except Exception as e:
            logger.error(f"Error in LangChain execution: {str(e)}")
            logger.error(traceback.format_exc())
            raise HTTPException(
                status_code=500,
                detail=f"Error in analysis execution: {str(e)}"
            )

    except Exception as e:
        logger.error(f"LangChain error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error analyzing content: {str(e)}")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error occurred: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
    )

@app.get("/")
async def root():
    return {"message": "Welcome to AI Fact Checker API"}

@app.post("/analyze", response_model=FactCheckResponse)
async def analyze_content(content_input: ContentInput):
    """
    Analyze the content (URL or text) for fact-checking.
    """
    try:
        logger.info(f"Analyzing content: {content_input.content}")
        analysis = analyze_with_langchain(content_input.content)
        return analysis
    except Exception as e:
        logger.error(f"Error analyzing content: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

def get_domain_from_url(url: str) -> str:
    extracted = tldextract.extract(url)
    return f"{extracted.domain}.{extracted.suffix}"

@app.post("/comments", response_model=Comment)
async def create_comment(comment: CommentCreate, db: Session = Depends(get_db)):
    """Create a new comment for a website."""
    try:
        db_comment = WebsiteComment(
            domain=get_domain_from_url(comment.url),
            commenter_name=comment.commenter_name,
            comment=comment.comment,
            rating=comment.rating
        )
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        
        # Add the url to the response
        response_comment = Comment.model_validate(db_comment)
        response_comment.url = comment.url
        
        return response_comment
    except Exception as e:
        logger.error(f"Error creating comment: {str(e)}")
        logger.error(traceback.format_exc())
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error creating comment: {str(e)}"
        )

@app.get("/comments/{url:path}", response_model=CommentResponse)
async def get_comments(url: str, db: Session = Depends(get_db)):
    """Get all comments for a website domain."""
    try:
        # Decode the URL
        decoded_url = unquote(url)
        domain = get_domain_from_url(decoded_url)
        
        comments = db.query(WebsiteComment)\
            .filter(WebsiteComment.domain == domain)\
            .order_by(WebsiteComment.created_at.desc())\
            .all()
        
        # Calculate average rating
        avg_rating = db.query(func.avg(WebsiteComment.rating))\
            .filter(WebsiteComment.domain == domain)\
            .scalar() or 0.0
        
        # Add the URL to each comment
        comment_responses = []
        for comment in comments:
            comment_model = Comment.model_validate(comment)
            comment_model.url = url  # Add the original URL to each comment
            comment_responses.append(comment_model)
        
        return {
            "comments": comment_responses,
            "average_rating": round(float(avg_rating) * 2) / 2  # Round to nearest 0.5
        }
    except Exception as e:
        logger.error(f"Error getting comments: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error getting comments: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="debug") 