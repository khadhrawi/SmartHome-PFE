/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          SmartHome PFE — ESP32 IoT Node                     ║
 * ║  Hardware: ESP32D | 3 RGB LEDs | Buzzer | 2 Servos          ║
 * ║            MQ6 Gas Sensor | DHT11 Temp+Humidity             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * MQTT topics subscribed:
 *   command/<TOPIC_LEDx>                 → "ON" / "OFF" / brightness 0-100
 *   command/<TOPIC_DOOR>                 → "ON" (open) / "OFF" (close)
 *   command/<TOPIC_WINDOW>               → "ON" (open) / "OFF" (close)
 *   command/autogen/<HOUSE_CODE>/alarm   → {"alarm": true/false}
 *
 * MQTT topics published:
 *   sensors/<HOUSE_CODE>/gas            → {"level": <ppm>}
 *   sensors/<HOUSE_CODE>/dht           → {"temperature": <°C>, "humidity": <%>}
 *
 * Required libraries (Tools → Manage Libraries):
 *   PubSubClient          by Nick O'Leary
 *   ESP32Servo            by Kevin Harrington
 *   ArduinoJson           by Benoit Blanchon
 *   DHT sensor library    by Adafruit
 *   Adafruit Unified Sensor by Adafruit
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ════════════════════════════════════════════════════════════════
//  ⚙️  USER CONFIG
// ════════════════════════════════════════════════════════════════

#define WIFI_SSID        "H House"
#define WIFI_PASSWORD    "HHOUSE2025"

// ── MQTT broker (choose ONE block) ───────────────────────────────────────
// Local development (PC running aedes on LAN):
//   #define MQTT_SERVER      "192.168.100.54"
//   #define MQTT_PORT        1883
//   #define MQTT_USE_TLS     false
//   #define MQTT_USERNAME    ""
//   #define MQTT_PASSWORD    ""

// Cloud (HiveMQ Cloud Serverless — free tier, MQTTS):
#define MQTT_SERVER      "b5f90de06c174bf39246d5b00a0de352.s1.eu.hivemq.cloud"
#define MQTT_PORT        8883                            // MQTTS port
#define MQTT_USE_TLS     true
#define MQTT_USERNAME    "smarthome-esp32"
// ⚠ Set this LOCALLY before flashing. Don't commit your real password.
#define MQTT_PASSWORD    "REPLACE_WITH_YOUR_HIVEMQ_PASSWORD"

#define HOUSE_CODE       "I5402"

// Device topics — must EXACTLY match what you create in the SmartHome dashboard
#define TOPIC_LED1       "living-room-light"
#define TOPIC_LED2       "bedroom-light"
#define TOPIC_LED3       "kitchen-light"
#define TOPIC_DOOR       "main-door"
#define TOPIC_WINDOW     "bedroom-window"

// ════════════════════════════════════════════════════════════════
//  📌 PIN MAPPING
// ════════════════════════════════════════════════════════════════
//
//  Component         GPIO    Notes
//  ──────────────────────────────────────────────────────────────
//  RGB LED1 R         2      Living Room — 220Ω each leg to GND
//  RGB LED1 G         4
//  RGB LED1 B         5
//  RGB LED2 R        16      Bedroom
//  RGB LED2 G        17
//  RGB LED2 B        21
//  RGB LED3 R        25      Kitchen
//  RGB LED3 G        26
//  RGB LED3 B        27
//  Buzzer            15      Active buzzer + to GPIO, - to GND
//  Servo Door        18      Signal pin (power: VIN=5V)
//  Servo Window      19      Signal pin (power: VIN=5V)
//  MQ6 AOUT          33      ADC1 only — 5V power from VIN
//  DHT11 DATA        23      10kΩ pull-up to 3.3V
//  ──────────────────────────────────────────────────────────────
//
//  RGB LED wiring (common cathode):
//    R pin → 220Ω → GPIO_R
//    G pin → 220Ω → GPIO_G
//    B pin → 220Ω → GPIO_B
//    GND pin → GND
//
//  If your RGB LED is COMMON ANODE set COMMON_ANODE to true below

