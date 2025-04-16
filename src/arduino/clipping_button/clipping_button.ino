const int buttonPin = 43;

int buttonState = 0;

void setup() {
  pinMode(buttonPin, INPUT);
  Serial.begin(9600);
}

void loop() {
  buttonState = digitalRead(buttonPin);

  if (buttonState == LOW) {
    Serial.write("Clip\n");
    delay(250); //delay here or its gonna send data out like crazy
  }
}
