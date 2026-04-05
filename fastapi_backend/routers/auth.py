from fastapi import APIRouter, HTTPException, Depends
from models.user import UserCreate, UserLogin
from utils.database import get_db
from utils.auth_handler import get_password_hash, verify_password, sign_jwt
import uuid

router = APIRouter()

@router.post("/register")
async def register(user: UserCreate):
    db = get_db()
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    hashed_pw = get_password_hash(user.password)
    user_id = str(uuid.uuid4())
    
    await db.users.insert_one({
        "_id": user_id,
        "username": user.username,
        "password": hashed_pw
    })
    
    token = sign_jwt(user_id)
    return {"token": token, "userId": user_id}

@router.post("/login")
async def login(user: UserLogin):
    db = get_db()
    db_user = await db.users.find_one({"username": user.username})
    
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
        
    token = sign_jwt(db_user["_id"])
    return {"token": token, "userId": db_user["_id"]}
