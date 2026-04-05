
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <SPI.h>
#include <WiFi.h>
#include <Wire.h>


// ── WIFI CONFIG ────────────────────────────────────────────────
const char *WIFI_SSID = "One";
const char *WIFI_PASSWORD = "12345678";

// ── SERVER CONFIG ─────────────────────────────────────────────
const char *SERVER_BASE =
    "https://psr-campus.onrender.com"; // deployed cloud backend
const char *API_KEY =
    "esp32_secret_2026"; // must match ESP32_API_KEY in .env.local

// ── PIN DEFINITIONS ───────────────────────────────────────────
// RFID SPI
#define SS_PIN 5   // SDA / CS
#define RST_PIN 4  // Reset (Changed from 22 to avoid conflict with I2C SCL)

// Ultrasonic HC-SR04
#define TRIG_PIN 12
#define ECHO_PIN 14

// Buzzer
#define BUZZER_PIN 27

// LED status
#define LED_GREEN_PIN 26
#define LED_RED_PIN 25

// ── THRESHOLDS ────────────────────────────────────────────────
#define PERSON_DISTANCE_CM 100   // Max distance to count as "person present"
#define MULTI_PERSON_THRESHOLD 2 // Buzzer triggers if ≥ 2 persons detected
#define BUZZER_DURATION_MS 3000  // Buzzer on for 3 seconds
#define SCAN_COOLDOWN_MS 3000    // Prevent re-scan within 3 seconds

// ── OBJECTS ───────────────────────────────────────────────────
MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); // Change 0x27 if not found (try 0x3F)

// State
unsigned long lastScanTime = 0;
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;

// ── PROTOTYPES ────────────────────────────────────────────────
String readRFID();
int countPersons();
void sendAttendance(String uid, int personCount);
void activateBuzzer();
void lcdPrint(String line1, String line2 = "");
void ledStatus(bool success);
void reconnectWiFi();

// ═══════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);

  // Pin setup
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);

  // LCD init
  Wire.begin(21, 22); // SDA=21, SCL=22
  lcd.init();
  lcd.backlight();
  lcdPrint("PSR Campus", "Booting...");

  // SPI + RFID init
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_DumpVersionToSerial();
  Serial.println("[RFID] Initialized");

  // WiFi connect
  lcdPrint("Connecting WiFi", "...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++attempts > 30) {
      Serial.println("\n[WiFi] Failed! Restarting...");
      ESP.restart();
    }
  }

  String ip = WiFi.localIP().toString();
  Serial.printf("\n[WiFi] Connected! IP: %s\n", ip.c_str());
  lcdPrint("WiFi Connected!", ip.c_str());
  delay(2000);
  lcdPrint("Scan RFID Card", "or Face to Enter");
}

// ═══════════════════════════════════════════════════════════════
void loop() {
  // ── Handle buzzer timeout ──
  if (buzzerActive && (millis() - buzzerStartTime >= BUZZER_DURATION_MS)) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerActive = false;
    Serial.println("[BUZZER] Deactivated");
  }

  // ── WiFi watchdog ──
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
    return;
  }

  // ── Scan cooldown ──
  if (millis() - lastScanTime < SCAN_COOLDOWN_MS)
    return;

  // ── Wait for RFID card ──
  if (!rfid.PICC_IsNewCardPresent())
    return;
  if (!rfid.PICC_ReadCardSerial())
    return;

  // ── Read UID ──
  String uid = readRFID();
  Serial.printf("[RFID] Card detected: %s\n", uid.c_str());
  lastScanTime = millis();

  // ── Count persons with ultrasonic ──
  int personCount = countPersons();
  Serial.printf("[SENSOR] Persons detected: %d\n", personCount);

  // ── Display ──
  lcdPrint("Card: " + uid, "Verifying...");

  // ── Security check ──
  if (personCount >= MULTI_PERSON_THRESHOLD) {
    Serial.println("[SECURITY] Multiple persons! Activating buzzer.");
    lcdPrint("SECURITY ALERT!", "Multiple Persons");
    activateBuzzer();
    ledStatus(false);
    // Still send to server with alert flag
  }

  // ── Send to server ──
  sendAttendance(uid, personCount);

  // ── Stop RFID ──
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ═══════════════════════════════════════════════════════════════
String readRFID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10)
      uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