#define COMMON_ANODE     true    // true = common anode, false = common cathode

// RGB LED 1 — Living Room
#define LED1_R  2
#define LED1_G  4
#define LED1_B  5

// RGB LED 2 — Bedroom
#define LED2_R  21
#define LED2_G  22
#define LED2_B  32

// RGB LED 3 — Kitchen
#define LED3_R  25
#define LED3_G  26
#define LED3_B  27

#define BUZZER_PIN       15
#define SERVO_DOOR_PIN   18
#define SERVO_WIN_PIN    19
#define GAS_PIN          33
#define DHT_PIN          23
#define DHT_TYPE         DHT11

// ════════════════════════════════════════════════════════════════
//  🎨 DEFAULT COLORS  (R, G, B  0-255)
//  Change these to set what color each room light uses
// ════════════════════════════════════════════════════════════════

#define COLOR_LIVING_R  255
#define COLOR_LIVING_G  0
#define COLOR_LIVING_B  0     // pure RED — easy to confirm R pin works

#define COLOR_BEDROOM_R 0
#define COLOR_BEDROOM_G 255
#define COLOR_BEDROOM_B 0     // pure GREEN — easy to confirm G pin works

#define COLOR_KITCHEN_R 0
#define COLOR_KITCHEN_G 0
#define COLOR_KITCHEN_B 255   // pure BLUE — easy to confirm B pin works

// ════════════════════════════════════════════════════════════════
//  🔧 SERVO ANGLES
// ════════════════════════════════════════════════════════════════

#define DOOR_OPEN_DEG    180
#define DOOR_CLOSED_DEG  0
#define WIN_OPEN_DEG     180
#define WIN_CLOSED_DEG   0

// ════════════════════════════════════════════════════════════════
//  📡 SENSOR INTERVALS
// ════════════════════════════════════════════════════════════════

#define GAS_INTERVAL     3000   // ms
#define DHT_INTERVAL     10000  // ms

// ════════════════════════════════════════════════════════════════
//  MQ6 CALIBRATION
// ════════════════════════════════════════════════════════════════

#define MQ6_RL            10.0f
#define MQ6_RO            9.83f
#define GAS_RAW_THRESHOLD 800   // raw ADC value (0-4095) — buzzer triggers above this

// ════════════════════════════════════════════════════════════════
//  GLOBALS
// ════════════════════════════════════════════════════════════════

struct LightCmd { bool on; int brightness; int r, g, b; bool hasColor; String effect; };

// Per-LED runtime state for effects (3 LEDs)
struct LedState {
  bool   on        = false;
  int    brightness = 0;
  int    r = 0, g = 0, b = 0;
  String effect    = "none";
} ledState[3];

// LED pin tuples
const int LED_R_PINS[3] = { 2, 21, 25 };
const int LED_G_PINS[3] = { 4, 22, 26 };
const int LED_B_PINS[3] = { 5, 32, 27 };

#if MQTT_USE_TLS
WiFiClientSecure wifiClient;
#else
WiFiClient       wifiClient;
#endif
PubSubClient mqtt(wifiClient);
Servo        servoDoor;
Servo        servoWindow;
DHT          dht(DHT_PIN, DHT_TYPE);

unsigned long lastGasMs = 0;
unsigned long lastDhtMs = 0;

char topicLed1[80], topicLed2[80], topicLed3[80];
char topicDoor[80], topicWindow[80], topicAlarm[80];
char topicGas[80], topicDHT[80];

// ════════════════════════════════════════════════════════════════
//  RGB LED CONTROL
// ════════════════════════════════════════════════════════════════

