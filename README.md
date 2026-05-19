# Ride Intelligence Web Application 🏍️📈

An intelligent web-based routing, assistance, and analytics system designed specifically for motorcycle riders. Unlike traditional systems that focus purely on the shortest path, the Ride Intelligence Web Application combines custom route optimization with personalized performance analytics and insights to improve safety, fuel efficiency, and rider decision-making.

---

## 🎯 Project Objectives & Scope

### Core Objectives
* **Intelligent Routing:** Develop a web platform providing optimized route suggestions tailored for riders using advanced algorithms (e.g., Dijkstra Algorithm).
* **Behavioral Insights:** Analyze rider behavior to generate meaningful performance summaries.
* **API Integration:** Seamlessly integrate mapping data dynamically via the OpenRouteService API.
* **Data Management:** Securely track, store, and manage user metrics and history for long-term tracking.

### In Scope
* Secure user registration and JWT authentication.
* Dynamic route planning inputs (Source & Destination).
* Live dashboard featuring route visualizations, ride summaries (distance, time, average speed), and performance metrics.
* Persistent storage for data tracking utilizing NoSQL architecture.

---

## 🚀 Key Features

* **Intelligent Route Optimization:** Leverages algorithmic path calculation combined with real-time mapping services.
* **Rider Behavior Analytics:** Tracks parameters such as estimated speed and travel duration to evaluate riding efficiency over time.
* **Custom Bike Profiles:** Allows users to input motorcycle parameters (engine CC, fuel capacity, model name) to provide tailored context for performance analysis.
* **Comprehensive Interactive Dashboard:** A single unified portal for route creation, viewing history, and analyzing performance trends.

### 📊 Feature Comparison with Traditional Platforms

| Feature | Google Maps | Mapbox | Proposed System |
| :--- | :---: | :---: | :---: |
| **Route Optimization** | Yes | Yes | **Yes** |
| **Customization** | Limited | High | **High** |
| **Rider Analytics** | No | No | **Yes** |
| **Behavioral Insights** | No | No | **Yes** |
| **Data Storage** | No | No | **Yes** |
| **Intelligent Decision Support** | No | No | **Yes** |

---

## 🏗️ System Architecture & Tech Stack

The application employs a decoupled **Client-Server (3-Tier Architecture)** split into separate interactive and computational components:

### Technologies Used

* **Frontend Layer:** Built using **React.js** (Single Page Application architecture) for dynamic components, state management, and user interaction. Deployed on **Vercel**.
* **Backend Layer:** Built using **FastAPI** (Python framework) delivering high performance, native async capabilities, and speedy computational logic execution. Deployed on **Render**.
* **Database Layer:** Managed via a **MongoDB Cloud Atlas Cluster** storing unstructured collections including Users, Ride Logs, and Bike Profiles.
* **Routing Logic & APIs:** Powering path calculations by combining the **OpenRouteService API** mapping services alongside custom **Dijkstra Algorithm** execution.

### Module Breakdown
1. **Authentication Module:** Session verification, user metadata validation, and secure access management.
2. **Route Engine:** Captures user coordinates, hooks into the mapping layer, and applies shortest/safest path algorithms.
3. **Analytics Module:** Ingests live data to compute metrics, performance updates, and efficiency ratings.
4. **Database Handling:** Coordinates asynchronous communication using MongoDB Wire Protocol to maintain consistent reads and writes.

---

## ⚙️ Core Implementation Snapshot

Here is an abstract representation of how the backend routes inputs through external mapping infrastructures:

```python
from fastapi import FastAPI, HTTPException
import requests

app = FastAPI(title="Ride Intelligence Backend")

@app.get("/route")
def get_route(start: str, end: str):
    # Abstract routing handler wrapping external telemetry integration
    url = f"[https://api.openrouteservice.org/v2/directions/driving-car](https://api.openrouteservice.org/v2/directions/driving-car)"
    headers = {
        "Authorization": "YOUR_OPENROUTESERVICE_API_KEY",
        "Accept": "application/json, application/geo+json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="API routing error")
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
🛠️ Getting Started & Installation
Follow these steps to spin up the development environment locally:
Prerequisites
Python 3.9+
Node.js v16+
MongoDB Atlas Account or Local Instance
OpenRouteService API Key
1. Repository Setup
git clone [https://github.com/Yellowbow96/route_inteligent_ai.git](https://github.com/Yellowbow96/route_inteligent_ai.git)
cd route_inteligent_ai
2. Backend Setup (FastAPI)
# Navigate to backend path (adjust based on repo structure)
cd backend

# Create and activate environment
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file config
echo "MONGODB_URL=your_mongodb_connection_string" >> .env
echo "ORS_API_KEY=your_openrouteservice_api_key" >> .env

# Run development server
uvicorn main:app --reload
3. Frontend Setup (React.js)
# Open a new terminal session
cd frontend

# Install package modules
npm install

# Connect frontend variables
echo "REACT_APP_API_URL=http://localhost:8000" >> .env

# Run local build server
npm start
🔮 Limitations & Future Scope
While the implementation safely achieves core routing optimization and data analytics tracking, future iterations plan to introduce:
AI-Based Route Prediction: Integrating ML models to predict optimal travel routing patterns based on historical data.
Hardware / IoT Integration: Connecting physical bike sensors directly to stream engine metrics, tilt analysis, and telemetry logs.
Offline Support: Leveraging local cache stores to maintain limited routing features in data dead zones.
Live Traffic Tracking: Dynamic data injection to alter path targets mid-journey based on immediate road incidents.
📜 References
FastAPI Core Documentation - https://fastapi.tiangolo.com
React Framework Guidelines - https://react.dev
OpenRouteService Dev Center Docs - https://openrouteservice.org/dev
Dijkstra, E. W. (1959). A note on two problems in connexion with graphs. Numerische Mathematik.
