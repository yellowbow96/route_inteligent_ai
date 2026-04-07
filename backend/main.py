from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, bike, ride, proxies

app = FastAPI(title="Rider Intelligence V3 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(bike.router, prefix="/api/bike", tags=["Bike"])
app.include_router(ride.router, prefix="/api/rides", tags=["Rides"])
app.include_router(proxies.router, prefix="/api/proxy", tags=["Proxies"])

@app.get("/")
def read_root():
    return {"status": "FastAPI V3 Running"}

@app.get("/test/route")
def test_route():
    from services.dijkstra import Graph, shortest_path
    g = Graph()
    g.add_node("A")
    g.add_node("B")
    g.add_node("C")
    g.add_edge("A", "C", 50)
    g.add_edge("A", "B", 10)
    g.add_edge("B", "C", 10)
    path = shortest_path(g, "A", "C")
    return {"status": "success", "dijkstra_path": path, "label": "Route optimized using Dijkstra Algorithm"}

@app.get("/test/fuel")
def test_fuel():
    from services.greedy import greedy_fuel_stops
    stops = greedy_fuel_stops([50, 50, 50, 50, 50], bike_capacity=10, bike_efficiency=40)
    return {"status": "success", "stops_at_km": stops, "label": "Fuel stop planning using Greedy Algorithm"}

@app.get("/test/places")
def test_places():
    from services.sorting import quick_sort_places
    mock = [
        {"name": "Dhaba 1", "distance": 10, "rating": 4.5},
        {"name": "Dhaba 2", "distance": 10, "rating": 5.0},
        {"name": "Dhaba 3", "distance": 20, "rating": 3.0}
    ]
    sorted_places = quick_sort_places(mock)
    return {"status": "success", "places": sorted_places, "label": "Top nearest recommended stops"}