void writeRGB(int rPin, int gPin, int bPin, int r, int g, int b) {
  if (COMMON_ANODE) { r = 255-r; g = 255-g; b = 255-b; }
  ledcWrite(rPin, r);
  ledcWrite(gPin, g);
  ledcWrite(bPin, b);
}

// brightness: 0-100
void setLed(int rPin, int gPin, int bPin,
            int colorR, int colorG, int colorB,
            bool on, int brightness = 100) {
  if (!on) {
    writeRGB(rPin, gPin, bPin, 0, 0, 0);
    return;
  }
  float scale = brightness / 100.0f;
  writeRGB(rPin, gPin, bPin,
           (int)(colorR * scale),
           (int)(colorG * scale),
           (int)(colorB * scale));
}

// ════════════════════════════════════════════════════════════════
//  PAYLOAD PARSING
// ════════════════════════════════════════════════════════════════

// Returns true = ON, false = OFF
// Also extracts brightness (0-100) via reference
bool payloadIsOn(const String& raw, int& brightness) {
  String s = raw;
  s.trim();
  if (s.length() >= 2 && s.charAt(0) == '"' && s.charAt(s.length()-1) == '"') {
    s = s.substring(1, s.length()-1);
  }
  s.toUpperCase();
  brightness = 100; // default full brightness

  if (s == "ON" || s == "OPEN" || s == "UNLOCK" || s == "TRUE") return true;
  if (s == "OFF"|| s == "CLOSE"|| s == "LOCK"   || s == "FALSE") { brightness = 0; return false; }

  // Numeric = brightness value
  int num = s.toInt();
  if (num > 0) { brightness = min(num, 100); return true; }
  brightness = 0;
  return false;
}

// Parse a #RRGGBB / RRGGBB string into r/g/b 0-255. Returns true on success.
bool parseHexColor(const String& raw, int& r, int& g, int& b) {
  String s = raw;
  s.trim();
  if (s.startsWith("#")) s = s.substring(1);
  if (s.length() != 6) return false;
  for (int i = 0; i < 6; i++) {
    char c = s.charAt(i);
    if (!((c>='0'&&c<='9')||(c>='a'&&c<='f')||(c>='A'&&c<='F'))) return false;
  }
  long v = strtol(s.c_str(), nullptr, 16);
  r = (v >> 16) & 0xFF;
  g = (v >>  8) & 0xFF;
  b =  v        & 0xFF;
  return true;
}

// Try to parse a JSON light command of the form
//   {"state":"ON"|"OFF", "brightness":0-100, "color":"#RRGGBB"}
// Falls back to plain string parsing if not JSON.
// Returns true if the device should be ON.
bool parseLightPayload(const String& raw, LightCmd& out,
                       int defaultR, int defaultG, int defaultB) {
  out.brightness = 100;
  out.r = defaultR; out.g = defaultG; out.b = defaultB;
  out.hasColor = false;
  out.on = false;
  out.effect = "none";

  String s = raw; s.trim();
  if (s.length() && s.charAt(0) == '{') {
    StaticJsonDocument<256> doc;
    if (!deserializeJson(doc, s)) {
      if (doc.containsKey("brightness")) {
        int b = doc["brightness"].as<int>();
        out.brightness = constrain(b, 0, 100);
      }
      if (doc.containsKey("color")) {
        const char* c = doc["color"];
        if (c && parseHexColor(String(c), out.r, out.g, out.b)) out.hasColor = true;
      }
      if (doc.containsKey("effect")) {
        const char* e = doc["effect"];
        if (e) out.effect = String(e);
      }
      if (doc.containsKey("state")) {
        String st = String((const char*)(doc["state"] | "")); st.toUpperCase();
        out.on = (st == "ON");
        if (!out.on) out.brightness = 0;
      } else {
        out.on = out.brightness > 0;
      }
      return out.on;
    }
  }

  int br = 100;
  bool on = payloadIsOn(raw, br);
  out.brightness = br;
  out.on = on;
  return on;
}

