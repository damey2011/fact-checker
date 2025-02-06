# AI Fact Checker

A web application that analyzes URLs and text content for factual accuracy using AI. The system provides detailed fact-checking results, credibility scores, and allows community feedback through comments and ratings.

## Project Structure

  ```
  .
  ├── backend/
  │   ├── prompts/           # AI prompt templates
  │   ├── database.py        # Database models and configuration
  │   ├── main.py           # FastAPI application
  │   ├── models.py         # Pydantic models
  │   └── requirements.txt  # Python dependencies
  ├── frontend/
  │   ├── src/
  │   │   ├── components/   # React components
  │   │   ├── pages/        # Page components
  │   │   └── styles/       # CSS styles
  │   └── package.json     # Node.js dependencies
  ├── docker-compose.yml    # Docker compose configuration
  ├── .env.example         # Example environment variables
  └── README.md           # Project documentation
  ```

## Getting Started

1. Clone the repository:
  ```bash
  git clone https://github.com/yourusername/ai-fact-checker.git
  cd ai-fact-checker
  ```

2. Create environment file:
  ```bash
  cp .env.example .env
  ```

3. Update the .env file with your OpenAI API key:
  ```
  OPENAI_API_KEY=your_key_here
  ```

4. Start the application using Docker Compose:
  ```bash
  docker-compose up --build
  ```

5. Access the application:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- React Router
- Heroicons

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy
- LangChain
- OpenAI API
- SQLite
- Pydantic

### Infrastructure
- Docker
- Docker Compose
- Git

## Features
- URL and text content analysis
- AI-powered fact-checking
- Credibility scoring
- Community feedback system
- Detailed source verification
- Real-time analysis 