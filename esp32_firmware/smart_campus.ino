#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <LiquidCrystal_I2C.h>
#include <MFRC522.h>
#include <SPI.h>
#include <WiFi.h>
#include <Wire.h>
#include <ESP32Servo.h>

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
#define SS_PIN 5  // SDA / CS
#define RST_PIN 4 // Reset 

// Ultrasonic HC-SR04
#define TRIG_PIN 12
#define ECHO_PIN 14

// Buzzer
#define BUZZER_PIN 27

// LED status
#define LED_GREEN_PIN 26
#define LED_RED_PIN 25

// IR Sensor & Servo
#define IR_PIN 13
#define SERVO_PIN 15

// ── THRESHOLDS ────────────────────────────────────────────────
#define PERSON_DISTANCE_CM 100   // Max distance to count as "person present"
#define MULTI_PERSON_THRESHOLD 2 // Buzzer triggers if ≥ 2 persons detected
#define BUZZER_DURATION_MS 3000  // Buzzer on for 3 seconds
#define SCAN_COOLDOWN_MS 3000    // Prevent re-scan within 3 seconds
#define SERVO_OPEN_MS 3000       // Servo stays open for 3 seconds

// ── OBJECTS ───────────────────────────────────────────────────
MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Servo gateServo;

// State
unsigned long lastScanTime = 0;
bool buzzerActive = false;
unsigned long buzzerStartTime = 0;

bool gateOpen = false;
unsigned long gateOpenTime = 0;

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
  pinMode(IR_PIN, INPUT); // IR Sensor

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);

  // Servo Init
  gateServo.attach(SERVO_PIN);
  gateServo.write(0); // Initialize closed

  // LCD init
  Wire.begin(21, 22); // SDA=21, SCL=22
  lcd.init();
  lcd.backlight();
  lcdPrint("PSR Campus", "Booting...");

  // SPI + RFID init
  SPI.begin();
  rfid.PCD_Init();

  // WiFi connect
  lcdPrint("Connecting WiFi", "...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }

  String ip = WiFi.localIP().toString();
  lcdPrint("WiFi Connected!", ip.c_str());
  delay(2000);
  lcdPrint("Ready: IR/RFID", "Awaiting Entry");
}

// ═══════════════════════════════════════════════════════════════
void loop() {
  // ── Handle buzzer timeout ──
  if (buzzerActive && (millis() - buzzerStartTime >= BUZZER_DURATION_MS)) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerActive = false;
  }

  // ── Handle Servo timeout ──
  if (gateOpen && (millis() - gateOpenTime >= SERVO_OPEN_MS)) {
    gateServo.write(0); // Close gate
    gateOpen = false;
    lcdPrint("Gate Closed", "Ready");
  }

  // ── WiFi watchdog ──
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
    return;
  }

  // ── Scan cooldown ──
  if (millis() - lastScanTime < SCAN_COOLDOWN_MS)
    return;

  // ── Handle IR Auto-Entry Logic ──
  // Assuming IR sensor returns LOW when an object is detected
  if (digitalRead(IR_PIN) == LOW && !gateOpen) {
      Serial.println("[IR] Human detected at Automated Gate!");
      gateServo.write(90); // Open gate
      gateOpen = true;
      gateOpenTime = millis();
      lastScanTime = millis();
      
      // Ultrasonic detection during the 3-sec window
      int personCount = countPersons();
      Serial.printf("[SENSOR] Persons detected during IR open: %d\n", personCount);
      
      if (personCount >= MULTI_PERSON_THRESHOLD) {
          activateBuzzer();
          lcdPrint("SECURITY ALERT!", "Multiple Persons");
          ledStatus(false);
      } else {
          lcdPrint("Auto Exit Open", "Proceed Slowly");
          ledStatus(true);
      }

      // Log auto exit to Google Sheets via backend
      sendAttendance("AUTO_EXIT_IR", personCount);
      return;
  }

  // ── Wait for RFID card ──
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  // ── Read UID ──
  String uid = readRFID();
  lastScanTime = millis();

  int personCount = countPersons();
  lcdPrint("Card: " + uid, "Verifying...");

  if (personCount >= MULTI_PERSON_THRESHOLD) {
    lcdPrint("SECURITY ALERT!", "Multiple Persons");
    activateBuzzer();
    ledStatus(false);
  }

  sendAttendance(uid, personCount);

  // Stop RFID
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
 *  HC-SR05 ULTRASONIC SENSOR:
 *  ┌─────────┬───────────┐
 *  │ Sensor  │ ESP32     │
 *  ├─────────┼───────────┤
 *  │ VCC     │ 5V (VIN)* │
 *  │ GND     │ GND       │
 *  │ TRIG    │ GPIO 12   │
 *  │ ECHO    │ GPIO 14   │
 *  │ OUT     │ (Not used)│
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
 *  │ SCL     │ GPIO 22   │
 *  │ VCC     │ 5V*       │
 *  │ GND     │ GND       │
 *  └─────────┴───────────┘
 *
 *  IR SENSOR & SERVO:
 *  IR OUT   → GPIO 13
 *  SERVO IN → GPIO 15
 *  Servo & IR VCC → *External 5V Power Supply*
 *
 *  LED INDICATORS:
 *  Green LED (+) → GPIO 26 → 220Ω resistor → GND
 *  Red   LED (+) → GPIO 25 → 220Ω resistor → GND
 *
 * ===================================================================
 *  CRITICAL WIRING NOTE (EXTERNAL POWER & COMMON GROUND):
 * ===================================================================
 *  Because the ESP32 cannot supply enough current for the Servo and 
 *  I2C LCD simultaneously, you MUST use an external 5V power supply.
 *  
 *  RULE 1: Connect the (+) of the external supply ONLY to the Servo, 
 *          LCD, and IR Sensor VCC pins. DO NOT connect it into the 
 *          ESP32 3V3 Pin!
 *  RULE 2: MUST COMMON GROUND! You MUST connect the GND of the external
 *          power supply to the GND pin of the ESP32. If you don't form 
 *          a common ground, the data pulses (PWM) will not work.
 * ===================================================================
 *  DEPLOYMENT STEPS
 * ===================================================================
 *  1. Install Arduino IDE + ESP32 board package
 *  2. Install libraries: MFRC522, ArduinoJson, LiquidCrystal_I2C, ESP32Servo
 *  3. Set WIFI_SSID, WIFI_PASSWORD
 *  4. Select: Tools → Board → ESP32 Dev Module
 *  5. Select: Tools → Port → COMx (your ESP32 port)
 *  6. Upload and open Serial Monitor at 115200 baud
 * ===================================================================
 */
