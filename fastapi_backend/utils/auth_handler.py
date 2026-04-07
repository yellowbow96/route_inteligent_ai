import os
import jwt
import bcrypt
from datetime import datetime, timedelta

secret = os.getenv("JWT_SECRET", "supersecret_rider_intelligence_key_python_2026")

def verify_password(plain_password: str, hashed_password: str):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

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
