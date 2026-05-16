/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║          SmartHome PFE — ESP32 IoT Node                     ║
 * ║  Hardware: ESP32D | 3 LEDs | Buzzer | 2 Servos              ║
 * ║            MQ6 Gas Sensor | DHT11 Temp+Humidity             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * MQTT topics subscribed (commands from backend):
 *   command/<TOPIC_LEDx>                   → ON / OFF / brightness number
 *   command/<TOPIC_DOOR>                   → ON (open) / OFF (close)
 *   command/<TOPIC_WINDOW>                 → ON (open) / OFF (close)
 *   command/autogen/<HOUSE_CODE>/alarm     → {"alarm": true/false}
 *
 * MQTT topics published (sensor data to backend):
 *   sensors/<HOUSE_CODE>/gas              → {"level": <ppm>}
 *   sensors/<HOUSE_CODE>/dht             → {"temperature": <°C>, "humidity": <%>}
 *
 * Required libraries (install via Arduino Library Manager):
 *   - PubSubClient   by Nick O'Leary        (MQTT)
 *   - ESP32Servo     by Kevin Harrington    (Servos)
 *   - ArduinoJson    by Benoit Blanchon     (JSON)
 *   - DHT sensor     by Adafruit            (DHT11)
 *   - Adafruit Unified Sensor by Adafruit  (DHT dependency)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ════════════════════════════════════════════════════════════════
//  ⚙️  USER CONFIG — fill these in before uploading
// ════════════════════════════════════════════════════════════════

#define WIFI_SSID        "YOUR_WIFI_SSID"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"

// Your PC's local IP address (run `ipconfig` in cmd → find IPv4 address)
#define MQTT_SERVER      "192.168.1.X"
#define MQTT_PORT        1883

// Your house code — visible in SmartHome dashboard (uppercase letters + numbers)
#define HOUSE_CODE       "YOUR_HOUSE_CODE"

// Device topics — must EXACTLY match what you create in the SmartHome dashboard
#define TOPIC_LED1       "living-room-light"
#define TOPIC_LED2       "bedroom-light"
#define TOPIC_LED3       "kitchen-light"
#define TOPIC_DOOR       "main-door"
#define TOPIC_WINDOW     "bedroom-window"

// ════════════════════════════════════════════════════════════════
//  📌 PIN MAPPING  (change if your wiring is different)
// ════════════════════════════════════════════════════════════════
//
//  Component    GPIO   Notes
//  ─────────────────────────────────────────────────────────────
//  LED 1         2     living room light  (220Ω resistor to GND)
//  LED 2         4     bedroom light      (220Ω resistor to GND)
//  LED 3         5     kitchen light      (220Ω resistor to GND)
//  Buzzer       15     active buzzer (+ to GPIO, - to GND)
//  Servo Door   18     signal pin (power: 5V / GND separate)
//  Servo Window 19     signal pin (power: 5V / GND separate)
//  MQ6 AOUT     34     ADC1 (MUST be 32-39 range when WiFi on)
//  DHT11 DATA   23     with 10kΩ pull-up to 3.3V
//  ─────────────────────────────────────────────────────────────

#define LED1_PIN         2
#define LED2_PIN         4
#define LED3_PIN         5
#define BUZZER_PIN       15
#define SERVO_DOOR_PIN   18
#define SERVO_WIN_PIN    19
#define GAS_PIN          34
#define DHT_PIN          23
#define DHT_TYPE         DHT11

// ════════════════════════════════════════════════════════════════
//  🔧 SERVO ANGLES — adjust for your physical setup
// ════════════════════════════════════════════════════════════════

#define DOOR_OPEN_DEG    90
#define DOOR_CLOSED_DEG  0
#define WIN_OPEN_DEG     90
#define WIN_CLOSED_DEG   0

// ════════════════════════════════════════════════════════════════
//  📡 SENSOR PUBLISH INTERVALS
// ════════════════════════════════════════════════════════════════

#define GAS_INTERVAL     3000   // publish gas every 3 seconds
#define DHT_INTERVAL     10000  // publish temp/humidity every 10 seconds

// ════════════════════════════════════════════════════════════════
//  MQ6 CALIBRATION (LPG / Butane)
//  Rs/Ro ratio in clean air ≈ 9.83  (adjust after burn-in ~24h)
// ════════════════════════════════════════════════════════════════

#define MQ6_RL           10.0f   // load resistor in kΩ
#define MQ6_RO           9.83f   // sensor base resistance ratio

// ════════════════════════════════════════════════════════════════
//  GLOBALS
// ════════════════════════════════════════════════════════════════

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);
Servo        servoDoor;
Servo        servoWindow;
DHT          dht(DHT_PIN, DHT_TYPE);

