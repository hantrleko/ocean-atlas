/**
 * Per-species behavior lists (data-driven action tabs).
 * Rigged species: `id` is the AnimationClip name authored in Blender (ocean-atlas-rig/scripts/reanim.py).
 * Procedural species: pose [pitch,yaw,roll] rad, amp/freq multipliers for the shader undulation,
 * bob/sway multipliers, and `fx` = a large rigid motion pattern (see aliveMotion.js fxOffsets).
 */
export const BEHAVIORS = {
  // ---- rigged (Blender clips) ----
  angler: [
    { id: 'ambush', label: '伏击静候', hold: 6, view: { yaw: 0.82, pitch: 0.12, dist: -0.35 } },
    { id: 'lure', label: '诱饵摆动', hold: 6, view: { yaw: 0.7, pitch: 0.1, dist: 1.5 } },
    { id: 'strike', label: '猛扑吞食', hold: 5, view: { yaw: 0.7, pitch: 0.12, dist: 3.0, camY: 0.25, aimY: 0.0 } },
    { id: 'swim', label: '缓慢游动', hold: 5 },
  ],
  whale: [
    { id: 'cruise', label: '巡游', hold: 6 },
    { id: 'breach', label: '跃身击浪', hold: 4.5, view: { dist: 3.2, mobDist: 5.2, frameY: 100, track: true } },
    { id: 'lobtail', label: '拍尾', hold: 6 },
    { id: 'blow', label: '喷气换气', hold: 4, view: { yaw: 1.25, pitch: 0.0, dist: 2.5, mobDist: 3.6, camY: 0.2, aimY: -0.4, frameY: 220, track: false } },
    { id: 'song', label: '倒立歌唱', hold: 7 },
  ],
  turtle: [
    { id: 'swim', label: '划水巡游', hold: 5 },
    { id: 'breathe', label: '上浮换气', hold: 4.5 },
    { id: 'graze', label: '啃食海草', hold: 7, view: { yaw: 0.4, pitch: 0.38, dist: -0.2, aimY: -0.1 } },
    { id: 'rest', label: '休憩', hold: 6 },
  ],
  dumbo: [
    { id: 'flap', label: '耳鳍拍游', hold: 4.5 },
    { id: 'hover', label: '漂浮悬停', hold: 6 },
    { id: 'reach', label: '触腕伸展', hold: 5 },
    { id: 'crawl', label: '海底爬行', hold: 6 },
  ],
  // ---- vampire / gulper / hammer are now rigged too (clips authored in ocean-atlas tools/rig/rig_new.py);
  //      their pose/amp/fx fields below are only used by the procedural fallback if a clip is missing ----
  // ---- procedural (static GLB + shader undulation + rigid fx) ----
  vampire: [
    { id: 'drift', label: '悬浮漂游', hold: 6, pose: [0.05, 0, 0], amp: 0.8, freq: 0.7, bob: 1, sway: 1, fx: { type: 'finpaddle', period: 2.2, mag: 0.1 } },
    { id: 'snow', label: '收集海洋雪', hold: 6, view: { yaw: 0.25, pitch: 0.32, dist: -0.2 }, pose: [0.5, 0, 0], amp: 0.5, freq: 0.5, bob: 0.4, sway: 0.4, fx: { type: 'sink', period: 6, mag: 0.18 } },
    { id: 'cloak', label: '斗篷翻转', hold: 5, pose: [0, 0, 0], amp: 0.3, freq: 0.4, bob: 0.3, sway: 0.3, fx: { type: 'cloak', period: 3, mag: 0.35 } },
    { id: 'flee', label: '喷射逃逸', hold: 4, pose: [-0.2, 0, 0], amp: 1.6, freq: 2, bob: 0.6, sway: 0.6, fx: { type: 'jet', period: 1.3, mag: 0.45, spin: 1 } },
  ],
  barreleye: [
    { id: 'hover', label: '静止悬停', hold: 6, pose: [0, 0, 0], amp: 0.4, freq: 0.6, bob: 0.5, sway: 0.4, fx: { type: 'finpaddle', period: 1.2, mag: 0.04 } },
    { id: 'gaze', label: '转眼仰望', hold: 6, pose: [0.15, 0, 0], amp: 0.5, freq: 0.6, bob: 0.5, sway: 0.4, fx: { type: 'tiltup', period: 5, mag: 0.85 } },
    { id: 'strike', label: '上冲捕食', hold: 4, pose: [0, 0, 0], amp: 1.5, freq: 1.8, bob: 0.5, sway: 0.5, fx: { type: 'riseStrike', period: 2.4, mag: 0.5 } },
    { id: 'cruise', label: '缓慢巡游', hold: 5, pose: [0, 0, 0], amp: 1.1, freq: 1.1, bob: 1, sway: 1.2, fx: { type: 'sweep', period: 6, mag: 0.6 } },
  ],
  gulper: [
    { id: 'swim', label: '蛇形游动', hold: 6, pose: [0, 0, 0], amp: 1.6, freq: 1.3, bob: 1, sway: 1.4, fx: { type: 'sweep', period: 4, mag: 0.35 } },
    { id: 'gape', label: '张口吞网', hold: 5, view: { yaw: -0.3, yawK: 5, pitch: 0.42, dist: -0.8, aimY: 0.15 }, pose: [-0.15, 0, 0], amp: 0.7, freq: 0.8, bob: 0.6, sway: 0.6, fx: { type: 'gape', period: 2.8, mag: 0.35 } },
    { id: 'tailglow', label: '尾灯诱饵', hold: 6, pose: [0.1, 0, 0.2], amp: 0.6, freq: 0.6, bob: 0.4, sway: 0.4, fx: { type: 'curl', period: 3.5, mag: 0.6 } },
    { id: 'drift', label: '垂直悬垂', hold: 6, pose: [1.25, 0, 0], amp: 0.5, freq: 0.5, bob: 0.6, sway: 0.4, fx: { type: 'sink', period: 7, mag: 0.12 } },
  ],
  nautilus: [
    { id: 'jet', label: '喷水倒游', hold: 5, pose: [0, 0, 0], amp: 1.2, freq: 1.4, bob: 0.6, sway: 0.6, fx: { type: 'jet', period: 1.6, mag: 0.3, back: 1 } },
    { id: 'rise', label: '夜间上浮', hold: 6, pose: [-0.25, 0, 0], amp: 0.8, freq: 1, bob: 0.4, sway: 0.5, fx: { type: 'rise', period: 6, mag: 0.4 } },
    { id: 'sink', label: '白昼下沉', hold: 6, pose: [0.3, 0, 0], amp: 0.4, freq: 0.6, bob: 0.3, sway: 0.4, fx: { type: 'sink', period: 6, mag: 0.4 } },
    { id: 'forage', label: '触手觅食', hold: 6, pose: [0.45, 0, 0], amp: 1.6, freq: 1.3, bob: 0.6, sway: 0.8, fx: { type: 'sweep', period: 3, mag: 0.35 } },
  ],
  jelly: [
    { id: 'pulse', label: '伞体脉动', hold: 6, pose: [0, 0, 0], amp: 2.4, freq: 1.45, bob: 0.4, sway: 0.35, fx: { type: 'pulse', period: 1.4, mag: 0.28 } },
    { id: 'drift', label: '随流漂浮', hold: 6, pose: [0.05, 0, 0.2], amp: 0.5, freq: 0.5, bob: 1.4, sway: 1.6, fx: { type: 'tumble', period: 9, mag: 0.6 } },
    { id: 'feed', label: '口腕进食', hold: 6, pose: [-0.1, 0, 0], amp: 1.7, freq: 0.85, bob: 0.6, sway: 0.7, fx: { type: 'pulse', period: 2.6, mag: 0.18 } },
  ],
  physalia: [
    { id: 'sail', label: '迎风帆行', hold: 6, pose: [0, 0.3, 0.45], amp: 0.8, freq: 1, bob: 0.8, sway: 0.6, fx: { type: 'sail', period: 4, mag: 0.4 } },
    { id: 'bob', label: '随浪起伏', hold: 6, pose: [0, 0, 0], amp: 0.7, freq: 0.8, bob: 2.4, sway: 1.5, fx: { type: 'waves', period: 2.6, mag: 0.18 } },
    { id: 'hunt', label: '触手捕猎', hold: 6, pose: [0.1, 0, 0], amp: 2.2, freq: 1.6, bob: 0.6, sway: 0.6, fx: { type: 'retract', period: 3, mag: 0.25 } },
    { id: 'roll', label: '翻身润浮囊', hold: 5, pose: [0, 0, 0], amp: 0.6, freq: 0.7, bob: 0.6, sway: 0.4, fx: { type: 'roll', period: 4, mag: 1.3 } },
  ],
  hammer: [
    { id: 'patrol', label: '巡游', hold: 6, pose: [0, 0, 0], amp: 1.1, freq: 1.1, bob: 1, sway: 1.2, fx: { type: 'sweep', period: 7, mag: 0.4 } },
    { id: 'scan', label: '扫描海底', hold: 6, pose: [0.4, 0, 0], amp: 0.9, freq: 1, bob: 0.5, sway: 0.4, fx: { type: 'scan', period: 2.2, mag: 0.55 } },
    { id: 'pin', label: '锤头压魟', hold: 5, pose: [0, 0, 0], amp: 1.7, freq: 1.8, bob: 0.4, sway: 0.4, fx: { type: 'pin', period: 2.6, mag: 0.4 } },
    { id: 'sideswim', label: '侧身游弋', hold: 6, pose: [0, 0, 1.1], amp: 1, freq: 0.9, bob: 0.8, sway: 0.6, fx: { type: 'sweep', period: 6, mag: 0.25 } },
  ],
  // ---- batch 1 rigged clips (id === Blender AnimationClip name) ----
  great_white: [
    { id: 'breach', label: '突袭跃身', hold: 5, view: { yaw: 0.48, pitch: 0.02, dist: 3.2, mobDist: 5.2, frameY: 80, track: true } },
    { id: 'cruise', label: '巡游绕圈', hold: 6 },
    { id: 'bite', label: '张口咬合', hold: 5 },
    { id: 'roll', label: '侧翻露眼', hold: 5 },
  ],
  manta: [
    { id: 'glide', label: '展翼滑翔', hold: 6 },
    { id: 'barrel', label: '翻滚滤食', hold: 5 },
    { id: 'hover', label: '清洁站悬停', hold: 6 },
    { id: 'leap', label: '跃出水面', hold: 5.5, view: { dist: 3.4, mobDist: 5.4, frameY: 90, track: true } },
  ],
  // ---- batch 2 rigged clips (id === Blender AnimationClip name) ----
  frilled_shark: [
    { id: 'slither', label: '蛇形游动', hold: 6 },
    { id: 'lunge', label: '弹射咬捕', hold: 4.5 },
    { id: 'gillflare', label: '皱鳃开合', hold: 5 },
  ],
  // ---- batch 4 rigged clips (id === Blender AnimationClip name) ----
  oarfish: [
    { id: 'hover', label: '垂直悬立', hold: 6, view: { yaw: 0.12, pitch: 0.02, dist: 0.15 } },
    { id: 'undulate', label: '背鳍波动', hold: 5.5, view: { yaw: 0.95, pitch: 0.04, dist: -0.35 } },
    { id: 'dive', label: '急速下潜', hold: 5.5, view: { yaw: 0.35, pitch: 0.22, dist: 0.7, track: true } },
  ],
  clownfish: [
    { id: 'nestle', label: '钻进海葵', hold: 5, view: { yaw: 1.02, pitch: 0.2, dist: -0.4 } },
    { id: 'fan', label: '护卵扇水', hold: 5 },
    { id: 'chase', label: '驱赶入侵者', hold: 4.5 },
  ],
  // ---- batch 3 rigged clips (id === Blender AnimationClip name) ----
  seahorse: [
    { id: 'grip', label: '尾卷海草', hold: 5.5, rate: 0.7, view: { yaw: 1.25, pitch: 0.06, dist: -0.3 } },
    { id: 'brood', label: '雄性育儿', hold: 6, rate: 0.55, view: { yaw: 0.15, pitch: 0.28, dist: -0.9 } },
    { id: 'sip', label: '吸管捕食', hold: 4.5, rate: 1.7, view: { yaw: 0.4, pitch: 0.16, dist: -1.5 } },
    { id: 'dance', label: '求偶共舞', hold: 5.5, rate: 1.15, view: { yaw: 0.85, pitch: 0.04, dist: 0.5 } },
  ],
  sunfish: [
    { id: 'bask', label: '侧躺晒日', hold: 6, view: { yaw: 0.4, pitch: 0.12 } },
    { id: 'stroke', label: '背臀鳍划水', hold: 5 },
    { id: 'dive', label: '深潜觅食', hold: 5.5 },
  ],
  blobfish: [
    { id: 'drift', label: '贴底漂浮', hold: 6 },
    { id: 'gulp', label: '张口吞食', hold: 5 },
    { id: 'collapse', label: '减压塌陷', hold: 5.5 },
  ],
  coelacanth: [
    { id: 'hover', label: '倒立漂浮', hold: 6 },
    { id: 'lobefin', label: '肉鳍交替划水', hold: 5.5 },
    { id: 'cave', label: '洞穴休憩', hold: 6 },
  ],
  orca: [
    { id: 'wavewash', label: '浪推海豹', hold: 5 },
    { id: 'hunt', label: '群体围猎', hold: 5 },
    { id: 'breach', label: '鲸跃', hold: 5, view: { dist: 3.2, mobDist: 5.2, frameY: 100, track: true } },
    { id: 'spyhop', label: '浮窥', hold: 6, view: { pitch: 0.12, dist: 1.8, mobDist: 2.6, track: true } },
  ],
  dolphin: [
    { id: 'leap', label: '跃出水面', hold: 4.5, view: { dist: 3.0, mobDist: 4.8, frameY: 80, track: true } },
    { id: 'surf', label: '乘浪冲浪', hold: 5 },
    { id: 'echolocate', label: '回声定位', hold: 5.5 },
    { id: 'bubble', label: '泡泡环', hold: 5 },
  ],
  sperm_whale: [
    { id: 'sleep', label: '垂直睡眠', hold: 6, rate: 0.5, view: { yaw: 1.15, pitch: 0.12, dist: 2.2, mobDist: 3.4, track: true } },
    { id: 'dive', label: '深潜捕乌贼', hold: 5.5, rate: 1.1, view: { yaw: 0.8, dist: 2.8, mobDist: 4.4, frameY: 40, track: true } },
    { id: 'blow', label: '喷气换气', hold: 5, rate: 1, view: { yaw: 0.5, pitch: 0.18, dist: 0.6 } },
    { id: 'click', label: '喀哒定位', hold: 5.5, rate: 1.55, view: { yaw: 0.22, pitch: 0.1, dist: -0.8 } },
  ],
  leatherback: [
    { id: 'cruise', label: '长距洄游', hold: 6 },
    { id: 'dive', label: '深潜捕水母', hold: 5 },
    { id: 'nest', label: '沙滩产卵', hold: 6 },
  ],
  giant_squid: [
    { id: 'lunge', label: '长腕捕猎', hold: 5, view: { yaw: 0.35, pitch: 0.22, dist: 0.35 } },
    { id: 'jet', label: '喷射推进', hold: 4.5, view: { yaw: 1.15, pitch: 0.05, dist: 1.2 } },
    { id: 'duel', label: '对抗抹香鲸', hold: 6, view: { yaw: 0.25, pitch: 0.1, dist: 0.2 } },
  ],
  octopus: [
    { id: 'camouflage', label: '变色伪装', hold: 5.5, view: { yaw: 0.25, pitch: 0.35, dist: -0.6 } },
    { id: 'ink', label: '喷墨逃逸', hold: 4.5, view: { yaw: 1.05, pitch: 0.05, dist: 0.7 } },
    { id: 'squeeze', label: '钻入缝隙', hold: 5.5, view: { yaw: 0.6, pitch: 0.4, dist: -0.35 } },
    { id: 'probe', label: '腕尖探物', hold: 5, view: { yaw: -0.7, pitch: 0.18, dist: 0.15 } },
  ],
  lionsmane: [
    { id: 'pulse', label: '伞体搏动', hold: 5.5, view: { yaw: 0.2, pitch: 0.12, dist: -0.15 } },
    { id: 'trail', label: '触手拖网', hold: 6, view: { yaw: 0.55, pitch: 0.38, dist: 0.5 } },
    { id: 'drift', label: '随流漂移', hold: 6.5, view: { yaw: 1.05, pitch: 0.05, dist: 0.65 } },
  ],
  comb_jelly: [
    { id: 'shimmer', label: '栉板彩虹光', hold: 5.5 },
    { id: 'gulp', label: '吞食其他栉水母', hold: 5 },
    { id: 'cruise', label: '张口游动', hold: 5.5 },
  ],
  // ---- batch 5 rigged clips (id === Blender AnimationClip name) ----
  spider_crab: [
    { id: 'walk', label: '缓步爬行', hold: 6 },
    { id: 'molt', label: '蜕壳', hold: 6.5 },
    { id: 'cloak', label: '附着伪装', hold: 5.5 },
  ],
  mantis_shrimp: [
    { id: 'punch', label: '弹击碎壳', hold: 5 },
    { id: 'guard', label: '洞口守候', hold: 6 },
    { id: 'display', label: '彩色求偶', hold: 6 },
  ],
  giant_isopod: [
    { id: 'ball', label: '卷成球', hold: 6 },
    { id: 'scavenge', label: '食腐', hold: 6 },
    { id: 'fast', label: '长期禁食', hold: 7 },
  ],
  starfish: [
    { id: 'crawl', label: '管足爬行', hold: 6, view: { yaw: 0.4, pitch: 0.72, dist: -0.35 } },
    { id: 'evert', label: '翻胃进食', hold: 6, view: { yaw: 0.15, pitch: 0.95, dist: -0.7 } },
    { id: 'regenerate', label: '断腕再生', hold: 7, view: { yaw: 1.15, pitch: 0.48, dist: -0.15 } },
  ],
  urchin: [
    { id: 'spin', label: '棘刺转动', hold: 5.5 },
    { id: 'graze', label: '啃食海藻', hold: 6 },
    { id: 'tube', label: '管足移动', hold: 6 },
  ],
};

