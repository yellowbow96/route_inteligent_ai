from fastapi import APIRouter, HTTPException, Request
from models.ride import RideLog
from utils.database import get_db
from routers.bike import get_current_user
from services.ai_engine import generate_ai_insights

router = APIRouter()

# Core Data Structure implementations: HASH MAPS
# Memory caching simulating Hash Maps for fast retrieval
db_cache = {} # Dictionary mapping userId -> list of rides
route_cache = {} # Dictionary mapping route points for Dijkstra cache

@router.post("/")
async def save_ride(ride: RideLog, request: Request):
    user_id = get_current_user(request)
    
    ride_data = ride.dict()
    ride_data["userId"] = user_id
    
    # AI Engine integration
    ai_insight = generate_ai_insights(ride.rider_score, ride.speedHistory, ride.fuel_used)
    ride_data["aiInsight"] = ai_insight
    
    # Mock saving to DB cache
    if user_id not in db_cache:
        db_cache[user_id] = []
    db_cache[user_id].insert(0, ride_data)
        
    return {"status": "success", "aiInsight": ai_insight}

@router.get("/")
async def get_rides(request: Request):
    user_id = get_current_user(request)
    
    # Hashing Algorithm cache lookup
    if user_id in db_cache:
        print("Hash maps used for efficient data access: CACHE HIT")
        return db_cache[user_id]
        
    return []
