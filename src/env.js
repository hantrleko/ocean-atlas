/**
 * Per-species environments (lightweight, procedural, mobile-friendly).
 * One shared set of meshes; presets only change uniforms / colours / counts and
 * are blended over ~1.6 s whenever the species changes.
 */
import * as THREE from 'three';

const C = h => new THREE.Color(h);
// top / horizon / bottom of the backdrop, fog density, particle look, ground & extras
const ABYSS = {
  top: 0x0a1626, hor: 0x050b14, bot: 0x020408, fog: 0.05, surf: 0, sun: 0,
  snow: 0x9fb4c8, snowOp: 0.75, specks: 1, speckCol: 0x4df2ff,
  bed: 0, bedCol: 0x1a1c22, bedY: -2.4, bedTilt: 0, caus: 0, causCol: 0x88ccff,
  grass: 0, rocks: 0.35, rays: 0, water: 0, ceil: 0,
  hemi: [0x7fa8d8, 0x0a0e18, 0.85], key: [0xcfe4ff, 1.25], exposure: 1.0, amb: 'abyss', dark: 1,
};
export const PRESETS = {
  angler: { ...ABYSS, speckCol: 0x6dffe2 },
  gulper: { ...ABYSS, speckCol: 0xff7ad9, snowOp: 0.6 },
  dumbo: { ...ABYSS, bed: 1, bedCol: 0x232028, speckCol: 0x7fb8ff, top: 0x0c1830 },
  vampire: { ...ABYSS, speckCol: 0x5fa8ff, snowOp: 0.9 },
  barreleye: { ...ABYSS, speckCol: 0x8cff9a, top: 0x08182a },
  whale: {
    top: 0x5fc4f0, hor: 0x1f6ea8, bot: 0x07263f, fog: 0.028, surf: 1, sun: 1,
    snow: 0xcfefff, snowOp: 0.3, specks: 0, speckCol: 0xffffff,
    bed: 0, bedCol: 0x22465a, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xbfefff,
    grass: 0, rocks: 0, rays: 1, water: 0, ceil: 1, ceilY: 3.4,
    hemi: [0xbfe8ff, 0x1a3c58, 1.25], key: [0xfff6e0, 1.6], exposure: 1.05, amb: 'open',
  },
  turtle: {
    top: 0x9fe4ff, hor: 0x3aa6c8, bot: 0x2a7f8c, fog: 0.035, surf: 1, sun: 1,
    snow: 0xeafcff, snowOp: 0.25, specks: 0, speckCol: 0xffffff,
    bed: 1, bedCol: 0xc9b58a, bedY: -1.95, bedTilt: 0, caus: 1, causCol: 0xfff6d0,
    grass: 1, grassCol: 0x4f8a3a, rocks: 0.6, rays: 0.8, water: 0, ceil: 0,
    hemi: [0xe8fbff, 0x6a7a50, 1.35], key: [0xfff2d0, 2.2], exposure: 1.05, amb: 'reef',
  },
  jelly: {
    top: 0x8fd4f2, hor: 0x3a96c4, bot: 0x145878, fog: 0.03, surf: 0.85, sun: 0.7,
    snow: 0xe7f7ff, snowOp: 0.35, specks: 0.28, speckCol: 0xfff2c8,
    bed: 0.45, bedCol: 0xc8b890, bedY: -2.25, bedTilt: 0, caus: 0.65, causCol: 0xfff6d8,
    grass: 0.22, grassCol: 0x4a8a48, rocks: 0.28, rays: 0.55, water: 0, ceil: 0,
    hemi: [0xe8fbff, 0x3a6070, 1.2], key: [0xfff4e0, 1.85], exposure: 1.04, amb: 'midwater',
  },
  physalia: {
    top: 0x3f8fdc, hor: 0xa9d3ee, bot: 0x0d3d66, fog: 0.011, surf: 0, sun: 0.9,
    snow: 0xffffff, snowOp: 0.0, specks: 0, speckCol: 0xffffff, sky: 1,
    bed: 0, bedCol: 0x0a2a44, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xffffff,
    grass: 0, rocks: 0, rays: 0, water: 1, waterY: -0.15, ceil: 0,
    hemi: [0xffffff, 0x2a5a80, 1.45], key: [0xfff4e0, 2.4], exposure: 1.02, amb: 'surface',
  },
  nautilus: {
    top: 0x2b4e8a, hor: 0x14294f, bot: 0x0a1428, fog: 0.04, surf: 0.25, sun: 0.2,
    snow: 0xb8c8ff, snowOp: 0.55, specks: 0.25, speckCol: 0xffb36b,
    bed: 1, bedCol: 0x5a4a5e, bedY: -2.1, bedTilt: 0.32, caus: 0.15, causCol: 0x9fb8ff,
    grass: 0.35, grassCol: 0x7a3f5a, rocks: 1, rays: 0.15, water: 0, ceil: 0,
    hemi: [0x8fa8e8, 0x2a1a30, 0.95], key: [0xc8d0ff, 1.4], exposure: 1.0, amb: 'twilight', dark: 1,
  },
  hammer: {
    top: 0x6fd0e8, hor: 0x2a8fb0, bot: 0x1d6a80, fog: 0.03, surf: 1, sun: 0.8,
    snow: 0xeafcff, snowOp: 0.3, specks: 0, speckCol: 0xffffff,
    bed: 1, bedCol: 0xe0cfa0, bedY: -2.0, bedTilt: 0, caus: 1.2, causCol: 0xfff8e0,
    grass: 0.25, grassCol: 0x6a8a3a, rocks: 0.9, rays: 0.7, water: 0, ceil: 0,
    hemi: [0xe0f8ff, 0x8a7a5a, 1.3], key: [0xfff2d8, 2.1], exposure: 1.05, amb: 'reef',
  },
};

