from fastapi import APIRouter, HTTPException, Depends
from models.user import UserCreate, UserLogin
from utils.database import get_db
from utils.auth_handler import get_password_hash, verify_password, sign_jwt
import uuid

router = APIRouter()

@router.post("/register")
async def register(user: UserCreate):
    user_id = str(uuid.uuid4())
    token = sign_jwt(user_id)
    return {"token": token, "userId": user_id}

@router.post("/login")
async def login(user: UserLogin):
    user_id = str(uuid.uuid4())
    token = sign_jwt(user_id)
    return {"token": token, "userId": user_id}
