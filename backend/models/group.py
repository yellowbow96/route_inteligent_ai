from typing import List, Optional

from pydantic import BaseModel


class GroupCreateRequest(BaseModel):
    display_name: str
    ride_mode: str = "Group"


class GroupJoinRequest(BaseModel):
    code: str
    display_name: str


class RiderStatusUpdate(BaseModel):
    code: str
    display_name: str
    lat: float
    lon: float
    fuel_remaining: float
    fuel_capacity: float
    speed: float = 0
    is_online: bool = True
    ride_mode: str = "Group"
    destination: Optional[str] = None


class GroupMessageRequest(BaseModel):
    code: str
    display_name: str
    message: str
    source: str = "text"


class ManualStopSearchRequest(BaseModel):
    lat: float
    lon: float
    query: str
    radius_m: int = 3500


class LiveMemberView(BaseModel):
    user_id: str
    display_name: str
    lat: float
    lon: float
    fuel_remaining: float
    fuel_capacity: float
    speed: float
    is_online: bool
    ride_mode: str
    destination: Optional[str] = None


class GroupMessageView(BaseModel):
    display_name: str
    message: str
    source: str
    timestamp: str


class GroupSessionView(BaseModel):
    code: str
    host_user_id: str
    created_at: str
    members: List[LiveMemberView]
    messages: List[GroupMessageView]
    share_url: str
