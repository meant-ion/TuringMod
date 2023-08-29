
export class OBSAnimations {

    #obs; // the websocket to connect and manipulate OBS
    #last_color;
    #helper;
    #original_facecam_info;
    
    color_list = [16777215, 16711680, 16753920, 16776960, 32768, 255, 15631086, 8388736];

    constructor(o, h) {
        this.#obs = o;
        this.#last_color = 0;
        this.#helper = h;
        this.#capture_facecam_dimensions();
    }

    async DVD_Screensaver() {
        let scene_info = await this.#gather_scene_and_source_info();
        let source_height = scene_info[2].sourceHeight;
        let source_width = scene_info[2].sourceWidth;

        let speed = {
            x: Math.round(Math.random() * (5 + 5 + 1) - 5) + 3,
            y: Math.round(Math.random() * (5 + 5 + 1) - 5) + 3,
        };

        //in case one of the speed values ends up as less than or equal to 3
        while (speed.x <= 3) {
            speed.x = speed.x + 1;
        } while (speed.y <= 3) {
            speed.y = speed.y + 1;
        }

        let bounced = false;

        await this.#filter_spawn();

        let start = Date.now();

        while (Date.now() - start < 30000) {
            if (bounced) bounced = !bounced;
            scene_info[1].positionX += speed.x;
            scene_info[1].positionY += speed.y;
            if (scene_info[1].positionX > source_width - (source_width - (source_width - scene_info[1].width)) || scene_info[1].positionX < 0) {
                speed.x *= -1;
                bounced = !bounced;
            }
            if (scene_info[1].positionY > source_height - (source_height - (source_height - scene_info[1].height)) || scene_info[1].positionY < 0) {
                speed.y *= -1;
                bounced = !bounced;
            }
            //needs to have these be >= 1
            scene_info[1].boundsWidth = 1;
            scene_info[1].boundsHeight = 1;

            await this.#obs.call('SetSceneItemTransform', {sceneName: scene_info[0], sceneItemId: scene_info[3], sceneItemTransform: scene_info[1]});
            if (bounced) {
                await this.#filter_kill();
                await this.#filter_spawn();
            }
            await this.#helper.sleep(0);
        }

        scene_info[1].positionX = this.#original_facecam_info.positionX;
        scene_info[1].positionY = this.#original_facecam_info.positionY;

        await this.#obs.call('SetSceneItemTransform', {sceneName: scene_info[0], sceneItemId: scene_info[3], sceneItemTransform: scene_info[1]});
        await this.#filter_kill();
        await this.#check_and_fix_facecam();
    }

