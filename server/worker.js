const { workerData, parentPort } = require('worker_threads');
const axios = require('axios');
const NodeCache = require('node-cache');
const { generateRoute } = require('./openai');  // Keep OpenAI for the initial route generation
const QRCode = require('qrcode');
const geocodeCache = new NodeCache({ stdTTL: 2592000, checkperiod: 3600 }); // Cache for 30 days

// Function to geocode an address
const geocodeAddress = async (address, googleMapsApiKey) => {
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

    if (response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        geocodeCache.set(address, location);
        return location;
    } else {
        throw new Error(`Geocoding failed for address: ${address}`);
    }
};
/*
// Function to construct Google Maps URL for the generated route
const constructGoogleMapsUrl = (origin, waypoints) => {
    const waypointsString = waypoints.join('|');
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&waypoints=${encodeURIComponent(waypointsString)}&destination=${encodeURIComponent(origin)}`;
};
*/
const constructGoogleMapsUrls = (origin, waypoints) => {
    const maxWaypointsPerUrl = 9; // Google Maps allows a maximum of 9 waypoints per URL
    const urls = [];
    let currentOrigin = origin;

    for (let i = 0; i < waypoints.length; i += maxWaypointsPerUrl) {
        const batchWaypoints = waypoints.slice(i, i + maxWaypointsPerUrl);
        let url;

        if (i === 0) {
            if (waypoints.length <= maxWaypointsPerUrl) {
                // Only one segment: origin is the start and end point
                const waypointsString = waypoints.join('|');
                url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&waypoints=${encodeURIComponent(waypointsString)}&destination=${encodeURIComponent(origin)}`;
            } else {
                // First segment of multiple: origin is the start, last waypoint is the end
                const waypointsString = batchWaypoints.slice(0, -1).join('|');
                const destination = batchWaypoints[batchWaypoints.length - 1];
                url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&waypoints=${encodeURIComponent(waypointsString)}&destination=${encodeURIComponent(destination)}`;
                currentOrigin = destination; // Update currentOrigin to the last waypoint of this segment
            }
        } else if (i + maxWaypointsPerUrl >= waypoints.length) {
            // Last segment: last waypoint is the destination, origin is the starting point
            const waypointsString = batchWaypoints.join('|');
            url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(currentOrigin)}&waypoints=${encodeURIComponent(waypointsString)}&destination=${encodeURIComponent(origin)}`;
        } else {
            // Intermediate segments: use currentOrigin and last waypoint as destination
            const waypointsString = batchWaypoints.slice(1, -1).join('|');
            const destination = batchWaypoints[batchWaypoints.length - 1];
            url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(currentOrigin)}&waypoints=${encodeURIComponent(waypointsString)}&destination=${encodeURIComponent(destination)}`;
            currentOrigin = destination; // Update currentOrigin to the last waypoint of this segment
        }

        urls.push(url);
    }

    return urls;
};
// Function to get duration using the Distance Matrix API
const getDurations = async (origin, destinations, googleMapsApiKey) => {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
            origins: origin,
            destinations: destinations.join('|'),
            key: googleMapsApiKey,
            mode: 'driving'
        }
    });

    if (response.data.rows.length === 0 || response.data.rows[0].elements.length === 0) {
        throw new Error('Failed to retrieve data from the Distance Matrix API');
    }

    const elements = response.data.rows[0].elements;
    const totalDuration = elements.reduce((total, element) => total + (element.duration?.value || 0), 0);
    const durations = elements.map((element) => element.duration?.text || 'Unknown');

    return {
        totalDuration: totalDuration > 3600
            ? `${Math.floor(totalDuration / 3600)} hrs ${Math.floor((totalDuration % 3600) / 60)} mins`
            : `${Math.floor(totalDuration / 60)} mins`,
        durations
    };
};

// Function to get distances using the Distance Matrix API
const getDistanceMatrix = async (origins, destinations, googleMapsApiKey) => {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
        params: {
            origins: origins.join('|'),
            destinations: destinations.join('|'),
            key: googleMapsApiKey,
            mode: 'driving'
        }
    });

    if (response.data.rows.length === 0 || response.data.rows[0].elements.length === 0) {
        throw new Error('Failed to retrieve data from the Distance Matrix API');
    }

    return response.data;
};