/** Catalog environment name → visual preset. `amb` keys match audio.js. */
const ENV = {
  sunlit_coastal: {
    top: 0x7ed4ee, hor: 0x2a90b4, bot: 0x166888, fog: 0.028, surf: 1, sun: 0.95,
    snow: 0xeafcff, snowOp: 0.28, specks: 0.08, speckCol: 0xffffff,
    bed: 1, bedCol: 0xd8c89a, bedY: -2.05, bedTilt: 0.05, caus: 1.15, causCol: 0xfff6d8,
    grass: 0.18, grassCol: 0x6a9a48, rocks: 0.65, rays: 0.9, water: 0, ceil: 0,
    hemi: [0xe7fbff, 0x8a7a58, 1.35], key: [0xfff3d8, 2.15], exposure: 1.06, amb: 'reef',
  },
  reef_cleaning_station: {
    top: 0x5ec8ea, hor: 0x1f86b8, bot: 0x146888, fog: 0.03, surf: 0.85, sun: 0.9,
    snow: 0xe7fbff, snowOp: 0.22, specks: 0.2, speckCol: 0xfff2a8,
    bed: 1, bedCol: 0xd2c0a4, bedY: -1.9, bedTilt: 0, caus: 1.05, causCol: 0xfff4cc,
    grass: 0.85, grassCol: 0x2f9a86, rocks: 1, rays: 0.75, water: 0, ceil: 0,
    hemi: [0xe4fbff, 0x5a8870, 1.3], key: [0xfff6e4, 2.05], exposure: 1.05, amb: 'reef',
  },
  deep_slope: {
    top: 0x12304e, hor: 0x0b1c32, bot: 0x060e18, fog: 0.046, surf: 0.1, sun: 0.12,
    snow: 0x9eb4c8, snowOp: 0.55, specks: 0.45, speckCol: 0x6ec8ff,
    bed: 1, bedCol: 0x2a3140, bedY: -1.85, bedTilt: 0.48, caus: 0.08, causCol: 0x88a0c0,
    grass: 0.05, grassCol: 0x243040, rocks: 1.05, rays: 0.08, water: 0, ceil: 0,
    hemi: [0x6a88b0, 0x101820, 0.8], key: [0xb8c8e0, 1.15], exposure: 0.95, amb: 'twilight', dark: 1,
  },
  twilight_zone: {
    top: 0x102848, hor: 0x0a1830, bot: 0x050c18, fog: 0.04, surf: 0.15, sun: 0.18,
    snow: 0xb7c8dc, snowOp: 0.62, specks: 0.9, speckCol: 0x4df2ff,
    bed: 0, bedCol: 0x101820, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xffffff,
    grass: 0, rocks: 0, rays: 0.12, water: 0, ceil: 0,
    hemi: [0x7aa0d0, 0x0a1424, 0.85], key: [0xc8d8f0, 1.2], exposure: 0.98, amb: 'twilight', dark: 1,
  },
  anemone_reef: {
    top: 0x6fd0e0, hor: 0x2a88a8, bot: 0x1a6078, fog: 0.032, surf: 0.9, sun: 0.85,
    snow: 0xfff0ea, snowOp: 0.22, specks: 0.15, speckCol: 0xffc2a0,
    bed: 1, bedCol: 0xe4d0b0, bedY: -1.92, bedTilt: 0, caus: 1.1, causCol: 0xfff0d0,
    grass: 1, grassCol: 0xd45a78, rocks: 0.75, rays: 0.7, water: 0, ceil: 0,
    hemi: [0xfff4ee, 0x8a6858, 1.3], key: [0xffe4c8, 2.1], exposure: 1.05, amb: 'reef',
  },
  seagrass_meadow: {
    top: 0x8fdef4, hor: 0x349cb8, bot: 0x24786e, fog: 0.034, surf: 1, sun: 1,
    snow: 0xeafcff, snowOp: 0.22, specks: 0, speckCol: 0xffffff,
    bed: 1, bedCol: 0xd4c49a, bedY: -1.9, bedTilt: 0, caus: 1.15, causCol: 0xfff6d0,
    grass: 1, grassCol: 0x3f8a32, rocks: 0.25, rays: 0.85, water: 0, ceil: 0,
    hemi: [0xe8fbff, 0x5a7a40, 1.35], key: [0xfff2d0, 2.15], exposure: 1.05, amb: 'reef',
  },
  sunlit_open_ocean: {
    top: 0x5fc4f0, hor: 0x1f6ea8, bot: 0x07263f, fog: 0.026, surf: 1, sun: 1,
    snow: 0xcfefff, snowOp: 0.28, specks: 0, speckCol: 0xffffff,
    bed: 0, bedCol: 0x22465a, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xbfefff,
    grass: 0, rocks: 0, rays: 1, water: 0, ceil: 1, ceilY: 3.2,
    hemi: [0xbfe8ff, 0x1a3c58, 1.28], key: [0xfff6e0, 1.7], exposure: 1.06, amb: 'open',
  },
  abyssal_plain: {
    ...ABYSS, bed: 1, bedY: -2.15, bedTilt: 0, rocks: 0.2, grass: 0, speckCol: 0x7ec8ff, snowOp: 0.8,
  },
  volcanic_cave: {
    top: 0x160e10, hor: 0x1c100c, bot: 0x070404, fog: 0.055, surf: 0, sun: 0.08,
    snow: 0x8a6858, snowOp: 0.4, specks: 0.85, speckCol: 0xff6a2a,
    bed: 1, bedCol: 0x1a1210, bedY: -1.65, bedTilt: 0.38, caus: 0, causCol: 0xff8844,
    grass: 0, rocks: 1.15, rays: 0.05, water: 0, ceil: 0,
    hemi: [0x6a4030, 0x100806, 0.7], key: [0xffa060, 0.85], exposure: 0.9, amb: 'abyss', dark: 1,
  },
  polar_ice_edge: {
    top: 0xd4f6ff, hor: 0x8ec8e4, bot: 0x1a5270, fog: 0.022, surf: 0.7, sun: 0.75, sky: 0.22,
    snow: 0xf4fbff, snowOp: 0.45, specks: 0.12, speckCol: 0xe8f7ff,
    bed: 0.35, bedCol: 0xd5e4ee, bedY: -2.3, bedTilt: 0, caus: 0.35, causCol: 0xf4fbff,
    grass: 0, rocks: 0.15, rays: 0.85, water: 0.35, waterY: 1.6, ceil: 0.55, ceilY: 2.6,
    hemi: [0xf4fbff, 0x4a7890, 1.35], key: [0xf7fbff, 2.0], exposure: 1.08, amb: 'open',
  },
  jellyfish_bloom: {
    top: 0x3a78c8, hor: 0x163868, bot: 0x071428, fog: 0.03, surf: 0.35, sun: 0.35,
    snow: 0xd0e6ff, snowOp: 0.55, specks: 0.85, speckCol: 0xffb0e0,
    bed: 0, bedCol: 0x0a1830, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xffffff,
    grass: 0, rocks: 0, rays: 0.4, water: 0, ceil: 0,
    hemi: [0xc8d8ff, 0x101830, 1.0], key: [0xe8e0ff, 1.35], exposure: 1.0, amb: 'midwater', dark: 1,
  },
  rocky_reef: {
    top: 0x3e86b8, hor: 0x1a5278, bot: 0x0e3048, fog: 0.036, surf: 0.55, sun: 0.55,
    snow: 0xd0e4f0, snowOp: 0.35, specks: 0.15, speckCol: 0xb8e0c8,
    bed: 1, bedCol: 0x6a645c, bedY: -1.85, bedTilt: 0.12, caus: 0.55, causCol: 0xfff0d0,
    grass: 0.45, grassCol: 0x3a6a38, rocks: 1.15, rays: 0.4, water: 0, ceil: 0,
    hemi: [0xd0e8f0, 0x3a4038, 1.1], key: [0xfff0dc, 1.7], exposure: 1.02, amb: 'reef',
  },
  tide_pool: {
    top: 0xb6f3ff, hor: 0x4ec8dc, bot: 0x2a9aaa, fog: 0.03, surf: 0.8, sun: 1,
    snow: 0xf4ffff, snowOp: 0.18, specks: 0.05, speckCol: 0xffffff,
    bed: 1, bedCol: 0xe6d2a8, bedY: -1.5, bedTilt: 0, caus: 1.7, causCol: 0xfff8e0,
    grass: 0.28, grassCol: 0x6aaa48, rocks: 0.95, rays: 0.65, water: 0, ceil: 0,
    hemi: [0xf4ffff, 0x8a7848, 1.45], key: [0xfff6d8, 2.35], exposure: 1.08, amb: 'surface',
  },
  deep_ocean: {
    top: 0x071422, hor: 0x061018, bot: 0x02060c, fog: 0.05, surf: 0.04, sun: 0.04,
    snow: 0x8aa0b8, snowOp: 0.72, specks: 1, speckCol: 0x3ec8ff,
    bed: 0, bedCol: 0x101820, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xffffff,
    grass: 0, rocks: 0, rays: 0.04, water: 0, ceil: 0,
    hemi: [0x4a7098, 0x050810, 0.7], key: [0x9ab4d0, 0.95], exposure: 0.92, amb: 'abyss', dark: 1,
  },
  open_jelly: {
    top: 0x5fc4f0, hor: 0x1f6ea8, bot: 0x07263f, fog: 0.026, surf: 1, sun: 1,
    snow: 0xcfefff, snowOp: 0.28, specks: 0.55, speckCol: 0xffc0e0,
    bed: 0, bedCol: 0x22465a, bedY: -6, bedTilt: 0, caus: 0, causCol: 0xbfefff,
    grass: 0, rocks: 0, rays: 0.85, water: 0, ceil: 1, ceilY: 3.2,
    hemi: [0xbfe8ff, 0x1a3c58, 1.28], key: [0xfff6e0, 1.7], exposure: 1.06, amb: 'open',
  },
  kelp_forest: {
    top: 0x1f6a48, hor: 0x0e4634, bot: 0x08281e, fog: 0.04, surf: 0.45, sun: 0.55,
    snow: 0xd8f0e0, snowOp: 0.3, specks: 0.12, speckCol: 0xc8f0a0,
    bed: 1, bedCol: 0x8a7a58, bedY: -1.95, bedTilt: 0, caus: 0.7, causCol: 0xe8ffc0,
    grass: 1, grassCol: 0x2f7a28, rocks: 0.55, rays: 0.8, water: 0, ceil: 0,
    hemi: [0xd8f0c8, 0x1a3020, 1.05], key: [0xfff2d0, 1.55], exposure: 1.0, amb: 'reef', dark: 1,
  },
};

