from playsound import playsound
import os, sys, random

def main(index):
    sound_list = ['shotgun-firing-4-6746.mp3','bonk.mp3','reeee.mp3','lot-of-dmg.mp3','air-horn.mp3',
                  'fail.mp3','emotional-dmg.mp3','not-fine.mp3','anime-god.mp3','AAAAAAAA.mp3','rack.mp3'
                  'no-god-pls-no.mp3','tacti-nuke.mp3']
    playsound(os.path.join(sys.path[0], sound_list[index]))

if __name__ == "__main__":
    if len(sys.argv) != 1:
        val = sys.argv[1:]
        i = int(val[0])
        main(i)
    else:
        main(random.randint(0,12))