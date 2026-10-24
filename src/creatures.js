import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { applyAliveMotion, makeAliveUpdater } from './aliveMotion.js';
import { behaviorsFor } from './behaviors.js';
import { frameFor } from './framing.js';
import { makeLureGlow, makeSpout, makeMouthCavity } from './effects.js';
const S = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05, ...o });
const P = (c, o = {}) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.2, transparent: true, opacity: 0.45, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, ...o });
export const glowMats = [];
const G = (c, i = 2) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i }); m.userData.base = i; glowMats.push(m); return m; };
const sph = (r, m, sx = 1, sy = 1, sz = 1, seg = 32) => { const g = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg >> 1), m); g.scale.set(sx, sy, sz); return g; };
const at = (o, x, y, z, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
// lathe body along +x : prof = [[x, r],...]
function lathe(prof, m, flatY = 1, flatZ = 1) {
  const g = new THREE.LatheGeometry(prof.map(([x, r]) => new THREE.Vector2(Math.max(r, 0.001), x)), 40);
  g.rotateZ(-Math.PI / 2); g.scale(1, flatY, flatZ); g.computeVertexNormals();
  return new THREE.Mesh(g, m);
}
// articulated chain hanging along -y
function chain(n, len, r0, r1, m, tipMat) {
  const root = new THREE.Group(), joints = []; let p = root;
  for (let i = 0; i < n; i++) {
    const j = new THREE.Group(); j.position.y = i ? -len : 0; p.add(j); joints.push(j);
    const r = r0 + (r1 - r0) * (i / n), r2 = r0 + (r1 - r0) * ((i + 1) / n);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r2, len * 1.08, 8), m); c.position.y = -len / 2; j.add(c); p = j;
  }
  if (tipMat) { const t = sph(r1 * 2.2, tipMat); t.position.y = -len; p.add(t); }
  root.userData.joints = joints; return root;
}
const wave = (ch, t, amp, ph, axis = 'z', sp = 2) => ch.userData.joints.forEach((j, i) => j.rotation[axis] = Math.sin(t * sp + ph + i * 0.5) * amp * (0.3 + i / ch.userData.joints.length));
function eye(r, x, y, z, g, glow) { const e = sph(r, S(0xf4f4f0, { roughness: 0.2 })); at(e, x, y, z); const p = sph(r * 0.6, glow || S(0x0b0b10, { roughness: 0.1 })); p.position.z = r * 0.6; e.add(p); g.add(e); return e; }