// HSV (h 0-359, s/v 0-255) → RGB 0-255
void hsvToRgb(int h, int s, int v, int& r, int& g, int& b) {
  int region = h / 60;
  int rem    = (h - region * 60) * 255 / 60;
  int p = (v * (255 - s)) / 255;
  int q = (v * (255 - (s * rem) / 255)) / 255;
  int t = (v * (255 - (s * (255 - rem)) / 255)) / 255;
  switch (region) {
    case 0: r=v; g=t; b=p; break;
    case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;
    case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;
    default: r=v; g=p; b=q; break;
  }
}

// Apply current ledState[idx] to physical pins, respecting active effect.
void applyLedState(int idx, int phase /* 0-359 for rainbow, 0-255 for pulse */) {
  const LedState& s = ledState[idx];
  if (!s.on) {
    writeRGB(LED_R_PINS[idx], LED_G_PINS[idx], LED_B_PINS[idx], 0, 0, 0);
    return;
  }
  int r = s.r, g = s.g, b = s.b;

  if (s.effect == "rainbow") {
    hsvToRgb(phase % 360, 255, 255, r, g, b);
  } else if (s.effect == "pulse") {
    float pulse = (sin(phase * PI / 128.0f) + 1.0f) * 0.5f; // 0..1
    r = (int)(s.r * pulse);
    g = (int)(s.g * pulse);
    b = (int)(s.b * pulse);
  }

  float scale = s.brightness / 100.0f;
  writeRGB(LED_R_PINS[idx], LED_G_PINS[idx], LED_B_PINS[idx],
           (int)(r * scale), (int)(g * scale), (int)(b * scale));
}

// ════════════════════════════════════════════════════════════════
//  GAS SENSOR
// ════════════════════════════════════════════════════════════════

float readGasPPM() {
  int raw = analogRead(GAS_PIN);
  if (raw <= 0) return 0.0f;
  if (raw >= 4090) return 10000.0f; // saturated → report max; avoid div-by-zero
  float vrl   = raw * 3.3f / 4095.0f;
  float rs    = ((3.3f - vrl) / vrl) * MQ6_RL;
  float ratio = rs / MQ6_RO;
  float ppm   = 1000.0f * pow(ratio, -2.37f);
  if (!isfinite(ppm) || ppm > 10000.0f) return 10000.0f;
  return (ppm < 0.0f) ? 0.0f : ppm;
}

// ════════════════════════════════════════════════════════════════
//  ACTUATORS
// ════════════════════════════════════════════════════════════════

void setDoor(bool open) {
  servoDoor.write(open ? DOOR_OPEN_DEG : DOOR_CLOSED_DEG);
  Serial.printf("[DOOR] %s\n", open ? "OPEN" : "CLOSED");
}

void setWindow(bool open) {
  servoWindow.write(open ? WIN_OPEN_DEG : WIN_CLOSED_DEG);
  Serial.printf("[WINDOW] %s\n", open ? "OPEN" : "CLOSED");
}

void setBuzzer(bool on) {
  if (on) { tone(BUZZER_PIN, 1000); Serial.println("[BUZZER] ALARM ON"); }
  else    { noTone(BUZZER_PIN); digitalWrite(BUZZER_PIN, LOW); Serial.println("[BUZZER] off"); }
}

// ════════════════════════════════════════════════════════════════
//  MQTT CALLBACK
// ════════════════════════════════════════════════════════════════

