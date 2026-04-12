from fastapi import APIRouter, HTTPException, Request
from models.bike import BikeProfile
from utils.database import get_db
from utils.auth_handler import decode_jwt

router = APIRouter()

def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = auth_header.split(" ")[1]
    decoded = decode_jwt(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return decoded["userId"]

@router.get("/")
async def get_bike(request: Request):
    user_id = get_current_user(request)
    return {"brand": "Royal Enfield", "model": "Himalayan", "year": "2023", "engine_cc": "411", "tank_capacity": "15", "weight": "199", "wheel_diameter": "21"}

@router.post("/")
async def save_bike(profile: BikeProfile, request: Request):
    return {"status": "success", "message": "Profile saved successfully"}