const B = {
dumbo() {
  const g = new THREE.Group(), m = S(0xf0a28c, { roughness: 0.45 }), up = [];
  const body = sph(0.75, m, 1, 1.1, 0.95); body.position.y = 0.35; g.add(body);
  const ears = [-1, 1].map(s => { const piv = new THREE.Group(); at(piv, s * 0.6, 0.65, 0); const e = sph(0.38, S(0xf3b3a0), 1, 0.55, 0.18); e.position.x = s * 0.32; piv.add(e); g.add(piv); return piv; });
  eye(0.13, -0.28, 0.25, 0.62, g); eye(0.13, 0.28, 0.25, 0.62, g);
  const web = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 24, 1, true), S(0xe48f7a, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 })); web.position.y = -0.45; web.rotation.x = Math.PI; g.add(web);
  const arms = [...Array(8)].map((_, i) => { const a = i / 8 * Math.PI * 2, c = chain(7, 0.13, 0.09, 0.03, m); c.position.set(Math.cos(a) * 0.45, -0.25, Math.sin(a) * 0.45); c.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); g.add(c); return c; });
  return { g, up: t => { ears.forEach((e, i) => e.rotation.z = (i ? -1 : 1) * Math.sin(t * 3) * 0.5); arms.forEach((a, i) => wave(a, t, 0.35, i)); g.position.y = Math.sin(t * 1.5) * 0.08; web.scale.set(1 + Math.sin(t * 3) * 0.06, 1, 1 + Math.sin(t * 3) * 0.06); } };
},
angler() {
  const g = new THREE.Group(), m = S(0x5a4a50, { roughness: 0.6 });
  const body = sph(0.85, m, 1.15, 1, 0.85); g.add(body);
  const jaw = sph(0.8, S(0x2b2427), 1.05, 0.5, 0.82, 32); at(jaw, 0.28, -0.32, 0, 0, 0, 0.2); g.add(jaw);
  const mouth = sph(0.6, S(0x120808), 0.4, 0.42, 0.66); at(mouth, 0.8, -0.12, 0); g.add(mouth);
  const tm = S(0xf2efe6, { roughness: 0.3 });
  for (let i = 0; i < 14; i++) { const a = (i / 13 - 0.5) * 2.2, up = i % 2; const t = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 6), tm); at(t, 0.88 + Math.cos(a) * 0.05 - Math.abs(a) * 0.15, up ? 0.06 : -0.26, Math.sin(a) * 0.48, up ? Math.PI : 0); g.add(t); }
  eye(0.07, 0.65, 0.38, 0.42, g);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.6, 3), m); at(tail, -1.15, 0, 0, 0, 0, Math.PI / 2); tail.scale.z = 0.2; g.add(tail);
  const rod = chain(6, 0.2, 0.025, 0.03, m, G(0x7ff6ff, 3)); at(rod, 0.25, 0.8, 0, 0, 0, Math.PI * 0.8); g.add(rod);
  const light = new THREE.PointLight(0x66f0ff, 2.5, 3); rod.userData.joints[5].add(light); light.position.y = -0.2;
  const fins = [-1, 1].map(s => { const f = sph(0.25, m, 1, 0.5, 0.1); at(f, -0.1, -0.2, s * 0.7, 0, s * 0.6); g.add(f); return f; });
  return { g, up: t => { rod.userData.joints.forEach((j, i) => j.rotation.z = -0.12 + Math.sin(t * 1.4 + i * .4) * 0.08); jaw.rotation.z = 0.2 + Math.sin(t * 0.8) * 0.08; tail.rotation.y = Math.sin(t * 2) * 0.3; fins.forEach((f, i) => f.rotation.x = Math.sin(t * 3 + i) * 0.4); g.position.y = Math.sin(t) * 0.06; } };
},
vampire() {
  const g = new THREE.Group(), m = S(0x8a1f2c, { roughness: 0.5 });
  const mantle = sph(0.55, m, 0.9, 1.35, 0.9); mantle.position.y = 0.55; g.add(mantle);
  const fins = [-1, 1].map(s => { const f = sph(0.3, m, 1, 0.45, 0.12); at(f, s * 0.55, 1.05, 0); g.add(f); return f; });
  [-1, 1].forEach(s => eye(0.12, s * 0.3, 0.2, 0.42, g, G(0x5ad8ff, 2.5)));
  const cloak = new THREE.Mesh(new THREE.ConeGeometry(1.0, 1.1, 32, 1, true), S(0x5a1420, { side: THREE.DoubleSide, roughness: 0.4 })); cloak.position.y = -0.45; cloak.rotation.x = Math.PI; g.add(cloak);
  const arms = [...Array(8)].map((_, i) => { const a = i / 8 * Math.PI * 2, c = chain(8, 0.15, 0.07, 0.02, m, G(0xff7dd0, 1.2)); c.position.set(Math.cos(a) * 0.3, -0.05, Math.sin(a) * 0.3); c.rotation.set(Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8); g.add(c); return c; });
  return { g, up: t => { const k = Math.sin(t * 1.6); cloak.scale.set(1 + k * .12, 1, 1 + k * .12); arms.forEach((a, i) => { a.rotation.x = Math.sin(i / 8 * 6.28) * (0.8 + k * 0.25); a.rotation.z = -Math.cos(i / 8 * 6.28) * (0.8 + k * 0.25); wave(a, t, 0.2, i, 'x'); }); fins.forEach((f, i) => f.rotation.z = (i ? 1 : -1) * Math.sin(t * 2.5) * 0.4); g.position.y = Math.sin(t * 1.6) * 0.1; } };
},
barreleye() {
  const g = new THREE.Group(), m = S(0x3b3f48, { metalness: 0.4, roughness: 0.35 });
  const body = lathe([[-1.3, 0], [-1.1, 0.12], [-0.4, 0.35], [0.2, 0.42], [0.65, 0.33], [0.85, 0]], m, 1, 0.65); g.add(body);
  const dome = sph(0.42, P(0xbfe8ff, { opacity: 0.3 }), 1.1, 0.85, 0.75); at(dome, 0.35, 0.3, 0); g.add(dome);
  const em = G(0x4dff7a, 1.6);
  [-1, 1].forEach(s => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.3, 16), em); at(e, 0.4, 0.33, s * 0.12); g.add(e); });
  [-1, 1].forEach(s => eye(0.045, 0.78, 0.12, s * 0.12, g));
  const tail = sph(0.3, S(0x56606c, { transparent: true, opacity: 0.8 }), 0.6, 1, 0.08); at(tail, -1.4, 0, 0); g.add(tail);
  const fins = [-1, 1].map(s => { const f = sph(0.32, P(0x9aa6b8, { opacity: 0.55 }), 1, 0.3, 0.05); at(f, 0, -0.15, s * 0.3, s * 0.4, 0.3 * s); g.add(f); return f; });
  return { g, up: t => { tail.rotation.y = Math.sin(t * 3) * 0.4; body.rotation.y = Math.sin(t * 3) * 0.04; fins.forEach((f, i) => f.rotation.z = Math.sin(t * 4 + i) * 0.35); g.position.y = Math.sin(t) * 0.06; } };
},
gulper() {
  const g = new THREE.Group(), m = S(0x1c1a22, { roughness: 0.4, metalness: 0.2 });
  const head = sph(0.22, m, 1.2, 1, 0.9); at(head, 0.55, 0.25, 0); g.add(head);
  eye(0.035, 0.75, 0.33, 0.12, g);
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6), S(0x2e2632, { side: THREE.DoubleSide, roughness: 0.3 })); at(pouch, 0.55, -0.2, 0, 0, 0, -Math.PI / 2 - 0.3); pouch.scale.set(0.9, 1.4, 0.9); g.add(pouch);
  const tail = chain(22, 0.12, 0.13, 0.012, m, G(0xff5fa8, 3.5)); at(tail, 0.3, 0.12, 0, 0, 0, -Math.PI / 2); g.add(tail);
  const l = new THREE.PointLight(0xff5fa8, 1.5, 2); tail.userData.joints[21].add(l);
  return { g, up: t => { tail.userData.joints.forEach((j, i) => j.rotation.x = Math.sin(t * 2.4 - i * 0.45) * 0.18); tail.userData.joints.forEach((j, i) => j.rotation.z = (i < 2 ? 0 : Math.sin(t * 0.8 + i * .2) * 0.05)); pouch.scale.y = 1.4 + Math.sin(t * 0.9) * 0.12; g.position.y = Math.sin(t * 1.2) * 0.07; } };
},
nautilus() {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = '#f2e6d0'; x.fillRect(0, 0, 512, 64); x.fillStyle = '#a5532c';
  for (let i = 0; i < 26; i++) { x.beginPath(); const px = i * 20 + 4; x.moveTo(px, 0); x.quadraticCurveTo(px + 14, 30, px + 2, 64); x.lineTo(px + 9, 64); x.quadraticCurveTo(px + 22, 30, px + 9, 0); x.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 4.2, r = 0.08 * Math.exp(0.18 * a); pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 240, 1, 24, false);
  const pos = tube.attributes.position, uv = tube.attributes.uv;
  for (let i = 0; i < pos.count; i++) { const u = uv.getX(i), p = curve.getPointAt(Math.min(u, 1)), rad = 0.04 + 0.45 * Math.pow(u, 1.6), v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(p).normalize(); pos.setXYZ(i, p.x + v.x * rad, p.y + v.y * rad, p.z + v.z * rad * 1.15); }
  tube.computeVertexNormals();
  const shell = new THREE.Mesh(tube, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 0.8 })); shell.rotation.z = Math.PI * 0.15; g.add(shell);
  const end = curve.getPointAt(1).clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.15);
  const head = sph(0.38, S(0xd9b48f), 1, 0.9, 1); head.position.copy(end).add(new THREE.Vector3(0.05, -0.05, 0)); g.add(head);
  const hood = sph(0.4, S(0x8a5a3a), 1, 0.4, 1.05); hood.position.copy(head.position).add(new THREE.Vector3(0, 0.25, 0)); g.add(hood);
  eye(0.07, head.position.x + 0.1, head.position.y + 0.05, 0.36, g);
  const tm = S(0xe8c9a6), tents = [];
  for (let i = 0; i < 18; i++) { const c = chain(5, 0.1, 0.03, 0.012, tm); const a = i / 18 * Math.PI * 2; c.position.copy(head.position).add(new THREE.Vector3(0.15 + Math.cos(a) * 0.08, -0.25, Math.sin(a) * 0.22)); c.rotation.z = 0.9 + Math.cos(a) * 0.3; c.rotation.x = Math.sin(a) * 0.4; g.add(c); tents.push(c); }
  g.position.set(-0.1, 0, 0);
  return { g, up: t => { tents.forEach((c, i) => wave(c, t, 0.3, i * 0.7)); g.position.y = Math.sin(t * 0.9) * 0.12; g.rotation.z = Math.sin(t * 0.9) * 0.05; } };
},
jelly() {
  const g = new THREE.Group();
  const bellM = P(0xdfe9ff, { opacity: 0.5, emissive: 0x9fc6ff, emissiveIntensity: 0.15 }); bellM.userData.base = 0.15; glowMats.push(bellM);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.95, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.45), bellM); bell.position.y = 0.4; g.add(bell);
  const gm = G(0xc994ff, 1.2);
  for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 30, Math.PI * 1.6), gm); const a = i * Math.PI / 2 + Math.PI / 4; at(r, Math.cos(a) * 0.3, 1.05, Math.sin(a) * 0.3, Math.PI / 2, 0, -a + Math.PI * 0.2); bell.add(r); r.position.y = 0.62; }
  const am = P(0xf1d9ff, { opacity: 0.55 }); const arms = [...Array(4)].map((_, i) => { const c = chain(10, 0.12, 0.07, 0.02, am); const a = i * Math.PI / 2; c.position.set(Math.cos(a) * 0.1, 0.5, Math.sin(a) * 0.1); g.add(c); return c; });
  const tm = G(0xbfe2ff, 0.6); const tents = [...Array(28)].map((_, i) => { const a = i / 28 * Math.PI * 2, c = chain(9, 0.11, 0.008, 0.005, tm); c.position.set(Math.cos(a) * 0.88, 0.45, Math.sin(a) * 0.88); g.add(c); c.userData.a = a; return c; });
  return { g, up: t => { const k = Math.sin(t * 2); bell.scale.set(1 + k * 0.08, 1 - k * 0.1, 1 + k * 0.08); tents.forEach((c, i) => { c.position.x = Math.cos(c.userData.a) * 0.88 * (1 + k * .08); c.position.z = Math.sin(c.userData.a) * 0.88 * (1 + k * .08); wave(c, t, 0.25, i, i % 2 ? 'x' : 'z', 1.5); }); arms.forEach((c, i) => wave(c, t, 0.2, i * 2, 'x', 1.2)); g.position.y = 0.2 + k * 0.1; } };
},
physalia() {
  const g = new THREE.Group();
  const fm = P(0x9bb8ff, { opacity: 0.6, emissive: 0x7a5cff, emissiveIntensity: 0.25 }); fm.userData.base = 0.25; glowMats.push(fm);
  const float = sph(0.6, fm, 1.5, 0.6, 0.6); float.position.y = 0.9; g.add(float);
  const crest = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), P(0xd38cff, { opacity: 0.55 })); crest.scale.set(1.3, 0.55, 0.12); crest.position.y = 1.15; g.add(crest);
  const cm = G(0x4f7dff, 0.9), pm = G(0xff8ad8, 0.6);
  const tents = [...Array(16)].map((_, i) => { const c = chain(i % 3 ? 12 : 16, 0.13, i % 3 ? 0.03 : 0.015, 0.008, i % 4 ? cm : pm); c.position.set(-0.6 + (i / 15) * 1.2, 0.65, Math.sin(i * 2.3) * 0.18); g.add(c); return c; });
  return { g, up: t => { tents.forEach((c, i) => wave(c, t, 0.15, i * 0.9, i % 2 ? 'x' : 'z', 1.2)); float.rotation.z = Math.sin(t * .9) * 0.06; crest.rotation.z = float.rotation.z; g.position.y = 0.3 + Math.sin(t * 0.9) * 0.08; } };
},
whale() {
  const g = new THREE.Group(), dark = S(0x46576a, { roughness: 0.45 }), light = S(0xdfe2e6);
  const body = lathe([[-1.9, 0.02], [-1.5, 0.12], [-0.8, 0.35], [0, 0.52], [0.7, 0.5], [1.2, 0.38], [1.55, 0.2], [1.7, 0]], dark, 0.9, 1); g.add(body);
  const belly = lathe([[-1.2, 0.02], [-0.7, 0.3], [0, 0.48], [0.7, 0.46], [1.3, 0.28], [1.6, 0]], light, 0.9, 0.95); belly.position.y = -0.06; belly.scale.set(1, 0.92, 0.92); g.add(belly);
  const fins = [-1, 1].map(s => { const piv = new THREE.Group(); at(piv, 0.75, -0.3, s * 0.4); const f = sph(0.65, light, 0.35, 0.06, 1); f.position.z = s * 0.6; f.rotation.y = s * 0.4; piv.add(f); g.add(piv); return piv; });
  const fl = new THREE.Group(); fl.position.x = -1.85; g.add(fl);
  [-1, 1].forEach(s => { const f = sph(0.4, dark, 0.35, 0.05, 1); at(f, -0.1, 0, s * 0.35, 0, s * 0.5); fl.add(f); });
  const dor = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 8), dark); at(dor, -0.9, 0.36, 0, 0, 0, 0.6); g.add(dor);
  [-1, 1].forEach(s => eye(0.035, 1.1, -0.08, s * 0.33, g));
  for (let i = 0; i < 9; i++) { const b = sph(0.04, dark); at(b, 1.0 + i * 0.07, 0.24 - i * 0.012, (i % 3 - 1) * 0.08); g.add(b); }
  g.scale.setScalar(1.05);
  return { g, up: t => { fl.rotation.z = Math.sin(t * 1.5) * 0.35; body.rotation.z = Math.sin(t * 1.5) * 0.02; fins.forEach((f, i) => f.rotation.x = (i ? -1 : 1) * (0.2 + Math.sin(t * 1.5) * 0.2)); g.position.y = Math.sin(t * 1.5 + 1) * 0.08; } };
},
turtle() {
  const g = new THREE.Group();
  const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d');
  x.fillStyle = '#6b5a32'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#3f3519'; x.lineWidth = 5;
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) { x.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, cx = c * 48 + (r % 2) * 24, cy = r * 42; x.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); } x.closePath(); x.fillStyle = `hsl(${35 + (r * c) % 12},${40 + (r + c) % 3 * 8}%,${26 + (r * 7 + c * 3) % 10}%)`; x.fill(); x.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const shell = sph(0.9, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.4, clearcoat: 0.6 }), 1.25, 0.42, 1); shell.position.y = 0.05; g.add(shell);
  const plas = sph(0.86, S(0xd9c99a), 1.2, 0.2, 0.95); plas.position.y = -0.05; g.add(plas);
  const skin = S(0x7d8a5a);
  const head = sph(0.24, skin, 1.35, 0.9, 1); at(head, 1.25, 0.05, 0); g.add(head);
  [-1, 1].forEach(s => eye(0.045, 1.42, 0.11, s * 0.17, g));
  const fl = (x, z, len, back) => { const piv = new THREE.Group(); at(piv, x, -0.02, z); const f = sph(len, skin, 0.4, 0.06, 1); f.position.z = Math.sign(z) * len * 0.9; f.rotation.y = Math.sign(z) * (back ? -0.6 : 0.5); piv.add(f); g.add(piv); return piv; };
  const F = [fl(0.6, 0.65, 0.6), fl(0.6, -0.65, 0.6), fl(-0.75, 0.55, 0.28, 1), fl(-0.75, -0.55, 0.28, 1)];
  return { g, up: t => { const k = Math.sin(t * 1.6); F[0].rotation.x = -0.4 * k - 0.1; F[1].rotation.x = 0.4 * k + 0.1; F[0].rotation.y = 0.3 * Math.cos(t * 1.6); F[1].rotation.y = -0.3 * Math.cos(t * 1.6); F[2].rotation.y = 0.2 * k; F[3].rotation.y = -0.2 * k; head.rotation.y = Math.sin(t * .5) * 0.15; g.position.y = Math.sin(t * 1.6 + 1) * 0.07; } };
},
hammer() {
  const g = new THREE.Group(), m = S(0x8e9aa6, { roughness: 0.4 }), belly = S(0xe8ecef);
  const body = lathe([[-1.6, 0.03], [-1.2, 0.14], [-0.4, 0.3], [0.4, 0.32], [1.0, 0.24], [1.35, 0.12]], m, 0.95, 0.85); g.add(body);
  const bel = lathe([[-1.2, 0.05], [-0.4, 0.27], [0.4, 0.29], [1.0, 0.21], [1.3, 0.08]], belly, 0.95, 0.85); bel.position.y = -0.05; bel.scale.set(1, 0.9, 0.95); g.add(bel);
  const ceph = sph(0.2, m, 0.7, 0.18, 2.6); ceph.scale.set(0.9, 0.22, 3.0); ceph.position.set(1.42, 0, 0); g.add(ceph);
  [-1, 1].forEach(s => eye(0.04, 1.42, 0.02, s * 0.6, g));
  const dor = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.75, 3), m); at(dor, 0.0, 0.55, 0, 0, 0, -0.25); dor.scale.z = 0.12; g.add(dor);
  const tail = new THREE.Group(); tail.position.x = -1.55; g.add(tail);
  const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.8, 3), m); at(t1, -0.15, 0.3, 0, 0, 0, 0.6); t1.scale.z = 0.12; tail.add(t1);
  const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 3), m); at(t2, -0.08, -0.15, 0, 0, 0, Math.PI - 0.7); t2.scale.z = 0.12; tail.add(t2);
  const pecs = [-1, 1].map(s => { const f = sph(0.32, m, 0.6, 0.05, 1); at(f, 0.5, -0.22, s * 0.38, 0, s * 0.6, 0); g.add(f); return f; });
  return { g, up: t => { tail.rotation.y = Math.sin(t * 2.2) * 0.35; body.rotation.y = Math.sin(t * 2.2) * 0.03; g.rotation.y = Math.sin(t * 2.2 + Math.PI) * 0.06; pecs.forEach((p, i) => p.rotation.x = (i ? -1 : 1) * Math.sin(t) * 0.12); g.position.y = Math.sin(t * 1.1) * 0.06; } };
},
};
function genericFallback() {
  const g = new THREE.Group();
  g.add(sph(0.55, S(0x6a8aa0), 1.15, 0.72, 0.85));
  return { g, up: t => { g.position.y = Math.sin(t * 1.2) * 0.08; g.rotation.y = t * 0.25; } };
}
export function build(id) { const r = (B[id] || genericFallback)(); const box = new THREE.Box3().setFromObject(r.g); const s = box.getSize(new THREE.Vector3()); const k = 3.3 / Math.max(s.x, s.y, s.z * 1.2); const c = box.getCenter(new THREE.Vector3()); const outer = new THREE.Group(); const inner = new THREE.Group(); inner.add(r.g); inner.scale.setScalar(k); inner.position.copy(c).multiplyScalar(-k); outer.add(inner); r.g.traverse(o => { if (o.isMesh) o.castShadow = true; }); const setMode = () => 'auto'; const getMode = () => 'auto'; r.up.setMode = setMode; r.up.getMode = getMode; return { g: outer, raw: r.g, up: r.up, setMode, getMode, k }; }


