import pyttsx3
import requests
import json
import sys


# the Python code that is used with the insulting function of TuringMod
# I decided to write the code here in Python and not in JS because I wanted a challenge with having to stitch
# two separate languages into a singular project and have them communicate, as well as I had already made a TTS
# machine for a different project and the code was simple enough to implement on its own without rewriting everything.

def get_insult():
    headers = {'Content-Type': 'application/json'}
    insult_response = requests.get('https://evilinsult.com/generate_insult.php?lang=en&type=json',
                                   headers=headers)
    text = json.dumps(insult_response.json(), sort_keys=True, indent=4)
    jobj = json.loads(text)
    return jobj["insult"]


class TTSMachine:

    def __init__(self):
        super(TTSMachine, self).__init__()
        self.engine = pyttsx3.init()
        self.engine.setProperty("rate", 150)

    def speak_text(self, text_to_say):
        self.engine.say(text_to_say)
        self.engine.runAndWait()

    def speak_insult(self):
        insult = get_insult()
        self.speak_text(insult)


def main():
    print(sys.path)
    machine = TTSMachine()
    machine.speak_insult()


if __name__ == "__main__":
    main()
