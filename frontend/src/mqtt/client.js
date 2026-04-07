import mqtt from 'mqtt';

// Aedes broker WebSocket URL mounted on Express server
const BROKER_URL = 'ws://localhost:5000/mqtt';

let client = null;

export const connectMqtt = () => {
   if (client) return client;

   client = mqtt.connect(BROKER_URL, {
      clientId: `smarthome_web_${Math.random().toString(16).slice(3)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
   });

   client.on('connect', () => {
      console.log('Connected to MQTT via WebSocket');
      // Subscribing to all devices telemetry topics
      client.subscribe('devices/#', (err) => {
         if(!err){
            console.log("Subscribed to devices/#");
         }
      });
   });

   client.on('error', (err) => {
      console.error('MQTT Connection Error: ', err);
   });

   client.on('reconnect', () => {
      console.log('MQTT Reconnecting...');
   });

   return client;
};

export const getMqttClient = () => client;

export const publishCommand = (topic, payload) => {
   if(client && client.connected) {
      client.publish(topic, JSON.stringify(payload), { qos: 1 });
   } else {
      console.error("Cannot publish: MQTT client is not connected.");
   }
}
