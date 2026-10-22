"""Rig vampire / gulper / hammer with world-axis-authored clips.
blender -b --python rig_new.py -- vampire gulper hammer"""
import sys, os, math
sys.path.insert(0, "/workspace/ocean-atlas-rig/scripts")
import bpy, numpy as np
from mathutils import Vector, Quaternion, Matrix
from rig_lib import clear_scene, import_glb, mesh_bbox, make_armature, add_bone, export_glb, save_blend
FPS = 24; TAU = 2*math.pi
def S(u, k=1, p=0): return math.sin(TAU*(k*u+p))
def bump(u, a, b):
    if u <= a or u >= b: return 0.0
    return math.sin(math.pi*(u-a)/(b-a))**2
def ramp(u, a, b):
    if u <= a: return 0.0
    if u >= b: return 1.0
    x = (u-a)/(b-a); return x*x*(3-2*x)
def hold(u, a, b, c, d): return ramp(u, a, b)*(1-ramp(u, c, d))
X, Y, Z = Vector((1,0,0)), Vector((0,1,0)), Vector((0,0,1))

def verts_np(mesh):
    co = np.empty(len(mesh.data.vertices)*3); mesh.data.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    M = np.array(mesh.matrix_world); return co @ M[:3,:3].T + M[:3,3]

def kmeans(P, init, it=25):
    C = init.copy()
    for _ in range(it):
        lab = np.argmin(((P[:,None,:]-C[None])**2).sum(-1), 1)
        for k in range(len(C)):
            if (lab == k).any(): C[k] = P[lab == k].mean(0)
    return C, lab

def weights(mesh, arm, power=3.0, radius={}, rigid_max=80, overrides=None):
    P = verts_np(mesh); n = len(P)
    bones = [b for b in arm.data.bones if b.use_deform]
    names = [b.name for b in bones]
    D = np.zeros((n, len(bones)))
    for j, b in enumerate(bones):
        h = np.array(arm.matrix_world @ b.head_local); t = np.array(arm.matrix_world @ b.tail_local)
        ab = t-h; L2 = max(ab @ ab, 1e-12)
        tt = np.clip(((P-h) @ ab)/L2, 0, 1)
        D[:, j] = np.linalg.norm(P-(h+tt[:,None]*ab), axis=1) / radius.get(b.name, 1.0)
    W = 1.0/(D+1e-4)**power
    if overrides: W = overrides(P, W, names)
    idx = np.argsort(-W, 1)[:, :4]
    top = np.take_along_axis(W, idx, 1); top /= top.sum(1, keepdims=True)
    # rigid islands: average weights over small islands (teeth, spines, eyes)
    me = mesh.data; par = np.arange(n)
    def f(a):
        while par[a] != a: par[a] = par[par[a]]; a = par[a]
        return a
    for e in me.edges:
        a, b = f(e.vertices[0]), f(e.vertices[1])
        if a != b: par[a] = b
    roots = np.array([f(i) for i in range(n)])
    full = np.zeros((n, len(bones)))
    np.put_along_axis(full, idx, top, 1)
    uniq, inv, cnt = np.unique(roots, return_inverse=True, return_counts=True)
    small = cnt[inv] <= rigid_max
    if small.any():
        sums = np.zeros((len(uniq), len(bones))); np.add.at(sums, inv, full)
        avg = sums / cnt[:, None]
        full[small] = avg[inv[small]]
    print("islands", len(uniq), "rigidified verts", int(small.sum()))
    idx = np.argsort(-full, 1)[:, :4]; top = np.take_along_axis(full, idx, 1); top /= top.sum(1, keepdims=True)
    mesh.vertex_groups.clear()
    vgs = [mesh.vertex_groups.new(name=nm) for nm in names]
    for i in range(n):
        for k in range(4):
            w = float(top[i, k])
            if w > 0.01: vgs[idx[i, k]].add([i], w, 'REPLACE')
    mod = mesh.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
    mesh.parent = arm
    print("weights done", n, names)

def rest_rot(arm, name):
    return (arm.data.bones[name].matrix_local.to_3x3()).to_quaternion()

