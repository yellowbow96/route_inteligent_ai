from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class RideLog(BaseModel):
    date: str
    distance: float
    duration: float
    average_speed: float
    fuel_used: float
    rider_score: float
    route_data: List[List[float]]
    tripCost: Optional[float] = 0
    speedHistory: Optional[List[Dict[str, Any]]] = []
