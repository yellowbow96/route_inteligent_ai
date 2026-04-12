from datetime import datetime, timezone
import random
import string

from fastapi import APIRouter, HTTPException, Request

from models.group import (
    GroupCreateRequest,
    GroupJoinRequest,
    GroupMessageRequest,
    RiderStatusUpdate,
)
from routers.bike import get_current_user


router = APIRouter()

group_sessions = {}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_group_code(length: int = 6) -> str:
    alphabet = string.ascii_uppercase + string.digits
    while True:
        code = "".join(random.choice(alphabet) for _ in range(length))
        if code not in group_sessions:
            return code


def session_to_response(session: dict) -> dict:
    members = list(session["members"].values())
    members.sort(key=lambda item: (item["user_id"] != session["host_user_id"], item["display_name"].lower()))
    return {
        "code": session["code"],
        "host_user_id": session["host_user_id"],
        "created_at": session["created_at"],
        "members": members,
        "messages": session["messages"][-20:],
        "share_url": session["share_url"],
    }


def require_session(code: str) -> dict:
    normalized = code.upper().strip()
    session = group_sessions.get(normalized)
    if not session:
        raise HTTPException(status_code=404, detail="Ride group not found")
    return session


@router.post("/create")
async def create_group(payload: GroupCreateRequest, request: Request):
    user_id = get_current_user(request)
    code = generate_group_code()
    share_url = f"/live/{code}"
    group_sessions[code] = {
        "code": code,
        "host_user_id": user_id,
        "created_at": utc_now(),
        "share_url": share_url,
        "members": {
            user_id: {
                "user_id": user_id,
                "display_name": payload.display_name,
                "lat": 0,
                "lon": 0,
                "fuel_remaining": 0,
                "fuel_capacity": 0,
                "speed": 0,
                "is_online": True,
                "ride_mode": payload.ride_mode,
                "destination": None,
                "updated_at": utc_now(),
            }
        },
        "messages": [
            {
                "display_name": "System",
                "message": f"{payload.display_name} created ride group {code}",
                "source": "system",
                "timestamp": utc_now(),
            }
        ],
    }
    return session_to_response(group_sessions[code])


@router.post("/join")
async def join_group(payload: GroupJoinRequest, request: Request):
    user_id = get_current_user(request)
    session = require_session(payload.code)
    session["members"][user_id] = {
        "user_id": user_id,
        "display_name": payload.display_name,
        "lat": 0,
        "lon": 0,
        "fuel_remaining": 0,
        "fuel_capacity": 0,
        "speed": 0,
        "is_online": True,
        "ride_mode": "Group",
        "destination": None,
        "updated_at": utc_now(),
    }
    session["messages"].append(
        {
            "display_name": "System",
            "message": f"{payload.display_name} joined the ride group",
            "source": "system",
            "timestamp": utc_now(),
        }
    )
    return session_to_response(session)


@router.get("/session/{code}")
async def get_group_session(code: str, request: Request):
    get_current_user(request)
    session = require_session(code)
    return session_to_response(session)


@router.get("/live/{code}")
async def get_group_live_public(code: str):
    session = require_session(code)
    return session_to_response(session)


@router.post("/status")
async def update_group_status(payload: RiderStatusUpdate, request: Request):
    user_id = get_current_user(request)
    session = require_session(payload.code)
    session["members"][user_id] = {
        "user_id": user_id,
        "display_name": payload.display_name,
        "lat": payload.lat,
        "lon": payload.lon,
        "fuel_remaining": payload.fuel_remaining,
        "fuel_capacity": payload.fuel_capacity,
        "speed": payload.speed,
        "is_online": payload.is_online,
        "ride_mode": payload.ride_mode,
        "destination": payload.destination,
        "updated_at": utc_now(),
    }
    return {
        "status": "ok",
        "members": session_to_response(session)["members"],
    }


@router.post("/message")
async def send_group_message(payload: GroupMessageRequest, request: Request):
    get_current_user(request)
    session = require_session(payload.code)
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session["messages"].append(
        {
            "display_name": payload.display_name,
            "message": message,
            "source": payload.source,
            "timestamp": utc_now(),
        }
    )
    session["messages"] = session["messages"][-40:]
    return {"status": "ok", "messages": session["messages"][-20:]}
