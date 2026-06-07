# SmartHome ESP32 — Explained Like You're 5

This file walks through **every part** of `SmartHome_ESP32.ino` in plain language. No prior embedded knowledge assumed.

---

## 1. What is this thing?

The **ESP32** is a tiny computer (~3 cm long) with built-in **WiFi**. It costs ~$5. Think of it as a smart microcontroller that can:
- Read sensors (temperature, gas, etc.)
- Control stuff (LEDs, motors, buzzers)
- Talk to the internet over WiFi

In this project, the ESP32 is the **brain** sitting inside your model house. It listens to commands from the cloud dashboard and reports back what the sensors see.

```
   [Your Phone/PC Browser]
              ↓ (internet)
        [Vercel Frontend]
              ↓ (HTTP)
        [Render Backend]
              ↕ (MQTT)
       [HiveMQ Cloud Broker]
              ↕ (MQTT over WiFi)
              ↓
       [ESP32 in your house]
              ↓
   [LEDs, Servos, Sensors, Buzzer]
```

Every arrow above is just a message. The ESP32's job is to translate cloud messages into physical actions, and physical sensor readings into cloud messages.

---

## 2. The hardware (what's wired up)

| Component | What it does | Connected to |
|---|---|---|
| **3 RGB LEDs** | Lights that can be any color | GPIO pins (one for R, one for G, one for B per LED) |
| **2 servos** | Tiny motors that swing 0–180° | GPIO 18 (door), GPIO 19 (window) |
| **1 buzzer** | Beeper for the gas alarm | GPIO 15 |
| **MQ6 gas sensor** | Detects LPG/butane gas | GPIO 33 (analog input) |
| **DHT11 sensor** | Reads temperature + humidity | GPIO 23 |

Each piece is a **separate component you wire to the ESP32 with jumper wires**.

---

## 3. The libraries (other people's code we use)

At the top of the .ino file:

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <DHT.h>
```

| Library | Why we need it |
|---|---|
| `WiFi.h` | Connect to WiFi |
| `WiFiClientSecure.h` | Open **secure TLS** connections (needed for HiveMQ on port 8883) |
| `PubSubClient.h` | Speak the **MQTT protocol** (the messaging system smart-home devices use) |
| `ESP32Servo.h` | Control servo motors |
| `ArduinoJson.h` | Read/write JSON text (`{"state":"ON","brightness":75}`) |
| `DHT.h` | Read the DHT11 sensor |

Think of these like importing tools from a toolbox — without them you'd have to write thousands of lines yourself.

---

## 4. The configuration block (lines 36–63)

```cpp
#define WIFI_SSID        "H House"
#define WIFI_PASSWORD    "HHOUSE2025"

#define MQTT_SERVER      "b5f90de06c174bf39246d5b00a0de352.s1.eu.hivemq.cloud"
#define MQTT_PORT        8883
#define MQTT_USE_TLS     true
#define MQTT_USERNAME    "smarthome-esp32"
#define MQTT_PASSWORD    "SmartHome2026"

#define HOUSE_CODE       "I5402"
```

`#define` is just a constant. Wherever the compiler sees `WIFI_SSID`, it pastes in `"H House"`.

- **WIFI_SSID + WIFI_PASSWORD**: which network the ESP32 joins.
- **MQTT_SERVER**: the broker address (HiveMQ Cloud).
- **MQTT_PORT 8883**: the secure MQTTS port. Port 1883 is normal MQTT (no encryption).
- **MQTT_USE_TLS true**: use encrypted connection.
- **MQTT_USERNAME + MQTT_PASSWORD**: login for HiveMQ.
- **HOUSE_CODE**: identifies which house this ESP32 belongs to. The dashboard filters everything by house code.

### Topics

```cpp
#define TOPIC_LED1       "living-room-light"
#define TOPIC_LED2       "bedroom-light"
#define TOPIC_LED3       "kitchen-light"
#define TOPIC_DOOR       "main-door"
#define TOPIC_WINDOW     "bedroom-window"
```

An **MQTT topic** is like a chat channel name. The backend posts messages on topic `command/bedroom-light` and the ESP32 listens on that channel.

---

## 5. Pin mapping (lines 67–100)

```cpp
#define LED1_R  2
#define LED1_G  4
#define LED1_B  5
...
#define GAS_PIN          33
#define DHT_PIN          23
```

