#include <LSS.h>

// LSS IDs and other important constants
#define LSS_ID_BASE    (1)
#define LSS_ID_SHLDR   (2)
#define LSS_ID_ELBOW   (3)
#define LSS_ID_WRIST   (4)
#define LSS_ID_ROTATOR (5)
#define LSS_ID_CLAW    (6)
#define LSS_BAUD  (LSS_DefaultBaud)
#define LSS_SERIAL  (Serial)

// clip/timestamp button vars
const int clipButtonPin = 53;
int clipButtonState = 0;

// LSS Objects
LSS baseLSS = LSS(LSS_ID_BASE);
LSS shoulderLSS = LSS(LSS_ID_SHLDR);
LSS elbowLSS = LSS(LSS_ID_ELBOW);
LSS wristLSS = LSS(LSS_ID_WRIST);
LSS rotatorLSS = LSS(LSS_ID_ROTATOR);
LSS clawLSS = LSS(LSS_ID_CLAW);

void setup()
{
  pinMode(clipButtonPin, INPUT);
  Serial.begin(9600);
  Serial.write("Booting Robo Arm And Clip Button\n");
  
//  // Initialize the LSS bus
//  LSS::initBus(LSS_SERIAL, LSS_BAUD);
//
//  delay(5000);
//
//  // Initialize LSS to position 0.0 °
//  setServoSpeeds();
//
//  // Wait for it to get there
//  delay(2000);
//
//  setAllPosToZero();
//
//  delay(2000);
}

void loop()
{
  clipButtonState = digitalRead(clipButtonPin);

  if (clipButtonState == HIGH) {
    Serial.write("Clip\n");
    delay(250);
  }
  
//  delay(2000);
//    twistAndBend();
//  delay(2000);
//  setAllToZero();
}


// test function, need to make sure that it can move as directed
void twistAndBend() {
  delay(2000);
  
  shoulderLSS.move(-600);

  delay(2000);

  elbowLSS.move(900);

  delay(2000);

  wristLSS.move(-950);

  delay(2000);

  wave();

  delay(2000);

  shoulderLSS.move(0);

  delay(2000);

  elbowLSS.move(0);

  delay(2000);

  wristLSS.move(0);

  delay(2000);

  clawLSS.move(0);

  delay(2000);
}

void wave() {
  clawLSS.setMaxSpeed(50);
  delay(2000);
  clawLSS.move(500);
  delay(2000);
  clawLSS.move(-500);
  clawLSS.setMaxSpeed(30);
}

void setAllPosToZero() {
  baseLSS.move(0);
  shoulderLSS.move(0);
  elbowLSS.move(0);
  wristLSS.move(0);
  rotatorLSS.move(0);
  clawLSS.move(0);
}

void setServoSpeeds() {
  baseLSS.setMaxSpeed(30);
  shoulderLSS.setMaxSpeed(30);
  elbowLSS.setMaxSpeed(30);
  wristLSS.setMaxSpeed(30);
  rotatorLSS.setMaxSpeed(30);
  clawLSS.setMaxSpeed(30);
}