// ═══════════════════════════════════════════════════════════════
int countPersons() {
  // Fire ultrasonic pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  float distance = (duration * 0.0343) / 2.0;

  Serial.printf("[SENSOR] Distance: %.1f cm\n", distance);

  // Only count if within range
  if (distance > 0 && distance < PERSON_DISTANCE_CM) {
    // Basic 1-person vs multi detection:
    // For real tailgating detection, use 2 sensors or IR beam
    // Here we use a simple heuristic: very short distance = extra person behind
    if (distance < 40)
      return 2; // Someone too close = possible tailgating
    return 1;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════
void sendAttendance(String uid, int personCount) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] No WiFi, skipping API call");
    lcdPrint("WiFi Error!", "No Connection");
    return;
  }

  HTTPClient http;
  String url = String(SERVER_BASE) + "/api/attendance/rfid";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  http.setTimeout(8000); // 8 second timeout

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["rfid"] = uid;
  doc["sensor_count"] = personCount;
  doc["gate_id"] = "main_gate";

  String payload;
  serializeJson(doc, payload);

  Serial.printf("[HTTP] POST %s\n", url.c_str());
  Serial.printf("[HTTP] Payload: %s\n", payload.c_str());

  int httpCode = http.POST(payload);

  if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    Serial.printf("[HTTP] Response (%d): %s\n", httpCode, response.c_str());

    // Parse response
    StaticJsonDocument<512> res;
    DeserializationError err = deserializeJson(res, response);

    if (!err) {
      bool success = res["success"].as<bool>();
      String message = res["message"].as<String>();
      String name = res["student"]["name"].as<String>();
      String action = res["gate_action"].as<String>();
      bool alert = res["security_alert"].as<bool>();

      if (action == "allow") {
        lcdPrint("Access Granted", name.length() > 0 ? name : "Welcome!");
        ledStatus(true);
        Serial.printf("[GATE] Access granted for: %s\n", name.c_str());
      } else {
        lcdPrint("Access Denied", message.length() > 0 ? message : "Try again");
        ledStatus(false);
        Serial.println("[GATE] Access denied");
      }

      if (alert) {
        activateBuzzer();
        lcdPrint("ALERT! Multi-", "Person Detected");
      }
    }
  } else if (httpCode == 404) {
    Serial.println("[HTTP] RFID not registered");
    lcdPrint("Card Not Found!", "Register First");
    ledStatus(false);
  } else {
    Serial.printf("[HTTP] Error code: %d\n", httpCode);
    lcdPrint("Server Error", String(httpCode));
    ledStatus(false);
  }

  http.end();
  delay(2000);
  lcdPrint("Scan RFID Card", "or Face to Enter");
}

// ═══════════════════════════════════════════════════════════════
void activateBuzzer() {
  Serial.println("[BUZZER] ACTIVATED");
  digitalWrite(BUZZER_PIN, HIGH);
  buzzerActive = true;
  buzzerStartTime = millis();
}

// ═══════════════════════════════════════════════════════════════
void ledStatus(bool success) {
  if (success) {
    digitalWrite(LED_GREEN_PIN, HIGH);
    delay(1500);
    digitalWrite(LED_GREEN_PIN, LOW);
  } else {
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_RED_PIN, HIGH);
      delay(150);
      digitalWrite(LED_RED_PIN, LOW);
      delay(150);
    }
  }
}

// ═══════════════════════════════════════════════════════════════
void lcdPrint(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(line2.substring(0, 16));
}

// ═══════════════════════════════════════════════════════════════
void reconnectWiFi() {
  Serial.println("[WiFi] Reconnecting...");
  lcdPrint("WiFi Lost!", "Reconnecting...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("[WiFi] Reconnected!");
    lcdPrint("WiFi Restored!", WiFi.localIP().toString());
    delay(1000);
    lcdPrint("Scan RFID Card", "or Face to Enter");
  }
}

/*
 * ===================================================================
 *  WIRING REFERENCE
 * ===================================================================
 *
 *  MFRC522 RFID READER (SPI Bus):
 *  ┌─────────┬───────────┐
 *  │ RFID    │ ESP32     │
 *  ├─────────┼───────────┤
 *  │ SDA/CS  │ GPIO 5    │
 *  │ SCK     │ GPIO 18   │
 *  │ MOSI    │ GPIO 23   │
 *  │ MISO    │ GPIO 19   │
 *  │ RST     │ GPIO 22   │
 *  │ GND     │ GND       │
 *  │ 3.3V    │ 3.3V      │
 *  └─────────┴───────────┘
 *
 *  HC-SR04 ULTRASONIC SENSOR:
 *  ┌─────────┬───────────┐
 *  │ Sensor  │ ESP32     │
 *  ├─────────┼───────────┤
 *  │ VCC     │ 5V (VIN)  │
 *  │ GND     │ GND       │
 *  │ TRIG    │ GPIO 12   │
 *  │ ECHO    │ GPIO 14   │
 *  └─────────┴───────────┘
 *
 *  BUZZER:
 *  ┌───────────┬───────────┐
 *  │ Buzzer +  │ GPIO 27   │
 *  │ Buzzer -  │ GND       │
 *  └───────────┴───────────┘
 *
 *  LCD I2C (16x2):
 *  ┌─────────┬───────────┐
 *  │ LCD     │ ESP32     │
 *  ├─────────┼───────────┤
 *  │ SDA     │ GPIO 21   │
 *  │ SCL     │ GPIO 22   │  (shared, configure jumper)
 *  │ VCC     │ 5V        │
 *  │ GND     │ GND       │
 *  └─────────┴───────────┘
 *
 *  LED INDICATORS:
 *  Green LED (+) → GPIO 26 → 220Ω resistor → GND
 *  Red   LED (+) → GPIO 25 → 220Ω resistor → GND
 *
 * ===================================================================
 *  DEPLOYMENT STEPS
 * ===================================================================
 *  1. Install Arduino IDE + ESP32 board package
 *  2. Install libraries: MFRC522, ArduinoJson, LiquidCrystal_I2C
 *  3. Set WIFI_SSID, WIFI_PASSWORD, SERVER_BASE, API_KEY
 *  4. Select: Tools → Board → ESP32 Dev Module
 *  5. Select: Tools → Port → COMx (your ESP32 port)
 *  6. Upload and open Serial Monitor at 115200 baud
 * ===================================================================
 */