def clip(arm, name, secs, fn, L):
    n = int(round(secs*FPS)); ad = arm.animation_data or arm.animation_data_create()
    act = bpy.data.actions.new(name); ad.action = act
    R = {pb.name: rest_rot(arm, pb.name) for pb in arm.pose.bones}
    for f in range(0, n+1, 2):
        u = (f % n)/n; pose = fn(u)
        for pb in arm.pose.bones:
            pb.rotation_mode = 'QUATERNION'
            q = Quaternion()
            for ax, ang in pose.get(pb.name, []):   # list of (world axis, angle) applied in order
                if isinstance(ax, str):              # 'lat' = this bone's own lateral (pitch) axis
                    bd = (arm.data.bones[pb.name].tail_local - arm.data.bones[pb.name].head_local).normalized()
                    ax = bd.cross(Z).normalized()
                q = Quaternion(ax, ang) @ q
            r = R[pb.name]
            pb.rotation_quaternion = r.inverted() @ q @ r
            pb.keyframe_insert('rotation_quaternion', frame=f+1)
            pb.scale = Vector(pose.get('_s', {}).get(pb.name, (1, 1, 1)))
            pb.keyframe_insert('scale', frame=f+1)
            if pb.name == 'root':
                pb.location = r.inverted() @ (Vector(pose.get('_loc', (0,0,0)))*L)
                pb.keyframe_insert('location', frame=f+1)
    tr = ad.nla_tracks.new(); tr.name = name; tr.strips.new(name, 1, act)
    act.use_fake_user = True; ad.action = None
    print("clip", name, n)

# ======================= HAMMERHEAD: head +X, up +Z, lateral Y =======================
def build_hammer(eb, P, c):
    mn, mx = P.min(0), P.max(0); L = mx[0]-mn[0]; x0 = (mn[0]+mx[0])/2
    # spine centreline z from vertex means along X
    def zc(x):
        m = np.abs(P[:,0]-x) < 0.03*L
        sel = P[m]; sel = sel[np.abs(sel[:,1]) < 0.06*L]
        return float(np.median(sel[:,2])) if len(sel) else float(c[2])
    xs = [mx[0]-0.02*L, mx[0]-0.22*L, mx[0]-0.42*L, mx[0]-0.6*L, mx[0]-0.76*L, mx[0]-0.9*L, mn[0]]
    pts = [Vector((x, 0, zc(x))) for x in xs]
    add_bone(eb, 'root', (x0, 0, zc(x0)), (x0+0.04*L, 0, zc(x0)))
    add_bone(eb, 'spine1', pts[2], pts[1], parent='root')          # chest
    add_bone(eb, 'head', pts[1], pts[0], parent='spine1', connect=True)
    names = ['spine2', 'spine3', 'spine4', 'tail']
    prev = 'spine1'
    for i, nm in enumerate(names):
        add_bone(eb, nm, pts[2+i], pts[3+i], parent=prev if i else 'spine1', connect=False); prev = nm
    pz = zc(mx[0]-0.35*L) - 0.08*L
    for s, nm in ((1, 'pec_L'), (-1, 'pec_R')):
        add_bone(eb, nm, (mx[0]-0.33*L, s*0.04*L, pz), (mx[0]-0.42*L, s*0.2*L, pz-0.12*L), parent='spine1')
    return L

HSP = ['head', 'spine1', 'spine2', 'spine3', 'spine4', 'tail']
def hwave(u, amp, k=1, lag=0.12, base=0.0):
    a = [0.06, 0.03, 0.12, 0.22, 0.34, 0.45]
    return {b: [(Z, base*(i == 0) + amp*a[i]*S(u, k, -i*lag))] for i, b in enumerate(HSP)}
