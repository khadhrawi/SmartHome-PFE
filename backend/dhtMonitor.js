/**
 * dhtMonitor.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Listens on MQTT topic  sensors/{houseCode}/dht
 * Payload expected:  { temperature: <°C>, humidity: <%> }
 *
 * On every reading:
 *   1. Persists temperature + humidity to HouseState
 *   2. Broadcasts socket event 'house:dht-update' to all house clients
 */

const { aedes }        = require('./broker');
const HouseState       = require('./models/HouseState');
const { emitDhtUpdated } = require('./realtime/notifications');

const DHT_TOPIC_PREFIX = 'sensors/';
const DHT_TOPIC_SUFFIX = '/dht';

async function handleDhtReading(houseCode, temperature, humidity) {
  try {
    let state = await HouseState.findOne({ houseCode });
    if (!state) state = await HouseState.create({ houseCode });

    state.temperature = temperature;
    state.humidity    = humidity;
    state.lastDhtRead = new Date();
    await state.save();

    emitDhtUpdated({ houseCode, temperature, humidity });
  } catch (err) {
    console.error('[DHT] handleDhtReading error:', err.message);
  }
}

function init() {
  aedes.on('publish', async (packet, client) => {
    if (!client) return;
    const topic = String(packet.topic || '');

    if (!topic.startsWith(DHT_TOPIC_PREFIX) || !topic.endsWith(DHT_TOPIC_SUFFIX)) return;

    const parts = topic.split('/');
    if (parts.length < 3) return;
    const houseCode = parts[1].toUpperCase();

    let temperature = null;
    let humidity    = null;
    try {
      const parsed = JSON.parse(packet.payload.toString());
      temperature  = Number(parsed?.temperature ?? parsed?.temp ?? null);
      humidity     = Number(parsed?.humidity    ?? parsed?.hum  ?? null);
    } catch {
      return;
    }

    if (!Number.isFinite(temperature) || !Number.isFinite(humidity)) return;
    await handleDhtReading(houseCode, temperature, humidity);
  });

  console.log('[DHT] 🌡️  DHT monitor active — listening on sensors/<houseCode>/dht');
}

module.exports = { init };
