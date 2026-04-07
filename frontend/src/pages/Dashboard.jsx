import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, MapPin, Gauge, Timer, Fuel, AlertTriangle,
  Search, Navigation, DollarSign, Settings, PhoneCall,
  Sun, Moon, TrendingUp
} from 'lucide-react';
import L from 'leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip as ChartTooltip
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip);

function MapMover({ center, zoom, heading, isSimulating }) {
  const map = useMap();
  useEffect(() => {
    if (isSimulating) {
        // While simulating, just silently pan to the new center to track the rider
        // without overriding the user's manual zoom level!
        map.panTo(center, { animate: true, duration: 1 });
    } else {
        // When not simulating (initial load or planning), set full view
        map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map, isSimulating]);
  return null;
}

// Custom DivIcon for Motorcycle with Rotation and Speed Ring
const createRiderIcon = (heading, speedColor) => {
  return L.divIcon({
    className: 'custom-rider-icon',
    html: `
      <div style="
        width: 40px; height: 40px; 
        border-radius: 50%;
        border: 3px solid ${speedColor};
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.6);
        box-shadow: 0 0 15px ${speedColor};
        transform: rotate(${heading}deg);
        transition: transform 0.5s ease-out, border-color 0.5s ease-out;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20px" height="20px">
           <!-- Simple up arrow / motorcycle abstract shape -->
           <path d="M12 2L4 20l8-4 8 4z" />
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

function Dashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [bike, setBike] = useState(null);
  const [weather, setWeather] = useState(null);
  const [theme, setTheme] = useState('dark');
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState([28.6139, 77.2090]);
  const [heading, setHeading] = useState(0);
  
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fuelUsed, setFuelUsed] = useState(0);
  const [alerts, setAlerts] = useState([]);
  
  // V2 Variables
  const [rideMode, setRideMode] = useState('Normal'); // Eco, Normal, Sport
  const [routeType, setRouteType] = useState('Fastest'); // Fastest, Safe, Fuel
  const [fuelPrice, setFuelPrice] = useState(100);
  const [speedHistory, setSpeedHistory] = useState([]); // [{time, speed, event}]
  const [showSOS, setShowSOS] = useState(false);
  const [hudPopover, setHudPopover] = useState(null);

  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [routeGeoPath, setRouteGeoPath] = useState([]);
  const [totalRouteDistance, setTotalRouteDistance] = useState(0);
  const [plannedStops, setPlannedStops] = useState([]);
  const [nearbyPOIs, setNearbyPOIs] = useState([]);

  const trackerRef = useRef(null);
  const pathIndexRef = useRef(0);

  // Auto layout theme based on time
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 6 && hr < 18) setTheme('light');
    else setTheme('dark');

    // Fetch Bike Profile
    axios.get('/api/bike/')
      .then(res => { 
        if (res.data) setBike(res.data); 
        else navigate('/profile'); 
      })
      .catch(() => navigate('/profile'));

    // GPS Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        addAlert("🛰️ GPS Signal Locked!", "gps_ok");
      }, (error) => {
        console.error("Geolocation error:", error);
        addAlert("❌ GPS Signal Failed. Using default location.", "gps_fail");
      });
    } else {
      addAlert("❌ Geolocation not supported by your browser.", "gps_unsupported");
    }
  }, [navigate]);

  useEffect(() => {
    axios.get(`/api/proxy/weather?lat=${currentLocation[0]}&lon=${currentLocation[1]}`)
         .then(res => setWeather(res.data)).catch(console.error);
  }, []);

  const locateMe = () => {
    if ("geolocation" in navigator) {
      addAlert("🔍 Locating rider...");
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
        addAlert("🛰️ GPS Signal Locked!", "gps_ok");
      }, (error) => {
        console.error("Geolocation error:", error);
        addAlert("❌ GPS Signal Failed. Please enable location permissions.", "gps_fail");
      });
    }
  };

  const triggerHudSuggestion = (msg) => {
    setHudPopover(msg);
    setTimeout(() => setHudPopover(null), 4000);
  };

  const addAlert = (msg, evType) => {
    setAlerts(prev => [...prev, msg].slice(-5));
    if (evType) {
      setSpeedHistory(prev => {
        let cp = [...prev];
        if (cp.length > 0) cp[cp.length-1].event = evType;
        return cp;
      });
    }
  };

  const fetchNearbyPOIs = async () => {
    try {
      addAlert("🔍 Ranking nearby locations...");
      const res = await axios.post('/api/proxy/pois/', { lat: currentLocation[0], lon: currentLocation[1] });
      if (res.data && Array.isArray(res.data.places)) {
        setNearbyPOIs(res.data.places);
        addAlert(`✨ ${res.data.label} (Quick Sort applied)`);
      } else {
        setNearbyPOIs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateFuel = (distKm, currentSpeed) => {
    if (!bike) return 0;
    const engineCc = parseInt(bike.engine_cc) || 150;
    const wheelDia = parseInt(bike.wheel_diameter) || 17;
    const weightKg = parseInt(bike.weight) || 150;
    
    const eff = (1500 / engineCc) * (wheelDia / weightKg) * 100;
    if (!isFinite(eff) || eff === 0) return 0;
    
    // Mode modifiers
    let modeMult = 1.0;
    if (rideMode === 'Eco') modeMult = 0.8;
    if (rideMode === 'Sport') modeMult = 1.3;

    const speedDrop = currentSpeed > 80 ? 1.2 : 1.0;
    return (distKm / eff) * modeMult * speedDrop;
  };

  const planRoute = async () => {
    if (!endQuery) return alert("Enter destination");
    
    let startLoc = startQuery;
    if (!startLoc && currentLocation) {
      // Use coordinates string for geocode if no query provided
      startLoc = `${currentLocation[1]},${currentLocation[0]}`; 
    }

    try {
      addAlert("🗺️ Calculating optimized route...");
      
      // Fallback geocoding logic
      let startC, endC;
      
      try {
        const startRes = await axios.get(`/api/proxy/geocode?query=${encodeURIComponent(startLoc || 'New Delhi')}`);
        if (startRes.data.features && startRes.data.features.length > 0) {
            startC = startRes.data.features[0].geometry.coordinates;
        } else if (currentLocation) {
            startC = [currentLocation[1], currentLocation[0]];
        }
        
        const endRes = await axios.get(`/api/proxy/geocode?query=${encodeURIComponent(endQuery)}`);
        if (endRes.data.features && endRes.data.features.length > 0) {
            endC = endRes.data.features[0].geometry.coordinates;
        } else {
            throw new Error("Destination not found");
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
        alert("Could not find locations. Please try more specific names.");
        return;
      }

      const routeRes = await axios.post('/api/proxy/route/', { coordinates: [startC, endC] });
      
      if (!routeRes.data || !routeRes.data.features || routeRes.data.features.length === 0) {
        throw new Error("No route geometry found in API response");
      }

      const coords = routeRes.data.features[0].geometry.coordinates.map(c => [c[1], c[0]]);
      const dist = routeRes.data.features[0].properties.summary.distance / 1000;
      
      setRouteGeoPath(coords);
      setTotalRouteDistance(dist);
      setCurrentLocation(coords[0]);
      
      if (routeRes.data.features[0].properties.dijkstraLabel) {
        addAlert(`🧠 ${routeRes.data.features[0].properties.dijkstraLabel}`);
      }

      // Calculate stops
      const engineCc = bike ? parseInt(bike.engine_cc) : 150;
      const wheelDia = bike ? parseInt(bike.wheel_diameter) : 17;
      const weightKg = bike ? parseInt(bike.weight) : 150;
      const tankCap = bike ? parseInt(bike.tank_capacity) : 10;

      // Real-world Physics based Efficiency Formula (Realistic for MCA project)
      // Base: 150cc bike @ 150kg ≈ 45-50 km/L
      const eff = (7500 / engineCc) * (150 / weightKg) * (wheelDia / 17);
      let maxRange = tankCap * eff;
      if (rideMode === 'Eco') maxRange *= 1.2;
      if (rideMode === 'Sport') maxRange *= 0.8;

      let newStops = [];
      let nextFuel = maxRange * 0.7;
      let nextRest = 100;

      let runD = 0;
      for (let i = 1; i < coords.length; i++) {
        const dLat = (coords[i][0] - coords[i-1][0]) * Math.PI / 180;
        const dLon = (coords[i][1] - coords[i-1][1]) * Math.PI / 180;
        const a = Math.sin(dLat/2) ** 2 + Math.cos(coords[i-1][0] * Math.PI / 180) * Math.cos(coords[i][0] * Math.PI / 180) * Math.sin(dLon/2) ** 2;
        runD += 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));

        if (runD >= nextFuel) {
          newStops.push({ type: 'Fuel', coords: coords[i], label: `Fuel Stop (~${Math.floor(runD)}km)`, dist: runD });
          nextFuel += (maxRange * 0.7);
        }
        if (runD >= nextRest) {
          newStops.push({ type: 'Rest', coords: coords[i], label: `Rest Break (~${Math.floor(runD)}km)`, dist: runD });
          nextRest += (routeType==='Safe'?80:120);
        }
      }
      setPlannedStops(newStops);
      addAlert("✅ Smart Route generated successfully!");

    } catch (e) {
      alert("Failed to plan route.");
    }
  };

  const startSimulation = () => {
    if (isSimulating) return;
    if (routeGeoPath.length === 0) return alert("Please plan a route first!");

    setIsSimulating(true);
    setDistance(0); setDuration(0); setFuelUsed(0);
    pathIndexRef.current = 0;
    setSpeedHistory([]);

    trackerRef.current = setInterval(() => {
      setDuration(d => d + 1);
      
      const isSport = rideMode === 'Sport';
      const maxSpd = isSport ? 120 : 90;
      const minSpd = isSport ? 60 : 30;
      const newSpeed = minSpd + Math.random() * (maxSpd - minSpd);
      
      setSpeed(newSpeed);
      
      setSpeedHistory(prev => [...prev, { time: prev.length, speed: newSpeed, event: null }]);

      // Dynamic thresholds based on mode
      const overspeedThreshold = rideMode === 'Eco' ? 70 : rideMode === 'Sport' ? 100 : 85;
      if (newSpeed > overspeedThreshold) {
        addAlert("⚠️ Overspeeding Detected!", 'overspeed');
        if (Math.random() > 0.8) triggerHudSuggestion("Reduce speed for better efficiency");
      }
      
      if (speed - newSpeed > 30) {
        addAlert("🛑 Sudden braking!", 'braking');
      }

      // Move coords
      pathIndexRef.current += 1;
      if (pathIndexRef.current < routeGeoPath.length) {
        const p1 = routeGeoPath[pathIndexRef.current - 1];
        const p2 = routeGeoPath[pathIndexRef.current];
        
        // Accurate Bearing Calculation for icon rotation
        const lat1 = p1[0] * Math.PI / 180;
        const lat2 = p2[0] * Math.PI / 180;
        const dLon = (p2[1] - p1[1]) * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const bear = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        setHeading(bear);
        
        setCurrentLocation(p2);
      } else {
        stopSimulation();
      }

      // Fuel Dist update
      const distIncr = newSpeed / 3600;
      setDistance(prev => {
        const nextDist = prev + distIncr;
        const used = calculateFuel(nextDist, newSpeed);
        setFuelUsed(used);
        
        // Check upcoming stops
        const nextStop = plannedStops.find(s => s.dist > nextDist && s.dist - nextDist < 5);
        if (nextStop && Math.random() > 0.9) triggerHudSuggestion(`${nextStop.type} ahead in ${(nextStop.dist - nextDist).toFixed(1)} km`);

        return nextDist;
      });
      
    }, 1000);
  };

  const stopSimulation = async () => {
    setIsSimulating(false);
    clearInterval(trackerRef.current);
    
    // Calculate final metrics
    const baseScore = rideMode === 'Sport' ? 95 : 100;
    const score = Math.max(0, baseScore - (alerts.length * 5));
    const avgSpeed = (distance / (duration / 3600)) || 0;
    const tripCost = fuelUsed * fuelPrice;
    
    let aiInsight = '';
    if (score > 90) aiInsight = "Excellent ride! Your throttle control was very smooth.";
    else if (score > 70) aiInsight = "Good ride. Consider reducing sudden braking events which cost you fuel efficiency.";
    else aiInsight = "Careful! You had frequent speed violations. The 'Safe' route mode is recommended for your next trip.";

    const rideData = { date: new Date().toISOString(), distance, duration, average_speed: avgSpeed, fuel_used: fuelUsed, rider_score: score, route_data: routeGeoPath, speedHistory };

    try {
      const res = await axios.post('/api/rides/', rideData);
      const backendAiInsight = res.data.aiInsight || aiInsight;
      navigate('/summary', { state: { ...rideData, score, aiInsight: backendAiInsight, tripCost, speedHistory } });
    } catch(err) {
      alert('Failed to save ride');
    }
  };

  const remainingFuel = (bike && bike.tank_capacity) ? Math.max(0, bike.tank_capacity - fuelUsed).toFixed(1) : 0;
  
  const getSpeedColor = () => {
    if (speed < 50) return '#10b981'; // green
    if (speed < 85) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const isLight = theme === 'light';
  const bgC = isLight ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50' : 'bg-gradient-to-br from-slate-900 via-purple-950 to-black';
  const textC = isLight ? 'text-gray-900' : 'text-gray-100';
  const panelBg = isLight ? 'bg-white/50 border-white/50 backdrop-blur-xl' : 'bg-black/40 border-purple-500/30 backdrop-blur-xl';

  return (
    <div className={`h-screen ${bgC} ${textC} flex flex-col overflow-hidden transition-colors duration-500`}>
      <header className={`${panelBg} border-b shadow-lg p-4 shrink-0 flex justify-between items-center backdrop-blur-md z-50`}>
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-neonBlue to-neonOrange mr-3 flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)]">
             <Navigation className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-neonBlue to-neonOrange mr-6">RIDER<span className="text-white">INTEL</span></h1>
          <button onClick={locateMe} className="text-gray-500 hover:text-neonBlue flex items-center">
            <MapPin className="w-5 h-5 mr-1" /> Locate
          </button>
          <button onClick={fetchNearbyPOIs} className="text-gray-500 hover:text-neonBlue flex items-center">
            <Search className="w-5 h-5 mr-1" /> Rank POIs
          </button>
          <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className="text-gray-500 hover:text-neonBlue">
            {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5"/>}
          </button>
        </div>
        
        <div className="flex items-center space-x-6">
          <div className="flex flex-col items-end mr-4">
             <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Active Rider</span>
             <span className="text-sm font-black text-white">{localStorage.getItem('username') || 'Tester'}</span>
          </div>
          <button onClick={() => setShowSOS(true)} className="flex items-center text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full hover:bg-red-500/20 animate-pulse">
            <PhoneCall className="w-4 h-4 mr-2" /> SOS
          </button>
          {weather && weather.main && weather.weather && weather.weather.length > 0 && (
            <div className={`flex items-center ${isLight?'text-gray-600':'text-gray-300'}`}>
              <span className="text-neonOrange mr-2 font-bold">{weather.main.temp}°C</span>
              <span className="text-sm">{weather.weather[0].main}</span>
            </div>
          )}
          <button onClick={() => navigate('/history')} className="font-semibold hover:text-neonBlue transition-colors">History</button>
          <button onClick={logout} className="text-gray-500 hover:text-red-500 transition-colors">Logout</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden flex-col md:flex-row relative">
        
        {/* Left Side Panel */}
        <aside className={`w-full md:w-[400px] ${panelBg} border-r flex flex-col shrink-0 overflow-y-auto z-40`}>
          
          {/* Settings / Preferences */}
          <div className="p-5 border-b border-gray-700/50">
            <h3 className="text-sm font-bold opacity-70 mb-3 flex items-center"><Settings className="w-4 h-4 mr-2"/> RIDER PREFERENCES</h3>
            
            <div className="flex space-x-2 mb-3">
              {['Eco', 'Normal', 'Sport'].map(m => (
                <button key={m} onClick={()=>setRideMode(m)} className={`flex-1 py-1.5 rounded text-xs font-bold ${rideMode===m ? 'bg-neonBlue text-gray-900 shadow-[0_0_10px_rgba(0,243,255,0.5)]' : 'bg-gray-700/30'}`}>{m}</button>
              ))}
            </div>

            <div className="flex space-x-2 mb-4">
              {['Fastest', 'Fuel Effic', 'Safe'].map(r => (
                <button key={r} onClick={()=>setRouteType(r.split(' ')[0])} className={`flex-1 py-1.5 rounded text-xs font-bold ${routeType===r.split(' ')[0] ? 'bg-neonOrange text-white shadow-[0_0_10px_rgba(255,107,0,0.5)]' : 'bg-gray-700/30'}`}>{r}</button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold flex items-center opacity-70">₹ Fuel Price / L</label>
              <input type="number" value={fuelPrice} onChange={e=>setFuelPrice(e.target.value)} className="bg-transparent border-b border-gray-500 w-16 text-sm text-center outline-none focus:border-neonBlue"/>
            </div>
          </div>

          {/* Route Planner */}
          <div className="p-5 border-b border-gray-700/50">
            <div className="space-y-3">
              <input value={startQuery} onChange={e=>setStartQuery(e.target.value)} placeholder="Start Location" className={`w-full bg-transparent border ${isLight?'border-gray-300':'border-gray-700'} rounded-lg p-2 text-sm focus:border-neonBlue outline-none`}/>
              <input value={endQuery} onChange={e=>setEndQuery(e.target.value)} placeholder="Destination" className={`w-full bg-transparent border ${isLight?'border-gray-300':'border-gray-700'} rounded-lg p-2 text-sm focus:border-neonOrange outline-none`}/>
              <button onClick={planRoute} className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center transition-colors">
                <Search className="w-4 h-4 mr-2"/> GENERATE {routeType.toUpperCase()} ROUTE
              </button>
            </div>
          </div>

          {/* Planned Stops */}
          <div className="p-5 flex-1 flex flex-col min-h-[200px]">
             <h3 className="text-xs font-bold opacity-70 mb-3 flex justify-between">UPCOMING STOPS <span>{plannedStops.length}</span></h3>
             <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {nearbyPOIs.length > 0 && (
                  <div className={`p-3 rounded-xl border mb-4 ${isLight?'bg-blue-50 border-blue-100':'bg-blue-500/10 border-blue-500/20'}`}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center text-blue-400">
                      <Activity className="w-3 h-3 mr-2"/> Ranked Locations
                    </h3>
                    <div className="space-y-1.5">
                      {nearbyPOIs.map((poi, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px]">
                          <span className={`${isLight?'text-gray-700':'text-white'} opacity-80`}>{poi.name}</span>
                          <span className="font-mono text-blue-400 font-bold">{poi.distance} km</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {plannedStops.map((stop, i) => (
                  <div key={i} className={`p-2 rounded border flex items-center space-x-3 ${stop.type === 'Fuel' ? (isLight?'bg-orange-50 border-orange-200 text-orange-600':'bg-neonOrange/10 border-neonOrange/30 text-neonOrange') : (isLight?'bg-blue-50 border-blue-200 text-blue-600':'bg-neonBlue/10 border-neonBlue/30 text-neonBlue')}`}>
                     {stop.type === 'Fuel' ? <Fuel className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                     <div className="text-xs font-bold">{stop.label} • In {(stop.dist - distance).toFixed(0)}km</div>
                  </div>
                ))}
             </div>
          </div>
          
          <div className="p-5 border-t border-gray-700/50">
            <button 
              onClick={isSimulating ? stopSimulation : startSimulation}
              className={`w-full py-3 rounded-xl font-black transition-transform active:scale-95 shadow-lg ${isSimulating ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-neonBlue text-gray-900 shadow-[0_0_20px_rgba(0,243,255,0.4)]'}`}
            >
              {isSimulating ? 'END RIDE & VIEW SUMMARY' : 'START RIDE'}
            </button>
          </div>
        </aside>

        {/* HUD over Map */}
        <div className="flex-1 relative z-0 flex flex-col">
          
          {hudPopover && (
            <div className="absolute top-32 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 bg-white text-gray-900 font-bold rounded-full shadow-2xl animate-[bounce_1s_infinite] border-2 border-neonBlue flex items-center">
              <Navigation className="w-5 h-5 mr-3 text-neonBlue" /> {hudPopover}
            </div>
          )}

          <div className="absolute top-4 left-4 right-4 z-[400] grid grid-cols-2 lg:grid-cols-4 gap-4 pointer-events-none">
             {[
               { icon: <Gauge/>, title: 'SPEED', val: `${(speed || 0).toFixed(0)}`, unit: 'km/h', color: getSpeedColor() },
               { icon: <MapPin/>, title: 'TRIP', val: `${(distance || 0).toFixed(1)}`, unit: 'km', color: '#fff' },
               { icon: <DollarSign/>, title: 'COST', val: `₹${((fuelUsed || 0) * (fuelPrice || 0)).toFixed(0)}`, unit: '', color: '#fff' },
               { icon: <Fuel/>, title: 'FUEL REM', val: `${remainingFuel || 0}`, unit: 'L', color: '#ff6b00' },
             ].map((m, i) => (
                <div key={i} className={`pointer-events-auto backdrop-blur-xl ${isLight?'bg-white/80 border-gray-200':'bg-gray-900/80 border-gray-700'} border rounded-xl p-3 shadow-2xl transition-all duration-300`}>
                  <p className="text-[10px] font-bold opacity-60 flex items-center mb-1">{React.cloneElement(m.icon, {className:"w-3 h-3 mr-1"})} {m.title}</p>
                  <h3 className="text-2xl font-black" style={{color: m.color}}>{m.val} <span className="text-sm opacity-50">{m.unit}</span></h3>
                </div>
             ))}
          </div>

          <MapContainer center={currentLocation} zoom={15} zoomControl={false} className="flex-1 w-full bg-[#1a1c23]" style={{ height: '100%', minHeight: '400px' }}>
            <MapMover center={currentLocation} zoom={isSimulating ? 16 : 14} heading={heading} isSimulating={isSimulating} />
            <TileLayer
              url={isLight ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"}
            />
            {routeGeoPath.length > 0 && <Polyline positions={routeGeoPath} color={routeType==='Fastest'?'#ff6b00':routeType==='Safe'?'#39ff14':'#00f3ff'} weight={6} opacity={0.8} />}
            {plannedStops.map((stop, i) => (
              <Marker key={`stop-${i}`} position={stop.coords}>
                <Popup>
                  <div className="text-xs font-bold">
                    <span className={stop.type === 'Fuel' ? 'text-neonOrange' : 'text-neonBlue'}>{stop.type} Stop</span>
                    <br />
                    {stop.label}
                  </div>
                </Popup>
              </Marker>
            ))}
            <Marker position={currentLocation} icon={createRiderIcon(heading, getSpeedColor())} zIndexOffset={1000} />
          </MapContainer>
          
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm z-[400] pointer-events-none">
             <div className="space-y-2 flex flex-col items-center">
               {alerts.map((a, i) => (
                  <div key={i} className="text-sm font-bold py-2 px-6 bg-red-900/90 backdrop-blur border border-red-500 text-red-100 rounded-full animate-pulse shadow-2xl">
                    {a}
                  </div>
                ))}
             </div>
          </div>
        </div>

      </main>

      {/* SOS Modal */}
      {showSOS && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000] flex items-center justify-center p-4">
          <div className={`${panelBg} max-w-md w-full rounded-2xl p-6 border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-[pulse_2s_infinite]`}>
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-center text-red-500 mb-2">EMERGENCY ASSISTANCE</h2>
            <p className="text-center opacity-80 text-sm mb-6">
              Your location ({currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}) has been recorded.
            </p>
            <div className="space-y-3">
              <button onClick={()=>setShowSOS(false)} className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-lg">
                SHARE LOCATION LIVE LINK
              </button>
              <button onClick={()=>setShowSOS(false)} className="w-full py-3 bg-gray-700/50 hover:bg-gray-700 text-white font-bold rounded-lg transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