// Function to process destinations and calculate distances
const processDestinations = async ({ destinations, origins, batchSize, googleMapsApiKey, storeInfo }) => {
    let allDistances = [];

    const batchPromises = [];
    for (let i = 0; i < destinations.length; i += batchSize) {
        const batchDestinations = destinations.slice(i, i + batchSize);
        batchPromises.push(
            getDistanceMatrix(origins, batchDestinations, googleMapsApiKey).then(distanceMatrix => {
                const distances = distanceMatrix.rows[0].elements.map((element, index) => ({
                    address: batchDestinations[index],
                    storeName: storeInfo[i + index].name,
                    phoneNumber: storeInfo[i + index].phone,
                    notes: storeInfo[i + index].notes,
                    distance: element.distance.value, // distance in meters
                    duration: Math.floor(element.duration.value / 60), // duration in minutes
                    latitude: storeInfo[i + index].latitude,  // Access latitude
                    longitude: storeInfo[i + index].longitude // Access longitude
                }));
                return distances;
            })
        );
    }

    const batchResults = await Promise.all(batchPromises);
    allDistances = batchResults.flat();

    return allDistances;
};

const generateRouteAndMetrics = async (origin, selectedLocations, googleMapsApiKey) => {
    try {
        const optimizedRoute = await generateRoute(origin, selectedLocations);
        const waypoints = optimizedRoute.route.slice(1, -1).map(step => step.address);

        const geocodePromises = [geocodeAddress(origin, googleMapsApiKey), ...waypoints.map(address => geocodeAddress(address, googleMapsApiKey))];
        const geocodeResults = await Promise.all(geocodePromises);

        // Ensure valid geocoding results
        const validGeocodeResults = geocodeResults.filter(result => result !== null);
        const validOrigin = validGeocodeResults.shift();
        const validWaypoints = validGeocodeResults.map(result => `${result.lat},${result.lng}`);

        if (!validOrigin) {
            throw new Error(`Failed to geocode origin address: ${origin}`);
        }

        // Get durations from Distance Matrix API
        const distanceMatrixData = await getDurations(`${validOrigin.lat},${validOrigin.lng}`, validWaypoints, googleMapsApiKey);

        const response = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', {
            origin: {
                location: {
                    latLng: {
                        latitude: validOrigin.lat,
                        longitude: validOrigin.lng
                    }
                }
            },
            destination: {
                location: {
                    latLng: {
                        latitude: validOrigin.lat,
                        longitude: validOrigin.lng
                    }
                }
            },
            travelMode: 'DRIVE',
            extraComputations: ['TRAFFIC_ON_POLYLINE'],
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            departureTime: { seconds: Math.floor((Date.now() + 5 * 60000) / 1000) }, // Adjusted for real-time traffic
            intermediates: validWaypoints.map(latLng => ({
                location: {
                    latLng: {
                        latitude: parseFloat(latLng.split(',')[0]),
                        longitude: parseFloat(latLng.split(',')[1])
                    }
                }
            }))
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsApiKey,
                'X-Goog-FieldMask': 'routes.legs.duration,routes.legs.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals'
            }
        });

        if (!response.data.routes || response.data.routes.length === 0) {
            throw new Error('Failed to retrieve directions from Google Maps API');
        }

        const routeData = response.data.routes[0];

        if (!routeData.legs || routeData.legs.length === 0) {
            throw new Error('No legs data available in the route');
        }

        const totalDistance = routeData.legs.reduce((total, leg) => total + (leg.distanceMeters || 0), 0);
        const polylineData = routeData.polyline.encodedPolyline;

        // Construct Google Maps URL
        const googleMapsUrls = constructGoogleMapsUrls(origin, waypoints);

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(googleMapsUrls);

        return {
            googleMapsUrls,
            qrCodeUrl, // Include the QR code URL in the response
            totalDistance: (totalDistance / 1609.34).toFixed(1) + ' miles',
            totalDuration: distanceMatrixData.totalDuration,
            polylineData: polylineData,
            travelAdvisory: routeData.travelAdvisory,
            waypointsForPins: validWaypoints,
            waypointsDurations: distanceMatrixData.durations
        };
    } catch (error) {
        console.error('Error generating route and metrics:', error);
        throw error;
    }
};

