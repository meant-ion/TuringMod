from playsound import playsound
import os, sys, random

def main():
    sound_list = []
    for root, dirs, files in os.walk(sys.path[0]):
        for file in files:
            if (file.endswith(".mp3")):
               sound_list.append(file)
    playsound(os.path.join(sys.path[0], sound_list[random.randint(0, len(sound_list) - 1)]))

if __name__ == "__main__":
    # to play either the bonk sound effect or to play the AI TTS file
    if len(sys.argv) != 1:
        val = sys.argv[1:]
        i = str(val[0])
        playsound(os.path.join(sys.path[0], i))
    else:
        main()