require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');

// MQTT Broker
const { aedes, mqttServer } = require('./broker');
const ws = require('ws');

// Import Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const scenarioRoutes = require('./routes/scenarios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Load API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/scenarios', scenarioRoutes);

// Create HTTP server for Express and WebSockets
const httpServer = http.createServer(app);

// Setup MQTT WebSockets over the HTTP server on a specific path /mqtt
const wss = new ws.Server({ server: httpServer, path: '/mqtt' });
const wsStream = require('websocket-stream');

wss.on('connection', function (conn, req) {
  const stream = wsStream(conn);
  aedes.handle(stream);
});

// Connect mapping MongoDB and Start Servers
const PORT = process.env.PORT || 5000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected successfully');

    // Start Express API Server + Websockets
    httpServer.listen(PORT, () => {
      console.log(`HTTP Server and MQTT over WS listening on port ${PORT}`);
    });

    // Start TCP MQTT Server
    mqttServer.listen(MQTT_PORT, () => {
      console.log(`Aedes MQTT TCP Server listening on port ${MQTT_PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
