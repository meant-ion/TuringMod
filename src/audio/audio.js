import Audic from 'audic';

export default async function audio() {

    const audic = new Audic('./drugsandalkohol.mp3');

    audic.volume = 1;

    console.log("Playing audio through audic now");

    await audic.play();

    // audic.addEventListener('ended', () => {
    //     audic.destroy();
    // });
}

