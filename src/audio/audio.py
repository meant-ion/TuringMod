from playsound import playsound
import os, sys, random, threading

class Audio:
    def __init__(self) -> None:
        self.sound_list = []
        self.p = None
        self._stop_event = threading.Event()
        for root, dirs, files in os.walk(sys.path[0]):
            for file in files:
                if (file.endswith(".mp3") and file != "audio.wav" and file != "audio.py"):
                    self.sound_list.append(file)
    def _play_sound(self, i):
        playsound(os.path.join(sys.path[0], i))
    def play_sound(self, i):
        playsound(os.path.join(sys.path[0], i))
    def kill_sound(self):
        self._stop_event.set()
    def play_rand_sound(self):
        playsound(os.path.join(sys.path[0], self.sound_list[random.randint(0, len(self.sound_list) - 1)]))


if __name__ == "__main__":
    a = Audio()
    # to play either the bonk sound effect or to play the AI TTS file
    if len(sys.argv) != 1:
        val = sys.argv[1:]
        i = str(val[0])
        if (i == 'stop'):
            a.kill_sound()
        else:
            a.play_sound(i)
    else:
        a.play_rand_sound()