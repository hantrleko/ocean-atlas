import sys, bpy, math
sys.path.insert(0, "/workspace/ocean-atlas-rig/scripts")
from rig_lib import clear_scene, import_glb, mesh_bbox
from mathutils import Vector
sp = sys.argv[sys.argv.index("--")+1]
clear_scene(); m = import_glb(f"/workspace/ocean-atlas-rig/work/{sp}.glb")
mn,mx,c,s = mesh_bbox(m); print("BBOX", sp, tuple(mn), tuple(mx))
sc = bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'; sc.render.resolution_x=sc.render.resolution_y=480
sc.display.shading.color_type='TEXTURE'
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=max(s)*1.2
D = max(s)*3
for name, d in [('front_-Y',(0,-1,0)),('side_+X',(1,0,0)),('top_+Z',(0,0,1))]:
    v = Vector(d); cam.location = c + v*D
    cam.rotation_euler = (-v).to_track_quat('-Z','Y' if name!='top_+Z' else 'Y').to_euler()
    sc.render.filepath = f"/workspace/ocean-atlas-rig/notes/view_{sp}_{name}.png"; bpy.ops.render.render(write_still=True)