def hammer_clips():
    def patrol(u):
        d = hwave(u, 1.0, 2)
        d['root'] = [(Z, 0.05*S(u, 1, .1))]; d['_loc'] = (0, 0.02*S(u, 1), 0.02*S(u, 2))
        d['pec_L'] = [(X, 0.08*S(u, 2))]; d['pec_R'] = [(X, -0.08*S(u, 2))]
        return d
    def scan(u):
        # slow, low cruise just above the seabed; cephalofoil sweeps wide side-to-side like a metal detector
        d = hwave(u, 0.45, 2, 0.1)
        sweep = S(u, 2)
        d['head'] = [(Y, 0.22), (Z, 0.62*sweep)]
        d['spine1'] = [(Z, -0.22*S(u, 2, -.06))]
        d['spine2'] = [(Z, -0.08*S(u, 2, -.12)), (Y, -0.05)]
        d['root'] = [(Y, 0.12), (Z, 0.06*S(u, 1))]
        d['_loc'] = (0.0, 0.05*S(u, 1), -0.2)
        d['pec_L'] = [(X, 0.3)]; d['pec_R'] = [(X, -0.3)]
        return d
    def pin(u):
        # fast dive -> hard downward head slam with arched body -> held pin (struggle wiggle) -> recover
        dive = ramp(u, .04, .2)*(1-ramp(u, .74, .95))
        slam = bump(u, .2, .32)
        held = hold(u, .24, .32, .64, .8)
        beat = (1 - 0.75*held)*dive
        d = {b: [(Z, beat*a*S(u, 6, -i*.12))] for i, (b, a) in enumerate(zip(HSP, [0.04, 0.05, 0.16, 0.28, 0.42, 0.55]))}
        d['head'] = [(Y, 0.55*slam + 0.5*held), (Z, 0.07*held*S(u, 8))]
        d['spine1'] = [(Y, 0.18*held + 0.1*slam)]
        d['spine2'] += [(Y, -0.12*held)]
        d['spine3'] += [(Y, -0.22*held)]
        d['spine4'] += [(Y, -0.26*held)]
        d['tail'] += [(Y, -0.2*held)]
        d['root'] = [(Y, 0.6*dive)]
        d['_loc'] = (0.14*dive, 0, -0.26*dive + 0.05*slam)
        d['pec_L'] = [(X, 0.45*held + 0.15*dive)]; d['pec_R'] = [(X, -0.45*held - 0.15*dive)]
        return d
    def sideswim(u):
        d = hwave(u, 0.85, 2)
        d['root'] = [(X, 1.0 + 0.06*S(u, 1))]; d['_loc'] = (0, 0, 0.02*S(u, 2))  # rolled ~60° (energy-saving side swim)
        d['pec_L'] = [(X, 0.1*S(u, 2))]; d['pec_R'] = [(X, -0.1*S(u, 2))]
        return d
    return {'patrol': (2.5, patrol), 'scan': (5, scan), 'pin': (3.2, pin), 'sideswim': (2.5, sideswim)}

# ======================= GULPER: head +X, curved body in XY, up +Z =====================
def build_gulper(eb, P, c):
    mn, mx = P.min(0), P.max(0); L = float(np.linalg.norm(mx-mn))
    # body is a C-curve around ~bbox centre: sample the centreline by angle from the head (+X) round to the tail
    cxy = (mn[:2]+mx[:2])/2
    snout = P[np.argmax(P[:, 0])]
    th = np.arctan2(P[:, 1]-cxy[1], P[:, 0]-cxy[0]); th0 = math.atan2(snout[1]-cxy[1], snout[0]-cxy[0])
    a = (th - th0 + 0.35) % TAU - 0.35           # 0 at head, increasing CCW toward tail
    amax = np.percentile(a, 99.7)
    tip = P[np.argmax(a)]
    edges = np.linspace(0.12, amax-0.05, 11)
    pts = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (a >= lo) & (a < hi)
        q = P[m]; pts.append(Vector(np.median(q, 0)) if len(q) else None)
    pts = [p for p in pts if p is not None]
    pts = [Vector((snout[0], snout[1], pts[0].z))] + pts + [Vector(tip)]
    print("gulper chain", [tuple(round(v, 3) for v in p) for p in pts])
    add_bone(eb, 'root', pts[2], pts[2] + (pts[1]-pts[2])*0.3)
    # head bone from pts[2] -> pts[0] (snout); spine from pts[2] backwards
    add_bone(eb, 'head', pts[2], pts[0], parent='root')
    prev = 'root'; names = []
    for i in range(2, len(pts)-1):
        nm = f'sp{i-1}'; add_bone(eb, nm, pts[i], pts[i+1], parent=prev, connect=(i > 2)); prev = nm; names.append(nm)
    # jaw: hinge behind the gape, pointing to lower snout
    hm = P[P[:, 0] > snout[0]-0.12*L]; mz = float(np.median(hm[:, 2]))
    add_bone(eb, 'jaw', (snout[0]-0.14*L, snout[1], mz-0.02*L), (snout[0]-0.01*L, snout[1], mz-0.07*L), parent='head')
    return L, names, (snout[0]-0.14*L, mz)

