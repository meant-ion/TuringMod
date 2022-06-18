import obspython as S
import random, time

# done with assistance from @GunP0P0 on twitch: twitch.tv/GunP0P0

# upper limit for moving the camera in scene: 3840, 2160
# TODO: 1: Figure out how to get the dimension of the camera (DONE)
#       2: Figure out how to get the dimension of the current scene (DONE)
#       3: Using those dimensions, get the face cam to not go out of bounds of the current scene (DONE)
#       4: Animate the camera moving around for ~1 minute 

# vector flip from @GunP0P0: if (position.y > max_height || postition.y < 0) speed.y *= -1

class CameraMover:

    def __init__(self):
        self.location = S.vec2()
        self.scale = S.vec2()
        self.speed = {"x": 0.0, "y": 0.0}
        self.init_pos = {"x": 0.0, "y": 0.0}

    def move_camera(self):
        current_scene = S.obs_frontend_get_current_scene()
        source = S.obs_get_source_by_name("Facecam")
        screen_source = S.obs_get_source_by_name("Primary Monitor")
        scene = S.obs_scene_from_source(current_scene)
        scene_item = S.obs_scene_find_source(scene, "Facecam")
        width = S.obs_source_get_width(source)
        height = S.obs_source_get_height(source)
        screen_width = S.obs_source_get_width(screen_source)
        screen_height = S.obs_source_get_height(screen_source)

        if scene_item:

            self.speed["x"] = random.randint(-2,2)
            self.speed["y"] = random.randint(-2,2)
            S.obs_sceneitem_get_pos(scene_item, self.location)
            self.init_pos["x"] = self.location.x
            self.init_pos["y"] = self.location.y
            S.obs_sceneitem_get_scale(scene_item, self.scale)
            actual_width = int(width * self.scale.x)
            actual_height = int(height * self.scale.y)
            # rand_x, rand_y = random.randint(0, screen_width-actual_width), random.randint(0, screen_height-actual_height)
            # self.location.x = rand_x
            # self.location.y = rand_y
            

            start_time = time.time()

            while(time.time()-start_time < 60):
                self.location.x += self.speed["x"]
                self.location.y += self.speed["y"]
                if (self.location.x > screen_width-actual_width or self.location.x < 0):
                    self.speed["x"] *= -1
                if (self.location.y > screen_height-actual_height or self.location.y < 0):
                    self.speed["y"] *= -1
                S.obs_sceneitem_set_pos(scene_item, self.location)
                time.sleep(0.001)

            self.location.x = self.init_pos["x"]
            self.location.y = self.init_pos["y"]
            S.obs_sceneitem_set_pos(scene_item, self.location)

        S.obs_scene_release(scene)
        S.obs_source_release(source)

    def edit_camera_filters(self):
        current_scene = S.obs_frontend_get_current_scene()
        source = S.obs_get_source_by_name("Facecam")
        scene = S.obs_scene_from_source(current_scene)
        scene_item = S.obs_scene_find_source(scene, "Facecam")

        if scene_item:
            settings = S.obs_data_create()
            S.obs_data_set_int(settings, "opacity", 50)
            source_color = S.obs_source_create_private(
                "color_filter", "opacity to 50", settings
            )
            S.obs_source_filter_add(source, source_color)

            S.obs_source_release(source)
            S.obs_data_release(settings)
            S.obs_source_release(source_color)


cam = CameraMover()

print("File is executing through OBS Python Scripting")

# cam.edit_camera_filters()

cam.move_camera()