const SPECIES_ENV = {
  great_white: 'sunlit_coastal',
  manta: 'reef_cleaning_station',
  frilled_shark: 'deep_slope',
  oarfish: 'twilight_zone',
  clownfish: 'anemone_reef',
  seahorse: 'seagrass_meadow',
  sunfish: 'sunlit_open_ocean',
  blobfish: 'abyssal_plain',
  coelacanth: 'volcanic_cave',
  orca: 'polar_ice_edge',
  dolphin: 'sunlit_coastal',
  sperm_whale: 'deep_ocean',
  leatherback: 'open_jelly',
  giant_squid: 'twilight_zone',
  octopus: 'rocky_reef',
  lionsmane: 'polar_ice_edge',
  comb_jelly: 'twilight_zone',
  spider_crab: 'deep_slope',
  mantis_shrimp: 'rocky_reef',
  giant_isopod: 'abyssal_plain',
  starfish: 'tide_pool',
  urchin: 'kelp_forest',
};
for (const [id, name] of Object.entries(SPECIES_ENV)) PRESETS[id] = ENV[name];

/**
 * Flagship ecological moments. While that behaviour is showing, the room leans
 * harder into the habitat (warmer anemone, a last shaft over a sleeping whale,
 * a quieter lamp-room). Other behaviours fall back to the species preset.
 * `hemi` / `key` match the preset tuple shape: [sky, ground, intensity] / [color, intensity].
 */
