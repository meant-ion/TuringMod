from playsound import playsound
import os, sys, random

def main(index):
    sound_list = ['shotgunfiring.mp3','bonk.mp3','reeee.mp3','lotofdmg.mp3','airhorn.mp3',
                  'fail.mp3','notfine.mp3','animegod.mp3','rack.mp3',
                  'nogodplsno.mp3','tactinuke.mp3','bababooey.mp3','knockknock.mp3']
    playsound(os.path.join(sys.path[0], sound_list[index]))

if __name__ == "__main__":
    if len(sys.argv) != 1:
        val = sys.argv[1:]
        i = int(val[0])
        main(i)
    else:
        main(random.randint(0,11))