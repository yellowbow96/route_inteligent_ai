import os
import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
secret = os.getenv("JWT_SECRET", "supersecret_rider_intelligence_key_python_2026")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def sign_jwt(user_id: str):
    payload = {
        "userId": user_id,
        "expires": (datetime.utcnow() + timedelta(days=7)).timestamp()
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def decode_jwt(token: str):
    try:
        decoded = jwt.decode(token, secret, algorithms=["HS256"])
        if decoded["expires"] >= datetime.utcnow().timestamp():
            return decoded
        return None
    except:
        return None
