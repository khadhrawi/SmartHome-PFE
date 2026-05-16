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
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ════════════════════════════════════════════════════════════════
//  ⚙️  USER CONFIG
// ════════════════════════════════════════════════════════════════

#define WIFI_SSID        "H House"
#define WIFI_PASSWORD    "HHOUSE2025"
#define MQTT_SERVER      "192.168.100.54"
#define MQTT_PORT        1883
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
//  MQ6 AOUT          34      ADC1 only — 5V power from VIN
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
#define GAS_PIN          34
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

WiFiClient   wifiClient;
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

// ════════════════════════════════════════════════════════════════
//  GAS SENSOR
// ════════════════════════════════════════════════════════════════

float readGasPPM() {
  int raw = analogRead(GAS_PIN);
  if (raw == 0) return 0.0f;
  float vrl   = raw * 3.3f / 4095.0f;
  float rs    = ((3.3f - vrl) / vrl) * MQ6_RL;
  float ratio = rs / MQ6_RO;
  float ppm   = 1000.0f * pow(ratio, -2.37f);
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

  int brightness = 100;
  bool on = payloadIsOn(p, brightness);

  if (t == topicLed1) {
    setLed(LED1_R, LED1_G, LED1_B, COLOR_LIVING_R,  COLOR_LIVING_G,  COLOR_LIVING_B,  on, brightness);
    Serial.printf("[LED1] %s brightness=%d\n", on ? "ON" : "OFF", brightness);
  }
  if (t == topicLed2) {
    setLed(LED2_R, LED2_G, LED2_B, COLOR_BEDROOM_R, COLOR_BEDROOM_G, COLOR_BEDROOM_B, on, brightness);
    Serial.printf("[LED2] %s brightness=%d\n", on ? "ON" : "OFF", brightness);
  }
  if (t == topicLed3) {
    setLed(LED3_R, LED3_G, LED3_B, COLOR_KITCHEN_R, COLOR_KITCHEN_G, COLOR_KITCHEN_B, on, brightness);
    Serial.printf("[LED3] %s brightness=%d\n", on ? "ON" : "OFF", brightness);
  }
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
    if (mqtt.connect(clientId.c_str())) {
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