void onMessage(char* topic, byte* payload, unsigned int len) {
  String t(topic);
  String p;
  p.reserve(len);
  for (unsigned int i = 0; i < len; i++) p += (char)payload[i];
  Serial.printf("\n[MQTT ←] %s  %s\n", topic, p.c_str());

  // Alarm
  if (t == topicAlarm) {
    StaticJsonDocument<128> doc;
    bool alarm = (!deserializeJson(doc, p)) ? (doc["alarm"] | false) : false;
    setBuzzer(alarm);
    return;
  }

  LightCmd cmd;
  int idx = -1;
  int defR = 0, defG = 0, defB = 0;
  if      (t == topicLed1) { idx = 0; defR = COLOR_LIVING_R;  defG = COLOR_LIVING_G;  defB = COLOR_LIVING_B; }
  else if (t == topicLed2) { idx = 1; defR = COLOR_BEDROOM_R; defG = COLOR_BEDROOM_G; defB = COLOR_BEDROOM_B; }
  else if (t == topicLed3) { idx = 2; defR = COLOR_KITCHEN_R; defG = COLOR_KITCHEN_G; defB = COLOR_KITCHEN_B; }

  if (idx >= 0) {
    parseLightPayload(p, cmd, defR, defG, defB);
    ledState[idx].on         = cmd.on;
    ledState[idx].brightness = cmd.brightness;
    ledState[idx].r          = cmd.r;
    ledState[idx].g          = cmd.g;
    ledState[idx].b          = cmd.b;
    ledState[idx].effect     = cmd.effect;
    applyLedState(idx, 0);
    Serial.printf("[LED%d] %s br=%d rgb=(%d,%d,%d) fx=%s\n",
                  idx+1, cmd.on ? "ON" : "OFF", cmd.brightness,
                  cmd.r, cmd.g, cmd.b, cmd.effect.c_str());
    return;
  }

  // Door / window — simple ON/OFF
  int dummy = 100;
  bool on = payloadIsOn(p, dummy);
  if (t == topicDoor)   setDoor(on);
  if (t == topicWindow) setWindow(on);
}

// ════════════════════════════════════════════════════════════════
//  WiFi + MQTT
// ════════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 40) {
    delay(500); Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] ✅ IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] ❌ Failed — restarting");
    delay(3000); ESP.restart();
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("[MQTT] Connecting...");
    String clientId = "esp32-" + WiFi.macAddress();
    bool ok;
#if MQTT_USE_TLS
    // HiveMQ Cloud needs auth + TLS
    ok = mqtt.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD);
#else
    ok = (strlen(MQTT_USERNAME) > 0)
       ? mqtt.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)
       : mqtt.connect(clientId.c_str());
