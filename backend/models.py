from pydantic import BaseModel, HttpUrl, Field, validator
from typing import List, Literal, Union, Optional
from datetime import datetime
import re
import tldextract

class Source(BaseModel):
    url: HttpUrl
    title: str
    publisher: str
    date: str

class Claim(BaseModel):
    claim: str
    verdict: Literal["True", "False", "Misleading", "Unverified"]
    explanation: str
    sources: List[Source]

class Metadata(BaseModel):
    analyzed_url: Union[HttpUrl, str]  # Can be URL or "Text Input"
    analysis_date: datetime = Field(default_factory=datetime.now)
    credibility_score: int = Field(ge=0, le=100)

class FactCheckResponse(BaseModel):
    claims: List[Claim]
    summary: str
    metadata: Metadata

class ContentInput(BaseModel):
    content: str

    @validator('content')
    def validate_content(cls, v):
        # URL regex pattern
        url_pattern = r'^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$'
        
        if re.match(url_pattern, v):
            return v
        elif len(v.strip()) > 0:
            return v
        else:
            raise ValueError("Content must be either a valid URL or non-empty text")

    def is_url(self) -> bool:
        url_pattern = r'^https?:\/\/'
        return bool(re.match(url_pattern, self.content))

class URLInput(BaseModel):
    url: HttpUrl 

class CommentCreate(BaseModel):
    commenter_name: str = Field(..., min_length=1, max_length=100)
    comment: str = Field(..., min_length=1, max_length=1000)
    rating: float = Field(..., ge=1, le=5)
    url: str

    @validator('rating')
    def validate_rating(cls, v):
        return round(v * 2) / 2  # Round to nearest 0.5

    @validator('url')
    def extract_domain(cls, v):
        extracted = tldextract.extract(v)
        return f"{extracted.domain}.{extracted.suffix}"

class Comment(BaseModel):
    id: int
    domain: str
    commenter_name: str
    comment: str
    rating: float
    created_at: datetime
    url: Optional[str] = None  # Make url optional in response

    class Config:
        from_attributes = True

class CommentResponse(BaseModel):
    comments: list[Comment]
    average_rating: float 