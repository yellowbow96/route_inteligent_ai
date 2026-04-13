import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Activity, MapPin, Gauge, Timer, Fuel, AlertTriangle,
  Search, Navigation, DollarSign, Settings, PhoneCall,
  Sun, Moon, Sparkles, Trees, Store, Coffee, ShieldPlus,
  Users, Copy, Radio, Mic, Share2, LocateFixed, Phone, Trophy, Bike, PencilLine, X
} from 'lucide-react';
import L from 'leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip as ChartTooltip
} from 'chart.js';
import BikeProfileForm from '../components/BikeProfileForm';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ChartTooltip);

const emptyBikeProfile = {
  model_name: '',
  engine_cc: '',
  weight: '',
  wheel_diameter: '',
  tank_capacity: ''
};

const normalizeBikeProfile = (data = {}) => ({
  model_name: data.model_name || [data.brand, data.model, data.year].filter(Boolean).join(' ') || '',
  engine_cc: data.engine_cc?.toString?.() || '',
  weight: data.weight?.toString?.() || '',
  wheel_diameter: data.wheel_diameter?.toString?.() || '',
  tank_capacity: data.tank_capacity?.toString?.() || ''
});

function MapMover({ center, zoom, heading, isSimulating, recenterTick }) {
  const map = useMap();
  useEffect(() => {
    if (recenterTick > 0) {
        map.setView(center, Math.max(map.getZoom(), zoom), { animate: true });
    } else if (isSimulating) {
        // While simulating, just silently pan to the new center to track the rider
        // without overriding the user's manual zoom level!
        map.panTo(center, { animate: true, duration: 1 });
    } else {
        // When not simulating (initial load or planning), set full view
        map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map, isSimulating, recenterTick]);
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
  const isMobileViewport = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  
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
  const [showRideRankPanel, setShowRideRankPanel] = useState(false);
  const [showBikeChooser, setShowBikeChooser] = useState(false);
  const [showBikeEditor, setShowBikeEditor] = useState(false);
  const [bikeDraft, setBikeDraft] = useState(emptyBikeProfile);
  const [bikeFormMessage, setBikeFormMessage] = useState('');
  const [lastRideSummary, setLastRideSummary] = useState(null);

  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [routeGeoPath, setRouteGeoPath] = useState([]);
  const [totalRouteDistance, setTotalRouteDistance] = useState(0);
  const [plannedStops, setPlannedStops] = useState([]);
  const [nearbyPOIs, setNearbyPOIs] = useState([]);
  const [localAreaIntel, setLocalAreaIntel] = useState(null);
  const [isAreaLoading, setIsAreaLoading] = useState(false);
  const [stopSearchQuery, setStopSearchQuery] = useState('');
  const [stopSearchResults, setStopSearchResults] = useState([]);
  const [isSearchingStops, setIsSearchingStops] = useState(false);
  const [rideCompanionMode, setRideCompanionMode] = useState('Solo');
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [walkieDraft, setWalkieDraft] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [utilityTab, setUtilityTab] = useState('plan');
  const [recenterTick, setRecenterTick] = useState(0);

  const trackerRef = useRef(null);
  const pathIndexRef = useRef(0);
  const speechRecognitionRef = useRef(null);
  const remainingFuelValue = (bike && bike.tank_capacity) ? Math.max(0, bike.tank_capacity - fuelUsed).toFixed(1) : 0;
  const liveRideScore = Math.max(0, (rideMode === 'Sport' ? 95 : 100) - (alerts.length * 5));
  const displayedRideScore = lastRideSummary?.score ?? liveRideScore;

  // Auto layout theme based on time
  useEffect(() => {
    const hr = new Date().getHours();
    if (hr >= 6 && hr < 18) setTheme('light');
    else setTheme('dark');

    // Fetch Bike Profile
    axios.get('/api/bike/')
      .then(res => { 
        if (res.data) setBike(normalizeBikeProfile(res.data));
        else setBike(null);
      })
      .catch(() => setBike(null));

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
  }, [currentLocation]);

  useEffect(() => {
    if (!activeGroup?.code || !bike) return;
    syncGroupStatus();
  }, [activeGroup?.code, bike, currentLocation, speed, remainingFuelValue, rideCompanionMode, endQuery]);

  useEffect(() => {
    if (!activeGroup?.code) return undefined;
    const timer = setInterval(() => {
      refreshGroupSession(activeGroup.code).catch(console.error);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeGroup?.code]);

  const openBikeChooser = () => {
    setBikeDraft(normalizeBikeProfile(bike || emptyBikeProfile));
    setBikeFormMessage('');
    setShowBikeEditor(!bike?.model_name);
    setShowBikeChooser(true);
  };

  const saveBikeProfile = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        model_name: bikeDraft.model_name,
        engine_cc: parseInt(bikeDraft.engine_cc, 10),
        weight: parseInt(bikeDraft.weight, 10),
        wheel_diameter: parseInt(bikeDraft.wheel_diameter, 10),
        tank_capacity: parseInt(bikeDraft.tank_capacity, 10)
      };

      await axios.post('/api/bike/', payload);
      const normalized = normalizeBikeProfile(bikeDraft);
      setBike(normalized);
      setBikeDraft(normalized);
      setBikeFormMessage('Bike profile saved. You can use it for this ride.');
      setShowBikeEditor(false);
    } catch (err) {
      console.error(err);
      setBikeFormMessage('Could not save bike profile. Check the numbers and try again.');
    }
  };

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
    const nextAlert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      msg,
      tone: evType === 'overspeed' || evType === 'gps_fail' ? 'danger' : evType === 'braking' ? 'warning' : 'info'
    };
    setAlerts(prev => [...prev, nextAlert].slice(-4));
    setTimeout(() => {
      setAlerts(prev => prev.filter(alert => alert.id !== nextAlert.id));
    }, 4200);
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

  const fetchLocalAreaIntel = async () => {
    try {
      setIsAreaLoading(true);
      addAlert("🧠 Scanning local area with map + Ollama...");
      const res = await axios.get(`/api/proxy/local-area?lat=${currentLocation[0]}&lon=${currentLocation[1]}&radius_m=3500`);
      setLocalAreaIntel(res.data);
      addAlert(`🌍 Local area intel ready for ${res.data.location_name || 'your area'}`);
    } catch (err) {
      console.error(err);
      addAlert("❌ Local area scan failed");
    } finally {
      setIsAreaLoading(false);
    }
  };

  const searchNearbyStops = async () => {
    if (!stopSearchQuery.trim()) return;
    try {
      setIsSearchingStops(true);
      const res = await axios.get(`/api/proxy/local-search?lat=${currentLocation[0]}&lon=${currentLocation[1]}&query=${encodeURIComponent(stopSearchQuery)}&radius_m=3500`);
      setStopSearchResults(res.data.results || []);
      addAlert(`📍 Found ${res.data.results?.length || 0} local stops for "${stopSearchQuery}"`);
    } catch (err) {
      console.error(err);
      addAlert("❌ Stop search failed");
    } finally {
      setIsSearchingStops(false);
    }
  };

  const buildAbsoluteShareLink = (code) => {
    if (typeof window === 'undefined') return `/live/${code}`;
    return `${window.location.origin}/live/${code}`;
  };

  const refreshGroupSession = async (code) => {
    const res = await axios.get(`/api/group/session/${code}`);
    setActiveGroup(res.data);
    setGroupMessages(res.data.messages || []);
    setShareLink(buildAbsoluteShareLink(res.data.code));
  };

  const createRideGroup = async () => {
    try {
      const username = localStorage.getItem('username') || 'Rider';
      const res = await axios.post('/api/group/create', { display_name: username, ride_mode: rideCompanionMode });
      setRideCompanionMode('Group');
      setActiveGroup(res.data);
      setGroupMessages(res.data.messages || []);
      setShareLink(buildAbsoluteShareLink(res.data.code));
      setGroupCodeInput(res.data.code);
      addAlert(`👥 Group ${res.data.code} created`);
    } catch (err) {
      console.error(err);
      addAlert("❌ Could not create ride group");
    }
  };

  const joinRideGroup = async () => {
    if (!groupCodeInput.trim()) return;
    try {
      const username = localStorage.getItem('username') || 'Rider';
      const res = await axios.post('/api/group/join', { code: groupCodeInput.trim().toUpperCase(), display_name: username });
      setRideCompanionMode('Group');
      setActiveGroup(res.data);
      setGroupMessages(res.data.messages || []);
      setShareLink(buildAbsoluteShareLink(res.data.code));
      addAlert(`🤝 Joined group ${res.data.code}`);
    } catch (err) {
      console.error(err);
      addAlert("❌ Could not join group");
    }
  };

  const syncGroupStatus = async () => {
    if (!activeGroup?.code || !bike) return;
    try {
      const username = localStorage.getItem('username') || 'Rider';
      await axios.post('/api/group/status', {
        code: activeGroup.code,
        display_name: username,
        lat: currentLocation[0],
        lon: currentLocation[1],
        fuel_remaining: Number(remainingFuelValue),
        fuel_capacity: Number(bike?.tank_capacity || 0),
        speed,
        is_online: true,
        ride_mode: rideCompanionMode,
        destination: endQuery || null
      });
    } catch (err) {
      console.error(err);
    }
  };

  const sendWalkieMessage = async (message, source = 'text') => {
    if (!activeGroup?.code) {
      addAlert("👥 Create or join a group before using walkie-talkie");
      return;
    }
    if (!message.trim()) return;
    try {
      const username = localStorage.getItem('username') || 'Rider';
      const res = await axios.post('/api/group/message', {
        code: activeGroup.code,
        display_name: username,
        message: message.trim(),
        source,
      });
      setGroupMessages(res.data.messages || []);
      setWalkieDraft('');
    } catch (err) {
      console.error(err);
      addAlert("❌ Walkie-talkie update failed");
    }
  };

  const startWalkieTalkie = () => {
    if (!activeGroup?.code) {
      addAlert("👥 Create or join a group before using walkie-talkie");
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      addAlert("🎙️ Voice transcription unsupported, use text walkie-talkie");
      return;
    }

    const recognition = new Recognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        sendWalkieMessage(transcript, 'voice');
      }
    };
    recognition.onerror = () => {
      setIsListening(false);
      addAlert("❌ Voice capture failed");
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognition.start();
  };

  const copyShareLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      addAlert("🔗 Live share link copied");
    } catch (err) {
      console.error(err);
    }
  };

  const shareOnWhatsApp = () => {
    if (!shareLink) return;
    const text = encodeURIComponent(`Join my RiderIntel live ride group here: ${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
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

  const beginRideSimulation = () => {
    if (isSimulating) return;
    if (routeGeoPath.length === 0) return alert("Please plan a route first!");

    setShowBikeChooser(false);
    setShowBikeEditor(false);
    setShowRideRankPanel(false);
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

  const handleStartRide = () => {
    if (isSimulating) {
      stopSimulation();
      return;
    }

    if (routeGeoPath.length === 0) {
      alert("Please plan a route first!");
      return;
    }

    openBikeChooser();
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
      const summary = { ...rideData, score, aiInsight: backendAiInsight, tripCost, speedHistory };
      setLastRideSummary(summary);
      setShowRideRankPanel(true);
      addAlert(`🏁 Ride complete. Score ${score} ready in Ride Rank.`);
    } catch(err) {
      alert('Failed to save ride');
    }
  };

  const getSpeedColor = () => {
    if (speed < 50) return '#10b981'; // green
    if (speed < 85) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const isLight = theme === 'light';
  const bgC = isLight ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50' : 'bg-gradient-to-br from-slate-900 via-purple-950 to-black';
  const textC = isLight ? 'text-gray-900' : 'text-gray-100';
  const panelBg = isLight ? 'bg-white/82 border-slate-200/90 backdrop-blur-xl shadow-[0_18px_45px_rgba(148,163,184,0.18)]' : 'bg-black/40 border-purple-500/30 backdrop-blur-xl';
  const mutedText = isLight ? 'text-slate-600' : 'text-gray-400';
  const subtleText = isLight ? 'text-slate-700' : 'text-gray-300';
  const navButton = isLight
    ? 'text-slate-700 hover:text-sky-700 hover:bg-sky-100 border border-transparent hover:border-sky-200'
    : 'text-gray-400 hover:text-neonBlue hover:bg-white/5';
  const ghostButton = isLight
    ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200'
    : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700';
  const selectedModeButton = isLight
    ? 'bg-sky-600 text-white border border-sky-700 shadow-[0_10px_24px_rgba(2,132,199,0.26)]'
    : 'bg-cyan-400 text-slate-950 border border-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.4)]';
  const selectedRouteButton = isLight
    ? 'bg-orange-500 text-white border border-orange-600 shadow-[0_10px_24px_rgba(249,115,22,0.24)]'
    : 'bg-neonOrange text-white border border-orange-300 shadow-[0_0_10px_rgba(255,107,0,0.5)]';
  const primaryButton = isLight
    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-[0_12px_25px_rgba(2,132,199,0.28)]'
    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border border-cyan-200';
  const mapShell = isLight
    ? 'bg-white/50 border border-slate-200/90 shadow-[0_20px_45px_rgba(148,163,184,0.2)]'
    : 'bg-black/20 border border-white/10';
  const metricCard = isLight
    ? 'bg-white/92 border-slate-200 text-slate-900 shadow-[0_16px_35px_rgba(148,163,184,0.22)]'
    : 'bg-gray-900/80 border-gray-700 text-gray-100';
  const metricValueColor = isLight ? '#0f172a' : '#ffffff';
  const tabButton = (tab) => utilityTab === tab ? selectedModeButton : ghostButton;
  const rideRankTone = displayedRideScore >= 85 ? 'text-emerald-400' : displayedRideScore >= 65 ? 'text-cyan-300' : 'text-orange-300';
  const rideRankLabel = displayedRideScore >= 85 ? 'Smooth control' : displayedRideScore >= 65 ? 'Stable ride' : 'Needs cleanup';
  const renderUtilityPanel = () => {
    if (utilityTab === 'plan') {
      return (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'}`}>
            <div className="space-y-3">
              <input value={startQuery} onChange={e=>setStartQuery(e.target.value)} placeholder="Start Location" className={`w-full rounded-lg p-2 text-sm outline-none transition-colors ${isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500' : 'bg-transparent border border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-300'}`}/>
              <input value={endQuery} onChange={e=>setEndQuery(e.target.value)} placeholder="Destination" className={`w-full rounded-lg p-2 text-sm outline-none transition-colors ${isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-orange-500' : 'bg-transparent border border-gray-700 text-white placeholder:text-gray-500 focus:border-orange-300'}`}/>
              <button onClick={planRoute} className={`w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center transition-colors ${primaryButton}`}>
                <Search className="w-4 h-4 mr-2"/> Generate Route
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold opacity-70 mb-3 flex justify-between">UPCOMING STOPS <span>{plannedStops.length}</span></h3>
            <div className="space-y-2 pr-2">
              {nearbyPOIs.length > 0 && (
                <div className={`p-3 rounded-xl border mb-4 ${isLight?'bg-sky-50 border-sky-100':'bg-blue-500/10 border-blue-500/20'}`}>
                  <h3 className={`text-[10px] font-black uppercase tracking-widest mb-2 flex items-center ${isLight ? 'text-sky-700' : 'text-blue-300'}`}>
                    <Activity className="w-3 h-3 mr-2"/> Ranked Locations
                  </h3>
                  <div className="space-y-1.5">
                    {nearbyPOIs.map((poi, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px]">
                        <span className={`${isLight?'text-slate-700':'text-white'} opacity-80`}>{poi.name}</span>
                        <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-blue-300'}`}>{poi.distance} km</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {plannedStops.map((stop, i) => (
                <div key={i} className={`p-2 rounded border flex items-center space-x-3 ${stop.type === 'Fuel' ? (isLight?'bg-orange-50 border-orange-200 text-orange-700':'bg-orange-500/10 border-orange-400/30 text-orange-200') : (isLight?'bg-blue-50 border-blue-200 text-blue-700':'bg-cyan-500/10 border-cyan-400/30 text-cyan-200')}`}>
                  {stop.type === 'Fuel' ? <Fuel className="w-4 h-4" /> : <Timer className="w-4 h-4" />}
                  <div className="text-xs font-bold">{stop.label} • In {(stop.dist - distance).toFixed(0)}km</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (utilityTab === 'group') {
      return (
        <div className="space-y-4">
          <div className={`rounded-2xl border p-4 ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'}`}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="text-sm font-bold opacity-80 flex items-center"><Users className="w-4 h-4 mr-2" /> Group Ride</h3>
                <p className={`text-xs mt-1 ${mutedText}`}>Live location, fuel bars, join code, and quick walkie-talkie updates.</p>
              </div>
              <span className={`text-[10px] uppercase tracking-[0.24em] px-2 py-1 rounded-full ${rideCompanionMode === 'Group' ? 'bg-cyan-500/15 text-cyan-300' : isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/5 text-gray-400'}`}>{rideCompanionMode}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button onClick={createRideGroup} className={`rounded-xl py-2 text-xs font-bold transition-colors ${selectedModeButton}`}>Create Group</button>
              <button onClick={joinRideGroup} className={`rounded-xl py-2 text-xs font-bold transition-colors ${ghostButton}`}>Join Group</button>
            </div>
            <input value={groupCodeInput} onChange={(e) => setGroupCodeInput(e.target.value.toUpperCase())} placeholder="Enter group code" className={`w-full rounded-lg p-2 text-sm outline-none transition-colors ${isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500' : 'bg-transparent border border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-300'}`}/>
            {activeGroup && (
              <div className={`rounded-2xl border p-3 mt-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className={`text-xs uppercase tracking-[0.24em] font-bold ${mutedText}`}>Active Code</div>
                    <div className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{activeGroup.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={copyShareLink} className={`rounded-full p-2 ${ghostButton}`}><Copy className="w-4 h-4" /></button>
                    <button onClick={shareOnWhatsApp} className={`rounded-full p-2 ${primaryButton}`}><Share2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className={`text-[11px] break-all ${mutedText}`}>{shareLink}</div>
              </div>
            )}
          </div>

          {activeGroup && (
            <div className="space-y-3">
              <div className={`rounded-2xl border p-3 ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'}`}>
                <div className={`text-[11px] font-black uppercase tracking-[0.22em] mb-3 flex items-center ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>
                  <LocateFixed className="w-3.5 h-3.5 mr-2" /> Riders Live
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {(activeGroup.members || []).map((member) => {
                    const fuelPct = Number(member.fuel_capacity) > 0 ? Math.max(0, Math.min(100, (Number(member.fuel_remaining) / Number(member.fuel_capacity)) * 100)) : 0;
                    return (
                      <div key={member.user_id} className={`rounded-xl border p-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <div className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{member.display_name}</div>
                            <div className={`text-[10px] uppercase tracking-[0.18em] ${mutedText}`}>{member.ride_mode}</div>
                          </div>
                          <div className={`text-[10px] font-bold ${member.is_online ? 'text-emerald-400' : mutedText}`}>{member.is_online ? 'LIVE' : 'OFF'}</div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] mb-2">
                          <span className={subtleText}>{Number(member.lat || 0).toFixed(3)}, {Number(member.lon || 0).toFixed(3)}</span>
                          <span className={subtleText}>{Number(member.speed || 0).toFixed(0)} km/h</span>
                        </div>
                        <div className={`h-2 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                          <div className={`${fuelPct > 50 ? 'bg-emerald-400' : fuelPct > 25 ? 'bg-amber-400' : 'bg-red-400'} h-full rounded-full`} style={{ width: `${fuelPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`rounded-2xl border p-3 ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'}`}>
                <div className={`text-[11px] font-black uppercase tracking-[0.22em] mb-3 flex items-center ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>
                  <Radio className="w-3.5 h-3.5 mr-2" /> Walkie-Talkie
                </div>
                <div className="flex gap-2 mb-2">
                  <input value={walkieDraft} onChange={(e) => setWalkieDraft(e.target.value)} placeholder="Send a quick update to your group" className={`flex-1 rounded-lg p-2 text-sm outline-none transition-colors ${isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500' : 'bg-transparent border border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-300'}`}/>
                  <button onClick={() => sendWalkieMessage(walkieDraft, 'text')} disabled={!activeGroup?.code} className={`rounded-lg px-3 ${!activeGroup?.code ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-600' : primaryButton}`}>Send</button>
                  <button onClick={startWalkieTalkie} disabled={!activeGroup?.code} className={`rounded-lg px-3 ${!activeGroup?.code ? 'opacity-50 cursor-not-allowed bg-slate-300 text-slate-600' : isListening ? selectedRouteButton : ghostButton}`}><Mic className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {groupMessages.length > 0 ? groupMessages.slice().reverse().map((message, idx) => (
                    <div key={`${message.timestamp || idx}-${idx}`} className={`rounded-xl px-3 py-2 text-[11px] border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold">{message.display_name}</span>
                        <span className={mutedText}>{message.source}</span>
                      </div>
                      <div>{message.message}</div>
                    </div>
                  )) : (
                    <div className={`text-[11px] ${mutedText}`}>No walkie-talkie updates yet.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={fetchLocalAreaIntel} disabled={isAreaLoading} className={`rounded-xl py-2 text-xs font-bold ${isAreaLoading ? ghostButton : primaryButton}`}>{isAreaLoading ? 'Scanning...' : 'Area Scan'}</button>
          <button onClick={fetchNearbyPOIs} className={`rounded-xl py-2 text-xs font-bold ${ghostButton}`}>Rank POIs</button>
        </div>
        <div className={`p-4 rounded-2xl border ${isLight ? 'bg-white/88 border-slate-200 shadow-[0_12px_30px_rgba(148,163,184,0.16)]' : 'bg-white/5 border-white/10'}`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className={`text-[11px] font-black uppercase tracking-[0.24em] flex items-center ${isLight ? 'text-slate-800' : 'text-white'}`}>
                <Sparkles className="w-3.5 h-3.5 mr-2 text-neonOrange" /> Local Area Intel
              </h3>
              <p className={`text-xs mt-1 ${mutedText}`}>Shops, rider essentials, scenic nature spots, and an Ollama summary for the current area.</p>
            </div>
            <button onClick={fetchLocalAreaIntel} disabled={isAreaLoading} className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${isAreaLoading ? ghostButton : primaryButton}`}>{isAreaLoading ? 'Scanning...' : 'Refresh'}</button>
          </div>
          {localAreaIntel ? (
            <div className="space-y-3">
              <div className={`rounded-2xl p-3 border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/10'}`}>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{localAreaIntel.location_name}</div>
                    <div className={`text-[10px] uppercase tracking-[0.24em] ${mutedText}`}>{localAreaIntel.summary_source === 'ollama' ? 'Ollama local summary' : 'Heuristic fallback summary'}</div>
                  </div>
                  <div className={`text-right text-[10px] font-bold ${mutedText}`}>
                    <div>Convenience {localAreaIntel.vibe_scores?.convenience || 0}</div>
                    <div>Scenic {localAreaIntel.vibe_scores?.scenic || 0}</div>
                  </div>
                </div>
                <p className={`text-xs leading-5 ${subtleText}`}>{localAreaIntel.summary}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Store className="w-3.5 h-3.5" />, label: 'Shops', value: localAreaIntel.counts?.shops || 0, tone: isLight ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-orange-500/10 border-orange-500/20 text-orange-300' },
                  { icon: <Coffee className="w-3.5 h-3.5" />, label: 'Food', value: localAreaIntel.counts?.food || 0, tone: isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-500/10 border-amber-500/20 text-amber-300' },
                  { icon: <Trees className="w-3.5 h-3.5" />, label: 'Nature', value: (localAreaIntel.counts?.parks || 0) + (localAreaIntel.counts?.nature || 0) + (localAreaIntel.counts?.viewpoints || 0), tone: isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
                  { icon: <ShieldPlus className="w-3.5 h-3.5" />, label: 'Services', value: localAreaIntel.counts?.services || 0, tone: isLight ? 'bg-sky-50 border-sky-200 text-sky-700' : 'bg-sky-500/10 border-sky-500/20 text-sky-300' }
                ].map((item) => (
                  <div key={item.label} className={`rounded-2xl border px-3 py-2 ${item.tone}`}>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">{item.icon}{item.label}</span>
                      <span className="text-lg font-black">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              {localAreaIntel.highlights?.length > 0 && (
                <div className="space-y-2">
                  {localAreaIntel.highlights.map((highlight, idx) => (
                    <div key={idx} className={`rounded-xl px-3 py-2 text-[11px] font-semibold border ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}>{highlight}</div>
                  ))}
                </div>
              )}
              <div className={`rounded-2xl border p-3 ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'}`}>
                <div className={`text-[11px] font-black uppercase tracking-[0.22em] mb-3 flex items-center ${isLight ? 'text-slate-700' : 'text-gray-200'}`}>
                  <Search className="w-3.5 h-3.5 mr-2" /> Search Stops Near Me
                </div>
                <div className="flex gap-2 mb-3">
                  <input value={stopSearchQuery} onChange={(e) => setStopSearchQuery(e.target.value)} placeholder="Search cafe, fuel, repair, shop..." className={`flex-1 rounded-lg p-2 text-sm outline-none transition-colors ${isLight ? 'bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-sky-500' : 'bg-transparent border border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-300'}`}/>
                  <button onClick={searchNearbyStops} className={`rounded-lg px-3 text-xs font-bold ${isSearchingStops ? ghostButton : primaryButton}`}>{isSearchingStops ? '...' : 'Find'}</button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {stopSearchResults.length > 0 ? stopSearchResults.map((item, idx) => (
                    <div key={`stop-search-${idx}`} className={`rounded-xl border px-3 py-2 text-[11px] ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-gray-200'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold truncate">{item.name}</span>
                        <span className={mutedText}>{item.distance_km} km</span>
                      </div>
                      <div className={`flex items-center justify-between gap-2 mt-1 ${mutedText}`}>
                        <span>{item.category} / {item.type}</span>
                        <span>{item.phone || 'No phone listed'}</span>
                      </div>
                    </div>
                  )) : (
                    <div className={`text-[11px] ${mutedText}`}>Run a local stop search to find fuel pumps, food, shops, or service points with any mapped phone numbers.</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className={`rounded-2xl border border-dashed p-4 text-xs ${isLight ? 'border-slate-300 bg-slate-50 text-slate-600' : 'border-white/10 bg-black/10 text-gray-400'}`}>
              Run an area scan to fetch shops, essentials, scenic nature markers, and an Ollama-generated local summary around your location.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${bgC} ${textC} flex flex-col overflow-x-hidden transition-colors duration-500`}>
      <header className={`${panelBg} border-b p-4 shrink-0 flex flex-col gap-4 xl:flex-row xl:justify-between xl:items-center backdrop-blur-md relative z-[1200]`}>
        <div className="flex flex-wrap items-center gap-2 md:gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLight ? 'bg-slate-900 shadow-[0_12px_24px_rgba(15,23,42,0.18)]' : 'bg-gradient-to-tr from-neonBlue to-neonOrange shadow-[0_0_15px_rgba(0,243,255,0.4)]'}`}>
             <Navigation className={`w-6 h-6 ${isLight ? 'text-cyan-300' : 'text-white'}`} />
          </div>
          <div className="flex flex-col min-w-0 mr-0 md:mr-4">
            <h1 className={`text-xl md:text-2xl font-black font-mono leading-none tracking-tight whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className={`${isLight ? 'text-slate-900' : 'text-white'}`}>RIDER</span>
              <span className="text-neonOrange">INTEL</span>
            </h1>
            <span className={`text-[10px] uppercase tracking-[0.28em] mt-1 ${mutedText}`}>Smart Ride Console</span>
          </div>
          <button onClick={locateMe} className={`flex items-center rounded-full px-3 py-2 transition-colors ${navButton}`}>
            <MapPin className="w-5 h-5 mr-1" /> Locate
          </button>
          <button onClick={() => setTheme(isLight ? 'dark' : 'light')} className={`rounded-full p-2 transition-colors ${navButton}`}>
            {isLight ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5"/>}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 md:gap-4 xl:justify-end">
          <div className="flex flex-col items-start xl:items-end mr-0 xl:mr-2">
             <span className="text-[10px] font-bold opacity-50 uppercase tracking-widest">Active Rider</span>
             <span className={`text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{localStorage.getItem('username') || 'Tester'}</span>
          </div>
          <button onClick={() => setShowRideRankPanel(true)} className={`flex items-center rounded-full px-3 py-2 font-semibold transition-colors ${navButton}`}>
            <Trophy className="w-4 h-4 mr-2" /> Ride Rank
          </button>
          <button onClick={() => setShowSOS(true)} className="flex items-center text-red-500 font-bold bg-red-500/10 px-3 py-1 rounded-full hover:bg-red-500/20 animate-pulse">
            <PhoneCall className="w-4 h-4 mr-2" /> SOS
          </button>
          {weather && weather.main && weather.weather && weather.weather.length > 0 && (
            <div className={`flex items-center ${subtleText}`}>
              <span className="text-neonOrange mr-2 font-bold">{weather.main.temp}°C</span>
              <span className="text-sm">{weather.weather[0].main}</span>
            </div>
          )}
          <button onClick={() => navigate('/history')} className={`rounded-full px-3 py-2 font-semibold transition-colors ${navButton}`}>History</button>
          <button onClick={logout} className={`rounded-full px-3 py-2 transition-colors ${isLight ? 'text-slate-600 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-white/5'}`}>Logout</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-visible flex-col md:flex-row relative">
        
        {/* Left Side Panel */}
        <aside className={`w-full md:w-[380px] ${panelBg} border-r flex flex-col shrink-0 overflow-y-auto relative z-[1100]`}>
          
          {/* Settings / Preferences */}
          <div className={`p-5 border-b ${isLight ? 'border-slate-200/90' : 'border-gray-700/50'}`}>
            <div className="mb-4">
              <h3 className="text-sm font-bold opacity-80 flex items-center"><Settings className="w-4 h-4 mr-2"/> RIDE PREFERENCES</h3>
              <p className={`text-xs mt-1 ${mutedText}`}>Adjust riding behavior, route strategy, and fuel assumptions before you start.</p>
            </div>
            
            <div className="mb-4">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] mb-2 ${mutedText}`}>Ride Mode</div>
              <div className="grid grid-cols-3 gap-2">
              {['Eco', 'Normal', 'Sport'].map(m => (
                <button key={m} onClick={()=>setRideMode(m)} className={`py-2 rounded-xl text-xs font-bold transition-colors ${rideMode===m ? selectedModeButton : ghostButton}`}>{m}</button>
              ))}
              </div>
            </div>

            <div className="mb-4">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] mb-2 ${mutedText}`}>Route Strategy</div>
              <div className="grid grid-cols-3 gap-2">
              {['Fastest', 'Fuel Effic', 'Safe'].map(r => (
                <button key={r} onClick={()=>setRouteType(r.split(' ')[0])} className={`py-2 rounded-xl text-xs font-bold transition-colors ${routeType===r.split(' ')[0] ? selectedRouteButton : ghostButton}`}>{r}</button>
              ))}
              </div>
            </div>

            <div className="mb-4">
              <div className={`text-[11px] font-semibold uppercase tracking-[0.2em] mb-2 ${mutedText}`}>Ride Companion</div>
              <div className="grid grid-cols-2 gap-2">
                {['Solo', 'Group'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setRideCompanionMode(mode)}
                    className={`py-2 rounded-xl text-xs font-bold transition-colors ${rideCompanionMode===mode ? selectedModeButton : ghostButton}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-2xl p-3 border ${isLight ? 'border-slate-200 bg-white/70' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between gap-3">
                <label className={`text-xs font-bold flex items-center ${subtleText}`}>₹ Fuel Price / L</label>
                <input type="number" value={fuelPrice} onChange={e=>setFuelPrice(e.target.value)} className={`rounded-lg px-3 py-2 w-24 text-sm text-center outline-none border transition-colors ${isLight ? 'border-slate-300 bg-white text-slate-900 focus:border-sky-500' : 'border-gray-600 bg-black/20 text-white focus:border-neonBlue'}`}/>
              </div>
            </div>
          </div>

          <div className={`p-4 border-b ${isLight ? 'border-slate-200/90' : 'border-gray-700/50'}`}>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setUtilityTab('plan')} className={`rounded-xl py-2 text-xs font-bold ${tabButton('plan')}`}>Plan</button>
              <button onClick={() => setUtilityTab('group')} className={`rounded-xl py-2 text-xs font-bold ${tabButton('group')}`}>Group</button>
              <button onClick={() => setUtilityTab('intel')} className={`rounded-xl py-2 text-xs font-bold ${tabButton('intel')}`}>Intel</button>
            </div>
          </div>

          {/* Planned Stops */}
          <div className="p-5 flex-1 flex flex-col min-h-[200px]">
            {renderUtilityPanel()}
           </div>
          
          <div className={`p-5 border-t sticky bottom-0 ${isLight ? 'border-slate-200/90 bg-white/90' : 'border-gray-700/50 bg-slate-950/85'} backdrop-blur-xl`}>
            <div className={`mb-3 rounded-2xl border px-4 py-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${mutedText}`}>Ride Rank</div>
                  <div className={`text-2xl font-black ${rideRankTone}`}>{displayedRideScore}</div>
                </div>
                <button onClick={() => setShowRideRankPanel(true)} className={`rounded-full px-3 py-2 text-xs font-bold ${ghostButton}`}>
                  Check score
                </button>
              </div>
              <div className={`mt-2 text-xs ${mutedText}`}>{lastRideSummary ? 'Last ride summary is ready.' : `Live estimate: ${rideRankLabel}.`}</div>
            </div>
            <button 
              onClick={handleStartRide}
              className={`w-full py-3 rounded-xl font-black transition-transform active:scale-95 shadow-lg ${isSimulating ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]' : isLight ? 'bg-sky-600 text-white shadow-[0_12px_30px_rgba(2,132,199,0.32)] hover:bg-sky-700' : 'bg-neonBlue text-gray-900 shadow-[0_0_20px_rgba(0,243,255,0.4)]'}`}
            >
              {isSimulating ? 'END RIDE' : 'START RIDE'}
            </button>
          </div>
        </aside>

        {/* HUD over Map */}
        <div className="flex-1 relative z-0 flex flex-col min-h-[420px] p-3 md:p-4">
          
          {hudPopover && (
            <div className={`absolute ${isMobileViewport ? 'top-3 left-3 right-3 translate-x-0' : 'top-32 left-1/2 -translate-x-1/2'} z-[1100] px-6 py-3 bg-white text-gray-900 font-bold rounded-2xl shadow-2xl border-2 border-neonBlue flex items-center justify-center`}>
              <Navigation className="w-5 h-5 mr-3 text-neonBlue" /> {hudPopover}
            </div>
          )}

          <div className={`${isMobileViewport ? 'relative mb-3 grid grid-cols-2 gap-3' : 'absolute top-8 left-8 right-8 z-[1100] grid grid-cols-2 lg:grid-cols-4 gap-4 pointer-events-none'}`}>
             {[
               { icon: <Gauge/>, title: 'SPEED', val: `${(speed || 0).toFixed(0)}`, unit: 'km/h', color: getSpeedColor() },
               { icon: <MapPin/>, title: 'TRIP', val: `${(distance || 0).toFixed(1)}`, unit: 'km', color: metricValueColor },
               { icon: <DollarSign/>, title: 'COST', val: `₹${((fuelUsed || 0) * (fuelPrice || 0)).toFixed(0)}`, unit: '', color: metricValueColor },
               { icon: <Fuel/>, title: 'FUEL REM', val: `${remainingFuelValue || 0}`, unit: 'L', color: '#ff6b00' },
             ].map((m, i) => (
                <div key={i} className={`pointer-events-auto backdrop-blur-xl border rounded-xl p-3 shadow-2xl transition-all duration-300 ${metricCard}`}>
                  <p className={`text-[10px] font-bold opacity-70 flex items-center mb-1 ${mutedText}`}>{React.cloneElement(m.icon, {className:"w-3 h-3 mr-1"})} {m.title}</p>
                  <h3 className="text-2xl font-black" style={{color: m.color}}>{m.val} <span className="text-sm opacity-50">{m.unit}</span></h3>
                </div>
             ))}
          </div>

          <div className={`relative flex-1 overflow-hidden rounded-[28px] ${mapShell}`}>
            <MapContainer center={currentLocation} zoom={15} zoomControl={false} className="h-full w-full dashboard-map" style={{ minHeight: '400px' }}>
              <MapMover center={currentLocation} zoom={isSimulating ? 16 : 14} heading={heading} isSimulating={isSimulating} recenterTick={recenterTick} />
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
              {(activeGroup?.members || [])
                .filter((member) => Number(member.lat) !== 0 || Number(member.lon) !== 0)
                .map((member) => (
                  <Marker key={`member-${member.user_id}`} position={[Number(member.lat), Number(member.lon)]}>
                    <Popup>
                      <div className="text-xs font-bold">
                        <div>{member.display_name}</div>
                        <div>Fuel: {Number(member.fuel_remaining || 0).toFixed(1)} / {Number(member.fuel_capacity || 0).toFixed(1)} L</div>
                        <div>Speed: {Number(member.speed || 0).toFixed(0)} km/h</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              <Marker position={currentLocation} icon={createRiderIcon(heading, getSpeedColor())} zIndexOffset={1000} />
            </MapContainer>
            <button
              onClick={() => setRecenterTick((tick) => tick + 1)}
              className={`absolute bottom-4 right-4 z-[1150] rounded-full p-3 shadow-xl border ${isLight ? 'bg-white text-slate-900 border-slate-200 hover:bg-slate-50' : 'bg-slate-900/95 text-cyan-200 border-cyan-400/30 hover:bg-slate-800'}`}
              aria-label="Recenter map to my location"
            >
              <LocateFixed className="w-5 h-5" />
            </button>
          </div>
          
        </div>

      </main>

      <div className={`fixed z-[1300] flex flex-col gap-3 pointer-events-none ${isMobileViewport ? 'right-3 left-3 top-24' : 'right-5 top-24 w-[360px]'}`}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-[slide-in-right_0.28s_ease-out] ${
              alert.tone === 'danger'
                ? 'bg-red-500/90 border-red-300 text-white'
                : alert.tone === 'warning'
                  ? 'bg-amber-400/95 border-amber-200 text-slate-900'
                  : 'bg-slate-900/92 border-cyan-400/40 text-cyan-50'
            }`}
          >
            <div className="text-sm font-bold leading-5">{alert.msg}</div>
          </div>
        ))}
      </div>

      {showRideRankPanel && (
        <div className="fixed inset-0 z-[1320] bg-black/50 backdrop-blur-sm">
          <div className={`absolute right-0 top-0 h-full w-full max-w-md border-l p-6 shadow-2xl ${panelBg}`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${mutedText}`}>Ride Rank</div>
                <div className={`mt-2 text-5xl font-black ${rideRankTone}`}>{displayedRideScore}</div>
                <div className={`mt-2 text-sm ${mutedText}`}>{lastRideSummary ? 'Last completed ride' : 'Live score estimate while planning or riding'}</div>
              </div>
              <button onClick={() => setShowRideRankPanel(false)} className={`rounded-full p-2 ${ghostButton}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Mode', value: rideMode },
                { label: 'Alerts', value: alerts.length },
                { label: 'Status', value: rideRankLabel },
              ].map((item) => (
                <div key={item.label} className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-white/80' : 'border-white/10 bg-white/5'}`}>
                  <div className={`text-[10px] font-black uppercase tracking-[0.22em] ${mutedText}`}>{item.label}</div>
                  <div className={`mt-2 text-sm font-bold ${subtleText}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {lastRideSummary ? (
              <div className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white/80' : 'border-white/10 bg-black/20'}`}>
                <div className="mb-4 flex items-center gap-2 text-sm font-bold">
                  <Trophy className="w-4 h-4 text-neonOrange" /> Last ride snapshot
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className={mutedText}>Distance</div>
                    <div className="font-bold">{lastRideSummary.distance.toFixed(1)} km</div>
                  </div>
                  <div>
                    <div className={mutedText}>Avg speed</div>
                    <div className="font-bold">{lastRideSummary.average_speed.toFixed(1)} km/h</div>
                  </div>
                  <div>
                    <div className={mutedText}>Fuel used</div>
                    <div className="font-bold">{lastRideSummary.fuel_used.toFixed(2)} L</div>
                  </div>
                  <div>
                    <div className={mutedText}>Trip cost</div>
                    <div className="font-bold">₹{lastRideSummary.tripCost.toFixed(0)}</div>
                  </div>
                </div>
                <p className={`mt-4 text-sm leading-6 ${mutedText}`}>{lastRideSummary.aiInsight}</p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => navigate('/summary', { state: lastRideSummary })}
                    className={`rounded-2xl px-4 py-3 text-sm font-black ${primaryButton}`}
                  >
                    Open full report
                  </button>
                  <button
                    onClick={() => navigate('/history')}
                    className={`rounded-2xl px-4 py-3 text-sm font-black ${ghostButton}`}
                  >
                    Ride history
                  </button>
                </div>
              </div>
            ) : (
              <div className={`rounded-3xl border border-dashed p-5 text-sm leading-7 ${isLight ? 'border-slate-300 bg-slate-50 text-slate-700' : 'border-white/10 bg-black/20 text-gray-300'}`}>
                Finish a ride to keep the full report here. Until then this panel works like a quick rank card instead of forcing a full-screen summary.
              </div>
            )}
          </div>
        </div>
      )}

      {showBikeChooser && (
        <div className="fixed inset-0 z-[1310] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className={`${panelBg} w-full max-w-2xl rounded-[28px] border p-6 shadow-2xl`}>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <div className={`text-[11px] font-black uppercase tracking-[0.24em] ${mutedText}`}>Before ride start</div>
                <h2 className="mt-2 text-2xl font-black">Choose bike profile</h2>
                <p className={`mt-2 text-sm ${mutedText}`}>When you start from the map, use the saved bike or switch to a new one for this ride.</p>
              </div>
              <button onClick={() => setShowBikeChooser(false)} className={`rounded-full p-2 ${ghostButton}`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {!showBikeEditor && bike?.model_name && (
              <div className={`mb-5 rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white/80' : 'border-white/10 bg-black/20'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${isLight ? 'bg-slate-900 text-cyan-200' : 'bg-cyan-400/15 text-cyan-200'}`}>
                      <Bike className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-lg font-black">{bike.model_name}</div>
                      <div className={`text-xs ${mutedText}`}>Saved profile</div>
                    </div>
                  </div>
                  <button onClick={() => setShowBikeEditor(true)} className={`rounded-full px-3 py-2 text-xs font-bold ${ghostButton}`}>
                    <PencilLine className="mr-2 inline h-4 w-4" />
                    New profile
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>Engine: <span className="font-bold">{bike.engine_cc} cc</span></div>
                  <div className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>Weight: <span className="font-bold">{bike.weight} kg</span></div>
                  <div className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>Wheel: <span className="font-bold">{bike.wheel_diameter}"</span></div>
                  <div className={`rounded-2xl border p-3 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'}`}>Tank: <span className="font-bold">{bike.tank_capacity} L</span></div>
                </div>

                <button onClick={beginRideSimulation} className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black ${primaryButton}`}>
                  Start with saved profile
                </button>
              </div>
            )}

            {(showBikeEditor || !bike?.model_name) && (
              <div className={`rounded-3xl border p-5 ${isLight ? 'border-slate-200 bg-white/80' : 'border-white/10 bg-black/20'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-black">{bike?.model_name ? 'Create another bike profile' : 'Create your first bike profile'}</div>
                    <div className={`text-xs ${mutedText}`}>Save it here, then continue the ride.</div>
                  </div>
                  {bike?.model_name && (
                    <button onClick={() => setShowBikeEditor(false)} className={`rounded-full px-3 py-2 text-xs font-bold ${ghostButton}`}>
                      Use saved instead
                    </button>
                  )}
                </div>

                <BikeProfileForm
                  profile={bikeDraft}
                  onChange={setBikeDraft}
                  onSubmit={saveBikeProfile}
                  submitLabel="Save bike profile"
                  message={bikeFormMessage}
                  compact
                />
              </div>
            )}
          </div>
        </div>
      )}

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
              <button
                onClick={() => {
                  if (shareLink) {
                    shareOnWhatsApp();
                  } else {
                    const emergencyLink = `https://www.google.com/maps?q=${currentLocation[0]},${currentLocation[1]}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(`Emergency rider location: ${emergencyLink}`)}`, '_blank');
                  }
                  setShowSOS(false);
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-lg"
              >
                SHARE ON WHATSAPP
              </button>
              <button
                onClick={() => {
                  const emergencyLink = shareLink || `https://www.google.com/maps?q=${currentLocation[0]},${currentLocation[1]}`;
                  navigator.clipboard.writeText(emergencyLink).catch(console.error);
                  setShowSOS(false);
                }}
                className={`w-full py-3 font-bold rounded-lg transition-colors ${isLight ? 'bg-orange-100 hover:bg-orange-200 text-orange-700' : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-200'}`}
              >
                COPY LIVE LOCATION
              </button>
              <button onClick={()=>setShowSOS(false)} className={`w-full py-3 font-bold rounded-lg transition-colors ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-gray-700/50 hover:bg-gray-700 text-white'}`}>
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
