/** Behaviour-driven visual effects for rigged creatures (angler lure glow, whale spout). */
import * as THREE from 'three';

const _v = new THREE.Vector3(), _s = new THREE.Vector3();

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let TEX = null; const tex = () => (TEX ||= glowTexture());

/** Glowing, pulsing bulb on the angler's lure. Tracks the posed bulb vertex (highest point at bind pose). */
export function makeLureGlow(raw, outer) {
  let skinned = null; raw.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  if (!skinned) return null;
  const holder = new THREE.Group(); outer.add(holder);
  const mat = new THREE.SpriteMaterial({ map: tex(), color: 0x7ff6ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const halo = new THREE.Sprite(mat); holder.add(halo);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(), color: 0xeaffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); holder.add(core);
  const light = new THREE.PointLight(0x66f0ff, 0, 3, 1.5); holder.add(light);
  let vi = -1, lvl = 0;
  const LEVEL = { lure: 1, ambush: 0.6, strike: 0.25, swim: 0.35 };
  const posAttr = skinned.geometry.attributes.position;
  return function update(t, behaviorId) {
    if (vi < 0) { // find bulb = highest vertex in world space at the current (rest-ish) pose
      raw.updateMatrixWorld(true); let best = -Infinity;
      for (let i = 0; i < posAttr.count; i++) { _v.fromBufferAttribute(posAttr, i).applyMatrix4(skinned.matrixWorld); if (_v.y > best) { best = _v.y; vi = i; } }
    }
    _v.fromBufferAttribute(posAttr, vi); skinned.applyBoneTransform(vi, _v); skinned.localToWorld(_v); outer.worldToLocal(_v);
    holder.position.copy(_v);
    const target = LEVEL[behaviorId] ?? 0.4; lvl += (target - lvl) * 0.08;
    const pulse = behaviorId === 'lure' ? 0.55 + 0.45 * Math.sin(t * 5.5) ** 2
      : behaviorId === 'ambush' ? 0.7 + 0.3 * Math.sin(t * 1.3) : 0.8 + 0.2 * Math.sin(t * 2);
    const k = lvl * pulse;
    halo.scale.setScalar(0.18 + 0.4 * k); core.scale.setScalar(0.06 + 0.08 * k);
    mat.opacity = 0.35 + 0.65 * k; light.intensity = 6 * k;
  };
}

/** Whale blow: mist particles rising from the blowhole while the 'blow' clip is at the surface. */
export function makeSpout(raw, outer) {
  const head = raw.getObjectByName('spine1'); if (!head) return null;
  const N = 260, pos = new Float32Array(N * 3), a = new Float32Array(N), sz = new Float32Array(N);
  const vel = new Float32Array(N * 3), life = new Float32Array(N).fill(-1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(a, 1));
  geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex() }, scale: { value: innerHeight / 2 } },
    vertexShader: 'attribute float alpha; attribute float size; varying float va; uniform float scale; void main(){ va=alpha; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform sampler2D map; varying float va; void main(){ vec4 c=texture2D(map,gl_PointCoord); gl_FragColor=vec4(vec3(0.85,0.93,1.0),c.a*va); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; outer.add(pts);
  const anchor = new THREE.Object3D(); head.add(anchor);
  let ready = false, i0 = 0, lastT = null;
  return function update(t, behaviorId, phase) {
    if (!ready) {
      // blowhole: top of the body above the head bone
      raw.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(raw); head.getWorldPosition(_v); _v.y = box.max.y - (box.max.y - box.min.y) * 0.12;
      anchor.position.copy(head.worldToLocal(_v.clone())); ready = true;
    }
    const dt = lastT == null ? 0.016 : Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    const emit = behaviorId === 'blow' && phase > 0.32 && phase < 0.62;
    if (emit) {
      anchor.getWorldPosition(_v); outer.worldToLocal(_v);
      for (let n = 0; n < 6; n++) {
        const i = i0; i0 = (i0 + 1) % N; life[i] = 0;
        pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
        const r = Math.random() * 0.35, th = Math.random() * Math.PI * 2;
        vel[i * 3] = Math.cos(th) * r; vel[i * 3 + 1] = 2.2 + Math.random() * 1.4; vel[i * 3 + 2] = Math.sin(th) * r;
      }
    }
    for (let i = 0; i < N; i++) {
      if (life[i] < 0) { a[i] = 0; continue; }
      life[i] += dt; const L = life[i] / 1.6;
      if (L >= 1) { life[i] = -1; a[i] = 0; continue; }
      vel[i * 3 + 1] -= dt * 1.2; vel[i * 3] *= 1 + dt * 0.6; vel[i * 3 + 2] *= 1 + dt * 0.6;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      a[i] = 0.55 * (1 - L) * Math.min(1, L * 8); sz[i] = 0.25 + L * 0.9;
    }
    geo.attributes.position.needsUpdate = geo.attributes.alpha.needsUpdate = geo.attributes.size.needsUpdate = true;
  };
}
