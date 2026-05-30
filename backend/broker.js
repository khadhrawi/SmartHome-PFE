/**
 * broker.js — MQTT layer with two modes:
 *
 *  1. EMBEDDED  (default, local dev): runs an aedes broker on tcp:1883 + ws.
 *  2. CLIENT    (cloud): connects to an external broker (e.g. HiveMQ Cloud)
 *                        as a client and exposes the same publish/on('publish')
 *                        interface so the rest of the codebase doesn't change.
 *
 * Switch by setting `MQTT_BROKER_URL` in the environment:
 *   MQTT_BROKER_URL=mqtts://xxxxx.s1.eu.hivemq.cloud:8883
 *   MQTT_USERNAME=...
 *   MQTT_PASSWORD=...
 */

const EventEmitter = require('events');
const Device = require('./models/Device');

const useExternal = !!process.env.MQTT_BROKER_URL;

let aedes;
let mqttServer;

if (useExternal) {
  // ── CLIENT MODE ──────────────────────────────────────────────────────────
  const mqtt = require('mqtt');
  const adapter = new EventEmitter();

  const url = process.env.MQTT_BROKER_URL;
  const client = mqtt.connect(url, {
    username:           process.env.MQTT_USERNAME || undefined,
    password:           process.env.MQTT_PASSWORD || undefined,
    rejectUnauthorized: true,
    reconnectPeriod:    3000,
    clientId:           `smarthome-backend-${Math.random().toString(16).slice(2, 10)}`,
    clean:              true,
  });

  client.on('connect', () => {
    console.log(`[MQTT] ✅ Connected to external broker ${url}`);
    // Subscribe to everything the backend needs from devices
    client.subscribe(['sensors/+/+', 'devices/+/+'], { qos: 1 }, (err) => {
      if (err) console.error('[MQTT] subscribe error:', err.message);
      else      console.log('[MQTT] Subscribed to sensors/+/+ and devices/+/+');
    });
  });

  client.on('reconnect', () => console.log('[MQTT] reconnecting…'));
  client.on('close',     () => console.log('[MQTT] disconnected'));
  client.on('error',     (err) => console.error('[MQTT] error:', err.message));

  client.on('message', (topic, payload, packet) => {
    // Mirror aedes "publish" event shape so existing listeners keep working
    const fakeClient = { id: 'external' };
    const aedesPacket = {
      topic,
      payload,
      qos:    packet.qos,
      retain: packet.retain,
    };
    adapter.emit('publish', aedesPacket, fakeClient);

    // Reuse the original devices/* persistence logic
    if (topic.startsWith('devices/')) {
      (async () => {
        try {
          const parts = topic.split('/');
          const topicStr = parts[parts.length - 1];
          const parsed = JSON.parse(payload.toString());
          await Device.findOneAndUpdate(
            { topic: topicStr },
            { state: parsed, status: 'online', lastSeen: Date.now() },
            { new: true },
          );
        } catch (err) {
          console.error('[MQTT] devices persist error:', err.message);
        }
      })();
    }
  });

  // aedes-compatible publish(): accepts ({ topic, payload, qos, retain }, cb)
  adapter.publish = (packet, cb) => {
    const { topic, payload, qos = 0, retain = false } = packet || {};
    if (!topic) { if (cb) cb(new Error('no topic')); return; }
    const body = typeof payload === 'string' || Buffer.isBuffer(payload)
      ? payload
      : JSON.stringify(payload);
    client.publish(topic, body, { qos, retain }, cb || (() => {}));
  };

  // aedes-compatible authenticate placeholder (no-op in client mode)
  adapter.authenticate = (_c, _u, _p, callback) => callback(null, true);

  aedes      = adapter;
  mqttServer = { listen: (_port, cb) => { if (cb) cb(); } }; // no-op TCP server
} else {
  // ── EMBEDDED MODE ────────────────────────────────────────────────────────
  aedes = require('aedes')();
  const aedesServerFactory = require('aedes-server-factory');

  aedes.authenticate = function (client, username, password, callback) {
    console.log(`[MQTT Auth] Client trying to connect: ${client.id}`);
    callback(null, true);
  };

  aedes.on('client', (client) => {
    console.log(`[MQTT] Client Connected: ${client ? client.id : client}`);
  });

  aedes.on('clientDisconnect', async (client) => {
    console.log(`[MQTT] Client Disconnected: ${client ? client.id : client}`);
    try {
      const device = await Device.findOne({ topic: { $regex: client.id, $options: 'i' } });
      if (device) {
        device.status = 'offline';
        await device.save();
      }
    } catch (err) {
      console.error('Error updating device status on disconnect', err);
    }
  });

  aedes.on('publish', async (packet, client) => {
    if (!client) return;
    console.log(`[MQTT] Message from ${client.id} on topic ${packet.topic}: ${packet.payload.toString()}`);
    if (packet.topic.startsWith('devices/')) {
      try {
        const parts = packet.topic.split('/');
        const topicStr = parts[parts.length - 1];
        const parsed = JSON.parse(packet.payload.toString());
        await Device.findOneAndUpdate(
          { topic: topicStr },
          { state: parsed, status: 'online', lastSeen: Date.now() },
          { new: true },
        );
      } catch (err) {
        console.error('Error processing MQTT msg:', err.message);
      }
    }
  });

  mqttServer = aedesServerFactory.createServer(aedes);
}

module.exports = { aedes, mqttServer };
