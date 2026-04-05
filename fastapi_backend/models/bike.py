from pydantic import BaseModel

class BikeProfile(BaseModel):
    model_name: str
    engine_cc: int
    weight: int
    wheel_diameter: int
    tank_capacity: int
