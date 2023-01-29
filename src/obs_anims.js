
export class OBSAnimations {

    #obs; // the websocket to connect and manipulate OBS
    #last_color;
    
    color_list = [16777215, 16711680, 16753920, 16776960, 32768, 255, 15631086, 8388736];

    constructor(o) {
        this.#obs = o;
        this.#last_color = 0;
    }

    async DVD_Screensaver() {
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
        facecam_info = facecam_info.sceneItemTransform;
        source_info = source_info.sceneItemTransform;
        let source_height = source_info.sourceHeight;
        let source_width = source_info.sourceWidth;

        let init_pos = {
            x: facecam_info.positionX,
            y: facecam_info.positionY,
        };
        let speed = {
            x: Math.round(Math.random() * (5 + 5 + 1) - 5) + 3,
            y: Math.round(Math.random() * (5 + 5 + 1) - 5) + 3,
        };

        //in case one of the speed values ends up as zero
        while (speed.x == 0) {
            speed.x = Math.round(Math.random());
        } while (speed.y == 0) {
            speed.y = Math.round(Math.random());
        }

        let bounced = false;

        await this.#filter_spawn();

        let start = Date.now();

        while (Date.now() - start < 30000) {
            if (bounced) { bounced = !bounced; }
            facecam_info.positionX += speed.x;
            facecam_info.positionY += speed.y;
            if (facecam_info.positionX > source_width - (source_width - 2944) || facecam_info.positionX < 0) {
                speed.x *= -1;
                bounced = !bounced;
            }
            if (facecam_info.positionY > source_height - (source_height - 1656) || facecam_info.positionY < 0) {
                speed.y *= -1;
                bounced = !bounced;
            }
            //needs to have these be >= 1
            facecam_info.boundsWidth = 1;
            facecam_info.boundsHeight = 1;

            await this.#obs.call('SetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: facecam_id, sceneItemTransform: facecam_info});
            if (bounced) {
                await this.#filter_kill();
                await this.#filter_spawn();
            }
            await this.#sleep(0);
        }

        facecam_info.positionX = init_pos.x;
        facecam_info.positionY = init_pos.y;

        await this.#obs.call('SetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: facecam_id, sceneItemTransform: facecam_info});
        await this.#filter_kill();
    }

    async bonk_squish() {
        await this.#sleep(750);
        const scene = await this.#obs.call('GetCurrentProgramScene');
        const source_list = await this.#obs.call('GetSceneItemList', {sceneName: scene.currentProgramSceneName});
        let facecam_id;
        for (let i in source_list.sceneItems) {
            if (source_list.sceneItems[i].sourceName == "Facecam") {
                facecam_id = source_list.sceneItems[i].sceneItemId;
            }
        }
        let facecam_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: facecam_id});
        facecam_info = facecam_info.sceneItemTransform;
        let original_scale = facecam_info.scaleY;
        let original_height = facecam_info.height;
        facecam_info.scaleY = original_scale / 2;
        facecam_info.positionY = original_height / 2;
        facecam_info.boundsWidth = 1;
        facecam_info.boundsHeight = 1;
        await this.#obs.call('SetSceneItemTransform', {sceneName: scene.currentProgramSceneName,sceneItemId: facecam_id,sceneItemTransform: facecam_info});
        facecam_info = await this.#obs.call('GetSceneItemTransform', {sceneName: scene.currentProgramSceneName, sceneItemId: facecam_id});
        facecam_info.scaleY = original_scale;
        facecam_info.positionY = 0;
        await this.#sleep(10000);
        await this.#obs.call('SetSceneItemTransform', {
            sceneName: scene.currentProgramSceneName,
            sceneItemId: facecam_id,
            sceneItemTransform: facecam_info,
        });
    }

    #sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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

}

export default OBSAnimations;