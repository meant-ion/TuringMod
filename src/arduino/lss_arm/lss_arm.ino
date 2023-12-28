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
const int clipButtonPin = 51;
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
  
  // Initialize the LSS bus
  LSS::initBus(LSS_SERIAL, LSS_BAUD);

  // Initialize LSS to position 0.0 °
  setAllToZero();

  // Wait for it to get there
  delay(2000);

  twistAndBend();
}

void loop()
{
  clipButtonState = digitalRead(clipButtonPin);

  if (clipButtonState == HIGH) {
    Serial.write("Clip\n");
    delay(250);
  }
  
//  delay(2000);
//  twistAndBend();
//  delay(2000);
//  setAllToZero();
}

// test function, need to make sure that it can move as directed
void twistAndBend() {

  baseLSS.move(200);
  delay(1000);
  shoulderLSS.move(125);
  delay(1000);
  elbowLSS.move(50);
  
}

void setAllToZero() {
  baseLSS.move(0);
  shoulderLSS.move(0);
  elbowLSS.move(0);
  wristLSS.move(0);
  rotatorLSS.move(0);
  clawLSS.move(0);
}
