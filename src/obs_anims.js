export class OBSAnimations {

    #obs; // the websocket to connect and manipulate OBS
    #last_color;
    #helper;
    #original_facecam_info;
    #bonk_calls;

    color_list = [16777215, 16711680, 16753920, 16776960, 32768, 255, 15631086, 8388736];

    constructor(o, h) {
        this.#obs = o;
        this.#last_color = 0;
        this.#helper = h;
        this.#bonk_calls = 0;
        this.#original_facecam_info = new Map();

        this.#capture_facecam_dimensions();
    }

    // no vertical scene changes
    async DVD_Screensaver() {
        let scene_info = await this.#gather_scene_and_source_info(true);

        let source_height = scene_info[0][2].sourceHeight;
        let source_width = scene_info[0][2].sourceWidth;

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

        await this.#filter_spawn('DVD Screensaver Edge Color Change');

        let start = Date.now();

        while (Date.now() - start < 30000) {
            if (bounced) bounced = !bounced;

            scene_info[0][1].positionX += speed.x;
            scene_info[0][1].positionY += speed.y;

            if (
                scene_info[0][1].positionX >
                source_width -
                (source_width -
                    (source_width -
                        scene_info[0][1].width +
                        scene_info[0][1].cropLeft -
                        scene_info[0][1].cropRight))
                || scene_info[0][1].positionX < 0
            ) {
                speed.x *= -1;
                bounced = !bounced;
            }

            if (
                scene_info[0][1].positionY >
                (source_height +
                    scene_info[0][1].cropBottom +
                    scene_info[0][1].cropTop) -
                (source_height -
                    (source_height - scene_info[0][1].height))
                || scene_info[0][1].positionY < 0
            ) {
                speed.y *= -1;
                bounced = !bounced;
            }

            //needs to have these be >= 1
            this.#reset_bounds(scene_info[0][1]);

            await this.#set_facecam_transform(scene_info[0]);

            if (bounced) {
                await this.#filter_kill('DVD Screensaver Edge Color Change');
                await this.#filter_spawn('DVD Screensaver Edge Color Change');
            }

            await this.#helper.sleep(0);
        }

        await this.#set_facecam_transform(
            scene_info[0],
            this.#get_original_facecam(scene_info[0][6])
        );

        await this.#filter_kill('DVD Screensaver Edge Color Change');
        await this.#check_and_fix_facecam();
    }

    // plays a bonk sound effect and squishes facecam
    // vertical and horizontal
    async bonk_squish() {
        ++this.#bonk_calls;

        await this.#helper.sleep(750); //give VLC enough time to play the bonk sound effect

        let scene_info = await this.#gather_scene_and_source_info();

        for (const info of scene_info) {
            let original = this.#get_original_facecam(info[6]);

            if (!original) continue;

            if (this.#bonk_calls % 2 != 0) {
                info[1].scaleY = original.scaleY / 2;
                info[1].positionY = info[2].sourceHeight - (original.height / 2);
            } else {
                info[1].scaleX = original.scaleX / 2;
            }

            this.#reset_bounds(info[1]);

            await this.#set_facecam_transform(info);
        }

        await this.#helper.sleep(10000);

        // Restore each canvas from its own original transform.
        for (const info of scene_info) {
            let original = this.#get_original_facecam(info[6]);

            if (!original) continue;

            await this.#set_facecam_transform(
                info,
                original
            );
        }

        await this.#check_and_fix_facecam();
    }

    // makes it look like my facecam is from a land down under. Vertical and horizontal
    async australia() {
        let scene_info = await this.#gather_scene_and_source_info();

        for (const info of scene_info) {
            let original = this.#get_original_facecam(info[6]);

            if (!original) continue;

            info[1].rotation = 180;
            info[1].positionX += original.width;
            info[1].positionY += original.height;

            await this.#set_facecam_transform(info);
        }

        await this.#helper.sleep(10000);

        // Restore each canvas from its own original transform.
        for (const info of scene_info) {
            await this.#set_facecam_transform(
                info,
                this.#get_original_facecam(info[6])
            );
        }

        await this.#check_and_fix_facecam();
    }

    // vertical and horizontal
    async barrel_roll() {
        let scene_info = await this.#gather_scene_and_source_info();

        for (const info of scene_info) {
            this.#reset_bounds(info[1]);

            info[1].alignment = 0; // sets the alignment position to center instead of top left corner

            //move the position back to it's original position since that changes with the alignment
            info[1].positionX += info[1].width / 2;
            info[1].positionY += info[1].height / 2;
        }

        for (let i = 0; i < 360; ++i) {
            for (const info of scene_info) {
                info[1].rotation = info[1].rotation >= 359 ? 0 : info[1].rotation + 1;
                // if (info[1].rotation >= 359) info[1].rotation = 0;
                // else info[1].rotation += 1;

                await this.#set_facecam_transform(info);
            }

            await this.#helper.sleep(2);
        }

        await this.#check_and_fix_facecam();
    }

    /**
     * Vertical and horizontal
     * @param {boolean} transform_axis true for wide pope, false for long pope
     * @param {boolean} _in_separate_anim helps prevent issues when separate animation is going on
     */
    async warp_facecam(transform_axis, _in_separate_anim = false) {
        let scene_info = await this.#gather_scene_and_source_info();

        for (const info of scene_info) {
            let original = this.#get_original_facecam(info[6]);

            if (!original) continue;

            if (transform_axis) {
                if (info[1].cropLeft < 500) {
                    info[1].cropLeft = original.width / 1.29;
                    info[1].cropRight = original.width / 1.29;
                }

                if (info[1].scaleX < 4) {
                    info[1].scaleX = original.scaleX * 8;
                }
            } else {
                if (info[1].cropTop < 500) {
                    info[1].cropTop = original.width / 2;
                    info[1].cropBottom = original.width / 2;
                }

                if (info[1].scaleY < 4) {
                    info[1].scaleY = original.scaleY * 8;
                }

                // calculate new pos for camera since the scale will shift a ton of the video down below the output
                info[1].positionY =
                    info[2].height -
                    ((original.height * info[1].scaleY) -
                    (info[1].height * original.scaleY) -
                    (info[1].cropTop * 1.2));
            }

            this.#reset_bounds(info[1]);

            await this.#set_facecam_transform(info);
        }

        await this.#helper.sleep(_in_separate_anim ? 4000 : 10000);

        await this.#check_and_fix_facecam();
    }

    // vertical and horizontal
    async ads_warning() {
        let scene_info = await this.#gather_scene_and_source_info();

        await this.#obs.call('ToggleInputMute', {
            inputName: 'Mic/Aux'
        });

        for (const info of scene_info) {
            if (info[5]) {
                await this.#set_scene_item_enabled(
                    info,
                    info[5],
                    true
                );
            }

            if (info[0] != "MY Ugly Fucking Mug Front And Center") {
                await this.#set_scene_item_enabled(
                    info,
                    info[3],
                    false
                );
            }
        }

        await this.#helper.sleep(180000);

        for (const info of scene_info) {
            if (info[5]) {
                await this.#set_scene_item_enabled(
                    info,
                    info[5],
                    false
                );
            }

            if (info[0] != "MY Ugly Fucking Mug Front And Center") {
                await this.#set_scene_item_enabled(
                    info,
                    info[3],
                    true
                );
            }
        }

        await this.#obs.call('ToggleInputMute', {
            inputName: 'Mic/Aux'
        });
    }

    async getStreamTimestamp() {
        const stream_status = await this.#obs.call('GetStreamStatus');

        return stream_status.outputTimecode;
    }

    /**
     * @param {string} scene_name
     */
    async changeCurrentScene(scene_name) {
        await this.#obs.call('SetCurrentProgramScene', {
            sceneName: scene_name
        });
    }

    /**
     * Gets scene/source information for both Main and Aitum canvases.
     *
     * scene_info format:
     *
     * [
     *     scene_name,
     *     facecam_info,
     *     source_info,
     *     facecam_id,
     *     main_screen_id,
     *     ads_text_id,
     *     canvas_uuid
     * ]
     *
     * @param {boolean} main_only the main, horizontal canvas
     */
    async #gather_scene_and_source_info(main_only = false) {
        const scene = await this.#obs.call('GetCurrentProgramScene');
        const canvases = await this.#obs.call('GetCanvasList');

        let scene_info = [];

        for (const canvas of canvases.canvases) {
            const isMain = canvas.canvasName == 'Main';
            const isVertical = canvas.canvasName.includes('Aitum');

            if (!isMain && !isVertical) continue;

            if (main_only && !isMain) continue;

            let scene_name;

            if (isMain) {
                scene_name = scene.sceneName;
            } else {
                const vertical_scene_list = await this.#obs.call('GetSceneList', {
                    canvasUuid: canvas.canvasUuid
                });

                if (!vertical_scene_list.scenes.length) continue;

                scene_name = vertical_scene_list.scenes[0].sceneName;
            }

            const source_list = await this.#obs.call('GetSceneItemList', {
                canvasUuid: canvas.canvasUuid,
                sceneName: scene_name
            });

            let facecam_id, main_screen_id, ads_text_id;

            for (const item of source_list.sceneItems) {
                if (item.sourceName == "Facecam") facecam_id = item.sceneItemId;

                if (item.inputKind == "monitor_capture" || item.inputKind == "game_capture") main_screen_id = item.sceneItemId;

                if (item.sourceName == "Ads Text") ads_text_id = item.sceneItemId;
            }

            if (!facecam_id) continue;

            let facecam_info = await this.#obs.call('GetSceneItemTransform', {
                canvasUuid: canvas.canvasUuid,
                sceneName: scene_name,
                sceneItemId: facecam_id
            });

            let source_info = {
                sourceHeight: 0,
                sourceWidth: 0,
                height: 0,
                width: 0
            };

            if (main_screen_id) {
                let source = await this.#obs.call('GetSceneItemTransform', {
                    canvasUuid: canvas.canvasUuid,
                    sceneName: scene_name,
                    sceneItemId: main_screen_id
                });

                source_info = source.sceneItemTransform;
            }

            scene_info.push([
                scene_name,
                facecam_info.sceneItemTransform,
                source_info,
                facecam_id,
                main_screen_id,
                ads_text_id,
                canvas.canvasUuid
            ]);
        }

        return scene_info;
    }

    /**
     * Sets a Facecam transform.
     *
     * A copy is sent to OBS so the original transform stored in
     * #original_facecam_info cannot accidentally be modified.
     */
    async #set_facecam_transform(scene_info, transform = scene_info[1]) {
        await this.#obs.call('SetSceneItemTransform', {
            canvasUuid: scene_info[6],
            sceneName: scene_info[0],
            sceneItemId: scene_info[3],
            sceneItemTransform: structuredClone(transform)
        });
    }

    /**
     * Enables/disables a scene item.
     */
    async #set_scene_item_enabled(scene_info, scene_item_id, enabled) {
        await this.#obs.call('SetSceneItemEnabled', {
            canvasUuid: scene_info[6],
            sceneName: scene_info[0],
            sceneItemId: scene_item_id,
            sceneItemEnabled: enabled
        });
    }

    // original copy needed to allow us to return to the standard after animation
    #get_original_facecam(canvas_uuid) {
        let original = this.#original_facecam_info.get(canvas_uuid);

        if (!original) {
            return null;
        }

        return structuredClone(original);
    }

    #reset_bounds(transform) {
        transform.boundsWidth = 1;
        transform.boundsHeight = 1;
    }

    async #capture_facecam_dimensions() {
        const canvases = await this.#obs.call('GetCanvasList');
        const cur = await this.#obs.call('GetCurrentProgramScene');

        for (const canvas of canvases.canvases) {
            const canvasName = canvas.canvasName;
            const isMainScene = canvasName == 'Main';
            const isVerticalScene = canvasName.includes('Aitum');

            if (!isMainScene && !isVerticalScene) continue;

            let scene_name;

            if (isMainScene) {
                // get the main canvas current scene; helps make this agnostic to scene changes
                scene_name = cur.sceneName;
            } else {
                const canvas_scenes = await this.#obs.call('GetSceneList', {
                    canvasUuid: canvas.canvasUuid
                });

                if (!canvas_scenes.scenes.length) continue;

                scene_name = canvas_scenes.scenes[0].sceneName;
            }

            const source_list = await this.#obs.call('GetSceneItemList', {
                canvasUuid: canvas.canvasUuid,
                sceneName: scene_name
            });

            let facecam_id;

            for (let i in source_list.sceneItems) {
                if (source_list.sceneItems[i].sourceName == "Facecam") {
                    facecam_id = source_list.sceneItems[i].sceneItemId;
                    break;
                }
            }

            if (!facecam_id) continue;

            let facecam_info = await this.#obs.call('GetSceneItemTransform', {
                canvasUuid: canvas.canvasUuid,
                sceneName: scene_name,
                sceneItemId: facecam_id
            });

            // Store a DEEP COPY so animations cannot modify the original.
            this.#original_facecam_info.set(
                canvas.canvasUuid,
                structuredClone(facecam_info.sceneItemTransform)
            );
        }
    }

    async #check_and_fix_facecam() {
        let scene_info = await this.#gather_scene_and_source_info();

        for (const info of scene_info) {
            let original = this.#get_original_facecam(info[6]);

            if (!original) continue;

            if (JSON.stringify(info[1]) != JSON.stringify(original)) {
                this.#reset_bounds(original);

                await this.#set_facecam_transform(
                    info,
                    original
                );
            }
        }
    }

    /**
     * creates a filter for a scene
     * @param {string} filter_name
     */
    async #filter_spawn(filter_name) {
        let color_index = Math.floor(
            Math.random() * (this.color_list.length - 1) + 1
        );

        while (this.#last_color == this.color_list[color_index]) {
            color_index = Math.floor(
                Math.random() * (this.color_list.length - 1) + 1
            );
        }

        this.#last_color = this.color_list[color_index];

        let filter_kind;
        let filter_settings;

        switch (filter_name) {
            case 'DVD Screensaver Edge Color Change':
                filter_kind = 'color_filter_v2';

                filter_settings = {
                    color_add: this.color_list[color_index]
                };

                break;
        }

        await this.#obs.call('CreateSourceFilter', {
            sourceName: 'Facecam',
            filterName: filter_name,
            filterKind: filter_kind,
            filterSettings: filter_settings,
        });
    }

    async #filter_kill(filter_name) {
        await this.#obs.call('RemoveSourceFilter', {
            sourceName: 'Facecam',
            filterName: filter_name,
        });
    }
}

export default OBSAnimations;