Each `#define` says **which physical pin on the ESP32 board is wired to what**. If you change the wiring, change this number.

ESP32 has ~30 usable pins (called **GPIO** — General Purpose Input/Output). Each has a number, e.g. GPIO 2 is one physical pin, GPIO 4 is another.

Important rules:
- **GPIO 34, 35, 36, 39**: input-only (can read, can't write)
- **GPIO 6–11**: reserved for flash — don't use
- All others: input + output

---

## 6. Global variables (lines 145–195)

```cpp
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);
Servo servoDoor;
Servo servoWindow;
DHT dht(DHT_PIN, DHT_TYPE);
```

These create the **objects** we'll use later:
- `wifiClient` = handles the TCP/TLS network connection
- `mqtt` = handles MQTT messages (uses `wifiClient` underneath)
- `servoDoor` / `servoWindow` = control servo motors
- `dht` = read the DHT11 sensor

```cpp
struct LightCmd { bool on; int brightness; int r, g, b; bool hasColor; String effect; };

struct LedState {
  bool on = false;
  int brightness = 0;
  int r = 0, g = 0, b = 0;
  String effect = "none";
} ledState[3];
```

A **struct** is like a box that holds related variables together. `LightCmd` represents one MQTT command we received. `ledState[3]` is an array of 3 boxes, one per LED, remembering what each LED is currently doing.

---

## 7. The RGB LED control (lines 175–195)

### `writeRGB()` — sends raw 0–255 values to the LED

```cpp
void writeRGB(int rPin, int gPin, int bPin, int r, int g, int b) {
  if (COMMON_ANODE) { r = 255-r; g = 255-g; b = 255-b; }
  ledcWrite(rPin, r);
  ledcWrite(gPin, g);
  ledcWrite(bPin, b);
}
```

LEDs come in two electrical types:
- **Common cathode**: HIGH voltage = bright
- **Common anode**: LOW voltage = bright (yours is this one — `COMMON_ANODE = true`)

So we **invert** the values for common anode LEDs.

`ledcWrite()` is ESP32's PWM function — it makes the pin pulse very fast to fake brightness. `255` = always on, `128` = half-bright, `0` = off.

### `setLed()` — combines color + on/off + brightness

```cpp
void setLed(int rPin, int gPin, int bPin,
            int colorR, int colorG, int colorB,
            bool on, int brightness = 100) {
  if (!on) { writeRGB(rPin, gPin, bPin, 0, 0, 0); return; }
  float scale = brightness / 100.0f;
  writeRGB(rPin, gPin, bPin,
           (int)(colorR * scale),
           (int)(colorG * scale),
           (int)(colorB * scale));
}
```

- If `on = false` → all zero (off)
- Otherwise: scale each color by brightness. E.g., `(255, 0, 0)` at 50% becomes `(128, 0, 0)`.

---

## 8. Parsing MQTT payloads (lines 215–290)

The backend sends messages like:
```json
{"state":"ON", "brightness":75, "color":"#ffc87a", "effect":"rainbow"}
```

We need to extract those values from the text.

### `parseHexColor()` — turns "#ff6b35" into r=255, g=107, b=53

```cpp
bool parseHexColor(const String& raw, int& r, int& g, int& b) {
  String s = raw;
  if (s.startsWith("#")) s = s.substring(1);
  if (s.length() != 6) return false;
  long v = strtol(s.c_str(), nullptr, 16);
  r = (v >> 16) & 0xFF;
  g = (v >>  8) & 0xFF;
  b =  v        & 0xFF;
  return true;
}
```

`strtol(..., 16)` parses a hex string into a number. Then we shift-and-mask to extract each byte:
- `>> 16` = move bits 16 positions right
- `& 0xFF` = keep only the lowest 8 bits

### `parseLightPayload()` — extracts the full JSON command

```cpp
bool parseLightPayload(const String& raw, LightCmd& out, ...) {
  if (s.charAt(0) == '{') {
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, s)) {
      if (doc.containsKey("brightness"))  out.brightness = doc["brightness"].as<int>();
      if (doc.containsKey("color"))       parseHexColor(doc["color"], out.r, out.g, out.b);
      if (doc.containsKey("effect"))      out.effect = doc["effect"].as<String>();
      ...
    }
  }
}
```

`StaticJsonDocument<256>` reserves 256 bytes to hold the parsed JSON. `deserializeJson` fills it in. Then we pull out each field.

If the payload isn't JSON (e.g., just `"ON"` or `"75"`), we fall back to the simpler `payloadIsOn()` function.

---

## 9. HSV → RGB conversion (lines 296–315)

```cpp
void hsvToRgb(int h, int s, int v, int& r, int& g, int& b) {
  ...
}
```

For the **rainbow effect**, instead of picking RGB directly we vary the **Hue** (color wheel angle 0–359°) and convert it back to RGB. This gives smooth color cycling: red → yellow → green → cyan → blue → magenta → red.

The math is just classic color theory — you don't need to understand the formula, just know that it converts a color wheel position into RGB.

---

## 10. Gas sensor reading (lines 234–245)

```cpp
float readGasPPM() {
  int raw = analogRead(GAS_PIN);
  if (raw <= 0) return 0.0f;
  if (raw >= 4090) return 10000.0f;
  float vrl   = raw * 3.3f / 4095.0f;
  float rs    = ((3.3f - vrl) / vrl) * MQ6_RL;
  float ratio = rs / MQ6_RO;
  float ppm   = 1000.0f * pow(ratio, -2.37f);
  ...
}
```

The MQ6 sensor outputs a voltage between 0V (no gas) and 3.3V (saturated). The ESP32 reads it as a number 0–4095.

Then we apply the MQ6 datasheet formula:
1. Convert raw ADC to voltage (`vrl`)
2. Compute the sensor's internal resistance (`rs`)
3. Compare to clean-air resistance (`MQ6_RO`)
4. Apply the power curve from the datasheet to get **parts per million** (ppm)

`raw >= 4090` means "saturated — gas levels too high to measure precisely, just return max."

`raw <= 0` means "nothing connected or zero reading — don't divide by zero."

---

## 11. Actuators (lines 247–265)

```cpp
void setDoor(bool open) {
  servoDoor.write(open ? DOOR_OPEN_DEG : DOOR_CLOSED_DEG);
}
void setWindow(bool open) {
  servoWindow.write(open ? WIN_OPEN_DEG : WIN_CLOSED_DEG);
}
void setBuzzer(bool on) {
  if (on) tone(BUZZER_PIN, 1000);
  else    noTone(BUZZER_PIN);
}
```

- `servo.write(angle)` rotates a servo to that angle (0–180°).
- `tone(pin, frequency)` makes a buzzer beep at that Hz. 1000 Hz = annoying high-pitched tone, perfect for an alarm.

---

## 12. The MQTT message handler `onMessage()` (lines 270–360)

This function fires **every time** a message arrives from HiveMQ.

```cpp
void onMessage(char* topic, byte* payload, unsigned int len) {
  // Convert raw bytes into a String
  String t(topic);
  String p;
  for (unsigned int i = 0; i < len; i++) p += (char)payload[i];

  // Is it an alarm command?
  if (t == topicAlarm) { setBuzzer(...); return; }

  // Is it a light command?
  if (idx >= 0) {
    parseLightPayload(p, cmd, ...);
    ledState[idx] = cmd;
    applyLedState(idx, 0);
    return;
  }

  // Or door/window?
  if (t == topicDoor)   setDoor(on);
  if (t == topicWindow) setWindow(on);
}
```

It checks the topic to decide what to do:
- Alarm topic → buzzer
- LED topics → save state + apply
- Door/window → move servo

---

## 13. Connecting to WiFi (lines 365–380)

```cpp
void connectWiFi() {
  WiFi.mode(WIFI_STA);                 // STA = "station" mode (a client, not an access point)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED && tries++ < 40) {
    delay(500); Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] ✅ IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    ESP.restart();   // give up and reboot
  }
}
```

Loops until we're connected, or restarts after 20 seconds of failure.

---

## 14. Connecting to MQTT (lines 386–415)

```cpp
void connectMQTT() {
  while (!mqtt.connected()) {
    String clientId = "esp32-" + WiFi.macAddress();
    bool ok = mqtt.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD);
    if (ok) {
      mqtt.subscribe(topicLed1);
      mqtt.subscribe(topicLed2);
      ...
    } else {
      Serial.printf("❌ rc=%d — retrying in 3s\n", mqtt.state());
      delay(3000);
    }
  }
}
```

The `mqtt.state()` codes:
| Code | Meaning |
|---|---|
| 0 | Connected |
| -2 | Network failure |
| 4 | Bad credentials |
| 5 | Not authorized |

After connecting we **subscribe** to the topics we care about — this tells the broker "send me messages on these channels."

---

## 15. `setup()` — runs once at boot (lines 480–550)

```cpp
void setup() {
  Serial.begin(115200);                  // start serial monitor at 115200 baud

  // Build full topic strings (e.g. "command/bedroom-light")
  snprintf(topicLed1, ..., "command/%s", TOPIC_LED1);

  // Initialize servos
  servoDoor.attach(SERVO_DOOR_PIN, 544, 2400);
  servoWindow.attach(SERVO_WIN_PIN, 544, 2400);

  // Initialize LED pins for PWM
  for (int pin : rgbPins) ledcAttach(pin, 1000, 8);

  // Boot beep
  pinMode(BUZZER_PIN, OUTPUT);
  tone(BUZZER_PIN, 1000); delay(300); noTone(BUZZER_PIN);

  // Sensors
  pinMode(GAS_PIN, INPUT);
  dht.begin();

  // Network
  connectWiFi();
#if MQTT_USE_TLS
  wifiClient.setInsecure();              // skip TLS cert check (OK for demo)
#endif
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMessage);           // tell PubSubClient to call onMessage() for every incoming message
  connectMQTT();
}
```

Setup is the **initialization phase** — runs once when the board powers on.

`wifiClient.setInsecure()` tells the ESP32 to skip checking HiveMQ's SSL certificate. In production you'd pin the real cert; for student work it's fine.

---

## 16. `loop()` — runs forever (lines 555–605)

```cpp
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected())             connectMQTT();
  mqtt.loop();                       // process any incoming messages

  unsigned long now = millis();

  // Animation tick — runs every 30ms for rainbow/pulse effects
  if (now - lastFxMs >= 30) {
    lastFxMs = now;
    fxPhase = (fxPhase + 3) % 360;
    for (int i = 0; i < 3; i++) {
      if (ledState[i].on && (ledState[i].effect == "rainbow" || ledState[i].effect == "pulse")) {
        applyLedState(i, fxPhase);
      }
    }
  }

  // Publish gas reading every 3 seconds
  if (now - lastGasMs >= GAS_INTERVAL) {
    float ppm = readGasPPM();
    mqtt.publish(topicGas, payload, false);
    // local buzzer if dangerously high
    if (raw > GAS_RAW_THRESHOLD) setBuzzer(true);
  }

  // Publish DHT every 10 seconds
  if (now - lastDhtMs >= DHT_INTERVAL) {
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    mqtt.publish(topicDHT, payload, false);
  }
}
```

The `loop()` function is the **forever loop** — it repeats infinitely. Three things happen here:

1. **Keep the network alive** — reconnect WiFi or MQTT if dropped
2. **Animate effects** — every 30 ms advance the rainbow/pulse phase
3. **Publish sensor data** — gas every 3s, DHT every 10s

`millis()` returns "milliseconds since boot". We use it for timing without freezing the CPU (instead of `delay()`).

---

## 17. The full life cycle (TL;DR)

1. **Power on** → `setup()` runs once:
   - Initialize hardware
   - Connect to WiFi
   - Connect to HiveMQ MQTT broker
   - Subscribe to command topics
2. **Forever after** → `loop()` runs repeatedly (~1000 times/sec):
   - Check if connections still alive (reconnect if not)
   - Process any incoming MQTT messages (handled in `onMessage` callback)
   - Tick the rainbow/pulse animation
   - Publish gas reading every 3 s
   - Publish DHT reading every 10 s

When you toggle a switch in the dashboard:
```
Dashboard → POST /api/floorplan/devices/X/state
       → Backend updates DB
       → Backend publishes to MQTT topic command/bedroom-light
       → HiveMQ delivers to ESP32 (which is subscribed)
       → onMessage() fires
       → parseLightPayload() decodes the JSON
       → applyLedState() updates the physical LED
```

Same in reverse for sensors:
```
MQ6 → ESP32 reads voltage → calculates ppm
   → mqtt.publish("sensors/I5402/gas", {"level": 320.5})
   → HiveMQ delivers to backend
   → gasMonitor.js processes
   → If > 400 ppm: declare emergency, push alarm command BACK to ESP32, broadcast to dashboard via Socket.IO
   → ESP32 buzzer fires, browser shows red overlay
```

---

## 18. Common questions

**Q: Why does my LED stay off after I toggle?**
A: Check Serial Monitor for `[LED1] ON br=100 ...`. If you see it, the message arrived. If the LED doesn't physically respond, check wiring/polarity (common anode vs cathode).

**Q: Why does the ESP32 keep restarting?**
A: Usually power. Servos especially cause voltage drops. Add a 100 µF capacitor between 5V and GND, or use an external power supply.

**Q: How do I add a new sensor?**
A: 1) Add a `#define NEW_SENSOR_PIN N` at the top. 2) Initialize in `setup()`. 3) Read it in `loop()` periodically. 4) Publish to a new topic like `sensors/I5402/light-level`. 5) Backend subscribes via wildcard `sensors/+/+` (already done).

