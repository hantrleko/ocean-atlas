import sys, bpy, math
from mathutils import Vector
sp = sys.argv[sys.argv.index("--")+1]
bpy.ops.wm.open_mainfile(filepath=f"/workspace/ocean-atlas-rig/blend/{sp}_v3.blend")
sc = bpy.context.scene; sc.render.engine = 'BLENDER_WORKBENCH'; sc.render.resolution_x = 360; sc.render.resolution_y = 300
sc.display.shading.color_type = 'TEXTURE'; sc.display.shading.light = 'STUDIO'
arm = next(o for o in bpy.data.objects if o.type == 'ARMATURE'); mesh = next(o for o in bpy.data.objects if o.type == 'MESH')
ad = arm.animation_data
for t in ad.nla_tracks: t.mute = True
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.data.ortho_scale = 1.9
views = {'front': Vector((0.35, -1, 0.3)), 'side': Vector((1, -0.25, 0.25))}
out = []
for t in ad.nla_tracks:
    act = bpy.data.actions[t.name]; ad.action = act
    n = int(act.frame_range[1])
    for vi, (vn, d) in enumerate(views.items()):
        for i, f in enumerate([1, n*0.25+1, n*0.5+1, n*0.75+1]):
            sc.frame_set(int(f))
            cam.location = d.normalized()*4; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
            p = f"/tmp/ps_{sp}_{t.name}_{vn}_{i}.png"; sc.render.filepath = p; bpy.ops.render.render(write_still=True); out.append((t.name, vn, i, p))
import json; json.dump(out, open(f"/tmp/ps_{sp}.json", "w"))
