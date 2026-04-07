const mqtt = require('mqtt');
const mongoose = require('mongoose');
require('dotenv').config();

const Device = require('./models/Device');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartHome';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Simulator connected to DB');
    const client = mqtt.connect('mqtt://localhost:1883');

    client.on('connect', async () => {
      console.log('Connected to Aedes Broker - Simulator OK');
      
      // Auto-provision basic devices
      const defaultUser = await User.findOne();
      const ownerId = defaultUser ? defaultUser._id : null;

      const seedDevices = ['living_room_lamp', 'kitchen_lamp'];
      for (const t of seedDevices) {
        await Device.findOneAndUpdate(
          { topic: t },
          { $setOnInsert: { name: t.replace(/_/g, ' '), type: 'lamp', owner: ownerId }, $set: { status: 'online', lastSeen: Date.now() } },
          { new: true, upsert: true }
        );
      }

      // Subscribe to commands
      client.subscribe('command/#');

      // Publish initial state
      seedDevices.forEach(t => {
        client.publish(`devices/${t}`, JSON.stringify({ status: 'OFF' }));
      });

      // Answer commands
      client.on('message', (topic, message) => {
        if (topic.startsWith('command/')) {
          const deviceTopic = topic.split('/')[1];
          const payload = JSON.parse(message.toString());
          console.log(`Simulator received command for ${deviceTopic}:`, payload);
          
          // Echo the new state back (simulating a physical device change)
          client.publish(`devices/${deviceTopic}`, JSON.stringify(payload));
        }
      });
      
      // Keep devices alive and occasionally flip randomly to demonstrate real-time UX
      setInterval(async () => {
         const allDevices = await Device.find({});
         if(allDevices.length > 0) {
           const randomDevice = allDevices[Math.floor(Math.random() * allDevices.length)];
           let currentStatus = randomDevice.state?.status === 'ON' ? 'ON' : 'OFF';
           if (Math.random() > 0.8) {
             currentStatus = currentStatus === 'ON' ? 'OFF' : 'ON';
             console.log(`Simulator randomly flipping ${randomDevice.topic} to ${currentStatus}`);
           }
           client.publish(`devices/${randomDevice.topic}`, JSON.stringify({ status: currentStatus }));
         }
      }, 4000);
    });
  })
  .catch(err => console.error(err));
