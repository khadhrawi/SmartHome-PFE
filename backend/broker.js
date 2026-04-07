const aedes = require('aedes')();
const aedesServerFactory = require('aedes-server-factory');
const Device = require('./models/Device');
const User = require('./models/User'); // For future JWT based auth in MQTT
// Aedes needs an http server for websockets, we will pass it from server.js

// Setup basic authentication (optional, depending on project specs)
aedes.authenticate = function (client, username, password, callback) {
  // Simple token/password check
  console.log(`[MQTT Auth] Client trying to connect: ${client.id}`);
  callback(null, true);
};

// Client connected
aedes.on('client', function (client) {
  console.log(`[MQTT] Client Connected: ${client ? client.id : client} `);
});

// Client disconnected
aedes.on('clientDisconnect', async function (client) {
  console.log(`[MQTT] Client Disconnected: ${client ? client.id : client}`);
  
  // Here we could handle device offline status updating
  try {
     const device = await Device.findOne({ topic: { $regex: client.id, $options: 'i' } });
     if(device) {
       device.status = 'offline';
       await device.save();
     }
  } catch (err) {
    console.error('Error updating device status on disconnect', err);
  }
});

// Message published
aedes.on('publish', async function (packet, client) {
  if (client) {
    console.log(`[MQTT] Message from ${client.id} on topic ${packet.topic}: ${packet.payload.toString()}`);
    // Here we can capture telemetry or state updates
    if (packet.topic.startsWith('devices/')) {
       try {
          const topicParts = packet.topic.split('/');
          const topicStr = topicParts[topicParts.length-1];
          const payload = JSON.parse(packet.payload.toString());
          
          await Device.findOneAndUpdate(
             { topic: topicStr },
             { state: payload, status: 'online', lastSeen: Date.now() },
             { new: true }
          );
       } catch (err) {
          console.error("Error processing MQTT msg:", err.message);
       }
    }
  }
});

// Create TCP regular MQTT server
const mqttServer = aedesServerFactory.createServer(aedes);

module.exports = { aedes, mqttServer };
