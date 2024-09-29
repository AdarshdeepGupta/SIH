import express from 'express'; // Import express for creating the server
import GtfsRealtimeBindings from 'gtfs-realtime-bindings'; // Import GTFS Realtime Bindings
import fetch from 'node-fetch'; // Import fetch for making API calls
import fs from 'fs'; // For reading stops file
import path from 'path'; // For path manipulation
import { fileURLToPath } from 'url'; // For converting file URLs to paths

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correctly reference the stops file using __dirname
const STOPS_FILE = path.join(__dirname, 'static_data/stops.txt'); // Path to your stops.txt

const app = express();
const PORT = 3000;

// Set the GTFS realtime source URL and API key
const GENERAL_API_URL = 'https://otd.delhi.gov.in/api/realtime/VehiclePositions.pb?key=6uwHpA2n3n0xI0ztWfxLE4WpOaSqTovX';

// Fetch GTFS real-time data
const fetchBusData = async () => {
    try {
        const response = await fetch(GENERAL_API_URL, {
            headers: {
                'x-api-key': '6uwHpA2n3n0xI0ztWfxLE4WpOaSqTovX', // Replace with your actual x-api-key
            },
        });

        if (!response.ok) {
            throw new Error(`${response.url}: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(new Uint8Array(buffer));
        
        const busPositions = feed.entity.map(entity => ({
            id: entity.vehicle?.vehicle?.id,
            latitude: entity.vehicle?.position?.latitude,
            longitude: entity.vehicle?.position?.longitude,
            timestamp: entity.vehicle?.timestamp
        })).filter(bus => bus.latitude && bus.longitude); // Filter out incomplete data

        return busPositions;
    } catch (error) {
        console.error('Error fetching GTFS data:', error.message);
        return [];
    }
};

// Fetch static stops data from stops.txt (if available)
const fetchStopsData = () => {
    return new Promise((resolve, reject) => {
        const stops = [];
        fs.createReadStream(STOPS_FILE)
            .on('data', (data) => {
                const rows = data.toString().split('\n');
                rows.forEach(row => {
                    const columns = row.split(',');
                    stops.push({
                        id: columns[0],
                        name: columns[2],
                        latitude: parseFloat(columns[4]),
                        longitude: parseFloat(columns[5]),
                    });
                });
            })
            .on('end', () => resolve(stops))
            .on('error', (err) => reject(err));
    });
};

// Endpoint to serve bus data
app.get('/api/buses', async (req, res) => {
    const busData = await fetchBusData();
    res.json(busData);
});

// Endpoint to serve stops data
app.get('/api/stops', async (req, res) => {
    try {
        const stopsData = await fetchStopsData();
        res.json(stopsData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load stops data' });
    }
});

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