/** Species ids that prefer a GLB under /models/${id}.glb */
export const GLB_IDS = new Set([
  'vampire','nautilus','dumbo','angler','barreleye','gulper','jelly','physalia','whale','turtle','hammer',
  'great_white','manta','frilled_shark','oarfish','clownfish','seahorse','sunfish','blobfish','coelacanth',
  'orca','dolphin','sperm_whale','leatherback','giant_squid','octopus','lionsmane','comb_jelly',
  'spider_crab','mantis_shrimp','giant_isopod','starfish','urchin',
]);

/** Skinned + AnimationMixer GLBs (skip GPU aliveMotion to avoid double deform). */
export const RIGGED_IDS = new Set([
  'angler', 'whale', 'turtle', 'dumbo', 'vampire', 'gulper', 'hammer',
  'great_white', 'manta', 'orca', 'dolphin',
  'frilled_shark', 'sperm_whale', 'leatherback', 'clownfish',
  'seahorse', 'sunfish', 'blobfish', 'coelacanth',
  'oarfish', 'giant_squid', 'octopus', 'lionsmane', 'comb_jelly',
  'spider_crab', 'mantis_shrimp', 'giant_isopod', 'starfish', 'urchin',
]);

const _tv = new THREE.Vector3();
const FADE_SEC = 0.3;

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
// Self-hosted glTF Draco decoder (wasm + wrapper) bundled by Vite via import.meta.url —
// served from our own assets/ so it is base-path safe under /ocean-atlas/ and needs no CDN.
dracoLoader.setDecoderPath(DRACO_GLTF_CONFIG);
dracoLoader.preload();
gltfLoader.setDRACOLoader(dracoLoader);
/** Cached { scene, animations } — we clone per display so fly-out can dispose safely. */
const glbCache = new Map();
/** In-flight GLB fetch/parse promises so a prefetch and a real select share one download. */
const glbPending = new Map();

