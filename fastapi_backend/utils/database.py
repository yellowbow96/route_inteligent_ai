import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

# Using the requested MongoDB Atlas URI from .env
MONGO_URI = os.getenv("MONGO_URI")

# We use AsyncIOMotorClient because the FastAPI routers use 'await' for all DB operations
client = AsyncIOMotorClient(MONGO_URI)
db = client["riderdb"] 

print("MongoDB Connected 🚀 (Async Mode for FastAPI)")

def get_db():
    return db