export function behaviorsFor(id) { return BEHAVIORS[id] || BEHAVIORS.nautilus; }
export function behaviorLabelFor(id, bid) { return behaviorsFor(id).find(b => b.id === bid)?.label || bid; }

/** Short line under the stage while that behavior is showing. Empty → species blurb. */
const BEHAVIOR_CAPTION = {
  angler: {
    ambush: '黑暗中唯一的灯，是一个温柔的陷阱。',
    lure: '饵球轻轻摆，像在跟路过的鱼打招呼。',
    strike: '嘴猛地张开，把光和猎物一起吞进去。',
    swim: '它慢慢挪开，头上的灯还在摇。',
  },
  whale: {
    cruise: '长鳍像翼，它沿着自己的航线慢慢游。',
    breach: '整条身体跃出水面，再砸回海里。',
    lobtail: '尾鳍高高举起，然后拍下去。',
    blow: '喷气孔喷出一团雾，它换了一口气。',
    song: '头朝下竖在水里，歌声传得很远。',
  },
  turtle: {
    swim: '前肢像桨，一下一下把水拨开。',
    breathe: '它浮上水面，探出头换气。',
    graze: '低头啃着海草。再远的沙滩，它也记得路。',
    rest: '停在水层里，四肢松松地垂着。',
  },
  dumbo: {
    flap: '一对耳鳍扇动，像在水里飞行。',
    hover: '它悬在海底上方，几乎不动。',
    reach: '触腕向前探，去够落在泥上的食物。',
    crawl: '贴着海底，一点一点往前挪。',
  },
  vampire: {
    drift: '斗篷张开，它在缺氧层里慢慢漂。',
    snow: '名字骇人，它却只是在收海洋雪。',
    cloak: '腕间膜翻过来，身体缩成一颗球。',
    flee: '它喷出一股水，头也不回地逃开。',
  },
  barreleye: {
    hover: '透明的头停在水里，眼睛朝上。',
    gaze: '管状眼转了个方向，望向头顶的光。',
    strike: '它突然上冲，去咬头顶游过的影子。',
    cruise: '身体放平，慢慢往前巡。',
  },
  gulper: {
    swim: '细长的身体像蛇一样左右摆。',
    gape: '嘴张成一张网，等着食物自己游进来。',
    tailglow: '尾端的小灯亮着，在身后晃。',
    drift: '它竖直挂在水里，像一根悬着的线。',
  },
  nautilus: {
    jet: '漏斗喷水，螺壳倒着往后退。',
    rise: '夜里它把气室调轻，慢慢上浮。',
    sink: '白天加重身体，沉回暗处。',
    forage: '几十条触手在螺口前面摸索。',
  },
  jelly: {
    pulse: '伞体一张一合，像月亮在呼吸。',
    drift: '它把身体交给水流，自己几乎不划。',
    feed: '口腕伸进水里，捞过往的小动物。',
  },
  physalia: {
    sail: '浮囊上的冠迎着风，整群往前漂。',
    bob: '浪头把蓝帽子托起来，又放下。',
    hunt: '水下的触手张开，等着碰到猎物。',
    roll: '它把浮囊浸进水里，润一润。',
  },
  hammer: {
    patrol: '锤头左右扫过，沿着海岸巡游。',
    scan: '宽头贴着沙底，电感受器在找埋着的鱼。',
    pin: '头翼压住沙里的魟，再一口咬住。',
    sideswim: '身体侧过来，继续往前游。',
  },
  great_white: {
    breach: '它从光的下面冲上来，整条身体离开海面。',
    cruise: '灰色的背贴着水面下，慢慢绕圈。',
    bite: '嘴张开，几排锯齿一起合上。',
    roll: '它侧过身，露出那只黑眼睛。',
  },
  manta: {
    glide: '两翼几乎不动，它在水里滑翔。',
    barrel: '翻了个身，把浮游生物滤进嘴里。',
    hover: '停在清洁站，让小鱼啄掉寄生虫。',
    leap: '宽翅膀拍出水面，再落回去。',
  },
  frilled_shark: {
    slither: '身体像鳗，一节一节地摆出去。',
    lunge: '它把身体弹直，咬向前面的猎物。',
    gillflare: '鳃裂的褶边张开，又慢慢合上。',
  },
  oarfish: {
    hover: '银色的带子竖在暮光里，头朝上。',
    undulate: '红色背鳍从头到尾一直在波动。',
    dive: '它收起身体，迅速往更深的地方去。',
  },
  clownfish: {
    nestle: '它钻进会蜇人的触手里，把家安在刺与刺之间。',
    fan: '停在卵旁边，胸鳍把新鲜的水扇过去。',
    chase: '有谁靠得太近，它就冲出去赶走。',
  },
  seahorse: {
    grip: '尾巴轻轻勾住一根海草，身体稳住。',
    brood: '雄鱼的育儿囊微微鼓起，孩子在里面。',
    sip: '管状的吻猛地一吸，小虾已经不见了。',
    dance: '两尾海马面对面，在水里慢慢转。',
  },
  sunfish: {
    bask: '圆盘侧躺在海面上，把太阳晒进身体。',
    stroke: '背鳍和臀鳍一起划，推着圆盘前进。',
    dive: '它离开海面，往下潜去找水母。',
  },
  blobfish: {
    drift: '软软的身体贴着海底，几乎不费力。',
    gulp: '嘴张开，把游到面前的东西吞进去。',
    collapse: '压力一消失，身体就塌成一团果冻。',
  },
  coelacanth: {
    hover: '头朝下，它在洞里倒立着漂。',
    lobefin: '肉鳍交替摆动，像在水里走路。',
    cave: '它退回岩洞的阴影里，停住。',
  },
  orca: {
    wavewash: '尾鳍拍打浮冰边缘，浪把海豹冲下来。',
    hunt: '黑白的家族排开，围住同一条鱼。',
    breach: '它整条跃出水面，再重重落下。',
    spyhop: '头垂直探出水面，看一眼冰上。',
  },
  dolphin: {
    leap: '它跃出浪尖，在空中弯成一道弧。',
    surf: '身体贴着浪坡往前冲。',
    echolocate: '额隆发出一串咔嗒声，去找前面的鱼。',
    bubble: '它吐出一个会自己打转的泡泡环。',
  },
  sperm_whale: {
    sleep: '巨大的头朝上竖着，它就这样睡觉。',
    dive: '尾鳍举起，身体沉向乌贼所在的深处。',
    blow: '偏在左边的喷气孔喷出斜斜的一团雾。',
    click: '额里的鲸蜡器聚焦喀哒声，去量前方的距离。',
  },
  leatherback: {
    cruise: '它用长鳍划过整片大洋，不停。',
    dive: '跟着水母往下潜，背甲的纵棱压住水。',
    nest: '爬上夜色里的沙滩，去把卵埋好。',
  },
  giant_squid: {
    lunge: '两条长腕伸出去，末端的吸盘张开。',
    jet: '外套膜一收，它往后弹开。',
    duel: '盘子一样大的眼睛，在暮光里盯着抹香鲸。',
  },
  octopus: {
    camouflage: '皮肤一眨眼，换成沙、藻和石头的颜色。',
    ink: '一团墨喷出来，它已经从另一头离开。',
    squeeze: '骨头不必跟着走，身体钻进更窄的缝。',
    probe: '一条腕先伸过去，尖端在摸那块石头。',
  },
  lionsmane: {
    pulse: '大伞缓慢搏动，冷水被推开一点。',
    trail: '伞下拖着密密的触手，像一张网。',
    drift: '它把身体交给海流，往冰缘漂。',
  },
  comb_jelly: {
    shimmer: '八列栉板拍过，光折成流动的虹。',
    gulp: '没有触手，它张大嘴吞下另一只栉水母。',
    cruise: '嘴还张着，身体已经往前游。',
  },
  spider_crab: {
    walk: '细长的步足像枯枝，一下一下地挪。',
    molt: '旧壳裂开，更软的身体从里面退出来。',
    cloak: '它把藻和海绵别在壳上，自己隐进去。',
  },
  mantis_shrimp: {
    punch: '锤节弹出，甲壳在空化气泡里碎开。',
    guard: '它守在洞口，复眼跟着外面的影子转。',
    display: '彩色的附肢展开，是给同类看的。',
  },
  giant_isopod: {
    ball: '受到惊扰，分节的背甲卷成一颗球。',
    scavenge: '它爬向沉到海底的尸体，慢慢吃。',
    fast: '吃完这一顿，它可以好几年不再开口。',
  },
  starfish: {
    crawl: '管足一排排吸住岩石，身体往前爬。',
    evert: '胃翻出体外，包住合不拢的贝。',
    regenerate: '断掉的腕还在，新的一截慢慢长出来。',
  },
  urchin: {
    spin: '棘刺转向威胁来的方向。',
    graze: '腹面的五颗牙刮过海藻。',
    tube: '管足把刺球一点点搬到下一丛藻上。',
  },
};

export function behaviorCaption(speciesId, behaviorId) {
  return BEHAVIOR_CAPTION[speciesId]?.[behaviorId] || '';
}