/**
 * Fetch + parse a species GLB once. onProgress(fraction 0..1) is called while downloading.
 * Uses Content-Length when available, otherwise an estimate from MODEL_BYTES.
 */
function fetchTemplate(id, onProgress) {
  if (glbCache.has(id)) { onProgress?.(1); return Promise.resolve(glbCache.get(id)); }
  let p = glbPending.get(id);
  const listeners = p?.listeners || new Set();
  if (onProgress) listeners.add(onProgress);
  if (p) return p;
  const url = `${import.meta.env.BASE_URL}models/${id}.glb`;
  p = gltfLoader.loadAsync(url, ev => {
    const total = ev.lengthComputable && ev.total ? ev.total : (MODEL_BYTES[id] || 6e5);
    const f = Math.min(0.98, ev.loaded / total);
    listeners.forEach(fn => fn(f));
  }).then(gltf => {
    const t = { scene: gltf.scene, animations: gltf.animations || [] };
    glbCache.set(id, t); glbPending.delete(id);
    listeners.forEach(fn => fn(1));
    return t;
  }, err => { glbPending.delete(id); throw err; });
  p.listeners = listeners;
  glbPending.set(id, p);
  return p;
}

/** Approximate compressed sizes (bytes) — progress fallback when the server omits Content-Length. */
const MODEL_BYTES = {
  angler: 466e3, barreleye: 296e3, dumbo: 541e3, gulper: 563e3, hammer: 373e3, jelly: 250e3, nautilus: 445e3, physalia: 312e3, turtle: 607e3, vampire: 711e3, whale: 480e3,
  great_white: 1705576, manta: 1297932, frilled_shark: 2351492, oarfish: 1614508, clownfish: 1959668, seahorse: 1919132,
  sunfish: 1720144, blobfish: 1808484, coelacanth: 1751404, orca: 1344704, dolphin: 1576744, sperm_whale: 1868988,
  leatherback: 2662552, giant_squid: 2212908, octopus: 1969256, lionsmane: 3260888, comb_jelly: 3109988,
  spider_crab: 2454764, mantis_shrimp: 2889640, giant_isopod: 3105960, starfish: 2855076, urchin: 2140244,
};