#endif
    if (ok) {
      Serial.println(" ✅ connected!");
      mqtt.subscribe(topicLed1);
      mqtt.subscribe(topicLed2);
      mqtt.subscribe(topicLed3);
      mqtt.subscribe(topicDoor);
      mqtt.subscribe(topicWindow);
      mqtt.subscribe(topicAlarm);
    } else {
      Serial.printf(" ❌ rc=%d — retrying in 3s\n", mqtt.state());
      delay(3000);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n╔══════════════════════════════╗");
  Serial.println("║  SmartHome ESP32 Node Boot  ║");
  Serial.println("╚══════════════════════════════╝");

  // Build topic strings
  snprintf(topicLed1,   sizeof(topicLed1),   "command/%s",               TOPIC_LED1);
  snprintf(topicLed2,   sizeof(topicLed2),   "command/%s",               TOPIC_LED2);
  snprintf(topicLed3,   sizeof(topicLed3),   "command/%s",               TOPIC_LED3);
  snprintf(topicDoor,   sizeof(topicDoor),   "command/%s",               TOPIC_DOOR);
  snprintf(topicWindow, sizeof(topicWindow), "command/%s",               TOPIC_WINDOW);
  // Backend lowercases houseCode when publishing alarm — must match exactly
  String hcLower = String(HOUSE_CODE); hcLower.toLowerCase();
  snprintf(topicAlarm, sizeof(topicAlarm), "command/autogen/%s/alarm", hcLower.c_str());
  snprintf(topicGas,    sizeof(topicGas),    "sensors/%s/gas",           HOUSE_CODE);
  snprintf(topicDHT,    sizeof(topicDHT),    "sensors/%s/dht",           HOUSE_CODE);

  // Servos FIRST — must claim LEDC channels before ledcAttach for LEDs
  // SG90: 50Hz, 544-2400µs pulse range
  servoDoor.attach(SERVO_DOOR_PIN, 544, 2400);
  servoWindow.attach(SERVO_WIN_PIN, 544, 2400);
  setDoor(false);
  setWindow(false);
  delay(500); // let servos settle

  // RGB LED pins — attach AFTER servos so channels don't conflict
  int rgbPins[] = {LED1_R, LED1_G, LED1_B,
                   LED2_R, LED2_G, LED2_B,
                   LED3_R, LED3_G, LED3_B};
  for (int pin : rgbPins) ledcAttach(pin, 1000, 8);

  // Start all LEDs off
  writeRGB(LED1_R, LED1_G, LED1_B, 0, 0, 0);
  writeRGB(LED2_R, LED2_G, LED2_B, 0, 0, 0);
  writeRGB(LED3_R, LED3_G, LED3_B, 0, 0, 0);

  // Buzzer — boot beep confirms wiring
  pinMode(BUZZER_PIN, OUTPUT);
  tone(BUZZER_PIN, 1000); delay(300); noTone(BUZZER_PIN);

  // Gas sensor
  pinMode(GAS_PIN, INPUT);

  // DHT11
  dht.begin();

  // Network
  connectWiFi();
#if MQTT_USE_TLS
  // Skip CA validation (acceptable for student/PFE demo; production should pin CA).
  wifiClient.setInsecure();
#endif
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setBufferSize(512);
  connectMQTT();

  Serial.println("\n[BOOT] ✅ Ready!");
  Serial.printf("  MQTT broker: %s:%d\n", MQTT_SERVER, MQTT_PORT);
  Serial.printf("  House code : %s\n",    HOUSE_CODE);
}

// ════════════════════════════════════════════════════════════════
//  LOOP
// ════════════════════════════════════════════════════════════════

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected())             connectMQTT();
  mqtt.loop();

  unsigned long now = millis();

  // Tick effect animations every ~30ms for any LED with a non-solid effect
  static unsigned long lastFxMs = 0;
  static int           fxPhase  = 0;
  if (now - lastFxMs >= 30) {
    lastFxMs = now;
    fxPhase  = (fxPhase + 3) % 360; // rainbow advances ~3°/tick
    for (int i = 0; i < 3; i++) {
      if (ledState[i].on && (ledState[i].effect == "rainbow" || ledState[i].effect == "pulse")) {
        applyLedState(i, fxPhase);
      }
    }
  }

  // Publish gas every 3s + local buzzer trigger
  if (now - lastGasMs >= GAS_INTERVAL) {
    lastGasMs = now;
    int   raw = analogRead(GAS_PIN);
    float ppm = readGasPPM();
    char payload[48];
    snprintf(payload, sizeof(payload), "{\"level\":%.1f}", ppm);
    mqtt.publish(topicGas, payload, false);
    Serial.printf("[GAS] raw=%d  %.1f ppm\n", raw, ppm);
    // Local safety: trigger buzzer directly if raw ADC exceeds threshold
    if (raw > GAS_RAW_THRESHOLD) {
      setBuzzer(true);
      Serial.printf("[BUZZER] LOCAL ALARM raw=%d\n", raw);
    } else {
      setBuzzer(false);
    }
  }

  // Publish DHT11 every 10s
  if (now - lastDhtMs >= DHT_INTERVAL) {
    lastDhtMs = now;
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    if (!isnan(temp) && !isnan(hum)) {
      char payload[64];
      snprintf(payload, sizeof(payload), "{\"temperature\":%.1f,\"humidity\":%.1f}", temp, hum);
      mqtt.publish(topicDHT, payload, false);
      Serial.printf("[DHT] %.1f°C  %.1f%%\n", temp, hum);
    } else {
      Serial.println("[DHT] Read failed — check wiring");
    }
  }
}
