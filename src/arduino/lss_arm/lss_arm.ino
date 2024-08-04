#include <LSS.h>
#include <SoftwareSerial.h>

// LSS IDs and other important constants
// Note: when sending arm commands, 10 = 1 Degree
#define LSS_ID_BASE    (1)
#define LSS_ID_SHLDR   (2)
#define LSS_ID_ELBOW   (3)
#define LSS_ID_WRIST   (4)
#define LSS_ID_ROTATOR (5)
#define LSS_ID_CLAW    (6)
#define LSS_BAUD       (LSS_DefaultBaud)

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

// Create a software serial port (LSS Adapter board used in XBee mode)
// This is used so I can still communicate with the board while the arm is attached
SoftwareSerial softSerial(8, 9);

void setup()
{
  pinMode(clipButtonPin, INPUT);
  Serial.begin(9600);
  Serial.write("Booting Robo Arm\n");
  
  // Initialize the LSS bus
  LSS::initBus(softSerial, LSS_BAUD);

  delay(5000);

  // Initialize LSS to position 0.0 °
  setServoSpeeds();

  setAllPosToZero();
}

void loop()
{ 
  if (Serial.available() > 0) {
    int num = Serial.parseInt();
    Serial.write("Got number " + num);

    if (num == 1) {
      wave();     
    }
  }
}


// test function, need to make sure that it can move as directed
void wave() {
  
  wristLSS.setMaxSpeed(70);
  int32_t wristPos = wristLSS.getPosition();
  if (wristPos != -700) {
    wristLSS.move(wristPos * -1);
  }
  wristLSS.move(-700);
  delay(2000);
  clawLSS.setMaxSpeed(50);
  clawLSS.move(500);
  delay(2000);
  clawLSS.move(-500);
  clawLSS.setMaxSpeed(30);
  delay(2000);
  clawLSS.setMaxSpeed(50);
  clawLSS.move(500);
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
  baseLSS.setMaxSpeed(50);
  shoulderLSS.setMaxSpeed(50);
  elbowLSS.setMaxSpeed(50);
  wristLSS.setMaxSpeed(50);
  rotatorLSS.setMaxSpeed(50);
  clawLSS.setMaxSpeed(50);
}