    async bonk_squish() {
        await this.#helper.sleep(750); //give VLC enough time to play the bonk sound effect
        let scene_info = await this.#gather_scene_and_source_info();
        let source_height = scene_info[2].sourceHeight;
        scene_info[1].scaleY = this.#original_facecam_info.scaleY / 2;
        scene_info[1].positionY = source_height - (this.#original_facecam_info.height / 2);
        scene_info[1].boundsWidth = 1;
        scene_info[1].boundsHeight = 1;
        await this.#obs.call('SetSceneItemTransform', {sceneName: scene_info[0], sceneItemId: scene_info[3], sceneItemTransform: scene_info[1]});
        let facecam_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene_info[0], sceneItemId: scene_info[3]});
        facecam_info.scaleY = this.#original_facecam_info.scaleY;
        facecam_info.height = this.#original_facecam_info.height;
        facecam_info.positionY = source_height - this.#original_facecam_info.height;
        await this.#helper.sleep(10000);
        await this.#obs.call('SetSceneItemTransform', {
            sceneName: scene_info[0],
            sceneItemId: scene_info[3],
            sceneItemTransform: facecam_info,
        });
        await this.#check_and_fix_facecam();
    }

    // makes it look like my facecam is from a land down under
    async australia() {
        let scene_info = await this.#gather_scene_and_source_info();
        scene_info[1].rotation = 180;
        scene_info[1].positionX += this.#original_facecam_info.width;
        scene_info[1].positionY += this.#original_facecam_info.height;
        await this.#obs.call('SetSceneItemTransform', {sceneName: scene_info[0], sceneItemId: scene_info[3], sceneItemTransform: scene_info[1]});
        scene_info[1].rotation = this.#original_facecam_info.rotation;
        scene_info[1].positionX -= this.#original_facecam_info.width;
        scene_info[1].positionY -= this.#original_facecam_info.height;
        await this.#helper.sleep(10000);
        await this.#obs.call('SetSceneItemTransform', {
            sceneName: scene_info[0],
            sceneItemId: scene_info[3],
            sceneItemTransform: scene_info[1],
        });
        await this.#check_and_fix_facecam();
    }

    async barrel_roll() {
        let scene_info = await this.#gather_scene_and_source_info();
        scene_info[1].boundsWidth = 1;
        scene_info[1].boundsHeight = 1;
        for (let i = 0; i < 360; ++i) {
            scene_info[1].rotation += 1;
            if (i < 180) {
                scene_info[1].positionX = this.#original_facecam_info.width / 180;
                scene_info[1].positionY = this.#original_facecam_info.height / 180;
            } else {
                scene_info[1].positionX -= (this.#original_facecam_info.width / 180);
                scene_info[1].positionY -= (this.#original_facecam_info.height / 180);
            }
            await this.#obs.call('SetSceneItemTransform', {
                sceneName: scene_info[0],
                sceneItemId: scene_info[3],
                sceneItemTransform: scene_info[1]
            });
            await this.#helper.sleep(25);
        }
        await this.#check_and_fix_facecam();
    }

    async wide_pope() {
        let scene_info = await this.#gather_scene_and_source_info();
        scene_info[1].width = scene_info[1].sourceWidth;
        if (scene_info[1].cropLeft < 500) {
            scene_info[1].cropLeft = this.#original_facecam_info.width / 1.29;
            scene_info[1].cropRight = this.#original_facecam_info.width / 1.29;
        }
        scene_info[1].scaleX = scene_info[1].scaleX < 4 ? this.#original_facecam_info.scaleX * 8 : scene_info[1].scaleX;
        scene_info[1].boundsWidth = 1;
        scene_info[1].boundsHeight = 1;
        await this.#obs.call('SetSceneItemTransform', {sceneName: scene_info[0],sceneItemId: scene_info[3],sceneItemTransform: scene_info[1]});
        scene_info[1].cropLeft = this.#original_facecam_info.cropLeft;
        scene_info[1].cropRight = this.#original_facecam_info.cropRight;
        scene_info[1].width = this.#original_facecam_info.width;
        scene_info[1].scaleX = this.#original_facecam_info.scaleX;
        await this.#helper.sleep(10000);
        await this.#obs.call('SetSceneItemTransform', {
            sceneName: scene_info[0],
            sceneItemId: scene_info[3],
            sceneItemTransform: scene_info[1],
        });
        await this.#check_and_fix_facecam();
    }

    async copypasta_animation() {
        const scene = await this.#obs.call('GetCurrentProgramScene');
        const source_list = await this.#obs.call('GetSceneItemList', {sceneName: scene.currentProgramSceneName});
        let main_screen_id;
        for (let i in source_list.sceneItems) {
            if (source_list.sceneItems[i].inputKind == "monitor_capture" || 
                source_list.sceneItems[i].inputKind == "game_capture") {
                    main_screen_id = source_list.sceneItems[i].sceneItemId;
            }
        }
        let source_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: main_screen_id});
        source_info = source_info.sceneItemTransform;
        const inputs_list = await this.#obs.call('GetInputList');
        const input_vol = await this.#obs.call('GetInputVolume', {inputName: inputs_list.inputs[0].inputName});
        const original_volume = input_vol.inputVolumeDb;

        const copypasta_lines = [
            "There is nothing wrong with your Twitch stream",
            "Do not attempt to adjust the picture",
            "We are controlling transmission",
            "If we wish to make it louder, we will bring up the volume",
            "If we wish to make it softer, we will tune it to a whisper",
            "We will control the horizontal",
            "We will control the vertical",
            "We can roll the image, make it flutter",
            "We can change the focus to a soft blur \nor sharpen it to crystal clarity",
            "For the next hour, sit quietly and \nwe will control all that you see and hear",
        ];

        for (let i = 0; i < copypasta_lines.length; ++i) {
            const text_id = await this.#obs.call('CreateInput', {
                sceneName: scene.currentProgramSceneName,
                inputName: `Line ${i}`,
                inputKind: "text_gdiplus_v2",
                inputSettings: {
                    font: {
                        face: "Arial",
                        size: 150,
                        style: "Bold"
                    },
                    outline: true,
                    outline_color: 4278190080,
                    outline_size: 2,
                    text: copypasta_lines[i]
                }
            });
            let new_text_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: text_id.sceneItemId});
            new_text_info = new_text_info.sceneItemTransform;
            new_text_info.positionY = 947;
            new_text_info.boundsWidth = 1;
            new_text_info.boundsHeight = 1;
            await this.#obs.call('SetSceneItemTransform', {
                sceneName: scene.currentProgramSceneName,
                sceneItemId: text_id.sceneItemId,
                sceneItemTransform: new_text_info,
            });

            if (i == 3) {
                await this.#obs.call('SetInputVolume', {inputName: inputs_list.inputs[0].inputName, inputVolumeDb: -1.5});
            } else if (i == 4) {
                await this.#obs.call('SetInputVolume', {inputName: inputs_list.inputs[0].inputName, inputVolumeDb: -40})
            }

            await this.#helper.sleep(4000);
            await this.#obs.call('RemoveInput', {inputName: `Line ${i}`});
            await this.#obs.call('SetInputVolume', {inputName: inputs_list.inputs[0].inputName, inputVolumeDb: original_volume});
        }

    }

    async #gather_scene_and_source_info() {
        const scene = await this.#obs.call('GetCurrentProgramScene');
        const source_list = await this.#obs.call('GetSceneItemList', {sceneName: scene.currentProgramSceneName});
        let facecam_id, main_screen_id;
        for (let i in source_list.sceneItems) {
            if (source_list.sceneItems[i].sourceName == "Facecam") {
                facecam_id = source_list.sceneItems[i].sceneItemId;
            }
            if (source_list.sceneItems[i].inputKind == "monitor_capture" || 
                source_list.sceneItems[i].inputKind == "game_capture") {
                    main_screen_id = source_list.sceneItems[i].sceneItemId;
            }
        }
        let facecam_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: facecam_id});
        let source_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: main_screen_id});
        return [scene.currentProgramSceneName, facecam_info.sceneItemTransform, source_info.sceneItemTransform, facecam_id, main_screen_id];
    }

    async #filter_spawn() {
        let color_index = Math.floor(Math.random() * (this.color_list.length - 1) + 1);
        while (this.#last_color == this.color_list[color_index]) {
            color_index = Math.floor(Math.random() * (this.color_list.length - 1) + 1);
        }
        this.#last_color = this.color_list[color_index];
        await this.#obs.call('CreateSourceFilter', {
            sourceName: 'Facecam', 
            filterName: 'DVD Screensaver Edge Color Change',
            filterKind: 'color_filter_v2',
            filterSettings: {color_add: this.color_list[color_index] },
        });
    }

    async #filter_kill() {
        await this.#obs.call('RemoveSourceFilter', {
            sourceName: 'Facecam',
            filterName: 'DVD Screensaver Edge Color Change',
        });
    }

    async #capture_facecam_dimensions() {
        const scene = await this.#obs.call('GetCurrentProgramScene');
        const source_list = await this.#obs.call('GetSceneItemList', {sceneName: scene.currentProgramSceneName});
        let facecam_id;
        for (let i in source_list.sceneItems) {
            if (source_list.sceneItems[i].sourceName == "Facecam") {
                facecam_id = source_list.sceneItems[i].sceneItemId;
            }
        }
        let facecam_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: facecam_id});
        this.#original_facecam_info = facecam_info.sceneItemTransform;
    }

    async #check_and_fix_facecam() {
        let scene_info = await this.#gather_scene_and_source_info();
        if (scene_info[1] != this.#original_facecam_info) {
            scene_info[1] = this.#original_facecam_info;
            await this.#obs.call('SetSceneItemTransform', {
                sceneName: scene_info[0],
                sceneItemId: scene_info[3],
                sceneItemTransform: scene_info[1],
            });
        }
    }

}

export default OBSAnimations;