const MOMENT = {
  clownfish: {
    beh: 'nestle',
    patch: {
      fog: 0.044, sun: 1, caus: 1.45, rays: 0.95, grass: 1.2, snowOp: 0.12,
      specks: 0.42, speckCol: 0xffb0a0, top: 0x7ad8d0, hor: 0x3498a4, bot: 0x1a5c70,
      exposure: 1.08,
      hemi: [0xfff1ea, 0x8a5848, 1.4], key: [0xffc8aa, 2.35],
    },
  },
  great_white: {
    beh: 'breach',
    patch: {
      fog: 0.018, sun: 1.25, rays: 1.4, surf: 1, snowOp: 0.1,
      bed: 0, grass: 0, rocks: 0, caus: 0, water: 0,
      ceil: 1, ceilY: 2.35,
      top: 0xc5f0ff, hor: 0x1a6ea8, bot: 0x083048, exposure: 1.14,
      hemi: [0xf7fcff, 0x163858, 1.5], key: [0xfff8ea, 2.6],
    },
  },
  turtle: {
    beh: 'graze',
    patch: {
      fog: 0.04, caus: 1.5, grass: 1.25, sun: 1.05, rays: 1, bedY: -1.8,
      grassCol: 0x3a8a30, exposure: 1.08,
      hemi: [0xeefee8, 0x4a6a38, 1.4], key: [0xfff3c8, 2.35],
    },
  },
  dolphin: {
    beh: 'leap',
    patch: {
      fog: 0.016, sun: 1.2, rays: 1.35, surf: 1, specks: 0.18, speckCol: 0xe8f8ff,
      bed: 0, grass: 0, rocks: 0, caus: 0, water: 0,
      ceil: 1, ceilY: 2.15, snowOp: 0.08,
      top: 0xb7e8ff, hor: 0x1f78b4, bot: 0x0a4068, exposure: 1.12,
      hemi: [0xf2fbff, 0x1a4a68, 1.48], key: [0xfff6e2, 2.5],
    },
  },
  manta: {
    beh: 'leap',
    patch: {
      fog: 0.018, sun: 1.15, rays: 1.3, surf: 1,
      bed: 0, grass: 0, rocks: 0, caus: 0, water: 0,
      ceil: 1, ceilY: 2.4, snowOp: 0.1,
      top: 0x9ad8f4, hor: 0x1c6ea4, bot: 0x083858, exposure: 1.1,
      hemi: [0xe8f6ff, 0x1a4460, 1.4], key: [0xfff4dc, 2.3],
    },
  },
  orca: {
    beh: 'hunt',
    patch: {
      fog: 0.02, sun: 0.85, rays: 1, surf: 0.8, snowOp: 0.62,
      bed: 0, grass: 0, rocks: 0, caus: 0.2,
      water: 0.45, waterY: 1.7, ceil: 0.4, ceilY: 2.7,
      top: 0xe7f8ff, hor: 0x9fd0e6, bot: 0x1a5878, exposure: 1.1,
      hemi: [0xf4fbff, 0x4a7890, 1.4], key: [0xf7fbff, 2.05],
    },
  },
  sperm_whale: {
    beh: 'sleep',
    patch: {
      fog: 0.036, sun: 0.16, rays: 0.42, surf: 0.1, snowOp: 0.7, specks: 0.7, speckCol: 0x7eb4dc,
      bed: 0, grass: 0, rocks: 0,
      top: 0x0e2034, hor: 0x142838, bot: 0x081420, exposure: 1.05,
      hemi: [0x7aa4c4, 0x101820, 1.05], key: [0xd0def0, 1.35],
    },
  },
  giant_squid: {
    beh: 'duel',
    patch: {
      fog: 0.052, sun: 0.06, rays: 0.16, specks: 1.2, speckCol: 0x9a6cff, snowOp: 0.72,
      top: 0x140e28, hor: 0x0c1430, bot: 0x070814, exposure: 0.9,
      hemi: [0x685888, 0x0a0c18, 0.72], key: [0xb0a0d8, 0.95],
    },
  },
  angler: {
    beh: 'ambush',
    patch: {
      fog: 0.068, sun: 0, rays: 0, specks: 0.55, speckCol: 0x6dffe2, snowOp: 0.5,
      top: 0x03060c, hor: 0x050910, bot: 0x020305, exposure: 0.8,
      hemi: [0x1a2838, 0x020408, 0.42], key: [0x1a3048, 0.55],
    },
  },
  vampire: {
    beh: 'snow',
    patch: {
      fog: 0.05, sun: 0.03, rays: 0.04, specks: 0.25, speckCol: 0xc5d8ff, snowOp: 1.15,
      top: 0x101828, hor: 0x141e2e, bot: 0x0a1018, exposure: 0.9,
      hemi: [0x5a7090, 0x10141c, 0.7], key: [0xb7c6da, 0.85],
    },
  },
};

/**
 * Habitat bucket for each species. Visual preset `amb` follows the bucket:
 * deep / benthic_deep → abyss, twilight → twilight, reef / benthic → reef,
 * open → open, surface → surface, coastal → midwater or the coastal reef bed.
 */
