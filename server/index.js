require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');
const { Pool } = require('pg');
const { Worker } = require('worker_threads');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../dist/trip-planner/browser')));

app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, '../dist/trip-planner/browser/index.html'));
});

// Local testing config
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCVMfV8HMmQHWcgZfF1ry3PCQXSxVtwOeg';
console.log('maps api key', googleMapsApiKey);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://sibi:leo@localhost:5432/maclocations',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

console.log('database', process.env.DATABASE_URL || 'postgres://sibi:leo@localhost:5432/maclocations');

const geocodeCache = new NodeCache({ stdTTL: 2592000, checkperiod: 3600 }); // Cache for 30 days

const geocodeAddress = async (address) => {
  try {
    const cachedLocation = geocodeCache.get(address);
    if (cachedLocation) {
      return cachedLocation;
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: googleMapsApiKey
      }
    });
    console.log('geocode response', response.data);
    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      geocodeCache.set(address, location);
      return location;
    } else {
      throw new Error(`Geocoding failed for address: ${address}`);
    }
  } catch (error) {
    console.error(`Geocoding error for address "${address}":`, error);
    return null;
  }
};

app.post('/generate-route-and-metrics', async (req, res) => {
    const { origin, locations: selectedLocations } = req.body;
    const worker = new Worker(path.resolve(__dirname, './worker.js'), {
        workerData: {
            generateRoute: true, // Flag for using OpenAI
            origin,
            selectedLocations,
            googleMapsApiKey
        }
    });

    worker.on('message', (routeData) => {
        res.json(routeData);
    });

    worker.on('error', (error) => {
        console.error('Worker error:', error);
        res.status(500).json({ error: 'Failed to generate route and metrics' });
    });
});

app.post('/recalculate-route', async (req, res) => {
    const { origin, remainingLocations } = req.body;
    const worker = new Worker(path.resolve(__dirname, './worker.js'), {
        workerData: {
            recalculateRoute: true, // New flag for recalculating without OpenAI
            origin,
            selectedLocations: remainingLocations, // Remaining locations after deletion
            googleMapsApiKey
        }
    });

    worker.on('message', (routeData) => {
        res.json(routeData);
    });

    worker.on('error', (error) => {
        console.error('Worker error:', error);
        res.status(500).json({ error: 'Failed to generate updated route and metrics' });
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});