unsigned long lastGasMs  = 0;
unsigned long lastDhtMs  = 0;

// Pre-built topic strings
char topicLed1[80], topicLed2[80], topicLed3[80];
char topicDoor[80], topicWindow[80], topicAlarm[80];
char topicGas[80],  topicDHT[80];

// ════════════════════════════════════════════════════════════════
//  PAYLOAD PARSING
//  Backend sends: "ON", "OFF", "OPEN", "CLOSE", brightness number
//  All wrapped in JSON.stringify() → payload is "\"ON\"" or "\"80\""
// ════════════════════════════════════════════════════════════════

bool payloadIsOn(const String& raw) {
  String s = raw;
  s.trim();
  // Strip surrounding JSON quotes if present
  if (s.length() >= 2 && s.charAt(0) == '"' && s.charAt(s.length() - 1) == '"') {
    s = s.substring(1, s.length() - 1);
  }
  s.toUpperCase();
  if (s == "ON"       || s == "OPEN"    || s == "UNLOCK"  ||
      s == "UNLOCKED" || s == "TRUE"    || s == "1")       return true;
  if (s == "OFF"      || s == "CLOSE"   || s == "CLOSED"  ||
      s == "LOCK"     || s == "LOCKED"  || s == "FALSE"   || s == "0") return false;
  // Numeric brightness — any value > 0 means ON
  return s.toInt() > 0;
}

// ════════════════════════════════════════════════════════════════
//  GAS SENSOR — MQ6 → PPM (LPG approximation)
// ════════════════════════════════════════════════════════════════

float readGasPPM() {
  int   raw  = analogRead(GAS_PIN);
  if (raw == 0) return 0.0f;
  float vrl  = raw * 3.3f / 4095.0f;           // voltage across load resistor
  float rs   = ((3.3f - vrl) / vrl) * MQ6_RL;  // sensor resistance
  float ratio = rs / MQ6_RO;                    // Rs/Ro
  // LPG power curve: ppm ≈ 1000 × ratio^(−2.37)
  float ppm  = 1000.0f * pow(ratio, -2.37f);
  return (ppm < 0.0f) ? 0.0f : ppm;
}

// ════════════════════════════════════════════════════════════════
//  ACTUATOR CONTROL
// ════════════════════════════════════════════════════════════════

void setLed(int pin, bool on) {
  digitalWrite(pin, on ? HIGH : LOW);
  Serial.printf("[LED] GPIO%d → %s\n", pin, on ? "ON" : "OFF");
}

void setDoor(bool open) {
  int angle = open ? DOOR_OPEN_DEG : DOOR_CLOSED_DEG;
  servoDoor.write(angle);
  Serial.printf("[DOOR] → %s (%d°)\n", open ? "OPEN" : "CLOSED", angle);
}

void setWindow(bool open) {
  int angle = open ? WIN_OPEN_DEG : WIN_CLOSED_DEG;
  servoWindow.write(angle);
  Serial.printf("[WINDOW] → %s (%d°)\n", open ? "OPEN" : "CLOSED", angle);
}

void setBuzzer(bool on) {
  if (on) {
    tone(BUZZER_PIN, 1000); // 1 kHz alarm tone
    Serial.println("[BUZZER] 🚨 ALARM ON");
  } else {
    noTone(BUZZER_PIN);
    digitalWrite(BUZZER_PIN, LOW);
    Serial.println("[BUZZER] silent");
  }
}

// ════════════════════════════════════════════════════════════════
//  MQTT MESSAGE HANDLER
// ════════════════════════════════════════════════════════════════

void onMessage(char* topic, byte* payload, unsigned int len) {
  String t(topic);
  String p;
  p.reserve(len);
  for (unsigned int i = 0; i < len; i++) p += (char)payload[i];

  Serial.printf("\n[MQTT ←] %s  %s\n", topic, p.c_str());

  // ── Gas alarm command (from gasMonitor.js on emergency) ─────
  if (t == topicAlarm) {
    StaticJsonDocument<128> doc;
    bool alarm = false;
    if (!deserializeJson(doc, p)) {
      alarm = doc["alarm"] | false;
    }
    setBuzzer(alarm);
    return;
  }

  // ── Device commands ─────────────────────────────────────────
  bool on = payloadIsOn(p);

  if (t == topicLed1)   setLed(LED1_PIN, on);
  if (t == topicLed2)   setLed(LED2_PIN, on);
  if (t == topicLed3)   setLed(LED3_PIN, on);
  if (t == topicDoor)   setDoor(on);
  if (t == topicWindow) setWindow(on);
}

// ════════════════════════════════════════════════════════════════
//  WiFi + MQTT CONNECTION
// ════════════════════════════════════════════════════════════════