export const HABITAT = {
  dumbo: 'benthic_deep', angler: 'deep', vampire: 'deep', barreleye: 'deep', gulper: 'deep',
  nautilus: 'twilight', jelly: 'coastal', physalia: 'surface', whale: 'open', turtle: 'reef',
  hammer: 'reef', great_white: 'coastal', manta: 'reef', frilled_shark: 'twilight', oarfish: 'twilight',
  clownfish: 'reef', seahorse: 'benthic', sunfish: 'open', blobfish: 'benthic_deep', coelacanth: 'benthic_deep',
  orca: 'open', dolphin: 'coastal', sperm_whale: 'deep', leatherback: 'open', giant_squid: 'twilight',
  octopus: 'reef', lionsmane: 'open', comb_jelly: 'twilight', spider_crab: 'benthic_deep',
  mantis_shrimp: 'reef', giant_isopod: 'benthic_deep', starfish: 'benthic', urchin: 'benthic',
};
export const HABITAT_ZH = {
  deep: '深海', twilight: '暮光带', reef: '浅海珊瑚礁', open: '开阔大洋',
  surface: '海面', benthic: '近岸底栖', benthic_deep: '深海底栖', coastal: '近岸浅海',
};
export function habitatLabel(id) { return HABITAT_ZH[HABITAT[id]] || ''; }
const NUM = ['fog', 'surf', 'sun', 'snowOp', 'specks', 'bed', 'bedY', 'bedTilt', 'caus', 'grass', 'rocks', 'rays', 'water', 'ceil', 'exposure', 'sky'];
const COL = ['top', 'hor', 'bot', 'snow', 'speckCol', 'bedCol', 'causCol', 'grassCol'];

const CAUSTIC = `
float caust(vec2 p,float t){vec2 q=p*1.1;float c=0.;
 for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.7+t*.7),cos(q.x*1.5-t*.6))*.55;c+=.35/(.12+abs(sin(q.x+q.y)));}
 return clamp(pow(c*.18,3.),0.,2.);}`;

