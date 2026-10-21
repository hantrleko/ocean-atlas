/**
 * Procedural "alive" motion for static GLB meshes:
 * - GPU vertex displacement via MeshStandard/Physical onBeforeCompile
 * - Rigid-body bob / yaw / pitch / roll + named behavioral pose cycling
 * Materials are cloned per display instance so the GLB cache template stays clean.
 */
import * as THREE from 'three';

/**
 * Per-species motion profiles.
 * Base swimming signature: kind / undulate / freq / bob / yaw / pitch / roll / …
 * Behaviors modulate pose + amp/freq/bob multipliers over time.
 *
 * Behavior fields:
 *   id, hold (s), pose [pitch,yaw,roll] rad, amp, freq, bob, sway
 */
export const MOTION = {
  dumbo: {
    kind: 'soft', undulate: 0.045, freq: 1.8, bob: 0.09, yaw: 0.2, pitch: 0.08, roll: 0.12,
    behaviors: [
      { id: 'cruise', hold: 5.5, pose: [0.04, 0.1, -0.12], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'forage', hold: 5.0, pose: [0.28, 0.06, 0.08], amp: 1.15, freq: 1.1, bob: 0.85, sway: 0.9 },
      { id: 'rest', hold: 6.0, pose: [-0.06, -0.04, 0.05], amp: 0.55, freq: 0.7, bob: 0.5, sway: 0.5 },
    ],
  },
  vampire: {
    kind: 'soft', undulate: 0.04, freq: 1.5, bob: 0.1, yaw: 0.16, pitch: 0.1, roll: 0.1,
    behaviors: [
      { id: 'rest', hold: 5.5, pose: [0.05, 0.06, -0.08], amp: 0.7, freq: 0.75, bob: 0.6, sway: 0.6 },
      { id: 'forage', hold: 5.0, pose: [0.22, 0.12, 0.1], amp: 1.2, freq: 1.15, bob: 1.0, sway: 1.0 },
      { id: 'cloak', hold: 5.5, pose: [0.38, -0.05, 0.18], amp: 0.45, freq: 0.55, bob: 0.4, sway: 0.4 },
    ],
  },
  angler: {
    kind: 'fish', undulate: 0.055, freq: 2.2, bob: 0.06, yaw: 0.14, pitch: 0.05, roll: 0.08,
    tailBias: 1,
    behaviors: [
      { id: 'rest', hold: 5.5, pose: [0.02, 0.05, 0.03], amp: 0.65, freq: 0.7, bob: 0.55, sway: 0.5 },
      { id: 'lure', hold: 6.0, pose: [0.18, 0.08, -0.06], amp: 1.35, freq: 0.85, bob: 0.7, sway: 0.7 },
      { id: 'hunt', hold: 4.0, pose: [-0.4, -0.12, 0.1], amp: 1.5, freq: 1.7, bob: 1.2, sway: 1.3 },
    ],
  },
  barreleye: {
    kind: 'fish', undulate: 0.035, freq: 2.6, bob: 0.05, yaw: 0.12, pitch: 0.06, roll: 0.07,
    tailBias: 1,
    behaviors: [
      { id: 'cruise', hold: 5.0, pose: [0.04, 0.08, -0.05], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'hunt', hold: 5.5, pose: [0.42, 0.05, 0.04], amp: 1.15, freq: 1.2, bob: 0.8, sway: 0.8 },
      { id: 'cruise', hold: 4.5, pose: [-0.05, -0.1, 0.08], amp: 0.95, freq: 0.95, bob: 1.0, sway: 1.0 },
    ],
  },
  gulper: {
    kind: 'fish', undulate: 0.06, freq: 1.9, bob: 0.07, yaw: 0.1, pitch: 0.12, roll: 0.06,
    tailBias: 1, long: true,
    behaviors: [
      { id: 'cruise', hold: 5.5, pose: [0.06, 0.06, -0.04], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'hunt', hold: 5.0, pose: [0.4, 0.08, 0.06], amp: 1.35, freq: 1.25, bob: 1.1, sway: 1.1 },
      { id: 'cruise', hold: 5.0, pose: [-0.08, -0.08, 0.05], amp: 0.9, freq: 0.9, bob: 0.9, sway: 0.9 },
    ],
  },
  jelly: {
    kind: 'jelly', undulate: 0.08, freq: 1.4, bob: 0.12, yaw: 0.1, pitch: 0.06, roll: 0.08,
    behaviors: [
      { id: 'pulse', hold: 5.0, pose: [0.05, 0.06, -0.08], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'forage', hold: 5.0, pose: [0.2, 0.1, 0.12], amp: 1.4, freq: 1.25, bob: 1.15, sway: 1.1 },
      { id: 'rest', hold: 5.5, pose: [-0.04, -0.05, 0.04], amp: 0.5, freq: 0.6, bob: 0.45, sway: 0.5 },
    ],
  },
  physalia: {
    kind: 'tendril', undulate: 0.05, freq: 1.1, bob: 0.08, yaw: 0.08, pitch: 0.04, roll: 0.1,
    behaviors: [
      { id: 'patrol', hold: 6.0, pose: [0.03, 0.1, -0.08], amp: 0.9, freq: 0.9, bob: 0.85, sway: 0.9 },
      { id: 'hunt', hold: 5.5, pose: [0.12, -0.08, 0.22], amp: 1.45, freq: 1.2, bob: 1.0, sway: 1.2 },
      { id: 'patrol', hold: 5.5, pose: [-0.04, 0.05, 0.1], amp: 0.85, freq: 0.85, bob: 0.8, sway: 0.85 },
    ],
  },
  whale: {
    kind: 'fish', undulate: 0.04, freq: 1.15, bob: 0.1, yaw: 0.1, pitch: 0.08, roll: 0.05,
    tailBias: 1, slow: true,
    behaviors: [
      { id: 'patrol', hold: 6.5, pose: [0.04, 0.06, -0.04], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'forage', hold: 5.5, pose: [0.32, 0.04, 0.05], amp: 1.1, freq: 1.05, bob: 0.85, sway: 0.8 },
      { id: 'display', hold: 6.0, pose: [-0.08, 0.08, 0.42], amp: 0.85, freq: 0.8, bob: 1.15, sway: 1.4 },
      { id: 'breach', hold: 4.5, pose: [-0.35, -0.05, -0.15], amp: 1.25, freq: 1.15, bob: 1.4, sway: 1.2 },
    ],
  },
  turtle: {
    kind: 'turtle', undulate: 0.022, freq: 1.6, bob: 0.07, yaw: 0.12, pitch: 0.07, roll: 0.14,
    behaviors: [
      { id: 'patrol', hold: 5.5, pose: [0.04, 0.12, -0.15], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'forage', hold: 5.0, pose: [0.35, 0.08, 0.1], amp: 1.15, freq: 1.1, bob: 0.75, sway: 0.85 },
      { id: 'court', hold: 5.5, pose: [-0.05, -0.1, 0.4], amp: 0.95, freq: 0.95, bob: 1.1, sway: 1.5 },
    ],
  },
  hammer: {
    kind: 'fish', undulate: 0.045, freq: 2.0, bob: 0.06, yaw: 0.16, pitch: 0.05, roll: 0.09,
    tailBias: 1,
    behaviors: [
      { id: 'patrol', hold: 5.0, pose: [0.03, 0.14, -0.08], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'hunt', hold: 4.5, pose: [0.38, -0.1, 0.08], amp: 1.4, freq: 1.45, bob: 1.15, sway: 1.2 },
      { id: 'court', hold: 5.5, pose: [-0.06, 0.12, 0.45], amp: 0.9, freq: 0.85, bob: 1.05, sway: 1.5 },
      { id: 'patrol', hold: 5.0, pose: [-0.04, -0.12, 0.1], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
    ],
  },
  nautilus: {
    kind: 'shell', undulate: 0.012, freq: 1.0, bob: 0.1, yaw: 0.08, pitch: 0.06, roll: 0.1,
    behaviors: [
      { id: 'patrol', hold: 5.5, pose: [0.06, 0.05, -0.1], amp: 1.0, freq: 1.0, bob: 1.0, sway: 1.0 },
      { id: 'forage', hold: 5.0, pose: [0.28, 0.08, 0.12], amp: 1.2, freq: 1.15, bob: 0.9, sway: 1.0 },
      { id: 'rest', hold: 6.0, pose: [-0.05, -0.04, 0.06], amp: 0.5, freq: 0.65, bob: 0.55, sway: 0.5 },
    ],
  },
};

/** Chinese labels for behavior ids (optional HUD / debug). */
export const BEHAVIOR_LABELS = {
  hunt: '捕食',
  court: '求偶',
  forage: '觅食',
  rest: '休息',
  patrol: '巡游',
  display: '展示',
  lure: '诱捕',
  cloak: '掩护',
  pulse: '脉动',
  breach: '跃水',
  cruise: '巡游',
};

export function behaviorLabel(id) {
  return BEHAVIOR_LABELS[id] || id;
}

const KIND_CODE = { fish: 0, soft: 1, jelly: 2, tendril: 3, turtle: 4, shell: 5 };

const DEFAULT_BEHAVIOR = {
  id: 'cruise',
  hold: 5.5,
  pose: [0, 0, 0],
  amp: 1,
  freq: 1,
  bob: 1,
  sway: 1,
};

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Pick length / lateral / up axes from a local bbox size (largest extent = length). */
function axesFromSize(size) {
  const dims = [
    { i: 0, v: size.x },
    { i: 1, v: size.y },
    { i: 2, v: size.z },
  ].sort((a, b) => b.v - a.v);
  const lengthAxis = dims[0].i;
  let lateralAxis = dims[1].i;
  // Prefer a non-Y axis for lateral swim when possible
  if (lateralAxis === 1 && dims[2].i !== 1) lateralAxis = dims[2].i;
  if (lengthAxis === 1) {
    lateralAxis = size.x >= size.z ? 0 : 2;
  }
  const upAxis = [0, 1, 2].find(i => i !== lengthAxis && i !== lateralAxis) ?? 1;
  return { lengthAxis, lateralAxis, upAxis };
}

function axisVec(i) {
  return i === 0 ? new THREE.Vector3(1, 0, 0)
    : i === 1 ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(0, 0, 1);
}

const VERTEX_CHUNK = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uKind;
  uniform float uTailBias;
  uniform vec3 uCenter;
  uniform vec3 uHalf;
  uniform vec3 uLenDir;
  uniform vec3 uLatDir;
  uniform vec3 uUpDir;

  vec3 oaDisplace(vec3 pos) {
    vec3 lp = pos - uCenter;
    float halfLen = max(dot(uHalf, abs(uLenDir)), 1e-4);
    float halfLat = max(dot(uHalf, abs(uLatDir)), 1e-4);
    float halfUp  = max(dot(uHalf, abs(uUpDir)), 1e-4);
    float along = clamp(dot(lp, uLenDir) / halfLen, -1.0, 1.0);
    float latN  = clamp(dot(lp, uLatDir) / halfLat, -1.0, 1.0);
    float upN   = clamp(dot(lp, uUpDir)  / halfUp,  -1.0, 1.0);
    vec3 d = vec3(0.0);

    if (uKind < 0.5) {
      // fish — lateral undulation, stronger toward tail
      float tail = clamp(0.15 + 0.85 * pow(clamp(-along * uTailBias * 0.5 + 0.5, 0.0, 1.0), 1.15), 0.0, 1.0);
      float wave = sin(along * 3.14159 * 1.6 - uTime * uFreq) * uAmp * tail;
      float wave2 = sin(along * 3.14159 * 0.8 - uTime * uFreq * 0.55) * uAmp * 0.25 * tail;
      d += uLatDir * (wave + wave2);
      d += uUpDir * sin(along * 2.0 - uTime * uFreq * 0.7) * uAmp * 0.18 * tail;
    } else if (uKind < 1.5) {
      // soft / cephalopod — multi-freq flutter
      float w1 = sin(along * 4.0 + latN * 2.0 - uTime * uFreq) * uAmp;
      float w2 = sin(upN * 3.5 + along * 2.0 - uTime * uFreq * 1.3) * uAmp * 0.55;
      float w3 = sin(latN * 5.0 - uTime * uFreq * 0.8) * uAmp * 0.35;
      d += uLatDir * (w1 + w3 * 0.5);
      d += uUpDir * (w2 + sin(uTime * uFreq * 1.1 + along) * uAmp * 0.4);
      d += uLenDir * sin(uTime * uFreq * 0.6 + latN * 2.0) * uAmp * 0.25;
    } else if (uKind < 2.5) {
      // jelly — radial / vertical bell pulse
      float pulse = sin(uTime * uFreq);
      float bell = smoothstep(-0.2, 1.0, upN);
      float radial = pulse * uAmp * (0.55 + 0.45 * bell);
      vec3 radialDir = lp - uUpDir * dot(lp, uUpDir);
      d += radialDir * (radial / max(halfLat, 1e-4));
      d -= uUpDir * pulse * uAmp * 0.55 * (0.4 + 0.6 * bell);
      float below = smoothstep(0.15, -1.0, upN);
      d += uLatDir * sin(uTime * uFreq * 1.2 + along * 3.0) * uAmp * 0.5 * below;
    } else if (uKind < 3.5) {
      // tendril / physalia — more motion on lower parts
      float below = smoothstep(0.2, -1.0, upN);
      float sway = sin(along * 2.5 + uTime * uFreq) * uAmp * (0.25 + 0.75 * below);
      float sway2 = sin(latN * 3.0 - uTime * uFreq * 0.9) * uAmp * 0.4 * below;
      d += uLatDir * (sway + sway2);
      d += uLenDir * sin(uTime * uFreq * 0.7 + upN * 2.0) * uAmp * 0.35 * below;
      d += uUpDir * sin(uTime * uFreq * 0.5) * uAmp * 0.15 * below;
    } else if (uKind < 4.5) {
      // turtle — mild body flex + flipper-ish tip motion
      float tip = pow(abs(latN), 1.4);
      float flex = sin(along * 2.2 - uTime * uFreq) * uAmp * 0.7;
      d += uUpDir * flex * (0.3 + 0.7 * abs(along));
      d += uLatDir * sin(uTime * uFreq * 1.4 + along) * uAmp * tip;
      d += uLenDir * sin(uTime * uFreq + latN) * uAmp * 0.3 * tip;
    } else {
      // shell / nautilus — very subtle rock
      float rock = sin(uTime * uFreq) * uAmp;
      d += uLatDir * rock * upN * 0.6;
      d += uUpDir * sin(uTime * uFreq * 0.8 + along) * uAmp * 0.5;
    }
    return pos + d;
  }
`;

function makeUniforms(profile, center, half, lengthAxis, lateralAxis, upAxis, sharedTime) {
  return {
    uTime: sharedTime,
    uAmp: { value: profile.undulate },
    uFreq: { value: profile.freq },
    uKind: { value: KIND_CODE[profile.kind] ?? 0 },
    uTailBias: { value: profile.tailBias ?? 1 },
    uCenter: { value: center.clone() },
    uHalf: { value: half.clone() },
    uLenDir: { value: axisVec(lengthAxis) },
    uLatDir: { value: axisVec(lateralAxis) },
    uUpDir: { value: axisVec(upAxis) },
  };
}

function patchMaterial(mat, uniforms) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (typeof prev === 'function') prev(shader, renderer);
    Object.assign(shader.uniforms, {
      uTime: uniforms.uTime,
      uAmp: uniforms.uAmp,
      uFreq: uniforms.uFreq,
      uKind: uniforms.uKind,
      uTailBias: uniforms.uTailBias,
      uCenter: uniforms.uCenter,
      uHalf: uniforms.uHalf,
      uLenDir: uniforms.uLenDir,
      uLatDir: uniforms.uLatDir,
      uUpDir: uniforms.uUpDir,
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_CHUNK}`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\ntransformed = oaDisplace(transformed);`,
      );
    mat.userData.shader = shader;
  };
  // Unique cache key so patched vs unpatched (and different kinds) don't collide
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () =>
    `oa-alive-${uniforms.uKind.value}-${prevKey ? prevKey() : mat.uuid.slice(0, 8)}`;
  mat.needsUpdate = true;
}

/**
 * Scale undulate amp relative to mesh size so tiny/huge Tripo meshes feel similar.
 * profile.undulate is tuned ~as a fraction of body length (~0.04 of half-extent).
 */
function ampForMesh(profile, halfLen) {
  // Treat profile.undulate as fraction of body half-length (museum-subtle)
  const frac = profile.undulate;
  // Map: undulate 0.04 → ~4% of half-length displacement at peak
  return Math.max(halfLen * frac * 0.9, 0.002);
}

/**
 * Clone materials on a display mesh tree and inject alive displacement shaders.
 * Uses each mesh's local geometry bbox so vertex `position` matches uniforms.
 * Stores baseAmp / baseFreq on uniforms for later behavior modulation.
 * @returns {{ sharedTime: {value:number}, profile: object, baseAmp: number, baseFreq: number, uniformSets: object[] }}
 */
export function applyAliveMotion(root, speciesId) {
  const profile = MOTION[speciesId] || MOTION.nautilus;
  const sharedTime = { value: 0 };
  const uniformSets = [];
  let baseAmp = profile.undulate;
  let baseFreq = profile.freq;

  root.traverse(o => {
    if (!o.isMesh || !o.material) return;

    const geo = o.geometry;
    if (!geo?.attributes?.position) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const size = bb.getSize(new THREE.Vector3());
    const center = bb.getCenter(new THREE.Vector3());
    const half = size.clone().multiplyScalar(0.5);
    const { lengthAxis, lateralAxis, upAxis } = axesFromSize(size);
    const halfLen = half.getComponent(lengthAxis);
    const uniforms = makeUniforms(profile, center, half, lengthAxis, lateralAxis, upAxis, sharedTime);
    const meshAmp = ampForMesh(profile, halfLen);
    uniforms.uAmp.value = meshAmp;
    uniforms.baseAmp = meshAmp;
    uniforms.baseFreq = profile.freq;
    baseAmp = meshAmp;
    baseFreq = profile.freq;

    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const cloned = mats.map(m => {
      const c = m.clone();
      if (c.map) c.map.colorSpace = THREE.SRGBColorSpace;
      if (c.emissiveMap) c.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      patchMaterial(c, uniforms);
      c.userData.aliveUniforms = uniforms;
      return c;
    });
    o.material = Array.isArray(o.material) ? cloned : cloned[0];
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.aliveUniforms = uniforms;
    uniformSets.push(uniforms);
  });

  return { sharedTime, profile, baseAmp, baseFreq, uniformSets };
}

/**
 * Resolve which two behaviors we're between at time t, with hold-based cycling
 * and a smoothstep ease near the end of each hold.
 * Transition window is ~1.0s of the hold (clamped).
 */
function sampleBehaviors(behaviors, t, phase) {
  const list = behaviors.length ? behaviors : [DEFAULT_BEHAVIOR];
  const total = list.reduce((s, b) => s + (b.hold || 5), 0);
  // Phase offset in seconds so species don't sync
  let u = ((t + phase * 1.7) % total + total) % total;
  let i0 = 0;
  for (let i = 0; i < list.length; i++) {
    const h = list[i].hold || 5;
    if (u < h) {
      i0 = i;
      break;
    }
    u -= h;
  }
  const cur = list[i0];
  const nxt = list[(i0 + 1) % list.length];
  const hold = cur.hold || 5;
  // Ease over last ~1.0s (or 20% of hold, whichever is milder for short holds)
  const easeWin = Math.min(1.1, Math.max(0.8, hold * 0.2));
  const local = u;
  const e = local < hold - easeWin
    ? 0
    : smoothstep(hold - easeWin, hold, local);

  return { cur, nxt, e, id: e < 0.5 ? cur.id : nxt.id };
}

/**
 * Build the rigid + shader up(t) callback for a GLB creature.
 * Cycles named behaviors with hold times; lerps pose AND amp/freq/bob multipliers.
 * @param {THREE.Object3D} raw — the cloned scene root inside wrapModel
 * @param {string} speciesId
 * @param {{sharedTime: object, profile: object, baseAmp?: number, baseFreq?: number, uniformSets?: object[]}} alive
 */
export function makeAliveUpdater(raw, speciesId, alive) {
  const { sharedTime, profile } = alive;
  const behaviors = profile.behaviors || [DEFAULT_BEHAVIOR];
  const phase = ((speciesId.charCodeAt(0) * 17 + speciesId.length * 13) % 100) / 100 * Math.PI * 2;
  const uniformSets = alive.uniformSets || [];

  // Collect unique uniform sets (also walk raw in case applyAliveMotion ran earlier)
  if (!uniformSets.length) {
    raw.traverse(o => {
      if (o.userData?.aliveUniforms) uniformSets.push(o.userData.aliveUniforms);
      const mats = o.isMesh
        ? (Array.isArray(o.material) ? o.material : [o.material])
        : [];
      for (const m of mats) {
        if (m?.userData?.aliveUniforms) uniformSets.push(m.userData.aliveUniforms);
      }
    });
  }
  // Deduplicate by object identity
  const uniq = [...new Set(uniformSets)];

  return function up(t) {
    sharedTime.value = t;

    const { cur, nxt, e } = sampleBehaviors(behaviors, t, phase);
    const pose = lerp3(cur.pose || [0, 0, 0], nxt.pose || [0, 0, 0], e);
    const ampMult = lerp(cur.amp ?? 1, nxt.amp ?? 1, e);
    const freqMult = lerp(cur.freq ?? 1, nxt.freq ?? 1, e);
    const bobMult = lerp(cur.bob ?? 1, nxt.bob ?? 1, e);
    const swayMult = lerp(cur.sway ?? 1, nxt.sway ?? 1, e);

    const bob = Math.sin(t * (profile.freq * 0.55 * freqMult) + phase) * profile.bob * bobMult;
    const yawW = Math.sin(t * 0.35 + phase) * profile.yaw * 0.35 * swayMult;
    const pitchW = Math.sin(t * 0.42 + phase * 1.3) * profile.pitch * 0.35 * swayMult;
    const rollW = Math.sin(t * 0.5 + phase * 0.7) * profile.roll * 0.3 * swayMult;

    raw.position.y = bob;
    raw.rotation.x = pose[0] + pitchW;
    raw.rotation.y = pose[1] + yawW;
    raw.rotation.z = pose[2] + rollW;

    for (const u of uniq) {
      const bAmp = u.baseAmp ?? alive.baseAmp ?? profile.undulate;
      const bFreq = u.baseFreq ?? alive.baseFreq ?? profile.freq;
      u.uAmp.value = bAmp * ampMult;
      u.uFreq.value = bFreq * freqMult;
    }
  };
}