def gulper_clips(names, hd=Vector((1, 0, 0))):
    n = len(names)
    def chain(u, amp, k=1, lag=0.09, ax=Z, grow=1.0):
        return {b: [(ax, amp*(0.25+0.75*(i/(n-1))**grow)*S(u, k, -i*lag))] for i, b in enumerate(names)}
    def swim(u):
        d = chain(u, 0.32, 1, 0.1)
        d['head'] = [(Z, 0.12*S(u, 1, .1))]; d['jaw'] = [('lat', 0.28)]
        d['root'] = [(Z, 0.08*S(u, 1, .05))]; d['_loc'] = (0, 0, 0.02*S(u, 2))
        return d
    def gape(u):
        c = hold(u, .04, .16, .26, .34)        # snap shut first (contrast)
        o = hold(u, .32, .48, .74, .92)        # then gape far wider than rest + inflate the pouch
        d = chain(u, 0.08, 1)
        d['jaw'] = [('lat', 0.3*c - 1.15*o)]
        d['head'] = [('lat', 0.38*o - 0.04*c)]
        d['_s'] = {'jaw': (1 + 0.55*o, 1 + 0.12*o, 1 + 0.55*o), 'head': (1 + 0.12*o, 1, 1 + 0.12*o)}
        d['root'] = [('lat', 0.1*o)]
        sv = hd*(0.1*o - 0.03*c)                 # surge forward along the head direction
        d['_loc'] = (sv.x, sv.y, sv.z)
        return d
    def tailglow(u):
        d = {b: [(Z, -0.22*ramp(i/(n-1), .45, 1) - 0.12*(i/(n-1))**2*S(u, 2, -i*.06)), ('lat', -0.25*(i/(n-1))**2*(0.6+0.4*S(u, 1)))] for i, b in enumerate(names)}
        d['head'] = [(Z, 0.05*S(u))]; d['jaw'] = [('lat', 0.22)]
        d['root'] = [(X, 0.25)]
        return d
    def drift(u):
        d = chain(u, 0.06, 1, 0.12)
        d['root'] = [('lat', -1.25 + 0.04*S(u))]; d['_loc'] = (0, 0, 0.03*S(u))
        d['head'] = [('lat', -0.08)]; d['jaw'] = [('lat', 0.18 - 0.08*S(u))]
        return d
    return {'swim': (3, swim), 'gape': (3, gape), 'tailglow': (3.5, tailglow), 'drift': (6, drift)}

