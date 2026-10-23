/**
 * Per-species behavior lists (data-driven action tabs).
 * Rigged species: `id` is the AnimationClip name authored in Blender (ocean-atlas-rig/scripts/reanim.py).
 * Procedural species: pose [pitch,yaw,roll] rad, amp/freq multipliers for the shader undulation,
 * bob/sway multipliers, and `fx` = a large rigid motion pattern (see aliveMotion.js fxOffsets).
 */
export const BEHAVIORS = {
  // ---- rigged (Blender clips) ----
  angler: [
    { id: 'ambush', label: '伏击静候', hold: 6, view: { yaw: 0.7, pitch: 0.1, dist: 1.5 } },
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
    { id: 'graze', label: '啃食海草', hold: 7 },
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
    { id: 'snow', label: '收集海洋雪', hold: 6, pose: [0.5, 0, 0], amp: 0.5, freq: 0.5, bob: 0.4, sway: 0.4, fx: { type: 'sink', period: 6, mag: 0.18 } },
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
  // ---- Tripo static GLBs: species-specific labels, procedural fx (no Blender clips) ----
  great_white: [
    { id: 'breach', label: '突袭跃身', hold: 4.2, pose: [0.25, 0, 0], amp: 1.7, freq: 1.5, bob: 0.7, sway: 0.6, fx: { type: 'riseStrike', period: 2.2, mag: 0.62 } },
    { id: 'circle', label: '巡游绕圈', hold: 6.5, pose: [0, 0, 0.12], amp: 1.05, freq: 1, bob: 0.8, sway: 1, fx: { type: 'orbit', period: 7, mag: 0.2 } },
    { id: 'bite', label: '张口咬合', hold: 4.2, pose: [0.05, 0, 0], amp: 0.8, freq: 0.9, bob: 0.5, sway: 0.5, fx: { type: 'gape', period: 2.1, mag: 0.42 } },
    { id: 'rolleye', label: '侧翻露眼', hold: 5, pose: [0, 0, 1.05], amp: 0.9, freq: 0.85, bob: 0.7, sway: 0.6, fx: { type: 'roll', period: 4.2, mag: 1.15 } },
  ],
  manta: [
    { id: 'glide', label: '展翼滑翔', hold: 6, pose: [0.06, 0, 0], amp: 0.65, freq: 0.75, bob: 0.9, sway: 1.1, fx: { type: 'sweep', period: 6.5, mag: 0.32 } },
    { id: 'barrel', label: '翻滚滤食', hold: 5, pose: [0, 0, 0], amp: 0.8, freq: 1, bob: 0.6, sway: 0.5, fx: { type: 'roll', period: 3.2, mag: 1.45 } },
    { id: 'hover', label: '清洁站悬停', hold: 6, pose: [0, 0, 0], amp: 0.5, freq: 0.6, bob: 0.45, sway: 0.45, fx: { type: 'finpaddle', period: 2.4, mag: 0.05 } },
    { id: 'leap', label: '跃出水面', hold: 4.2, pose: [-0.15, 0, 0], amp: 1.2, freq: 1.3, bob: 0.6, sway: 0.5, fx: { type: 'rise', period: 3, mag: 0.55 } },
  ],
  frilled_shark: [
    { id: 'snake', label: '蛇形游动', hold: 6, pose: [0, 0, 0.15], amp: 1.8, freq: 1.35, bob: 0.8, sway: 1.3, fx: { type: 'sweep', period: 3.2, mag: 0.5 } },
    { id: 'strike', label: '弹射咬捕', hold: 4, pose: [0.1, 0, 0], amp: 1.4, freq: 1.8, bob: 0.5, sway: 0.5, fx: { type: 'jet', period: 1.35, mag: 0.55 } },
    { id: 'gills', label: '皱鳃开合', hold: 5, pose: [0, 0, 0], amp: 0.7, freq: 0.8, bob: 0.5, sway: 0.5, fx: { type: 'gape', period: 1.7, mag: 0.28 } },
  ],
  oarfish: [
    { id: 'upright', label: '垂直悬立', hold: 6.5, pose: [0, 0, 0], amp: 0.7, freq: 0.8, bob: 0.55, sway: 0.5, fx: { type: 'finpaddle', period: 2.6, mag: 0.04 } },
    { id: 'dorsal', label: '背鳍波动', hold: 5.5, pose: [0, 0, 0.08], amp: 1.7, freq: 1.6, bob: 0.6, sway: 0.7, fx: { type: 'finpaddle', period: 1.05, mag: 0.1 } },
    { id: 'dive', label: '缓慢下潜', hold: 6, pose: [0.12, 0, 0], amp: 0.6, freq: 0.6, bob: 0.5, sway: 0.45, fx: { type: 'sink', period: 6.5, mag: 0.38 } },
  ],
  clownfish: [
    { id: 'anemone', label: '钻进海葵', hold: 5, pose: [0.25, 0, 0], amp: 0.6, freq: 0.8, bob: 0.45, sway: 0.45, fx: { type: 'retract', period: 2.8, mag: 0.32 } },
    { id: 'fan', label: '护卵扇水', hold: 5.5, pose: [0, 0, 0], amp: 1.5, freq: 1.7, bob: 0.5, sway: 0.6, fx: { type: 'finpaddle', period: 1.05, mag: 0.16 } },
    { id: 'chase', label: '驱赶入侵者', hold: 4, pose: [0, 0, 0.1], amp: 1.4, freq: 1.6, bob: 0.6, sway: 0.8, fx: { type: 'jet', period: 1.15, mag: 0.34 } },
  ],
  seahorse: [
    { id: 'grasp', label: '尾卷海草', hold: 6, pose: [0.1, 0, 0.2], amp: 0.6, freq: 0.7, bob: 0.45, sway: 0.5, fx: { type: 'curl', period: 3.6, mag: 0.42 } },
    { id: 'brood', label: '雄性育儿', hold: 6, pose: [0, 0, 0], amp: 0.55, freq: 0.6, bob: 0.5, sway: 0.45, fx: { type: 'pulse', period: 2.8, mag: 0.12 } },
    { id: 'snap', label: '吸管捕食', hold: 4.2, pose: [0.15, 0, 0], amp: 0.7, freq: 1.1, bob: 0.45, sway: 0.45, fx: { type: 'gape', period: 1.5, mag: 0.2 } },
    { id: 'dance', label: '求偶共舞', hold: 6, pose: [0, 0.2, 0.25], amp: 0.9, freq: 1.1, bob: 1.1, sway: 1.2, fx: { type: 'orbit', period: 5, mag: 0.1 } },
  ],
  sunfish: [
    { id: 'bask', label: '侧躺晒日', hold: 6.5, pose: [0, 0, 1.15], amp: 0.55, freq: 0.6, bob: 0.7, sway: 0.5, fx: { type: 'roll', period: 5.5, mag: 0.9 } },
    { id: 'flap', label: '背臀鳍划水', hold: 5, pose: [0, 0, 0], amp: 1.2, freq: 1.3, bob: 0.7, sway: 0.6, fx: { type: 'finpaddle', period: 1.25, mag: 0.14 } },
    { id: 'dive', label: '深潜觅食', hold: 5.5, pose: [0.45, 0, 0], amp: 0.7, freq: 0.8, bob: 0.5, sway: 0.45, fx: { type: 'sink', period: 5, mag: 0.42 } },
  ],
  blobfish: [
    { id: 'float', label: '贴底漂浮', hold: 6.5, pose: [0.18, 0, 0], amp: 0.55, freq: 0.55, bob: 0.5, sway: 0.45, fx: { type: 'finpaddle', period: 3.2, mag: 0.045 } },
    { id: 'gulp', label: '张口吞食', hold: 4.5, pose: [0, 0, 0], amp: 0.7, freq: 0.7, bob: 0.45, sway: 0.45, fx: { type: 'gape', period: 2.5, mag: 0.48 } },
    { id: 'melt', label: '减压塌陷', hold: 5.5, pose: [0, 0, 0], amp: 0.6, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'flatten', period: 4.2, mag: 0.42 } },
  ],
  coelacanth: [
    { id: 'headdown', label: '倒立漂浮', hold: 6.5, pose: [1.2, 0, 0], amp: 0.55, freq: 0.6, bob: 0.5, sway: 0.5, fx: { type: 'finpaddle', period: 3.4, mag: 0.05 } },
    { id: 'paddle', label: '肉鳍交替划水', hold: 5.5, pose: [0, 0, 0.08], amp: 1.15, freq: 1.2, bob: 0.7, sway: 0.8, fx: { type: 'finpaddle', period: 1.35, mag: 0.12 } },
    { id: 'cave', label: '洞穴休憩', hold: 6.5, pose: [0.12, 0, 0], amp: 0.5, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'sink', period: 7, mag: 0.12 } },
  ],
  orca: [
    { id: 'wash', label: '浪推海豹', hold: 5, pose: [0.15, 0, 0.2], amp: 1.1, freq: 1.1, bob: 1.2, sway: 0.8, fx: { type: 'waves', period: 2.3, mag: 0.22 } },
    { id: 'pod', label: '群体围猎', hold: 6, pose: [0, 0, 0], amp: 1.35, freq: 1.25, bob: 0.7, sway: 1, fx: { type: 'orbit', period: 5.2, mag: 0.26 } },
    { id: 'breach', label: '鲸跃', hold: 4.2, pose: [0.2, 0, 0], amp: 1.4, freq: 1.4, bob: 0.6, sway: 0.5, fx: { type: 'riseStrike', period: 2.3, mag: 0.6 } },
    { id: 'spy', label: '浮窥', hold: 5, pose: [-0.55, 0, 0], amp: 0.6, freq: 0.7, bob: 0.5, sway: 0.45, fx: { type: 'rise', period: 3.6, mag: 0.38 } },
  ],
  dolphin: [
    { id: 'leap', label: '跃出水面', hold: 4, pose: [-0.1, 0, 0], amp: 1.4, freq: 1.5, bob: 0.7, sway: 0.7, fx: { type: 'rise', period: 2.1, mag: 0.55 } },
    { id: 'surf', label: '乘浪冲浪', hold: 5.5, pose: [0, 0, 0.15], amp: 1.1, freq: 1.15, bob: 1.4, sway: 1, fx: { type: 'waves', period: 2, mag: 0.26 } },
    { id: 'echo', label: '回声定位', hold: 5.5, pose: [0.18, 0.35, 0], amp: 0.8, freq: 0.9, bob: 0.55, sway: 0.7, fx: { type: 'sweep', period: 3.2, mag: 0.4 } },
    { id: 'rings', label: '泡泡环', hold: 5, pose: [0, 0, 0], amp: 0.9, freq: 1, bob: 0.8, sway: 0.6, fx: { type: 'pulse', period: 1.6, mag: 0.16 } },
  ],
  sperm_whale: [
    { id: 'sleep', label: '垂直睡眠', hold: 7, pose: [1.35, 0, 0], amp: 0.5, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'sink', period: 8, mag: 0.06 } },
    { id: 'dive', label: '深潜捕乌贼', hold: 5.5, pose: [0.65, 0, 0], amp: 0.8, freq: 0.85, bob: 0.5, sway: 0.45, fx: { type: 'sink', period: 4.4, mag: 0.5 } },
    { id: 'blow', label: '喷气(左斜)', hold: 4.5, pose: [0, 0.4, -0.28], amp: 0.6, freq: 0.7, bob: 0.6, sway: 0.5, fx: { type: 'rise', period: 3.1, mag: 0.22 } },
    { id: 'click', label: '喀哒声定位', hold: 5.5, pose: [0.1, 0.2, 0], amp: 0.65, freq: 0.75, bob: 0.5, sway: 0.6, fx: { type: 'sweep', period: 4, mag: 0.22 } },
  ],
  leatherback: [
    { id: 'migrate', label: '长距洄游', hold: 6.5, pose: [0, 0, 0.05], amp: 1.05, freq: 0.95, bob: 0.8, sway: 0.9, fx: { type: 'sweep', period: 6.5, mag: 0.38 } },
    { id: 'dive', label: '深潜捕水母', hold: 5.5, pose: [0.5, 0, 0], amp: 0.85, freq: 0.9, bob: 0.5, sway: 0.5, fx: { type: 'sink', period: 5, mag: 0.45 } },
    { id: 'nest', label: '沙滩产卵', hold: 6, pose: [0.4, 0, 0.1], amp: 0.55, freq: 0.6, bob: 0.45, sway: 0.45, fx: { type: 'pin', period: 4.2, mag: 0.22 } },
  ],
  giant_squid: [
    { id: 'arms', label: '长腕捕猎', hold: 5.5, pose: [0.15, 0, 0], amp: 1.6, freq: 1.2, bob: 0.6, sway: 0.8, fx: { type: 'retract', period: 3, mag: 0.38 } },
    { id: 'jet', label: '喷射推进', hold: 4.2, pose: [-0.1, 0, 0], amp: 1.3, freq: 1.6, bob: 0.55, sway: 0.5, fx: { type: 'jet', period: 1.45, mag: 0.5 } },
    { id: 'duel', label: '对抗抹香鲸', hold: 5, pose: [0.2, 0.3, 0.3], amp: 1.4, freq: 1.3, bob: 0.7, sway: 0.8, fx: { type: 'tumble', period: 3.1, mag: 0.65 } },
  ],
  octopus: [
    { id: 'camo', label: '变色伪装', hold: 5.5, pose: [0.05, 0, 0], amp: 0.7, freq: 0.8, bob: 0.45, sway: 0.5, fx: { type: 'pulse', period: 2.2, mag: 0.16 } },
    { id: 'ink', label: '喷墨逃逸', hold: 4, pose: [-0.15, 0, 0], amp: 1.5, freq: 1.8, bob: 0.55, sway: 0.6, fx: { type: 'jet', period: 1.25, mag: 0.52, spin: 1 } },
    { id: 'squeeze', label: '钻入缝隙', hold: 5, pose: [0.2, 0, 0], amp: 0.6, freq: 0.7, bob: 0.45, sway: 0.45, fx: { type: 'flatten', period: 2.6, mag: 0.5 } },
    { id: 'probe', label: '腕尖探物', hold: 5.5, pose: [0.1, 0.15, 0], amp: 1.55, freq: 1.25, bob: 0.6, sway: 0.9, fx: { type: 'sweep', period: 3, mag: 0.48 } },
  ],
  lionsmane: [
    { id: 'pulse', label: '伞体搏动', hold: 5.5, pose: [0, 0, 0], amp: 2.2, freq: 1.3, bob: 0.5, sway: 0.4, fx: { type: 'pulse', period: 1.55, mag: 0.3 } },
    { id: 'net', label: '触手拖网', hold: 6, pose: [0.08, 0, 0], amp: 1.4, freq: 0.8, bob: 0.7, sway: 0.6, fx: { type: 'retract', period: 3.5, mag: 0.32 } },
    { id: 'drift', label: '随流漂移', hold: 6.5, pose: [0.05, 0, 0.15], amp: 0.55, freq: 0.5, bob: 1.3, sway: 1.4, fx: { type: 'tumble', period: 8, mag: 0.32 } },
  ],
  comb_jelly: [
    { id: 'rainbow', label: '栉板彩虹光', hold: 5.5, pose: [0, 0, 0], amp: 1.8, freq: 1.7, bob: 0.7, sway: 0.5, fx: { type: 'pulse', period: 1.1, mag: 0.1 } },
    { id: 'gulp', label: '吞食其他栉水母', hold: 4.5, pose: [0.1, 0, 0], amp: 0.8, freq: 0.8, bob: 0.5, sway: 0.45, fx: { type: 'gape', period: 2.3, mag: 0.4 } },
    { id: 'swim', label: '张口游动', hold: 5.5, pose: [0.28, 0, 0], amp: 1.15, freq: 1.15, bob: 0.8, sway: 0.7, fx: { type: 'sweep', period: 3.2, mag: 0.28 } },
  ],
  spider_crab: [
    { id: 'walk', label: '缓步爬行', hold: 6.5, pose: [0.32, 0, 0], amp: 0.55, freq: 0.6, bob: 0.45, sway: 0.55, fx: { type: 'sweep', period: 4.4, mag: 0.16 } },
    { id: 'molt', label: '蜕壳', hold: 5.5, pose: [0, 0, 0], amp: 0.6, freq: 0.6, bob: 0.5, sway: 0.45, fx: { type: 'pulse', period: 3.6, mag: 0.22 } },
    { id: 'dress', label: '附着伪装', hold: 6, pose: [0.2, 0, 0], amp: 0.5, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'sink', period: 6, mag: 0.1 } },
  ],
  mantis_shrimp: [
    { id: 'punch', label: '弹击碎壳', hold: 3.6, pose: [0.05, 0, 0], amp: 0.8, freq: 1.4, bob: 0.45, sway: 0.45, fx: { type: 'jet', period: 0.95, mag: 0.72 } },
    { id: 'guard', label: '洞口守候', hold: 6, pose: [0.22, 0.15, 0], amp: 0.55, freq: 0.6, bob: 0.45, sway: 0.5, fx: { type: 'scan', period: 2.6, mag: 0.4 } },
    { id: 'court', label: '彩色求偶', hold: 5.5, pose: [0, 0.2, 0.15], amp: 1.2, freq: 1.3, bob: 0.8, sway: 1, fx: { type: 'orbit', period: 4, mag: 0.14 } },
  ],
  giant_isopod: [
    { id: 'ball', label: '卷成球', hold: 5, pose: [0.2, 0, 0], amp: 0.55, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'curl', period: 3.2, mag: 0.95 } },
    { id: 'scavenge', label: '食腐', hold: 6, pose: [0.48, 0, 0], amp: 0.6, freq: 0.65, bob: 0.45, sway: 0.5, fx: { type: 'scan', period: 3.1, mag: 0.48 } },
    { id: 'fast', label: '长期禁食', hold: 7, pose: [0, 0, 0], amp: 0.5, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'finpaddle', period: 6.5, mag: 0.025 } },
  ],
  starfish: [
    { id: 'tube', label: '管足爬行', hold: 6.5, pose: [0.12, 0, 0], amp: 0.5, freq: 0.55, bob: 0.45, sway: 0.5, fx: { type: 'sweep', period: 6.2, mag: 0.11 } },
    { id: 'stomach', label: '翻胃进食', hold: 5.5, pose: [0, 0, 0], amp: 0.6, freq: 0.6, bob: 0.45, sway: 0.45, fx: { type: 'pulse', period: 3.2, mag: 0.26 } },
    { id: 'regen', label: '断腕再生', hold: 5.5, pose: [0.05, 0, 0.1], amp: 0.55, freq: 0.55, bob: 0.45, sway: 0.45, fx: { type: 'retract', period: 4, mag: 0.28 } },
  ],
  urchin: [
    { id: 'spines', label: '棘刺转动', hold: 5.5, pose: [0, 0, 0], amp: 0.55, freq: 0.7, bob: 0.45, sway: 0.45, fx: { type: 'spin', period: 4, mag: 0.15, turns: 1 } },
    { id: 'graze', label: '啃食海藻', hold: 6, pose: [0.28, 0, 0], amp: 0.55, freq: 0.6, bob: 0.45, sway: 0.45, fx: { type: 'scan', period: 3.2, mag: 0.32 } },
    { id: 'tube', label: '管足移动', hold: 6, pose: [0.08, 0, 0], amp: 0.55, freq: 0.6, bob: 0.5, sway: 0.55, fx: { type: 'sweep', period: 5.2, mag: 0.18 } },
  ],
};

export function behaviorsFor(id) { return BEHAVIORS[id] || BEHAVIORS.nautilus; }
export function behaviorLabelFor(id, bid) { return behaviorsFor(id).find(b => b.id === bid)?.label || bid; }
