"""
School of Motesart - Minimal Backend Server
============================================
This is a simplified server with just the T.A.M.i Chat V2 endpoint.
For local development and testing.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import sys
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import Optional
import jwt
from datetime import datetime, timezone, timedelta

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Add repo root so app.routers.* is importable
sys.path.insert(0, str(ROOT_DIR.parent))

# Import services
from services.airtable_service import airtable_service
from services.tami_chat_v2 import tami_chat_v2
from app.routers.mya import router as mya_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="School of Motesart - T.A.M.i API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create API router
api_router = APIRouter(prefix="/api")


# ============ HEALTH CHECK ============

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "tami-api"}


# ============ AUTH HELPERS ============

def create_access_token(data: dict) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Validate JWT token and return user info."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"email": email}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ============ AUTH ENDPOINTS ============

class LoginRequest(BaseModel):
    email: str
    password: str


@api_router.post("/auth/login")
async def login(request: LoginRequest):
    """
    Simple login endpoint for testing.
    In production, validate against your user database.
    """
    # For testing - accept any credentials
    # In production, validate against your database
    access_token = create_access_token(data={"sub": request.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": request.email
        }
    }


# ============ T.A.M.i CHAT V2 ENDPOINT ============

class TAMiChatV2Request(BaseModel):
    """T.A.M.i Chat V2 request"""
    student_id: str  # Airtable record ID (rec...)
    message: str


@api_router.post("/tami/chat/v2")
async def tami_chat_v2_endpoint(
    request: TAMiChatV2Request,
    current_user: dict = Depends(get_current_user)
):
    """
    T.A.M.i Chat V2 - Direct implementation.
    
    Flow:
    1. Receives student_id + message
    2. Loads context from Airtable (Student, Practice Logs, Homework)
    3. Sends to Claude API
    4. Returns response + context_used
    """
    try:
        logger.info(f"[T.A.M.i V2] Request from {current_user.get('email')} for student {request.student_id}")
        
        result = await tami_chat_v2.chat(
            student_id=request.student_id,
            message=request.message,
            airtable_service=airtable_service
        )
        
        return {
            "status": "success",
            "response": result.get("response"),
            "context_used": result.get("context_used")
        }
        
    except Exception as e:
        logger.error(f"[T.A.M.i V2] Error: {e}")
        return {
            "status": "error",
            "response": "Oops! Something went wrong. Please try again.",
            "context_used": {"error": str(e)}
        }


# ============ UTILITY ENDPOINTS ============

@api_router.get("/students")
async def list_students(current_user: dict = Depends(get_current_user)):
    """List all students from Airtable."""
    try:
        students = await airtable_service.list_students()
        return {
            "status": "success",
            "students": [
                {
                    "id": s.get("id"),
                    "name": s.get("fields", {}).get("Students Name", "Unknown"),
                    "weekly_target": s.get("fields", {}).get("Assigned Weekly Practice Minutes", 60)
                }
                for s in students
            ]
        }
    except Exception as e:
        logger.error(f"Error listing students: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/student/{student_id}")
async def get_student(student_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific student's details."""
    try:
        student = await airtable_service.get_student(student_id)
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        return {
            "status": "success",
            "student": {
                "id": student.get("id"),
                "fields": student.get("fields", {})
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting student: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Include the API router
api_router.include_router(mya_router)
app.include_router(api_router)


# ============ RUN SERVER ============

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