# ======================= VAMPIRE: up +Z, face -Y, 8 arms hang -Z ======================
def build_vampire(eb, P, c):
    mn, mx = P.min(0), P.max(0); H = mx[2]-mn[2]
    bands = [mn[2]+H*f for f in (0.50, 0.37, 0.24, 0.12, 0.02)]
    ctr = P[(P[:, 2] < bands[0]) & (P[:, 2] > bands[1])][:, :2].mean(0)
    # find arm columns near the bottom with kmeans, then follow upward
    low = P[(P[:, 2] < bands[2]) & (P[:, 2] > bands[3])][:, :2]
    ang = np.linspace(0, TAU, 8, endpoint=False)
    init = ctr + 0.25*H*np.c_[np.cos(ang), np.sin(ang)]
    C, _ = kmeans(low, init, 40)
    cols = []
    for k in range(8):
        col = []; cur = C[k]
        for zt, zb in zip(bands[:-1], bands[1:]):
            sl = P[(P[:, 2] <= zt) & (P[:, 2] > zb)]
            if not len(sl): break
            near = sl[((sl[:, :2]-cur)**2).sum(1) < (0.09*H)**2]
            if len(near) < 8: break
            cur = near[:, :2].mean(0); col.append(Vector((cur[0], cur[1], (zt+zb)/2)))
        cols.append(col)
    add_bone(eb, 'root', (ctr[0], ctr[1], bands[0]), (ctr[0], ctr[1], bands[0]+0.05*H))
    add_bone(eb, 'mantle', (ctr[0], ctr[1], bands[0]), (ctr[0], ctr[1], mx[2]-0.08*H), parent='root')
    ztop = mx[2]-0.18*H
    for s, nm in ((-1, 'fin_L'), (1, 'fin_R')):
        add_bone(eb, nm, (ctr[0]+s*0.12*H, ctr[1], ztop), (ctr[0]+s*0.42*H, ctr[1], ztop+0.02*H), parent='mantle')
    arms = []
    for k, col in enumerate(cols):
        if len(col) < 2: continue
        base = Vector((ctr[0], ctr[1], bands[0])) + (Vector((col[0].x, col[0].y, bands[0]))-Vector((ctr[0], ctr[1], bands[0])))*0.6
        pts = [base] + col
        prev = 'root'
        for i in range(len(pts)-1):
            nm = f'arm{k}_{i}'; add_bone(eb, nm, pts[i], pts[i+1], parent=prev, connect=i > 0); prev = nm
        arms.append((k, len(pts)-1, Vector((col[0].x-ctr[0], col[0].y-ctr[1], 0)).normalized()))
    print("vampire arms", [(k, n) for k, n, _ in arms])
    return H, arms, bands[0]

def vampire_clips(arms):
    def armpose(d, u, spread, wav, k=1, curl=0.0):
        for (a, n, rd) in arms:
            tang = Z.cross(rd).normalized()          # rotating about tangent swings the arm outward (+) / inward (-)
            for i in range(n):
                ang = (spread if i == 0 else curl) + wav*S(u, k, -i*.12 + a*.07)
                d[f'arm{a}_{i}'] = [(tang, -ang)]
        return d
    def drift(u):
        d = armpose({}, u, 0.12, 0.08, 1)
        d['fin_L'] = [(Y, 0.55*S(u, 2))]; d['fin_R'] = [(Y, -0.55*S(u, 2))]
        d['mantle'] = [(X, 0.05*S(u, 1, .2))]; d['_loc'] = (0, 0, 0.04*S(u, 1, .1))
        return d
    def snow(u):
        d = armpose({}, u, 0.35, 0.06, 1, 0.1)      # arms spread wide as a snow-collecting net
        d['fin_L'] = [(Y, 0.2*S(u, 2))]; d['fin_R'] = [(Y, -0.2*S(u, 2))]
        d['root'] = [(X, 0.25)]; d['_loc'] = (0, 0, -0.08*ramp(u, 0, .5) + 0.08*ramp(u, .5, 1))
        return d
    def cloak(u):
        # inverted "pineapple": each arm everts ~190° up and over the mantle, the rotation spread along
        # the chain (root joint never exceeds ~85°, which keeps the webbing from shearing), oral side +
        # cirri end up facing outward; mantle shrinks/tucks inside the arm cage. hold, then unfurl.
        o = hold(u, .08, .34, .68, .92)
        seg = [1.45, 1.05, 0.62, 0.22]
        d = {}
        for (a, n, rd) in arms:
            tang = Z.cross(rd).normalized()
            for i in range(n):
                # distal segments curl first, the root joint lifts last -> no flat 'sheet' mid-swing
                k = 3 - min(i, 3)
                oi = hold(u, .06 + 0.05*k, .28 + 0.03*k, .68 - 0.03*k, .92)
                d[f'arm{a}_{i}'] = [(tang, -(seg[min(i, 3)]*oi + 0.03*(1-o)*S(u, 1, -i*.12 + a*.07) + 0.1*(i == 0)*(1-o)))]
        d['_s'] = {'mantle': (1 - 0.22*o, 1 - 0.3*o, 1 - 0.22*o), 'fin_L': (1 - 0.5*o,)*3, 'fin_R': (1 - 0.5*o,)*3}
        d['mantle'] = [(Z, 0.1*o*S(u, 1))]
        d['fin_L'] = [(Y, -0.5*o)]; d['fin_R'] = [(Y, 0.5*o)]
        d['root'] = [(X, 0.06*o*S(u, 2))]
        d['_loc'] = (0, 0, -0.12*o)
        return d
    def flee(u):
        p = (u*3) % 1; c = bump(p, 0, .35); e = ramp(p, .3, .9)   # 3 jet pulses
        d = armpose({}, u, 0.5*(1-c) - 0.12*c, 0.1, 3, -0.1*c)
        d['fin_L'] = [(Y, 0.8*S(u, 6))]; d['fin_R'] = [(Y, -0.8*S(u, 6))]
        d['root'] = [(Z, TAU*0.25*u*4 % TAU if False else 0.6*S(u)), (X, -0.25)]
        d['_loc'] = (0, 0, 0.05*(c - 0.5))
        return d
    return {'drift': (3, drift), 'snow': (6, snow), 'cloak': (5, cloak), 'flee': (3, flee)}

