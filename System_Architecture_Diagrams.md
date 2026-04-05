# Rider Intelligence - System Architecture Diagrams

This document contains the structural blueprints for the Rider Intelligence Phase 3 platform (FastAPI Python + MongoDB + React).

## DFD Level 0 (Context Diagram)

This represents the highest-level view of the application boundary, showing how external entities interact with the core system.

```mermaid
graph LR
    User[User / Rider] -->|Input: Credentials, Origin, Dest| RI[Rider Intelligence FastAPI V3]
    RI -->|Output: Optimized Route, ALerts| User
    
    RI <-->|API Requests / JSON Responses| Ext[External Services: OpenRouteService, Weather API]
```

---

## DFD Level 1 (Internal Services)

This diagram details the internal flow of data between the major modular engines executing the Python algorithms.

```mermaid
graph TD
    Auth[1.0 Auth System]
    Route[2.0 Route Planning Engine]
    POI[3.0 Smart POI Engine]
    AI[4.0 AI Insights Engine]
    
    DB_Users[(Users Collection)]
    DB_Rides[(Rides Collection Database)]
    Cache_Route[(Route Hash Cache)]
    Ext_ORS((ORS External API))

    Auth <-->|JWT Validation| DB_Users
    
    Route <-->|Dijkstra / Greedy Algorithms| Cache_Route
    Route <-->|Fetch Geometry| Ext_ORS
    
    POI <-->|Quick Sort Algorithms| Ext_ORS
    
    AI <-->|Analyzes Trajectory Logs| DB_Rides
```

---

## Entity-Relationship (ER) Diagram

This diagram maps out the relationships and fundamental structure arrays of the NoSQL MongoDB implementation storing rider metrics.

```mermaid
erDiagram
    USER ||--|| BIKE_PROFILE : "registers"
    USER ||--o{ RIDE_LOG : "completes"
    
    USER {
        ObjectId _id PK
        String username
        String password_hash
        Date createdAt
    }
    
    BIKE_PROFILE {
        ObjectId userId FK
        String model_name
        Int engine_cc
        Int weight
        Int tank_capacity
    }
    
    RIDE_LOG {
        ObjectId _id PK
        ObjectId userId FK
        Date date
        Float distance
        Float duration
        Float average_speed
        Float fuel_used
        Float rider_score
        Array route_data
        Array speedHistory
    }
```
