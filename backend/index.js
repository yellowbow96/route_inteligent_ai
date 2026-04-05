import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import jwt from 'jsonwebtoken';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

app.use(cors());
app.use(express.json());

// Initialize SQLite database
let db;
async function initDb() {
  db = await open({
    filename: './rider_intelligence.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bike_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      model TEXT,
      engine_cc INTEGER,
      weight INTEGER,
      wheel_diameter INTEGER,
      tank_capacity INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      date TEXT,
      distance REAL,
      duration INTEGER,
      average_speed REAL,
      fuel_used REAL,
      rider_score INTEGER,
      route_data TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );
  `);
  console.log('Connected to SQLite database.');
}

initDb();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    const token = jwt.sign({ id: result.lastID, username }, JWT_SECRET);
    res.json({ token, userId: result.lastID });
  } catch (error) {
    res.status(400).json({ error: 'Username may already exist' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  
  if (user) {
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, userId: user.id });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/bike', authenticateToken, async (req, res) => {
  const profile = await db.get('SELECT * FROM bike_profiles WHERE user_id = ?', [req.user.id]);
  res.json(profile || null);
});

app.post('/api/bike', authenticateToken, async (req, res) => {
  const { model, engine_cc, weight, wheel_diameter, tank_capacity } = req.body;
  
  const existing = await db.get('SELECT * FROM bike_profiles WHERE user_id = ?', [req.user.id]);
  if (existing) {
    await db.run(
      'UPDATE bike_profiles SET model = ?, engine_cc = ?, weight = ?, wheel_diameter = ?, tank_capacity = ? WHERE user_id = ?',
      [model, engine_cc, weight, wheel_diameter, tank_capacity, req.user.id]
    );
  } else {
    await db.run(
      'INSERT INTO bike_profiles (user_id, model, engine_cc, weight, wheel_diameter, tank_capacity) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, model, engine_cc, weight, wheel_diameter, tank_capacity]
    );
  }
  res.json({ success: true });
});

app.post('/api/rides', authenticateToken, async (req, res) => {
  const { date, distance, duration, average_speed, fuel_used, rider_score, route_data } = req.body;
  const result = await db.run(
    'INSERT INTO rides (user_id, date, distance, duration, average_speed, fuel_used, rider_score, route_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, date, distance, duration, average_speed, fuel_used, rider_score, JSON.stringify(route_data)]
  );
  res.json({ id: result.lastID });
});

app.get('/api/rides', authenticateToken, async (req, res) => {
  const rides = await db.all('SELECT * FROM rides WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  res.json(rides);
});

app.get('/api/proxy/weather', async (req, res) => {
  const { lat, lon } = req.query;
  try {
    const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.OPENWEATHER_API_KEY}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather data' });
  }
});

app.post('/api/proxy/route', async (req, res) => {
  const { coordinates } = req.body;
  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      { coordinates },
      {
        headers: {
          'Authorization': process.env.OPENROUTESERVICE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch route data' });
  }
});

app.get('/api/proxy/geocode', async (req, res) => {
  const { query } = req.query;
  try {
    const response = await axios.get(`https://api.openrouteservice.org/geocode/search?api_key=${process.env.OPENROUTESERVICE_API_KEY}&text=${encodeURIComponent(query)}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to geocode location' });
  }
});

app.post('/api/proxy/pois', async (req, res) => {
  const { geometry, limit, categories } = req.body;
  // Fallback Overpass API logic since OpenRouteService POIs API might be disabled or have different limits
  // ORS POIs uses category arrays
  try {
    const response = await axios.post(
      'https://api.openrouteservice.org/pois',
      { request: 'pois', geometry, limit: limit || 10 },
      {
        headers: {
          'Authorization': process.env.OPENROUTESERVICE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('POI Fetch failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch POIs' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
