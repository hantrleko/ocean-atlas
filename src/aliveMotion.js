/**
 * Procedural "alive" motion for static GLB meshes:
 * - GPU vertex displacement via MeshStandard/Physical onBeforeCompile
 * - Rigid-body bob / yaw / pitch / roll + eased pose cycling
 * Materials are cloned per display instance so the GLB cache template stays clean.
 */
import * as THREE from 'three';

/**
 * Per-species motion profiles. Amplitudes are in local mesh units (pre-wrap scale).
 * Pose targets: [pitch, yaw, roll] radians relative to rest.
 */
export const MOTION = {
  dumbo: {
    kind: 'soft', undulate: 0.045, freq: 1.8, bob: 0.09, yaw: 0.2, pitch: 0.08, roll: 0.12,
    posePeriod: 5.5,
    poses: [[0.05, 0.12, -0.18], [-0.08, -0.1, 0.15], [0.02, 0.05, 0.05]],
  },
  vampire: {
    kind: 'soft', undulate: 0.04, freq: 1.5, bob: 0.1, yaw: 0.16, pitch: 0.1, roll: 0.1,
    posePeriod: 6.0,
    poses: [[0.1, 0.08, -0.12], [-0.06, -0.14, 0.1], [0.04, 0.02, 0.06]],
  },
  angler: {
    kind: 'fish', undulate: 0.055, freq: 2.2, bob: 0.06, yaw: 0.14, pitch: 0.05, roll: 0.08,
    posePeriod: 5.0, tailBias: 1,
    poses: [[0.04, 0.18, -0.1], [-0.05, -0.12, 0.12], [0.0, 0.06, 0.04]],
  },
  barreleye: {
    kind: 'fish', undulate: 0.035, freq: 2.6, bob: 0.05, yaw: 0.12, pitch: 0.06, roll: 0.07,
    posePeriod: 4.5, tailBias: 1,
    poses: [[0.08, 0.1, -0.08], [-0.04, -0.15, 0.1], [0.02, 0.04, 0.0]],
  },
  gulper: {
    kind: 'fish', undulate: 0.06, freq: 1.9, bob: 0.07, yaw: 0.1, pitch: 0.12, roll: 0.06,
    posePeriod: 5.8, tailBias: 1, long: true,
    poses: [[0.12, 0.08, -0.06], [-0.1, -0.1, 0.08], [0.05, 0.04, 0.03]],
  },
  jelly: {
    kind: 'jelly', undulate: 0.08, freq: 1.4, bob: 0.12, yaw: 0.1, pitch: 0.06, roll: 0.08,
    posePeriod: 4.8,
    poses: [[0.06, 0.08, -0.1], [-0.05, -0.1, 0.12], [0.0, 0.04, 0.04]],
  },
  physalia: {
    kind: 'tendril', undulate: 0.05, freq: 1.1, bob: 0.08, yaw: 0.08, pitch: 0.04, roll: 0.1,
    posePeriod: 6.5,
    poses: [[0.03, 0.12, -0.08], [-0.04, -0.08, 0.14], [0.02, 0.0, 0.05]],
  },
  whale: {
    kind: 'fish', undulate: 0.04, freq: 1.15, bob: 0.1, yaw: 0.1, pitch: 0.08, roll: 0.05,
    posePeriod: 7.0, tailBias: 1, slow: true,
    poses: [[0.06, 0.08, -0.06], [-0.08, -0.06, 0.05], [0.02, 0.04, 0.02]],
  },
  turtle: {
    kind: 'turtle', undulate: 0.022, freq: 1.6, bob: 0.07, yaw: 0.12, pitch: 0.07, roll: 0.14,
    posePeriod: 5.2,
    poses: [[0.05, 0.15, -0.2], [-0.06, -0.12, 0.18], [0.03, 0.05, 0.06]],
  },
  hammer: {
    kind: 'fish', undulate: 0.045, freq: 2.0, bob: 0.06, yaw: 0.16, pitch: 0.05, roll: 0.09,
    posePeriod: 5.0, tailBias: 1,
    poses: [[0.04, 0.16, -0.1], [-0.04, -0.14, 0.12], [0.0, 0.05, 0.03]],
  },
  nautilus: {
    kind: 'shell', undulate: 0.012, freq: 1.0, bob: 0.1, yaw: 0.08, pitch: 0.06, roll: 0.1,
    posePeriod: 6.2,
    poses: [[0.08, 0.06, -0.12], [-0.05, -0.08, 0.1], [0.03, 0.02, 0.04]],
  },
};

const KIND_CODE = { fish: 0, soft: 1, jelly: 2, tendril: 3, turtle: 4, shell: 5 };

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
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
 * @returns {{ sharedTime: {value:number}, profile: object }}
 */
export function applyAliveMotion(root, speciesId) {
  const profile = MOTION[speciesId] || MOTION.nautilus;
  const sharedTime = { value: 0 };

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
    uniforms.uAmp.value = ampForMesh(profile, halfLen);

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
  });

  return { sharedTime, profile };
}

/**
 * Build the rigid + shader up(t) callback for a GLB creature.
 * @param {THREE.Object3D} raw — the cloned scene root inside wrapModel
 * @param {string} speciesId
 * @param {{sharedTime: object, profile: object}} alive
 */
export function makeAliveUpdater(raw, speciesId, alive) {
  const { sharedTime, profile } = alive;
  const poses = profile.poses || [[0, 0, 0]];
  const period = profile.posePeriod || 5.5;
  const phase = ((speciesId.charCodeAt(0) * 17 + speciesId.length * 13) % 100) / 100 * Math.PI * 2;

  return function up(t) {
    sharedTime.value = t;

    const bob = Math.sin(t * (profile.freq * 0.55) + phase) * profile.bob;
    const yawW = Math.sin(t * 0.35 + phase) * profile.yaw * 0.35;
    const pitchW = Math.sin(t * 0.42 + phase * 1.3) * profile.pitch * 0.35;
    const rollW = Math.sin(t * 0.5 + phase * 0.7) * profile.roll * 0.3;

    const n = poses.length;
    const cycle = ((t / period) + phase * 0.1) % n;
    const i0 = Math.floor(cycle) % n;
    const i1 = (i0 + 1) % n;
    const frac = cycle - Math.floor(cycle);
    const e = smoothstep(0.15, 0.85, frac);
    const pose = lerp3(poses[i0], poses[i1], e);

    raw.position.y = bob;
    raw.rotation.x = pose[0] + pitchW;
    raw.rotation.y = pose[1] + yawW;
    raw.rotation.z = pose[2] + rollW;
  };
}
