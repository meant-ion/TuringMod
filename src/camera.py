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
        # want the colors to be a bit more random, so we keep track of the last color used so it doesn't pop up twice in a row
        self.last_color = None

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
            # in case one of the speed values comes up as zero, meaning it would be bound either to the top 
            # or left edge of the screen
            while (self.speed["x"] == 0):
                self.speed["x"] = random.randint(-2,2)
            while (self.speed["y"] == 0):
                self.speed["y"] = random.randint(-2,2)
            
            S.obs_sceneitem_get_pos(scene_item, self.location)
            self.init_pos["x"] = self.location.x
            self.init_pos["y"] = self.location.y
            S.obs_sceneitem_get_scale(scene_item, self.scale)
            actual_width = int(width * self.scale.x)
            actual_height = int(height * self.scale.y)
            

            start_time = time.time()

            # The animation part. Flips the movement vector when facecam hits an edge/corner
            while(time.time()-start_time < 60):
                self.location.x += self.speed["x"]
                self.location.y += self.speed["y"]
                if (self.location.x > screen_width-actual_width or self.location.x < 0):
                    self.speed["x"] *= -1
                    self.edit_camera_filters()
                if (self.location.y > screen_height-actual_height or self.location.y < 0):
                    self.speed["y"] *= -1
                    self.edit_camera_filters()
                S.obs_sceneitem_set_pos(scene_item, self.location)
                time.sleep(0.001)

            time.sleep(2.5)

            self.location.x = self.init_pos["x"]
            self.location.y = self.init_pos["y"]
            S.obs_sceneitem_set_pos(scene_item, self.location)

        self.reset_camera_filter(source)
        S.obs_scene_release(scene)
        S.obs_source_release(source)

    def edit_camera_filters(self):
        current_scene = S.obs_frontend_get_current_scene()
        source = S.obs_get_source_by_name("Facecam")
        scene = S.obs_scene_from_source(current_scene)
        scene_item = S.obs_scene_find_source(scene, "Facecam")

        # list of colors used in this script (in order): White, Red, Orange, Yellow, Green, Blue, Violet, Purple
        color_list = ['ffffff', 'ff0000', 'ffa500', 'ffff00', '008000', '0000ff', 'ee82ee', '800080']

        if scene_item:

            self.reset_camera_filter(source)

            settings = S.obs_data_create()
            index = random.randint(0, len(color_list) - 1)
            while (self.last_color == color_list[index]):
                index = random.randint(0, len(color_list) - 1)
            self.last_color = color_list[index]

            S.obs_data_set_int(settings, "color_multiply", int(color_list[index], 16))
            source_color = S.obs_source_create_private(
                "color_filter_v2", "DVD Screensaver Edge Color Change", settings
            )
            S.obs_source_filter_add(source, source_color)

            S.obs_source_release(source)
            S.obs_data_release(settings)
            S.obs_source_release(source_color)

    # No good way to change the filter color if filter already exists, so delete old filter and remake with
    # new filter value
    def reset_camera_filter(self, source):
        old_filter = S.obs_source_get_filter_by_name(source, "DVD Screensaver Edge Color Change")
        if old_filter is not None:
            S.obs_source_filter_remove(source, old_filter)
            S.obs_source_release(old_filter)


cam = CameraMover()

# cam.move_camera()

def screen_saver(props, prop):
    cam.move_camera()

def script_description():
    return "Makes the facecam do a DVD screensaver style animation"

def script_properties():
    props = S.obs_properties_create()
    S.obs_properties_add_button(props, "button1", "Activate The Screen Saver", screen_saver)
    return props