// Function to generate the route and metrics using only Google Maps API (For recalculation)
// Function to generate the route and metrics using only Google Maps API (For recalculation)
const generateRouteAndMetricsWithoutOpenAI = async (origin, selectedLocations, googleMapsApiKey) => {
    try {
        if (!origin || !selectedLocations || selectedLocations.length === 0) {
            throw new Error('Origin and selected locations must be provided.');
        }

        const waypoints = selectedLocations; // Use all selected locations as waypoints

        // Geocode origin and waypoints
        const geocodePromises = [geocodeAddress(origin, googleMapsApiKey), ...waypoints.map(address => geocodeAddress(address, googleMapsApiKey))];
        const geocodeResults = await Promise.all(geocodePromises);

        // Ensure valid geocoding results
        const validGeocodeResults = geocodeResults.filter(result => result !== null);
        const validOrigin = validGeocodeResults.shift();
        const validWaypoints = validGeocodeResults.map(result => `${result.lat},${result.lng}`);

        if (!validOrigin) {
            throw new Error(`Failed to geocode origin address: ${origin}`);
        }

        // Get durations from Distance Matrix API
        const distanceMatrixData = await getDurations(`${validOrigin.lat},${validOrigin.lng}`, validWaypoints, googleMapsApiKey);

        const response = await axios.post('https://routes.googleapis.com/directions/v2:computeRoutes', {
            origin: {
                location: {
                    latLng: {
                        latitude: validOrigin.lat,
                        longitude: validOrigin.lng
                    }
                }
            },
            destination: {
                location: {
                    latLng: {
                        latitude: validOrigin.lat,
                        longitude: validOrigin.lng
                    }
                }
            },
            travelMode: 'DRIVE',
            extraComputations: ['TRAFFIC_ON_POLYLINE'],
            routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
            departureTime: { seconds: Math.floor((Date.now() + 5 * 60000) / 1000) }, // Adjusted for real-time traffic
            intermediates: validWaypoints.map(latLng => ({
                location: {
                    latLng: {
                        latitude: parseFloat(latLng.split(',')[0]),
                        longitude: parseFloat(latLng.split(',')[1])
                    }
                }
            }))
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': googleMapsApiKey,
                'X-Goog-FieldMask': 'routes.legs.duration,routes.legs.distanceMeters,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals'
            }
        });

        if (!response.data.routes || response.data.routes.length === 0) {
            throw new Error('Failed to retrieve directions from Google Maps API');
        }

        const routeData = response.data.routes[0];

        if (!routeData.legs || routeData.legs.length === 0) {
            throw new Error('No legs data available in the route');
        }

        const totalDistance = routeData.legs.reduce((total, leg) => total + (leg.distanceMeters || 0), 0);
        const polylineData = routeData.polyline.encodedPolyline;

        // Construct Google Maps URL
        const googleMapsUrls = constructGoogleMapsUrls(origin, waypoints);

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(googleMapsUrls);

        return {
            googleMapsUrls,
            qrCodeUrl, // Include the QR code URL in the response
            totalDistance: (totalDistance / 1609.34).toFixed(1) + ' miles',
            totalDuration: distanceMatrixData.totalDuration,
            polylineData: polylineData,
            travelAdvisory: routeData.travelAdvisory,
            waypointsForPins: validWaypoints,
            waypointsDurations: distanceMatrixData.durations
        };
    } catch (error) {
        console.error('Error generating route and metrics:', error);
        throw error;
    }
};
// Main worker logic
(async () => {
    try {
        if (!workerData) {
            throw new Error("No workerData provided");
        }

        console.log('Worker data received:', workerData);

        if (workerData.generateRoute) {
            // If the task is to generate the route using OpenAI
            const routeData = await generateRouteAndMetrics(workerData.origin, workerData.selectedLocations, workerData.googleMapsApiKey);
            console.log('Generated route using OpenAI:', routeData);
            parentPort.postMessage(routeData);
        } else if (workerData.recalculateRoute) {
            // If the task is to recalculate the route without OpenAI
            const routeData = await generateRouteAndMetricsWithoutOpenAI(workerData.origin, workerData.selectedLocations, workerData.googleMapsApiKey);
            console.log('Recalculated route using Google Maps API:', routeData);
            parentPort.postMessage(routeData);
        } else {
            // Fallback to the processDestinations function
            const distances = await processDestinations(workerData);
            console.log('Calculated distances:', distances);
            parentPort.postMessage(distances);
        }
    } catch (error) {
        console.error('Worker error:', error);
        if (parentPort) {
            parentPort.postMessage({ error: error.message });
        } else {
            console.error('parentPort is not available');
        }
    }
})(); 