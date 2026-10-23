/**
 * 真实成体典型尺寸（米）。`lengthMeters` 是网格最长轴所代表的那段身体，
 * 「比例对比」用它把潜水员和物种放到同一比例。
 *
 * 取常见成体，不是纪录极值。主要依据：FishBase（common length）、
 * NOAA Fisheries 物种页、IUCN 体型描述、Smithsonian Ocean / FAO 概况。
 * 狮鬃水母野生触手可达约 30 m，模型只保留伞体和缩短的触手裙，因此按伞径比较。
 * 僧帽水母按浮囊长度，不含未完整建模的长触手。
 */
export const DIVER_HEIGHT_M = 1.75;

/** @type {Record<string, {lengthMeters: number, measure: string}>} */
export const SPECIES_SIZE = {
  dumbo: { lengthMeters: 0.2, measure: '全长' },
  angler: { lengthMeters: 0.18, measure: '雌鱼全长' },
  vampire: { lengthMeters: 0.3, measure: '全长' },
  barreleye: { lengthMeters: 0.15, measure: '全长' },
  gulper: { lengthMeters: 0.75, measure: '全长' },
  nautilus: { lengthMeters: 0.2, measure: '壳径' },
  jelly: { lengthMeters: 0.3, measure: '伞径' },
  physalia: { lengthMeters: 0.25, measure: '浮囊长' },
  whale: { lengthMeters: 14, measure: '全长' },
  turtle: { lengthMeters: 1.0, measure: '背甲长' },
  hammer: { lengthMeters: 4.0, measure: '全长' },
  great_white: { lengthMeters: 4.5, measure: '全长' },
  manta: { lengthMeters: 6.0, measure: '翼展' },
  frilled_shark: { lengthMeters: 1.6, measure: '全长' },
  oarfish: { lengthMeters: 3.0, measure: '全长' },
  clownfish: { lengthMeters: 0.1, measure: '全长' },
  seahorse: { lengthMeters: 0.17, measure: '全长' },
  sunfish: { lengthMeters: 1.8, measure: '体高' },
  blobfish: { lengthMeters: 0.3, measure: '全长' },
  coelacanth: { lengthMeters: 1.5, measure: '全长' },
  orca: { lengthMeters: 6.5, measure: '全长' },
  dolphin: { lengthMeters: 2.6, measure: '全长' },
  sperm_whale: { lengthMeters: 16, measure: '全长' },
  leatherback: { lengthMeters: 1.5, measure: '背甲长' },
  giant_squid: { lengthMeters: 10, measure: '含触腕全长' },
  octopus: { lengthMeters: 1.0, measure: '腕展' },
  lionsmane: { lengthMeters: 2.0, measure: '伞径' },
  comb_jelly: { lengthMeters: 0.1, measure: '全长' },
  spider_crab: { lengthMeters: 3.7, measure: '腿展' },
  mantis_shrimp: { lengthMeters: 0.15, measure: '全长' },
  giant_isopod: { lengthMeters: 0.35, measure: '全长' },
  starfish: { lengthMeters: 0.3, measure: '腕展' },
  urchin: { lengthMeters: 0.08, measure: '含棘直径' },
};

export function sizeOf(id) {
  return SPECIES_SIZE[id] || { lengthMeters: 1, measure: '全长' };
}
