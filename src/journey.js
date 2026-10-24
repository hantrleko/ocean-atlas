/**
 * 策展路径。科目仍是二级索引；默认入口是四间展厅，而不是三十三枚科目芯片。
 * 旗舰物种在 main.js 里锁定 `behavior`，环境与画幅另有对应的瞬间覆盖。
 */
import { SPECIES } from './species.js';
import { BEHAVIORS } from './behaviors.js';

export const ACTS = [
  {
    id: 'reef',
    title: '浅海礁盘',
    kicker: '第一展区',
    copy: '几米深的光还很暖。海葵、海草和礁石把家让出来，这一翼先看住在刺与草之间的动物。',
    lead: 'clownfish',
    ids: ['clownfish', 'seahorse', 'turtle', 'octopus', 'mantis_shrimp', 'manta', 'hammer', 'starfish', 'urchin', 'nautilus'],
  },
  {
    id: 'upper',
    title: '大洋上层',
    kicker: '第二展区',
    copy: '阳光还透得下来。鲨从光的下面冲上来，海豚玩着浪，鲸在这层蓝色里换气、赶路。',
    lead: 'great_white',
    ids: ['great_white', 'dolphin', 'whale', 'sunfish', 'leatherback', 'jelly', 'physalia'],
  },
  {
    id: 'abyss',
    title: '暮光与深渊',
    kicker: '第三展区',
    copy: '光在这里提前结束。灯、巨眼，还有一头头朝上睡着的鲸，都靠黑暗里剩下的那一点线索生活。',
    lead: 'sperm_whale',
    ids: ['sperm_whale', 'giant_squid', 'oarfish', 'barreleye', 'comb_jelly', 'frilled_shark', 'vampire', 'angler', 'gulper', 'dumbo', 'coelacanth', 'blobfish', 'spider_crab', 'giant_isopod'],
  },
  {
    id: 'polar',
    title: '极地冰缘',
    kicker: '第四展区',
    copy: '水更冷，天更白。家族沿着冰排开，伞下拖着比身体长得多的触手。',
    lead: 'orca',
    ids: ['orca', 'lionsmane'],
  },
];

/** 旗舰：默认姿态与墙上那一句对齐。scale 只用于「请潜水员站过来」的一次提示。 */
export const FLAGSHIPS = [
  { id: 'clownfish', behavior: 'nestle', moment: '钻进海葵', scale: 'tiny' },
  { id: 'great_white', behavior: 'breach', moment: '从光下跃身', scale: 'large' },
  { id: 'turtle', behavior: 'graze', moment: '海草床啃食', scale: null },
  { id: 'dolphin', behavior: 'leap', moment: '跃出浪尖', scale: null },
  { id: 'sperm_whale', behavior: 'sleep', moment: '垂直睡眠', scale: 'large' },
  { id: 'giant_squid', behavior: 'duel', moment: '暮光对视', scale: 'large' },
  { id: 'angler', behavior: 'ambush', moment: '一盏冷灯', scale: 'tiny' },
  { id: 'vampire', behavior: 'snow', moment: '收集海洋雪', scale: 'tiny' },
];

/** 分享卡片上的金句。舞台字幕仍走行为说明，避免两套文案抢同一行。 */
export const LINES = {
  dumbo: '深海里最慢的飞行，用的是一对耳朵。',
  angler: '黑暗中唯一的灯，是一个温柔的陷阱。',
  vampire: '名字骇人，它却只以海洋雪为食。',
  barreleye: '它透过自己透明的头，仰望来自上方的微光。',
  gulper: '一张网一般的嘴，拖着一盏粉色的小灯。',
  nautilus: '黄金螺线里，藏着五亿年的浮沉。',
  jelly: '一枚月亮在水中呼吸，一张一合。',
  physalia: '一顶漂流的蓝帽子，其实是一整个群落。',
  whale: '它的歌声越过整片海洋，长鳍如翼。',
  turtle: '穿越千里，它总能找回出生的那片沙滩。',
  hammer: '锤形的头是一张雷达，扫过海底的沙。',
  great_white: '它从光的下面冲上来，整条身体离开海面。',
  manta: '两只头鳍像勺子，把浮游生物扫进永远张着的嘴。',
  frilled_shark: '身体像鳗，牙像一排排小三叉戟。',
  oarfish: '一条银色的带子竖在暮光里，背鳍红得像火焰。',
  clownfish: '它把家安在会蜇人的花里。',
  seahorse: '尾巴勾住一根草，父亲把孩子养在肚子里。',
  sunfish: '没有尾巴的圆盘，侧躺着把太阳晒进身体。',
  blobfish: '在高压里它是一条鱼，被捞上来才变成果冻。',
  coelacanth: '六千六百万年的空白之后，它还在洞里倒立着漂。',
  orca: '黑白的家族沿着冰缘排开，把同一套捕法传下去。',
  dolphin: '跃出浪尖的那一下，它还带回一个泡泡环。',
  sperm_whale: '巨大的头朝上竖在水里，它就这样睡觉。',
  leatherback: '背上不是甲，是七条皮革一样的纵棱。',
  giant_squid: '盘子一样大的眼睛，在暮光里盯着抹香鲸。',
  octopus: '八条腕各有各的主意，皮肤一眨眼就换成石头。',
  lionsmane: '伞下拖着比蓝鲸还长的一张网。',
  comb_jelly: '八列纤毛把光折成流动的虹。',
  spider_crab: '步足长得像枯枝，壳上还别着一小片伪装。',
  mantis_shrimp: '洞穴口一闪，甲壳就碎了。',
  giant_isopod: '深海里的巨型潮虫，可以好几年不吃一顿。',
  starfish: '它把胃翻出体外，包住一只合不拢的贝。',
  urchin: '一颗会走路的紫刺球，底下藏着五颗牙。',
};

export function actById(id) {
  return ACTS.find(a => a.id === id) || ACTS[0];
}

export function actOf(speciesId) {
  return ACTS.find(a => a.ids.includes(speciesId)) || ACTS[0];
}

export function actIndex(id) {
  const i = ACTS.findIndex(a => a.id === id);
  return i < 0 ? 0 : i;
}

export function nextAct(id) {
  return ACTS[(actIndex(id) + 1) % ACTS.length];
}

export function flagshipOf(speciesId) {
  return FLAGSHIPS.find(f => f.id === speciesId) || null;
}

export function lineOf(species) {
  if (!species) return '';
  return LINES[species.id] || species.caption || '';
}

export function assertJourney() {
  const all = SPECIES.map(s => s.id);
  const ids = ACTS.flatMap(a => a.ids);
  const missing = all.filter(id => !ids.includes(id));
  const extra = ids.filter(id => !all.includes(id));
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  const badLead = ACTS.filter(a => !a.ids.includes(a.lead)).map(a => a.id);
  const badFlag = FLAGSHIPS.filter(f => !all.includes(f.id) || !BEHAVIORS[f.id]?.some(b => b.id === f.behavior)).map(f => f.id);
  const missingLine = all.filter(id => !LINES[id]);
  if (missing.length || extra.length || dup.length || badLead.length || badFlag.length || missingLine.length) {
    const msg = JSON.stringify({ missing, extra, dup, badLead, badFlag, missingLine });
    throw new Error(`[journey] ${msg}`);
  }
}

assertJourney();