**Q: How do I add a new actuator?**
A: 1) Add a `#define TOPIC_NEW "new-device"`. 2) Subscribe in `connectMQTT()`. 3) Handle in `onMessage()`. 4) Create a Device in the dashboard with the matching topic.

**Q: Why TLS / port 8883?**
A: HiveMQ Cloud only accepts encrypted connections. Port 1883 (plain MQTT) doesn't work there. Local development with aedes uses 1883 because it's faster and unencrypted is fine on your LAN.

**Q: What's a "topic"?**
A: A topic is just a string label like `command/bedroom-light`. MQTT brokers use them like chat channels — publish on a channel, every subscriber to that channel receives it. The `/` is just convention for hierarchy.

**Q: What's QoS?**
A: Quality of Service. QoS 1 = "at least once delivery" (default in our publishes). QoS 0 = fire and forget. QoS 2 = exactly once (rarely needed).

**Q: What's `retain: true`?**
A: When set, the broker keeps the last message and delivers it instantly to any new subscriber. So if the ESP32 reboots, it immediately receives the last LED state and restores it. We use it for commands; sensor readings don't need retention.

---

## 19. Glossary

| Word | Meaning |
|---|---|
| **GPIO** | General Purpose Input/Output — a physical pin |
| **PWM** | Pulse Width Modulation — fake analog by pulsing very fast |
| **ADC** | Analog-to-Digital Converter — reads voltage, returns 0–4095 |
| **MQTT** | The messaging protocol IoT devices use (think WhatsApp for sensors) |
| **Broker** | The MQTT server that routes messages between clients |
| **Topic** | A channel name in MQTT |
| **Publish** | Send a message on a topic |
| **Subscribe** | Listen for messages on a topic |
| **Payload** | The actual content of an MQTT message |
| **TLS / MQTTS** | Encrypted MQTT over port 8883 |
| **Servo** | Small motor that rotates to a specific angle |
| **DHT11** | Cheap temperature + humidity sensor |
| **MQ6** | Cheap gas sensor for LPG/butane |
| **HSV** | Hue, Saturation, Value — alternate color representation good for rainbows |
| **RGB** | Red, Green, Blue — the way LEDs mix colors |
| **Common anode** | LED type where all + pins are joined (so LOW = bright) |
| **Common cathode** | LED type where all − pins are joined (so HIGH = bright) |
| **Hard reset** | Restart the ESP32 (usually via the reset button or USB reconnect) |
| **Serial Monitor** | The Arduino IDE window that shows printf output from the ESP32 |
| **Baud rate** | Speed of serial communication. We use 115200 bits/sec |

---

## 20. Cheat sheet for changing things

| You want to... | Edit this |
|---|---|
| Change WiFi network | Lines 36–37 |
| Switch local ↔ cloud broker | Lines 49–54 |
| Add a new LED | Add `#define LED4_*`, `ledcAttach`, add to `onMessage` |
| Change scene colors | Edit `MODE_COLOR` in `backend/routes/floorplan.js` |
| Change gas alarm threshold | `GAS_THRESHOLD_DEFAULT` in `backend/gasMonitor.js` |
| Change publish frequency | `GAS_INTERVAL` (3000ms) or `DHT_INTERVAL` (10000ms) at lines 137–138 |
| Calibrate MQ6 | Adjust `MQ6_RO` after burn-in |
| Test without sensors | Comment out `analogRead(GAS_PIN)` and just publish a fake value |

That's the whole sketch in plain English. If anything is still confusing, ask about the specific line number and I'll explain that part more.
