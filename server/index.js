require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');
const { Pool } = require('pg');
const { Worker } = require('worker_threads');
const path = require('path');
const { sendTelegramMessage } = require('./telegram');
const { setGlobalRouteData, getGlobalRouteData } = require('./globalRouteData'); // Import the functions

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../dist/trip-planner/browser')));

// const tableName = 'stores';
const tableName = 'dev_stores';
console.log('db table is set to:', tableName);

/*
// local testing config
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyCVMfV8HMmQHWcgZfF1ry3PCQXSxVtwOeg';
console.log('maps api key', googleMapsApiKey);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://sibi:leo@localhost:5432/maclocations',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
  });
  
  console.log('database', process.env.DATABASE_URL || 'postgres://sibi:leo@localhost:5432/maclocations');
  
*/
// Prod config
if (!process.env.GOOGLE_MAPS_API_KEY || !process.env.DATABASE_URL) {
  throw new Error('Critical environment variables are missing!');
}

const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
console.log('Google Maps API Key Loaded:', googleMapsApiKey ? 'Yes' : 'No');


const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://sibi:leo@localhost:5432/maclocations',
  ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false } // Disable SSL for local, enable for production
});

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

app.post('/calculate-distance', async (req, res) => {
  const originAddress = req.body.origin;
  const destinations = [];
  const storeInfo = [];

  try {
    const client = await pool.connect();
    const result = await client.query(`SELECT * FROM ${tableName}`);

    // Loop through each store in the database
    result.rows.forEach(row => {
      // Only include stores that have both latitude and longitude
      if (row.latitude && row.longitude) {
        destinations.push(row.location);
        storeInfo.push({
          name: row.store_name,
          location: row.location,
          phone: row.phone_number,
          notes: row.notes,
          latitude: row.latitude,
          longitude: row.longitude
        });
      }
    });

    client.release();

    // Geocode the origin address
    const originLocation = await geocodeAddress(originAddress); 
    const origins = [`${originLocation.lat},${originLocation.lng}`];

    const worker = new Worker(path.resolve(__dirname, './worker.js'), {
      workerData: {
        destinations,
        origins,
        batchSize: 25,
        googleMapsApiKey,
        storeInfo
      }
    });

    worker.on('message', (distances) => {
      const seen = new Set();
      const uniqueDistances = distances.filter((dest) => {
        if (seen.has(dest.address)) {
          return false;
        }
        seen.add(dest.address);
        return true;
      });
      const N = uniqueDistances.length; // Set N to the total number of unique locations
      const topNClosest = uniqueDistances.sort((a, b) => a.distance - b.distance).slice(0, N);

      const resultObj = {
        origin: originAddress,
        originCoordinates: {
          latitude: originLocation.lat,
          longitude: originLocation.lng
        },
        topNClosest: topNClosest.map(dest => ({
          storeName: dest.storeName,
          address: dest.address,
          phoneNumber: dest.phoneNumber,
          notes: dest.notes,
          distance: (dest.distance / 1609.34).toFixed(1) + ' miles', // Convert meters to miles and round to one decimal place
          duration: dest.duration > 60 ? `${Math.floor(dest.duration / 60)} hrs ${dest.duration % 60} mins` : `${dest.duration} mins`,
          latitude: dest.latitude,
          longitude: dest.longitude
        }))
      };

      res.json(resultObj);
    });

    worker.on('error', (error) => {
      console.error('Worker error:', error);
      res.status(500).json({ error: 'Failed to process distances' });
    });
  } catch (error) {
    console.error('Error Response:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: error.message });
  }
});

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
        setGlobalRouteData(routeData)
        res.json(routeData);
    });

    worker.on('error', (error) => {
        console.error('Worker error:', error);
        res.status(500).json({ error: 'Failed to generate route and metrics' });
    });
});

app.post('/recalculate-route', async (req, res) => {
  console.log('Received recalculate-route request:', req.body);

  const { origin, remainingLocations } = req.body;

  if (!origin || !remainingLocations) {
    return res.status(400).json({ error: 'Missing required fields: origin or remainingLocations' });
  }

  // Proceed with the worker thread logic
  const worker = new Worker(path.resolve(__dirname, './worker.js'), {
    workerData: {
      recalculateRoute: true,
      origin,
      selectedLocations: remainingLocations,
      googleMapsApiKey
    }
  });

  worker.on('message', (routeData) => {
    setGlobalRouteData(routeData);
    res.json(routeData); // Respond with the new route data
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
    res.status(500).json({ error: 'Failed to generate updated route and metrics' });
  });
});

app.post('/send-telegram-message', async (req, res) => {
  const globalRouteData = getGlobalRouteData(); // Get the global route data
  console.log('globalRouteData', globalRouteData);

  if (!globalRouteData) {
    return res.status(400).json({ error: 'No route data available to send' });
  }

  try {
    const response = await sendTelegramMessage(globalRouteData);
    res.json({ success: true, response });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    res.status(500).json({ error: 'Failed to send Telegram message' });
  }
});

app.get('/*', function(req, res) {
  res.sendFile(path.join(__dirname, '../dist/trip-planner/browser/index.html'));
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});