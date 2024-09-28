const express = require('express');
const axios = require('axios');
const gtfsRealtimeBindings = require('gtfs-realtime-bindings');

const app = express();
const PORT = 3000;

// Endpoint to serve real-time bus data
app.get('/api/realtime/VehiclePositions.pb?key=6uwHpA2n3n0xI0ztWfxLE4WpOaSqTovX', async (req, res) => {
    try {
        const response = await axios.get('DTC_REALTIME_URL', {
            responseType: 'arraybuffer'
        });
        const feed = gtfsRealtimeBindings.FeedMessage.decode(new Uint8Array(response.data));

        const buses = feed.entity.map(entity => ({
            id: entity.vehicle.vehicle.id,
            latitude: entity.vehicle.position.latitude,
            longitude: entity.vehicle.position.longitude
        }));

        res.json(buses);
    } catch (error) {
        console.error('Error fetching GTFS data:', error);
        res.status(500).send('Failed to fetch real-time bus data');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