/** Warm the cache for a species in the background (no-op on Save-Data / slow connections). */
export function prefetchCreature(id) {
  if (!GLB_IDS.has(id) || glbCache.has(id) || glbPending.has(id)) return;
  const c = navigator.connection;
  if (c && (c.saveData || /2g/.test(c.effectiveType || ''))) return;
  fetchTemplate(id).catch(() => {});
}
export const isCached = id => !GLB_IDS.has(id) || glbCache.has(id);

/** Drop a cached GLB (geometry + textures). Call only after its on-screen clone is gone. */
export function releaseCreature(id) {
  if (glbPending.has(id)) return;
  const t = glbCache.get(id);
  if (!t) return;
  glbCache.delete(id);
  t.scene.traverse(o => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    mats.forEach(m => {
      m.map?.dispose();
      m.normalMap?.dispose();
      m.roughnessMap?.dispose();
      m.metalnessMap?.dispose();
      m.emissiveMap?.dispose();
      m.aoMap?.dispose();
      m.dispose();
    });
  });
}

/** Dispose materials cloned onto a displayed creature. Geometry stays with the template. */
export function disposeCloneMaterials(root) {
  const dead = [];
  root?.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => { dead.push(m); m.dispose(); });
  });
  if (!dead.length) return;
  for (let i = glowMats.length - 1; i >= 0; i--) {
    if (dead.includes(glowMats[i])) glowMats.splice(i, 1);
  }
}

