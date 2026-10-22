"""Shared helpers for Ocean Atlas creature rigging (Blender 5.x)."""
import bpy
from mathutils import Vector, Euler
import math

FPS = 24

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Ensure fps
    bpy.context.scene.render.fps = FPS

def import_glb(path):
    bpy.ops.import_scene.gltf(filepath=path)
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise RuntimeError(f"No mesh in {path}")
    # Join if multiple
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for m in meshes:
            m.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        meshes = [bpy.context.view_layer.objects.active]
    mesh = meshes[0]
    # Apply transforms
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh.name = "CreatureMesh"
    return mesh

def mesh_bbox(mesh):
    bb = [mesh.matrix_world @ Vector(c) for c in mesh.bound_box]
    xs = [v.x for v in bb]; ys = [v.y for v in bb]; zs = [v.z for v in bb]
    mn = Vector((min(xs), min(ys), min(zs)))
    mx = Vector((max(xs), max(ys), max(zs)))
    return mn, mx, (mn + mx) * 0.5, mx - mn

def make_armature(name="Armature"):
    arm_data = bpy.data.armatures.new(name)
    arm_obj = bpy.data.objects.new(name, arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj
    arm_obj.select_set(True)
    return arm_obj

def edit_bones(arm_obj):
    bpy.ops.object.mode_set(mode='EDIT')
    return arm_obj.data.edit_bones

def add_bone(ebones, name, head, tail, parent=None, connect=False):
    b = ebones.new(name)
    b.head = Vector(head)
    b.tail = Vector(tail)
    if parent is not None:
        b.parent = ebones[parent] if isinstance(parent, str) else parent
        b.use_connect = connect
    return b

def exit_edit(arm_obj):
    bpy.ops.object.mode_set(mode='OBJECT')

def parent_with_auto_weights(mesh, arm_obj):
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')

def ensure_action(name):
    # Remove existing same-name action
    if name in bpy.data.actions:
        bpy.data.actions.remove(bpy.data.actions[name])
    act = bpy.data.actions.new(name)
    return act

def push_action_to_nla(arm_obj, action, start=0):
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    track = arm_obj.animation_data.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, start, action)

def key_bone_euler(arm_obj, bone_name, frame, euler_xyz, mode='XYZ'):
    """Set pose bone rotation and insert keyframe. euler in radians."""
    pb = arm_obj.pose.bones[bone_name]
    pb.rotation_mode = mode
    pb.rotation_euler = Euler(euler_xyz, mode)
    pb.keyframe_insert(data_path="rotation_euler", frame=frame)

def clear_pose(arm_obj):
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)

def bake_action_from_keys(arm_obj, action_name, frame_start, frame_end):
    """Assign current keyed animation as a named action, then clear active."""
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    # Current action may be unnamed; rename / duplicate
    act = arm_obj.animation_data.action
    if act is None:
        # Collect from pose bones — Blender 5 may use Action slots; fallback create
        act = bpy.data.actions.new(action_name)
        arm_obj.animation_data.action = act
        return act
    # In Blender 4.4+/5, action may be wrapped; handle both
    try:
        # Blender 5 layered actions: get the underlying Action
        if hasattr(act, 'action') and act.action is not None:
            real = act.action
        else:
            real = act if isinstance(act, bpy.types.Action) else None
    except Exception:
        real = act
    if real is None:
        real = bpy.data.actions.new(action_name)
        arm_obj.animation_data.action = real
        return real
    real.name = action_name
    # Make a copy so next animation starts fresh
    copy = real.copy()
    copy.name = action_name
    # Clear current keyframes by assigning None then new empty
    arm_obj.animation_data.action = None
    return copy

def new_empty_action(arm_obj, name):
    if not arm_obj.animation_data:
        arm_obj.animation_data_create()
    # Remove stale
    existing = bpy.data.actions.get(name)
    if existing:
        bpy.data.actions.remove(existing)
    act = bpy.data.actions.new(name)
    # Blender 5: assign via animation_data.action
    try:
        arm_obj.animation_data.action = act
    except TypeError:
        # layered actions API
        arm_obj.animation_data.action = act
    return act

def finish_action(arm_obj, name):
    """Rename current action, stash on object, clear for next clip."""
    ad = arm_obj.animation_data
    if not ad or not ad.action:
        return None
    act = ad.action
    # Blender 5 Action might be accessed differently
    real = getattr(act, 'action', None) or act
    if not isinstance(real, bpy.types.Action):
        # try slot
        real = act
    try:
        real.name = name
    except Exception:
        pass
    # Ensure NLA strip for export discovery
    track = ad.nla_tracks.new()
    track.name = name
    try:
        track.strips.new(name, int(real.frame_range[0]), real)
    except Exception:
        try:
            strip = track.strips.new(name, 1, real)
        except Exception as e:
            print("NLA push failed:", e)
    # Detach so next clip is separate
    ad.action = None
    # Also keep action alive by fake user
    real.use_fake_user = True
    return real

def export_glb(filepath, *, use_draco=True):
    """Export selected armature+children as GLB with skins and animations."""
    bpy.ops.object.mode_set(mode='OBJECT')
    # Remove stray leaf-bone helper meshes
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'MESH' and (
            obj.name.lower().startswith('icosphere') or obj.name.startswith('Bone')
        ):
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.context.scene.objects:
        if obj.type in {'ARMATURE', 'MESH'}:
            obj.select_set(True)
            if obj.type == 'ARMATURE':
                bpy.context.view_layer.objects.active = obj

    kwargs = dict(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_nla_strips=True,
        export_def_bones=False,
        export_leaf_bone=False,
        export_apply=False,
        export_skins=True,
        export_morph=False,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_yup=True,
        export_anim_single_armature=True,
        export_extra_animations=True,
        export_reset_pose_bones=True,
    )
    if use_draco:
        kwargs['export_draco_mesh_compression_enable'] = True
        kwargs['export_draco_mesh_compression_level'] = 6
    try:
        bpy.ops.export_scene.gltf(**kwargs)
    except TypeError as e:
        print("export kwargs issue, retrying minimal:", e)
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB',
            use_selection=True,
            export_animations=True,
            export_skins=True,
            export_yup=True,
            export_leaf_bone=False,
        )

def save_blend(path):
    bpy.ops.wm.save_as_mainfile(filepath=path)

print("rig_lib loaded")
