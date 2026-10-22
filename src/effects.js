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
  const stalkMat = new THREE.SpriteMaterial({ map: tex(), color: 0x9ff8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const stalk = new THREE.Sprite(stalkMat); outer.add(stalk);
  let vi = -1, si = -1, lvl = 0; const _w = new THREE.Vector3();
  const LEVEL = { lure: 1, ambush: 0.6, strike: 0.25, swim: 0.35 };
  const posAttr = skinned.geometry.attributes.position;
  return function update(t, behaviorId) {
    if (vi < 0) { // find bulb = highest vertex in world space at the current (rest-ish) pose
      raw.updateMatrixWorld(true); let best = -Infinity;
      for (let i = 0; i < posAttr.count; i++) { _v.fromBufferAttribute(posAttr, i).applyMatrix4(skinned.matrixWorld); if (_v.y > best) { best = _v.y; vi = i; } }
      // stalk end: lowest vertex within a small radius of the bulb (where the stalk meets the bulb)
      const bulb = _w.fromBufferAttribute(posAttr, vi).applyMatrix4(skinned.matrixWorld).clone();
      const box = new THREE.Box3().setFromObject(skinned), R = box.getSize(new THREE.Vector3()).length() * 0.06; let low = Infinity;
      for (let i = 0; i < posAttr.count; i++) { _v.fromBufferAttribute(posAttr, i).applyMatrix4(skinned.matrixWorld); if (_v.distanceTo(bulb) < R && _v.y < low) { low = _v.y; si = i; } }
    }
    const posed = (i, out) => { out.fromBufferAttribute(posAttr, i); skinned.applyBoneTransform(i, out); skinned.localToWorld(out); return outer.worldToLocal(out); };
    holder.position.copy(posed(vi, _v));
    if (si >= 0) stalk.position.copy(posed(si, _w).lerp(holder.position, 0.35));
    const target = LEVEL[behaviorId] ?? 0.4; lvl += (target - lvl) * 0.08;
    const pulse = behaviorId === 'lure' ? 0.55 + 0.45 * Math.sin(t * 5.5) ** 2
      : behaviorId === 'ambush' ? 0.7 + 0.3 * Math.sin(t * 1.3) : 0.8 + 0.2 * Math.sin(t * 2);
    const k = lvl * pulse;
    halo.scale.setScalar(0.12 + 0.22 * k); core.scale.setScalar(0.05 + 0.06 * k);
    stalk.scale.setScalar(0.05 + 0.08 * k); stalkMat.opacity = 0.3 + 0.6 * k;
    mat.opacity = 0.35 + 0.65 * k; light.intensity = 6 * k;
  };
}

/** Whale blow: mist particles rising from the blowhole while the 'blow' clip is at the surface. */
export function makeSpout(raw, outer) {
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
  let skinned = null; raw.traverse(o => { if (o.isSkinnedMesh && !skinned) skinned = o; });
  const pa = skinned.geometry.attributes.position; let bi = -1;
  let i0 = 0, lastT = null;
  return function update(t, behaviorId, phase) {
    if (bi < 0) {
      // glTF space: head (snout) = max z. Blowhole = highest vertex in the slab 22–32% back from the snout.
      skinned.geometry.computeBoundingBox(); const bb = skinned.geometry.boundingBox, len = bb.max.z - bb.min.z; let best = -Infinity;
      for (let i = 0; i < pa.count; i++) { const z = pa.getZ(i), f = (bb.max.z - z) / len; if (f > 0.22 && f < 0.32 && Math.abs(pa.getX(i)) < len * 0.05 && pa.getY(i) > best) { best = pa.getY(i); bi = i; } }
    }
    const dt = lastT == null ? 0.016 : Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
    // Drop the whale during the blow so the spout has headroom (base y; bob is added after)
    if (behaviorId === 'blow') outer.position.y = -1.25;
    const emit = behaviorId === 'blow' && phase > 0.28 && phase < 0.7;
    if (emit) {
      _v.fromBufferAttribute(pa, bi); skinned.applyBoneTransform(bi, _v); skinned.localToWorld(_v); outer.worldToLocal(_v);
      _v.y -= 0.05;
      for (let n = 0; n < 4; n++) {
        const i = i0; i0 = (i0 + 1) % N; life[i] = 0;
        pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
        const r = Math.random() * 0.18, th = Math.random() * Math.PI * 2;
        // Short column in outer-local +Y so mist stays near the head and in frame
        vel[i * 3] = Math.cos(th) * r * 0.7; vel[i * 3 + 1] = 0.28 + Math.random() * 0.12; vel[i * 3 + 2] = Math.sin(th) * r * 0.7;
      }
    }
    for (let i = 0; i < N; i++) {
      if (life[i] < 0) { a[i] = 0; continue; }
      life[i] += dt; const L = life[i] / 0.65;
      if (L >= 1) { life[i] = -1; a[i] = 0; continue; }
      vel[i * 3 + 1] -= dt * 1.6; vel[i * 3] *= 1 + dt * 0.4; vel[i * 3 + 2] *= 1 + dt * 0.4;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      // Cap height relative to the blowhole so mist never runs off the top of the frame
      if (bi >= 0) {
        _v.fromBufferAttribute(pa, bi); skinned.applyBoneTransform(bi, _v); skinned.localToWorld(_v); outer.worldToLocal(_v);
        if (pos[i * 3 + 1] > _v.y + 0.22) pos[i * 3 + 1] = _v.y + 0.22;
      }
      a[i] = 0.6 * (1 - L) * Math.min(1, L * 10); sz[i] = 0.2 + L * 0.7;
    }
    geo.attributes.position.needsUpdate = geo.attributes.alpha.needsUpdate = geo.attributes.size.needsUpdate = true;
  };
}


/** Dark oral cavity: a radial-gradient disc in the gape so the open mouth reads as a deep throat. */
export function makeMouthCavity(raw) {
  const head = raw.getObjectByName('spine1');
  if (!head) return null;
  const g = new THREE.Group(); head.add(g);
  const cv = document.createElement('canvas'); cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  const grd = x.createRadialGradient(128, 128, 8, 128, 128, 128);
  grd.addColorStop(0, 'rgb(0,0,0)');
  grd.addColorStop(0.35, 'rgb(8,2,4)');
  grd.addColorStop(0.7, 'rgb(28,10,12)');
  grd.addColorStop(1, 'rgb(40,18,16)');
  x.fillStyle = grd; x.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, depthWrite: true });
  // Disc in the XY plane of the bone, facing ±Y (snout axis); rotate so it faces the snout
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat);
  disc.rotation.x = Math.PI / 2; // face along ±Y
  g.add(disc);
  // Slightly smaller, darker disc pushed further into the throat for parallax
  const deep = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({
    color: 0x000000, side: THREE.DoubleSide,
  }));
  deep.rotation.x = Math.PI / 2; deep.position.set(0, 0.12, 0); g.add(deep);
  let ready = false;
  return function update(_t, behaviorId) {
    if (!ready) { g.position.set(0, -0.13, -0.02); g.scale.setScalar(0.18); ready = true; }
    const open = behaviorId === 'strike' ? 1 : behaviorId === 'lure' ? 0.55 : behaviorId === 'ambush' ? 0.28 : 0.1;
    g.visible = open > 0.1;
    g.scale.setScalar(0.15 + 0.06 * open);
  };
}