void connectWiFi() {
  Serial.printf("\n[WiFi] Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 40) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] ✅ IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WiFi] ❌ Failed — restarting in 5s");
    delay(5000);
    ESP.restart();
  }
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("[MQTT] Connecting...");
    String clientId = "esp32-" + WiFi.macAddress();
    if (mqtt.connect(clientId.c_str())) {
      Serial.println(" ✅ connected!");
      mqtt.subscribe(topicLed1);
      mqtt.subscribe(topicLed2);
      mqtt.subscribe(topicLed3);
      mqtt.subscribe(topicDoor);
      mqtt.subscribe(topicWindow);
      mqtt.subscribe(topicAlarm);
      Serial.printf("  Subscribed: %s\n", topicLed1);
      Serial.printf("  Subscribed: %s\n", topicLed2);
      Serial.printf("  Subscribed: %s\n", topicLed3);
      Serial.printf("  Subscribed: %s\n", topicDoor);
      Serial.printf("  Subscribed: %s\n", topicWindow);
      Serial.printf("  Subscribed: %s\n", topicAlarm);
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
  Serial.println("\n\n╔══════════════════════════════╗");
  Serial.println("║  SmartHome ESP32 Node Boot  ║");
  Serial.println("╚══════════════════════════════╝");

  // Build all topic strings
  snprintf(topicLed1,   sizeof(topicLed1),   "command/%s",               TOPIC_LED1);
  snprintf(topicLed2,   sizeof(topicLed2),   "command/%s",               TOPIC_LED2);
  snprintf(topicLed3,   sizeof(topicLed3),   "command/%s",               TOPIC_LED3);
  snprintf(topicDoor,   sizeof(topicDoor),   "command/%s",               TOPIC_DOOR);
  snprintf(topicWindow, sizeof(topicWindow), "command/%s",               TOPIC_WINDOW);
  snprintf(topicAlarm,  sizeof(topicAlarm),  "command/autogen/%s/alarm", HOUSE_CODE);
  snprintf(topicGas,    sizeof(topicGas),    "sensors/%s/gas",           HOUSE_CODE);
  snprintf(topicDHT,    sizeof(topicDHT),    "sensors/%s/dht",           HOUSE_CODE);

  // GPIO setup
  pinMode(LED1_PIN,    OUTPUT);
  pinMode(LED2_PIN,    OUTPUT);
  pinMode(LED3_PIN,    OUTPUT);
  pinMode(BUZZER_PIN,  OUTPUT);
  pinMode(GAS_PIN,     INPUT);

  // Default OFF
  setLed(LED1_PIN, false);
  setLed(LED2_PIN, false);
  setLed(LED3_PIN, false);
  setBuzzer(false);

  // Servos
  servoDoor.attach(SERVO_DOOR_PIN);
  servoWindow.attach(SERVO_WIN_PIN);
  setDoor(false);    // start closed
  setWindow(false);  // start closed

  // DHT11
  dht.begin();

  // Network
  connectWiFi();
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(onMessage);
  mqtt.setBufferSize(512);
  connectMQTT();

  Serial.println("\n[BOOT] ✅ Ready!");
  Serial.printf("  Gas    → %s\n", topicGas);
  Serial.printf("  DHT    → %s\n", topicDHT);
  Serial.printf("  Alarm  ← %s\n", topicAlarm);
}

// ════════════════════════════════════════════════════════════════
//  LOOP
// ════════════════════════════════════════════════════════════════

void loop() {
  // Reconnect if needed
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqtt.connected()) {
    connectMQTT();
  }
  mqtt.loop();

  unsigned long now = millis();

  // ── Publish gas reading every 3s ──────────────────────────
  if (now - lastGasMs >= GAS_INTERVAL) {
    lastGasMs = now;
    float ppm = readGasPPM();
    char payload[48];
    snprintf(payload, sizeof(payload), "{\"level\":%.1f}", ppm);
    mqtt.publish(topicGas, payload, false);
    Serial.printf("[GAS] %.1f ppm → %s\n", ppm, topicGas);
  }

  // ── Publish DHT11 reading every 10s ───────────────────────
  if (now - lastDhtMs >= DHT_INTERVAL) {
    lastDhtMs = now;
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    if (!isnan(temp) && !isnan(hum)) {
      char payload[64];
      snprintf(payload, sizeof(payload),
               "{\"temperature\":%.1f,\"humidity\":%.1f}", temp, hum);
      mqtt.publish(topicDHT, payload, false);
      Serial.printf("[DHT] %.1f°C  %.1f%% → %s\n", temp, hum, topicDHT);
    } else {
      Serial.println("[DHT] Read failed — check wiring");
    }
  }
}
