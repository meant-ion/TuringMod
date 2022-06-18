import obspython as S
import random

# upper limit for moving the camera in scene: 3840, 2160
# TODO: 1: Figure out how to get the dimension of the camera
#       2: Figure out how to get the dimension of the current scene
#       3: Using those dimensions, get the face cam to not go out of bounds of the current scene
#       4: Animate the camera moving around for ~1 minute

class CameraMover:

    def __init__(self):
        self.location = S.vec2()

    def move_camera(self):
        current_scene = S.obs_frontend_get_current_scene()
        source = S.obs_get_source_by_name("Facecam")
        scene = S.obs_scene_from_source(current_scene)
        scene_item = S.obs_scene_find_source(scene, "Facecam")

        if scene_item:
            rand_x, rand_y = random.randint(0, 3840), random.randint(0, 2160)
            print("old location coords: ", self.location.x, ", ", self.location.y)
            S.obs_sceneitem_get_pos(scene_item, self.location)
            self.location.x = rand_x
            self.location.y = rand_y
            print("new location coords: ", self.location.x, ", ", self.location.y)
            S.obs_sceneitem_set_pos(scene_item, self.location)

        S.obs_scene_release(scene)
        S.obs_source_release(source)

    def edit_camera_filters(self):
        print(dir(S))
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
