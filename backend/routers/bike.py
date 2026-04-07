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
    db = get_db()
    bike = await db.bikes.find_one({"userId": user_id}, {"_id": 0})
    if not bike:
        return None
    return bike

@router.post("/")
async def save_bike(profile: BikeProfile, request: Request):
    user_id = get_current_user(request)
    db = get_db()
    bike_data = profile.dict()
    bike_data["userId"] = user_id
    await db.bikes.update_one(
        {"userId": user_id},
        {"$set": bike_data},
        upsert=True
    )
    return {"status": "success", "message": "Profile saved successfully"}