function wrapModel(raw, targetSize, fromGlb) {
  const box = new THREE.Box3().setFromObject(raw);
  const size = box.getSize(new THREE.Vector3());
  const k = targetSize / Math.max(size.x, size.y, size.z, 1e-6);
  const c = box.getCenter(new THREE.Vector3());
  const outer = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(raw);
  inner.scale.setScalar(k);
  inner.position.copy(c).multiplyScalar(-k);
  outer.add(inner);
  if (fromGlb) outer.userData.fromGlb = true;
  raw.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => {
          if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
          if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
          m.needsUpdate = true;
        });
      }
    }
  });
  return { outer, k };
}

/**
 * Gulper texture is near-black: lift it with a texture-driven teal emissive + a fresnel rim so the
 * silhouette reads on the dark background without losing the deep-sea look (theme-scaled via glowMats).
 */
function brightenDeepSea(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const m = o.material;
    m.color?.multiplyScalar(1.6);
    if (m.map) { m.emissiveMap = m.map; }
    m.emissive?.set(0x4fb6c8);
    m.emissiveIntensity = 0.55; m.userData.base = 0.55; glowMats.push(m);
    m.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rim = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.5);
        totalEmissiveRadiance += vec3(0.25, 0.75, 0.9) * rim * 0.55;`);
    };
    m.customProgramCacheKey = () => 'gulper-rim';
    m.needsUpdate = true;
  });
}

/**
 * Motion envelope of a wrapped creature, in the wrapper's local frame: a point cloud of sampled vertices
 * across ALL of its clips (rigged) or across every behaviour's rigid pose/fx motion (static GLBs, driven
 * through their own updater). main.js fits the phone camera to these points exactly.
 * Returns { pts: Float32Array xyz, pad } (pad = extra fraction for GPU-only displacement).
 */
const _bv = new THREE.Vector3();
function sampleInto(outer, raw, out, per) {
  outer.updateMatrixWorld(true);
  raw.traverse(o => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    const n = o.geometry.attributes.position.count, step = Math.max(1, Math.floor(n / per));
    for (let i = 0; i < n; i += step) {
      o.getVertexPosition(i, _bv); _bv.applyMatrix4(o.matrixWorld); out.push(_bv.x, _bv.y, _bv.z);
    }
  });
}
function measureFitRigged(outer, raw, clips, steps = 8, per = 500) {
  const out = [], m = new THREE.AnimationMixer(raw);
  for (const c of clips) {
    const a = m.clipAction(c); a.play();
    const n = Math.max(1, steps);
    for (let k = 0; k < n; k++) { m.setTime(c.duration * k / n); sampleInto(outer, raw, out, per); }
    a.stop();
  }
  m.stopAllAction(); m.uncacheRoot(raw);
  return { pts: new Float32Array(out), pad: 0.03 };
}
function cheapFit(outer, raw) {
  const out = [];
  sampleInto(outer, raw, out, 220);
  return { pts: new Float32Array(out), pad: 0.08 };
}
function measureFitStatic(outer, raw, id, ctrl) {
  const out = [];
  const list = behaviorsFor(id);
  const save = [outer.position.clone(), outer.quaternion.clone()];
  let t = 1000;
  for (const b of list) {
    ctrl.setMode(b.id);
    const dur = Math.max(4, (b.fx?.period || 3) * 1.5);
    for (let k = 0; k < 40; k++) { t += dur / 40; ctrl.up(t, dur / 40); if (k % 3 === 2) sampleInto(outer, raw, out, 350); }
  }
  ctrl.setMode('auto'); ctrl.up(t + 0.016, 0.016);
  outer.position.copy(save[0]); outer.quaternion.copy(save[1]);
  // static models also get GPU-only undulation (tentacles/fins) that the CPU can't see: small pad
  return { pts: new Float32Array(out), pad: 0.08 };
}

function cloneMaterials(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    if (Array.isArray(o.material)) o.material = o.material.map(m => m.clone());
    else o.material = o.material.clone();
  });
}

/** Moon jelly GLB is an opaque Tripo shell. Pull it toward a readable bell. */
function softenMoonJelly(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      m.transparent = true;
      m.opacity = Math.min(typeof m.opacity === 'number' ? m.opacity : 1, 0.46);
      m.depthWrite = false;
      m.side = THREE.DoubleSide;
      if (typeof m.roughness === 'number') m.roughness = Math.min(m.roughness, 0.22);
      if (m.emissive) {
        m.emissive.set(0xd4f2ff);
        m.emissiveIntensity = Math.max(m.emissiveIntensity || 0, 0.22);
        m.userData.base = m.emissiveIntensity;
        glowMats.push(m);
      }
      m.needsUpdate = true;
    });
  });
}

/** «变色伪装»: cycle the body tint so the clip reads even when the GLB motion is subtle. */
function makeOctopusCamo(raw) {
  const mats = [];
  raw.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    list.forEach(m => {
      if (!m.color) return;
      if (!m.userData.camoBase) m.userData.camoBase = m.color.clone();
      mats.push(m);
    });
  });
  const cols = [0xc4623e, 0x6e8f3e, 0xe4d2a4, 0x3a322c, 0x8d4a38].map(c => new THREE.Color(c));
  const tmp = new THREE.Color();
  return function update(t, behaviorId) {
    const on = behaviorId === 'camouflage';
    mats.forEach(m => {
      const base = m.userData.camoBase;
      if (!on) { m.color.lerp(base, 0.1); return; }
      const u = t * 0.7;
      const i = Math.floor(u) % cols.length;
      tmp.copy(cols[i]).lerp(cols[(i + 1) % cols.length], u - Math.floor(u));
      m.color.lerp(tmp, 0.28);
    });
  };
}

/** Map UI behavior id → AnimationClip (clip names == behavior ids, authored in Blender). */
function clipForBehavior(id, behaviorId, clips) {
  return clips[behaviorId] || clips[behaviorsFor(id)[0].id] || Object.values(clips)[0];
}

const _ea = new THREE.Euler();
const _qa = new THREE.Quaternion();

/** Extra local bone motion where a clip is still quiet. Seahorse / octopus / squid / starfish use their exported clips. */
function accentPose(raw, id, beh, t) {
  if (id !== 'sperm_whale') return;
  if (!raw.userData.boneMap) {
    const map = {};
    raw.traverse(o => { if (o.isBone) map[o.name] = o; });
    raw.userData.boneMap = map;
  }
  const b = raw.userData.boneMap;
  const mul = (node, x, y, z) => {
    if (!node) return;
    _ea.set(x, y, z);
    _qa.setFromEuler(_ea);
    node.quaternion.multiply(_qa);
  };
  if (beh === 'click') {
    const k = 0.5 + 0.5 * Math.sin(t * 16);
    mul(b.jaw, 0.32 * k, 0, 0);
    mul(b.head, 0.05 * Math.sin(t * 16), 0.1 * Math.sin(t * 8), 0);
  }
}

/**
 * AnimationMixer controller for skinned GLBs.
 * setMode keeps chip API; auto → swim; locked behaviors map to swim/lure/idle.
 */
function makeRiggedUpdater(raw, outer, id, mixer, clips) {
  let mode = 'auto';
  let currentAction = null;
  let lastT = null;

  function playClip(clip, fade = FADE_SEC, behaviorId) {
    if (!clip) return;
    const next = mixer.clipAction(clip);
    next.timeScale = behaviorsFor(id).find(b => b.id === behaviorId)?.rate || 1;
    if (currentAction === next && next.isRunning()) return;
    next.enabled = true;
    next.reset();
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = false;
    if (fade <= 0 || !currentAction) {
      next.weight = 1;
      next.play();
      if (currentAction && currentAction !== next) {
        currentAction.stop();
      }
    } else {
      next.fadeIn(fade).play();
      currentAction.fadeOut(fade);
    }
    currentAction = next;
  }

  // auto: cycle through this species' own behavior list
  const list = behaviorsFor(id).filter(b => clips[b.id]);
  let autoIdx = 0, autoT0 = null;
  playClip(clipForBehavior(id, list[0]?.id, clips), 0, list[0]?.id);
  const fx = [
    id === 'angler' && makeLureGlow(raw, outer),
    id === 'angler' && makeMouthCavity(raw),
    id === 'whale' && makeSpout(raw, outer),
    id === 'octopus' && makeOctopusCamo(raw),
  ].filter(Boolean);
  const activeId = () => (mode === 'auto' ? list[autoIdx]?.id : mode);
  /** Camera hint for the current behaviour ({yaw, pitch, dist, lookY}) — consumed by main.js. */
  const trackBone = raw.getObjectByName(id === 'whale' ? 'spine3' : 'root');
  /** World-space height of the body centre (for camera tracking during breach). */
  function trackY() { if (!trackBone) return 0; trackBone.getWorldPosition(_tv); return _tv.y; }
  function view() { return behaviorsFor(id).find(b => b.id === activeId())?.view || null; }

  function setMode(m) {
    if (m == null || m === 'auto') {
      mode = 'auto'; autoT0 = null;
      playClip(clipForBehavior(id, list[autoIdx]?.id, clips), FADE_SEC, list[autoIdx]?.id);
      return 'auto';
    }
    mode = m;
    playClip(clipForBehavior(id, m, clips), FADE_SEC, m);
    return mode;
  }

  function getMode() {
    return mode;
  }

  function up(t, dt) {
    let d = dt;
    if (d == null || Number.isNaN(d)) {
      if (lastT == null) lastT = t;
      d = Math.min(Math.max(t - lastT, 0), 0.05);
    }
    lastT = t;
    if (mode === 'auto' && list.length > 1) {
      if (autoT0 == null) autoT0 = t;
      if (t - autoT0 > (list[autoIdx].hold || 5)) {
        autoIdx = (autoIdx + 1) % list.length; autoT0 = t;
        playClip(clipForBehavior(id, list[autoIdx].id, clips), 0.6, list[autoIdx].id);
      }
    }
    mixer.update(d);
    accentPose(raw, id, activeId(), t);
    const ph = currentAction ? (currentAction.time / currentAction.getClip().duration) : 0;
    if (outer) outer.position.y = 0;
    for (const f of fx) f(t, activeId(), ph);
    // Subtle rigid bob on wrap group only — additive so behaviour fx (e.g. blow drop) can shift the base
    if (outer) outer.position.y += Math.sin(t * 0.9) * 0.025;
  }

  up.setMode = setMode;
  up.getMode = getMode;
  return { up, setMode, getMode, mixer, view, trackY, active: activeId };
}

/**
 * Async creature loader. Tries GLB first;
 * falls back to procedural build() if missing or load fails.
 * Returns { g, raw, up, setMode, getMode, k, mixer? } matching build().
 */
export async function loadCreature(id, onProgress) {
  if (!GLB_IDS.has(id)) return build(id);
  try {
    const template = await fetchTemplate(id, onProgress);
    const useRig = RIGGED_IDS.has(id) && template.animations.length > 0;
    const raw = useRig ? SkeletonUtils.clone(template.scene) : template.scene.clone(true);
    cloneMaterials(raw);
    if (id === 'jelly') softenMoonJelly(raw);
    const fitSize = frameFor(id).size;

    if (useRig) {
      const { outer, k } = wrapModel(raw, fitSize, true);
      if (id === 'gulper') brightenDeepSea(raw);
      const mixer = new THREE.AnimationMixer(raw);
      const clips = Object.fromEntries(template.animations.map(a => [a.name, a]));
      // Bind-pose envelope now; the full clip cloud is deferred so a cold switch can paint.
      const fit = cheapFit(outer, raw);
      const ctrl = makeRiggedUpdater(raw, outer, id, mixer, clips);
      const refineFit = apply => {
        const idle = window.requestIdleCallback || (fn => setTimeout(fn, 600));
        idle(() => {
          try {
            const probe = SkeletonUtils.clone(template.scene);
            const wrapped = wrapModel(probe, fitSize, true);
            apply(measureFitRigged(wrapped.outer, probe, template.animations, 4, 240));
          } catch (err) { console.warn('[ocean-atlas] envelope', err?.message || err); }
        }, { timeout: 2800 });
      };
      return {
        fit, refineFit,
        g: outer, raw, up: ctrl.up, setMode: ctrl.setMode, getMode: ctrl.getMode, k, mixer, view: ctrl.view, trackY: ctrl.trackY, active: ctrl.active,
      };
    }

    // Static GLB: GPU alive displacement + behavioral rigid pose
    const alive = applyAliveMotion(raw, id);
    const { outer, k } = wrapModel(raw, fitSize, true);
    const ctrl = makeAliveUpdater(raw, id, alive);
    const fit = measureFitStatic(outer, raw, id, ctrl);
    return { fit, g: outer, raw, up: ctrl.up, setMode: ctrl.setMode, getMode: ctrl.getMode, k, active: ctrl.active, view: ctrl.view };
  } catch (err) {
    console.warn(`[ocean-atlas] GLB load failed for ${id}, using procedural:`, err?.message || err);
    return build(id);
  }
}
