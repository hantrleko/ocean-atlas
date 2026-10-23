/**
 * Per-species stage framing.
 * Models are normalized to `size` (longest axis, world units) then viewed from `dist`
 * with vertical `fov`. `yaw` / `pitch` are the resting orbit; `aimY` shifts the look-at.
 *
 * Elongated animals (shark, oarfish, sperm whale, squid, lion's mane) get their own
 * lens so the body fills the stage without the long axis leaving the frame.
 * spider_crab / starfish / mantis_shrimp / giant_isopod / urchin stay on the shared
 * museum camera — that framing already reads for those low, wide benthic meshes.
 */
export const DEFAULT_FRAME = Object.freeze({
  dist: 9,
  fov: 35,
  aimY: 0,
  aimX: 0,
  size: 2.8,
  yaw: -0.5,
  pitch: 0.12,
});

export const FRAMES = {
  dumbo: { dist: 8.1, fov: 34, size: 3.05, yaw: 0.35, pitch: 0.2, aimY: -0.04 },
  angler: { dist: 7.8, fov: 33, size: 3.1, yaw: 0.7, pitch: 0.1 },
  vampire: { dist: 8.0, fov: 34, size: 3.15, yaw: 0.25, pitch: 0.14 },
  barreleye: { dist: 7.4, fov: 32, size: 2.95, yaw: 0.55, pitch: 0.16 },
  gulper: { dist: 8.6, fov: 30, size: 3.4, yaw: 0.2, pitch: 0.08 },
  nautilus: { dist: 7.9, fov: 33, size: 3.05, yaw: 0.55, pitch: 0.12 },
  jelly: { dist: 8.0, fov: 34, size: 3.15, yaw: 0.2, pitch: 0.08 },
  physalia: { dist: 8.3, fov: 34, size: 3.15, yaw: 0.3, pitch: 0.06, aimY: 0.12 },
  whale: { dist: 8.5, fov: 32, size: 3.4, yaw: 0.55, pitch: 0.06 },
  turtle: { dist: 7.9, fov: 33, size: 3.1, yaw: 0.45, pitch: 0.12 },
  hammer: { dist: 8.2, fov: 31, size: 3.35, yaw: 0.65, pitch: 0.08 },
  great_white: { dist: 7.6, fov: 30, size: 3.3, yaw: 0.62, pitch: 0.06 },
  manta: { dist: 8.8, fov: 32, size: 3.6, yaw: 0.4, pitch: 0.22, aimY: -0.04 },
  frilled_shark: { dist: 8.5, fov: 28, size: 3.45, yaw: 0.4, pitch: 0.1 },
  oarfish: { dist: 9.4, fov: 28, size: 3.7, yaw: 0.12, pitch: 0.02 },
  clownfish: { dist: 7.3, fov: 32, size: 2.95, yaw: 0.75, pitch: 0.12 },
  seahorse: { dist: 8.0, fov: 30, size: 3.55, yaw: 0.28, pitch: 0.06 },
  sunfish: { dist: 8.1, fov: 33, size: 3.2, yaw: 0.45, pitch: 0.1 },
  blobfish: { dist: 7.6, fov: 33, size: 2.95, yaw: 0.5, pitch: 0.14 },
  coelacanth: { dist: 8.1, fov: 31, size: 3.3, yaw: 0.55, pitch: 0.08 },
  orca: { dist: 8.3, fov: 32, size: 3.35, yaw: 0.58, pitch: 0.08 },
  dolphin: { dist: 7.9, fov: 32, size: 3.2, yaw: 0.62, pitch: 0.08 },
  sperm_whale: { dist: 8.0, fov: 30, size: 3.45, yaw: 0.5, pitch: 0.08, aimY: 0.04 },
  leatherback: { dist: 8.1, fov: 32, size: 3.25, yaw: 0.48, pitch: 0.1 },
  giant_squid: { dist: 8.2, fov: 33, size: 3.55, yaw: 0.42, pitch: 0.12, aimY: -0.06 },
  octopus: { dist: 7.9, fov: 34, size: 3.1, yaw: 0.4, pitch: 0.18 },
  lionsmane: { dist: 8.6, fov: 34, size: 3.55, yaw: 0.3, pitch: 0.14, aimY: -0.2 },
  comb_jelly: { dist: 7.5, fov: 32, size: 2.9, yaw: 0.3, pitch: 0.1 },
  // Kept on the shared museum camera (recent benthic fit).
  spider_crab: { dist: 9, fov: 35, size: 2.8, yaw: -0.5, pitch: 0.12 },
  mantis_shrimp: { dist: 9, fov: 35, size: 2.8, yaw: -0.5, pitch: 0.12 },
  giant_isopod: { dist: 9, fov: 35, size: 2.8, yaw: -0.5, pitch: 0.12 },
  starfish: { dist: 9, fov: 35, size: 2.8, yaw: -0.5, pitch: 0.12 },
  urchin: { dist: 9, fov: 35, size: 2.8, yaw: -0.5, pitch: 0.12 },
};

export function frameFor(id) {
  const f = FRAMES[id];
  return f ? { ...DEFAULT_FRAME, ...f } : { ...DEFAULT_FRAME };
}
