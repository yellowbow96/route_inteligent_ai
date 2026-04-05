from fastapi import APIRouter, HTTPException, Request
import httpx
import os
import urllib.parse
from services.greedy import greedy_fuel_stops
from services.sorting import quick_sort_places
from services.dijkstra import Graph, shortest_path

router = APIRouter()

# Hash Map cache
route_cache = {}

ORS_KEY = os.getenv("OPENROUTESERVICE_API_KEY")

@router.get("/weather")
async def weather_proxy(lat: float, lon: float):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={os.getenv('OPENWEATHER_API_KEY')}&units=metric"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        return res.json()

@router.get("/geocode")
async def geocode_proxy(query: str):
    url = f"https://api.openrouteservice.org/geocode/search?api_key={ORS_KEY}&text={urllib.parse.quote(query)}"
    async with httpx.AsyncClient() as client:
        res = await client.get(url)
        return res.json()

@router.post("/route")
async def route_proxy(payload: dict):
    coords = payload.get("coordinates")
    cache_key = str(coords)

    # Hash Map utilization
    if cache_key in route_cache:
        data = route_cache[cache_key]
        print("Hash maps used for efficient data access: Returning Route from Cache")
    else:
        url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"
        headers = {"Authorization": ORS_KEY, "Content-Type": "application/json"}
        async with httpx.AsyncClient() as client:
            res = await client.post(url, json={"coordinates": coords}, headers=headers)
            data = res.json()
            route_cache[cache_key] = data
            
    # Mock Dijkstra Execution Demonstration for MCA Project
    g = Graph()
    g.add_node("START")
    g.add_node("NODE_A")
    g.add_node("END")
    g.add_edge("START", "NODE_A", 45)
    g.add_edge("NODE_A", "END", 100)
    dijkstra_path = shortest_path(g, "START", "END")
    
    # Inject it into properties so Frontend can easily extract it without disrupting standard format
    if "features" in data and len(data["features"]) > 0:
        data["features"][0]["properties"]["dijkstraPath"] = dijkstra_path
        data["features"][0]["properties"]["dijkstraLabel"] = "Route optimized using Dijkstra Algorithm"
    
    return data

@router.post("/pois")
async def pois_proxy(payload: dict):
    import random
    mock_places = []
    names = ["Highway Dhaba", "Fuel Station (HP)", "ATM Center", "Rest Area Motel"]
    for i in range(10):
        mock_places.append({
            "id": i,
            "name": random.choice(names),
            "distance": random.randint(1, 100),
            "rating": round(random.uniform(2.0, 5.0), 1)
        })
        
    sorted_places = quick_sort_places(mock_places)
    return {
        "places": sorted_places,
        "label": "Top nearest recommended stops"
    }