export function createEnv({ scene, mobile, snowMat, onSplash }) {
  const T = { value: 0 };
  const st = {}; // current blended state
  let target = PRESETS.angler, dark = false;
  for (const k of NUM) st[k] = target[k] ?? 0;
  for (const k of COL) st[k] = C(target[k] ?? 0x000000);

  // ---- backdrop sphere (gradient + sun glow + surface shimmer / sky horizon) ----
  const bgU = { t: T, top: { value: C(0) }, hor: { value: C(0) }, bot: { value: C(0) }, surf: { value: 0 }, sun: { value: 0 }, sky: { value: 0 }, lum: { value: 1 } };
  const bg = new THREE.Mesh(new THREE.SphereGeometry(48, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: bgU,
    vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 top,hor,bot;uniform float t,surf,sun,sky,lum;varying vec3 vP;${CAUSTIC}
void main(){vec3 d=normalize(vP);float y=d.y;
 vec3 uw=y>0.?mix(hor,top,pow(smoothstep(0.,1.,y),.8)):mix(hor,bot,smoothstep(0.,-.7,y));
 uw+=top*surf*.55*smoothstep(.45,1.,y)*caust(d.xz*9./(y+.2),t*.6);
 uw+=vec3(1.,.97,.85)*sun*.5*pow(max(0.,dot(d,normalize(vec3(.3,1.,.2)))),12.);
 vec3 sk=y>0.?mix(hor,top,smoothstep(0.,.5,y))+vec3(1.,.95,.8)*pow(max(0.,dot(d,normalize(vec3(.5,.35,-.8)))),40.)*1.2
   :mix(vec3(.2,.45,.62),bot,smoothstep(0.,-.3,y));
 gl_FragColor=vec4(mix(uw,sk,sky)*lum,1.);}`,
  }));
  bg.renderOrder = -10; bg.frustumCulled = false; scene.add(bg);

  // ---- bioluminescent specks ----
  const SN = mobile ? 140 : 260, sg = new THREE.BufferGeometry(), sp = new Float32Array(SN * 3), ss = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { sp.set([(Math.random() - .5) * 16, (Math.random() - .5) * 9, (Math.random() - .5) * 10 - 1.5], i * 3); ss[i] = Math.random(); }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); sg.setAttribute('seed', new THREE.BufferAttribute(ss, 1));
  const spU = { t: T, col: { value: C(0) }, op: { value: 0 }, burst: { value: 0 } };
  const specks = new THREE.Points(sg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: spU,
    vertexShader: `attribute float seed;uniform float t,burst;varying float a;void main(){vec3 p=position;p+=vec3(sin(t*.2+seed*30.),cos(t*.17+seed*11.),sin(t*.13+seed*5.))*.35;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(2.+seed*3.)*(1.+burst)*(10./-mv.z);
 a=pow(.5+.5*sin(t*(.6+seed*1.7)+seed*40.),6.)+burst*.6;}`,
    fragmentShader: `uniform vec3 col;uniform float op;varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(col*(1.-d*2.)*a*op,1.);}`,
  }));
  specks.frustumCulled = false; scene.add(specks);

  // ---- seabed (shared plane, Lambert + caustics) ----
  const bedU = { uT: T, uCaus: { value: 0 }, uCausCol: { value: C(0xffffff) } };
  const bedGeo = new THREE.PlaneGeometry(44, 44, mobile ? 48 : 80, mobile ? 48 : 80); bedGeo.rotateX(-Math.PI / 2);
  { const p = bedGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    p.setY(i, (Math.sin(x * .7) * Math.cos(z * .55) * .12 + Math.sin(x * .23 + z * .31) * .35) * Math.min(1, r / 4)); } bedGeo.computeVertexNormals(); }
  const bedMat = new THREE.MeshLambertMaterial({ color: 0xc9b58a });
  bedMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, bedU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvWP=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = 'uniform float uT,uCaus;uniform vec3 uCausCol;varying vec3 vWP;' + CAUSTIC + '\n' + sh.fragmentShader.replace('#include <opaque_fragment>', 'outgoingLight+=uCausCol*caust(vWP.xz*.9,uT)*uCaus*.35;\n#include <opaque_fragment>');
  };
  const bed = new THREE.Mesh(bedGeo, bedMat); bed.receiveShadow = true; scene.add(bed);

  // ---- instanced seagrass / kelp blades (vertex sway) ----
  const GN = mobile ? 320 : 700;
  const blade = new THREE.PlaneGeometry(0.07, 0.7, 1, 4); blade.translate(0, 0.35, 0);
  { const p = blade.attributes.position; for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * (1 - p.getY(i) / 0.8)); }
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x4f8a3a, side: THREE.DoubleSide });
  grassMat.onBeforeCompile = sh => {
    sh.uniforms.uT = T;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
 float ph=instanceMatrix[3].x*1.3+instanceMatrix[3].z*.9; float h=position.y/.7;
 transformed.x+=sin(uT*1.2+ph)*.18*h*h; transformed.z+=cos(uT*.9+ph)*.1*h*h;`);
  };
  const grass = new THREE.InstancedMesh(blade, grassMat, GN); grass.frustumCulled = false;
  const gBase = [];
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    for (let i = 0; i < GN; i++) { const a = Math.random() * Math.PI * 2, r = 2.2 + Math.pow(Math.random(), .7) * 11;
      v.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1); e.set(0, Math.random() * 3, 0); q.setFromEuler(e); const k = .6 + Math.random() * 1.1; s.set(k, k * (.7 + Math.random() * .8), k);
      gBase.push(v.clone()); m.compose(v, q, s); grass.setMatrixAt(i, m); } }
  scene.add(grass);

  // ---- rocks ----
  const RN = mobile ? 14 : 26, rockGeo = new THREE.IcosahedronGeometry(1, 1);
  { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const k = .75 + Math.sin(p.getX(i) * 5 + p.getZ(i) * 3) * .15 + Math.random() * .1; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * .6, p.getZ(i) * k); } rockGeo.computeVertexNormals(); }
  const rockMat = new THREE.MeshLambertMaterial({ color: 0x5a5560, flatShading: true });
  const rocks = new THREE.InstancedMesh(rockGeo, rockMat, RN); rocks.frustumCulled = false; rocks.receiveShadow = true;
  const rBase = [];
  for (let i = 0; i < RN; i++) { const a = (i / RN) * Math.PI * 2 + Math.random() * .4, r = 3.2 + Math.random() * 9; rBase.push([Math.cos(a) * r, Math.sin(a) * r - 2, .3 + Math.random() * 1.1, Math.random() * 6]); }
  scene.add(rocks);

  // ---- light shafts (additive quads) ----
  const rayU = { t: T, op: { value: 0 } };
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: rayU,
    vertexShader: `varying vec2 vU;void main(){vU=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform float t,op;varying vec2 vU;void main(){float x=abs(vU.x-.5)*2.;float a=(1.-x*x)*pow(vU.y,1.4)*(.65+.35*sin(t*.5+vU.x*6.));gl_FragColor=vec4(vec3(.9,.97,1.)*a*op*.16,1.);}`,
  });
  const rays = new THREE.Group();
  for (let i = 0; i < (mobile ? 5 : 8); i++) { const q = new THREE.Mesh(new THREE.PlaneGeometry(1.2 + Math.random() * 1.6, 16), rayMat);
    q.position.set(-6 + i * 1.7 + Math.random(), 3, -3 - Math.random() * 4); q.rotation.z = -0.32 + Math.random() * .1; q.rotation.y = Math.random() - .5; rays.add(q); }
  scene.add(rays);

  // ---- water surface: physalia (seen from above, waves) & whale (ceiling seen from below) ----
  const wU = { t: T, op: { value: 0 }, deep: { value: C(0x0d4f7a) }, shal: { value: C(0x4fb0d8) }, below: { value: 0 } };
  const wGeo = new THREE.PlaneGeometry(60, 60, mobile ? 64 : 110, mobile ? 64 : 110); wGeo.rotateX(-Math.PI / 2);
  const wMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: wU,
    vertexShader: `uniform float t;varying vec3 vW;varying float vH;
float wv(vec2 p){return sin(p.x*.9+t*1.1)*.09+sin(p.y*1.3-t*.9+p.x*.4)*.06+sin((p.x+p.y)*2.3+t*1.9)*.03+sin(p.x*4.1-p.y*3.3+t*2.6)*.012;}
void main(){vec3 p=position;float h=wv(p.xz)*smoothstep(28.,6.,length(p.xz));p.y+=h;vH=h;vW=(modelMatrix*vec4(p,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vW,1.);}`,
    fragmentShader: `uniform float t,op,below;uniform vec3 deep,shal;varying vec3 vW;varying float vH;${CAUSTIC}
void main(){vec3 v=normalize(cameraPosition-vW);float fr=pow(1.-abs(v.y),3.);
 vec3 c=mix(deep,shal,.45+vH*5.)+vec3(.75,.88,1.)*fr*.22+vec3(1.)*smoothstep(.07,.13,vH)*.3;
 float a=mix(.62,.9,fr);
 if(below>.5){if(cameraPosition.y<vW.y){c=mix(shal,vec3(.85,.97,1.),.4)+caust(vW.xz*.6,t)*.25;a=.55;}else{c=mix(deep,shal,.55+vH*5.)+vec3(1.)*smoothstep(.07,.13,vH)*.3;a=mix(.32,.8,fr);}}
 float f=smoothstep(10.,30.,length(vW.xz));a*=1.-f*.85;gl_FragColor=vec4(c,a*op);}`,
  });
  const water = new THREE.Mesh(wGeo, wMat); water.renderOrder = 2; water.frustumCulled = false; scene.add(water);

  // ---- splash / bubble / puff particle pool (CPU sim, cheap) ----
  const PN = 360, pGeo = new THREE.BufferGeometry(), pPos = new Float32Array(PN * 3), pAl = new Float32Array(PN), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN), pKind = new Uint8Array(PN);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('al', new THREE.BufferAttribute(pAl, 1));
  const pU = { col: { value: C(0xffffff) } };
  const parts = new THREE.Points(pGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: pU,
    vertexShader: `attribute float al;varying float a;void main(){a=al;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(2.+a*5.)*(10./-mv.z);}`,
    fragmentShader: `uniform vec3 col;varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float ring=smoothstep(.5,.35,d)*(.45+.55*smoothstep(.2,.42,d));gl_FragColor=vec4(col,ring*a);}`,
  }));
  parts.frustumCulled = false; scene.add(parts);
  let pNext = 0;
  function emit(n, x, y, z, kind, spread = 1) {
    for (let k = 0; k < n; k++) { const i = pNext; pNext = (pNext + 1) % PN; pKind[i] = kind;
      pPos[i * 3] = x + (Math.random() - .5) * .6 * spread; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z + (Math.random() - .5) * .6 * spread;
      const a = Math.random() * Math.PI * 2, s = Math.random();
      if (kind === 0) { pVel.set([Math.cos(a) * s * 2.2 * spread, 2.5 + Math.random() * 4, Math.sin(a) * s * 2.2 * spread], i * 3); pLife[i] = 1.2 + Math.random() * .6; } // splash
      else if (kind === 1) { pVel.set([(Math.random() - .5) * .3, .6 + Math.random() * .9, (Math.random() - .5) * .3], i * 3); pLife[i] = 2.5 + Math.random() * 1.5; } // bubbles
      else { pVel.set([Math.cos(a) * s * 1.2, .2 + Math.random() * .5, Math.sin(a) * s * 1.2], i * 3); pLife[i] = 2 + Math.random(); } // sand puff
    }
  }
  function simParts(dt) {
    for (let i = 0; i < PN; i++) { if (pLife[i] <= 0) { pAl[i] = 0; continue; }
      pLife[i] -= dt; const k = pKind[i];
      if (k === 0) pVel[i * 3 + 1] -= 9.8 * dt; else if (k === 2) { pVel[i * 3] *= .97; pVel[i * 3 + 1] *= .96; pVel[i * 3 + 2] *= .97; }
      else pPos[i * 3] += Math.sin(pLife[i] * 6 + i) * .004;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      pAl[i] = Math.min(1, pLife[i]) * (k === 2 ? .5 : .9);
    }
    pGeo.attributes.position.needsUpdate = true; pGeo.attributes.al.needsUpdate = true;
  }

  // ---- behaviour reactions ----
  let ceilY = 3.4, sid = 'angler', lastBeh = null, behT = 0, prevTrack = null, burst = 0, flick = 0;
  const ON = { // fired once when a behaviour becomes active
    turtle_breathe: () => emit(40, .2, -.2, .4, 1),
    vampire_flee: () => { burst = 1; emit(30, -.8, 0, 0, 1); },
    vampire_cloak: () => { burst = .6; },
    nautilus_jet: () => emit(36, -.9, 0, .1, 1),
    angler_strike: () => { burst = 1; emit(18, .9, 0, .4, 1); },
    angler_lure: () => { burst = .4; },
    gulper_tailglow: () => { burst = .7; },
    barreleye_strike: () => { burst = .5; },
    hammer_pin: () => emit(70, .6, st.bedY + .1, .2, 2, 1.4),
    dumbo_crawl: () => emit(40, 0, st.bedY + .15, 0, 2),
    physalia_roll: () => emit(50, 0, (target.waterY ?? 0) + .05, 0, 0, .6),
    whale_lobtail: () => setTimeout(() => sid === 'whale' && emit(110, -1.6, ceilY, 0, 0, 1.5), 900),
    great_white_breach: () => emit(120, 0, 1.15, 0, 0, 1.5),
    orca_breach: () => emit(130, 0, 1.35, 0, 0, 1.5),
    dolphin_leap: () => emit(80, 0, 1.15, 0, 0, 1.1),
    manta_leap: () => emit(70, 0, 1.25, 0, 0, 1),
    spider_crab_walk: () => emit(36, 0, st.bedY + .12, 0, 2, .8),
    starfish_crawl: () => emit(24, 0, st.bedY + .08, 0, 2, .5),
    urchin_tube: () => emit(20, 0, st.bedY + .08, 0, 2, .4),
    mantis_shrimp_punch: () => emit(28, .35, st.bedY + .15, .2, 2, .7),
    giant_isopod_scavenge: () => emit(26, 0, st.bedY + .1, 0, 2, .55),
    octopus_ink: () => { burst = .8; emit(40, -.6, 0, .2, 1); },
    giant_squid_jet: () => { burst = .7; emit(34, -.8, 0, .1, 1); },
  };
  function react(beh, cur, t, dt) {
    if (beh !== lastBeh) { lastBeh = beh; behT = t; ON[`${sid}_${beh}`]?.(); }
    // whale breach: splash when the body crosses the surface (going up and coming back down)
    if (sid === 'whale' && cur?.trackY) {
      const y = cur.trackY(), s = ceilY;
      if (prevTrack != null && beh === 'breach' && ((prevTrack < s && y >= s) || (prevTrack > s && y <= s))) { emit(160, 0, s, 0, 0, 2); onSplash?.(y < prevTrack ? 1 : .6); }
      prevTrack = y;
    }
    if (sid === 'whale' && beh === 'blow' && Math.random() < dt * 8) emit(2, .6, ceilY - .3, 0, 1);
    if (sid === 'turtle' && beh === 'graze' && Math.random() < dt * 6) emit(1, .9, st.bedY + .1, .3, 2);
    if (sid === 'vampire' && beh === 'snow') burst = Math.max(burst, .35);
  }

  function set(speciesId, instant, habitatKey) {
    sid = speciesId; lastBeh = null; prevTrack = null;
    const named = habitatKey && ENV[habitatKey];
    target = named || PRESETS[speciesId] || PRESETS.angler;
    if (instant) { for (const k of NUM) st[k] = target[k] ?? 0; for (const k of COL) st[k].set(target[k] ?? 0); }
  }
  const tmpC = new THREE.Color();
  /** Per-frame: blend, push uniforms, react to behaviour. Returns light tint info for main.js. */
  function update(t, dt, { beh, cur, lights, fog, renderer, camDist = 12 }) {
    T.value = t;
    const moment = MOMENT[sid];
    const look = moment && beh === moment.beh ? { ...target, ...moment.patch } : target;
    const k = 1 - Math.exp(-dt * 2.2);
    for (const n of NUM) st[n] += ((look[n] ?? 0) - st[n]) * k;
    for (const n of COL) st[n].lerp(tmpC.set(look[n] ?? 0), k);
    const lum = dark ? 0.62 : 1;
    // Keep the backdrop sphere around the camera. Tiny species in scale mode
    // pull the camera outside the old radius and the page background shows as a hard circle.
    bg.scale.setScalar(Math.max(1, camDist / 16));
    bgU.top.value.copy(st.top); bgU.hor.value.copy(st.hor); bgU.bot.value.copy(st.bot);
    bgU.surf.value = st.surf; bgU.sun.value = st.sun; bgU.sky.value = st.sky; bgU.lum.value = lum;
    fog.color.copy(st.hor).multiplyScalar(lum); fog.density = st.fog;
    snowMat.uniforms.col.value.copy(st.snow); snowMat.uniforms.op.value = st.snowOp;
    burst *= Math.exp(-dt * 1.5);
    spU.col.value.copy(st.speckCol); spU.op.value = st.specks * (dark ? 1.3 : 1); spU.burst.value = burst; specks.visible = st.specks > .02;
    // seabed
    bed.visible = st.bed > .02; bed.position.y = st.bedY - (1 - st.bed) * 3; bed.rotation.x = st.bedTilt; bed.rotation.z = st.bedTilt * .3;
    bedMat.color.copy(st.bedCol).multiplyScalar(lum); bedU.uCaus.value = st.caus; bedU.uCausCol.value.copy(st.causCol);
    // grass
    const gn = Math.round(GN * Math.min(1, st.grass * Math.min(1, st.bed * 1.2)));
    grass.count = gn; grass.visible = gn > 0; grass.position.y = bed.position.y; grass.rotation.copy(bed.rotation); grassMat.color.copy(st.grassCol).multiplyScalar(lum * .9);
    // rocks (sink below the bed when not wanted)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
    const showR = st.rocks * st.bed; rocks.visible = showR > .02;
    if (rocks.visible) { for (let i = 0; i < RN; i++) { const [x, z, sc, r] = rBase[i], on = i / RN < st.rocks ? 1 : 0;
      v.set(x, -.15, z); e.set(0, r, 0); q.setFromEuler(e); s.setScalar(sc * on * st.bed + 1e-4); m.compose(v, q, s); rocks.setMatrixAt(i, m); }
      rocks.instanceMatrix.needsUpdate = true; rocks.position.y = bed.position.y; rocks.rotation.copy(bed.rotation); rockMat.color.copy(st.bedCol).multiplyScalar(.55 * lum); }
    // rays
    rayU.op.value = st.rays * (dark ? .6 : 1); rays.visible = st.rays > .02;
    // water
    const wOp = Math.max(st.water, st.ceil); water.visible = wOp > .02; wU.op.value = wOp;
    const ceilOn = (look.ceil || 0) > 0.45 || (target.ceil || 0) > 0.45;
    wU.below.value = ceilOn ? 1 : 0;
    water.position.y = ceilOn ? ceilY + (1 - st.ceil) * 3 : (look.waterY ?? target.waterY ?? -.15) - (1 - st.water) * 2;
    // lights: tint toward preset
    const [hs, hg, hi] = look.hemi, [kc, ki] = look.key;
    lights.hemi.color.lerp(tmpC.set(hs), k); lights.hemi.groundColor.lerp(tmpC.set(hg), k);
    lights.hemiMul += (hi - lights.hemiMul) * k; lights.keyMul += (ki / 2 - lights.keyMul) * k; lights.key.color.lerp(tmpC.set(kc), k);
    // caustic flicker on the key light in sunlit scenes
    flick = st.caus > .1 || st.rays > .3 ? (Math.sin(t * 3.1) * .5 + Math.sin(t * 5.3) * .3) * .08 : 0;
    renderer.toneMappingExposure = lights.expBase * st.exposure * (1 + flick * .5);
    // whale: the surface comes down into view while it surfaces / breaches / lobtails
    const want = sid === 'whale'
      ? ({ breach: .5, blow: 1.0, lobtail: .45 }[beh] ?? (look.ceilY || target.ceilY || 3.4))
      : (look.ceilY || target.ceilY || 3.4);
    ceilY += (want - ceilY) * (1 - Math.exp(-dt * 1.6));
    react(beh, cur, t, dt);
    simParts(dt);
    pU.col.value.set(sid === 'hammer' || sid === 'dumbo' || sid === 'turtle' ? (lastBeh === 'graze' || lastBeh === 'pin' || lastBeh === 'crawl' ? 0xd8c8a0 : 0xffffff) : 0xffffff);
    return { amb: target.amb };
  }
  return { set, update, setDark: d => { dark = d; }, preset: () => target, emit, get id() { return sid; } };
}
