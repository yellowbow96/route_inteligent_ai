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
    db = get_db()
    
    ride_data = ride.dict()
    ride_data["userId"] = user_id
    
    # AI Engine integration
    ai_insight = generate_ai_insights(ride.rider_score, ride.speedHistory, ride.fuel_used)
    ride_data["aiInsight"] = ai_insight

    await db.rides.insert_one(ride_data)
    
    # Update explicitly named Hash Map
    if user_id in db_cache:
        # Invalidate cache if new data added
        del db_cache[user_id]
        
    return {"status": "success", "aiInsight": ai_insight}

@router.get("/")
async def get_rides(request: Request):
    user_id = get_current_user(request)
    
    # Hashing Algorithm cache lookup
    if user_id in db_cache:
        print("Hash maps used for efficient data access: CACHE HIT")
        return db_cache[user_id]
        
    db = get_db()
    rides_cursor = db.rides.find({"userId": user_id}, {"_id": 0}).sort("date", -1)
    rides = await rides_cursor.to_list(length=100)
    
    # Hashing Algorithm populate
    db_cache[user_id] = rides
    print("Hash maps used for efficient data access: SAVED TO CACHE")
    
    return rides
