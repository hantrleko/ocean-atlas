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
    { id: 'gape', label: '张口吞网', hold: 5, pose: [-0.15, 0, 0], amp: 0.7, freq: 0.8, bob: 0.6, sway: 0.6, fx: { type: 'gape', period: 2.8, mag: 0.35 } },
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
};

export function behaviorsFor(id) { return BEHAVIORS[id] || BEHAVIORS.nautilus; }
export function behaviorLabelFor(id, bid) { return behaviorsFor(id).find(b => b.id === bid)?.label || bid; }