def run(sp):
    clear_scene(); bpy.context.scene.render.fps = FPS
    mesh = import_glb(f"/workspace/ocean-atlas-rig/work/{sp}.glb")
    P = verts_np(mesh); mn, mx, c, s = mesh_bbox(mesh); print(sp, "verts", len(P), tuple(s))
    arm = make_armature(sp.capitalize()+'Armature')
    bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones
    if sp == 'hammer':
        Lr = build_hammer(eb, P, c)
    elif sp == 'gulper':
        Lr, names, hinge = build_gulper(eb, P, c)
    else:
        Lr, arms, zj = build_vampire(eb, P, c)
    bpy.ops.object.mode_set(mode='OBJECT')
    ov = None; rad = {}
    if sp == 'gulper':
        hx, hz = hinge; snx = P[:, 0].max()
        def ov(P, W, names_):
            j = names_.index('jaw'); W = W.copy()
            fx = np.clip((P[:, 0]-hx)/(snx-hx), 0, 1)*np.clip((hz-P[:, 2])/(0.05*Lr), 0, 1)   # front & below mouth line
            other = W.sum(1)
            W[:, j] = 0; W *= (1-fx)[:, None]; W[:, j] = fx*other + 1e-9
            return W
        rad = {'head': 1.3}
    if sp == 'hammer': rad = {'head': 1.4, 'pec_L': 0.6, 'pec_R': 0.6}
    if sp == 'vampire':
        rad = {'mantle': 1.5, 'fin_L': 0.8, 'fin_R': 0.8, 'root': 0.8}
        def ov(P, W, names_):
            # clean arm/cloak junction: mantle+fins fade out below the arm root ring, arm bones fade out above
            W = W.copy(); t = np.clip((P[:, 2] - (zj - 0.1*Lr))/(0.16*Lr), 0, 1)
            t = t*t*(3 - 2*t)
            for j, nm in enumerate(names_):
                if nm in ('mantle', 'fin_L', 'fin_R'): W[:, j] *= 0.03 + 0.97*t
                elif nm.startswith('arm'): W[:, j] *= (0.03 + 0.97*(1 - t)) if not nm.endswith('_0') else (1.6 - 0.6*t)
            return W
    weights(mesh, arm, power=3.0, radius=rad, overrides=ov)
    L = max(mesh.dimensions)
    hd = (arm.data.bones['head'].tail_local - arm.data.bones['head'].head_local).normalized() if sp == 'gulper' else None
    clips = hammer_clips() if sp == 'hammer' else gulper_clips(names, hd) if sp == 'gulper' else vampire_clips(arms)
    bpy.context.view_layer.objects.active = arm
    for nm, (secs, fn) in clips.items(): clip(arm, nm, secs, fn, L)
    for pb in arm.pose.bones: pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    save_blend(f"/workspace/ocean-atlas-rig/blend/{sp}_v3.blend")
    out = f"/workspace/ocean-atlas-rig/out3/{sp}.glb"; export_glb(out, use_draco=False)
    print("WROTE", out, os.path.getsize(out))

for sp in sys.argv[sys.argv.index("--")+1:]: run(sp)
