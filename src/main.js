import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SPECIES, GROUPS } from './species.js';
import { build, glowMats, loadCreature, prefetchCreature, isCached, releaseCreature, disposeCloneMaterials } from './creatures.js';
import { uniqueBehaviors, behaviorLabel } from './aliveMotion.js';
import { createEnv, habitatLabel } from './env.js';
import { createAudio } from './audio.js';
import { frameFor } from './framing.js';
import { createDiver, DIVER_HEIGHT_M } from './diver.js';
import { sizeOf } from './sizes.js';

const $ = s => document.querySelector(s), body = document.body;
const canvas = $('#c'), R = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

// Museum-style key + rim + fill
const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.35); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff6ea, 2.4); key.position.set(3.2, 5.2, 4.2); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 20;
key.shadow.camera.left = key.shadow.camera.bottom = -4; key.shadow.camera.right = key.shadow.camera.top = 4;
scene.add(key);
const rim = new THREE.DirectionalLight(0x66e0ff, 0.35); rim.position.set(-4.2, 2.2, -3.4); scene.add(rim);
const fill = new THREE.DirectionalLight(0xc8d8ff, 0.55); fill.position.set(-2.2, 1.4, 3.5); scene.add(fill);
const bounce = new THREE.DirectionalLight(0xffe0c8, 0.35); bounce.position.set(0.5, -2.5, 1.5); scene.add(bounce);

// soft ground shadow disc
const sc = document.createElement('canvas'); sc.width = sc.height = 128;
const sx = sc.getContext('2d');
const gr = sx.createRadialGradient(64, 64, 0, 64, 64, 64);
gr.addColorStop(0, 'rgba(10,20,40,.45)'); gr.addColorStop(1, 'rgba(10,20,40,0)');
sx.fillStyle = gr; sx.fillRect(0, 0, 128, 128);
const shadow = new THREE.Mesh(
  new THREE.PlaneGeometry(4.2, 1.6),
  new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.85; scene.add(shadow);

// marine snow
const N = 900, pg = new THREE.BufferGeometry(), pp = new Float32Array(N * 3), ps = new Float32Array(N);
for (let i = 0; i < N; i++) {
  pp.set([(Math.random() - .5) * 18, (Math.random() - .5) * 12, (Math.random() - .5) * 10 - 2], i * 3);
  ps[i] = Math.random();
}
pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
pg.setAttribute('seed', new THREE.BufferAttribute(ps, 1));
const pm = new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, blending: THREE.NormalBlending,
  uniforms: { t: { value: 0 }, col: { value: new THREE.Color(0x7a8aa0) }, op: { value: .5 } },
  vertexShader: `attribute float seed;uniform float t;varying float a;void main(){vec3 p=position;p.y=mod(p.y+6.-t*(.08+seed*.12),12.)-6.;p.x+=sin(t*.3+seed*20.)*.3;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=(1.5+seed*3.)*(10./-mv.z);a=.3+.7*fract(seed*7.);}`,
  fragmentShader: `uniform vec3 col;uniform float op;varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(col,(1.-d*2.)*a*op);}`
});
scene.add(new THREE.Points(pg, pm));
const stage = new THREE.Group(); scene.add(stage);

// per-species environment + sound
const audio = createAudio();
const envx = createEnv({ scene, mobile: innerWidth < 900 || /Mobi|Android|iPhone/.test(navigator.userAgent), snowMat: pm, onSplash: k => audio.splash(k) });
const LB = { hemi: hemi, key: key, hemiMul: 1, keyMul: 1, expBase: 1, hemiBase: 1.35, keyBase: 2.4 };
scene.fog = new THREE.FogExp2(0x071018, 0.045);
let lastBeh = null;
{ // sound UI (Chinese); muted until the user taps
  const btn = $('#bSound'), wrap = $('#snd'), range = $('#volR'), hint = $('#sndHint'); let ht = 0, ct = 0;
  const say = m => { hint.textContent = m; hint.classList.add('on'); clearTimeout(ht); ht = setTimeout(() => hint.classList.remove('on'), 1800); };
  audio.onChange((on, v) => {
    btn.textContent = on ? (v < .01 ? '🔈' : '🔊') : '🔇'; btn.classList.toggle('on', on); wrap.classList.toggle('on', on);
    btn.title = btn.ariaLabel = on ? '关闭声音' : '开启声音'; btn.setAttribute('aria-pressed', on); range.value = Math.round(v * 100);
  });
  btn.onclick = async () => { await audio.toggle(); say(audio.on ? `声音已开启 · 音量 ${Math.round(audio.vol * 100)}%` : '声音已关闭');
    if (audio.on) { wrap.classList.add('open'); clearTimeout(ct); ct = setTimeout(() => wrap.classList.remove('open'), 3000); } else wrap.classList.remove('open'); };
  range.oninput = () => { audio.setVolume(range.value / 100); clearTimeout(ct); ct = setTimeout(() => wrap.classList.remove('open'), 3000); };
}

// postprocessing — soft bloom (stronger in dark theme)
const composer = new EffectComposer(R);
const renderPass = new RenderPass(scene, cam);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.2, 0.4, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// detail renderer (no bloom)
const dc = $('#dc'), DR = new THREE.WebGLRenderer({ canvas: dc, antialias: true, alpha: true });
DR.setPixelRatio(2); DR.setSize(108, 108, false);
DR.outputColorSpace = THREE.SRGBColorSpace; DR.toneMapping = THREE.ACESFilmicToneMapping;
const dcam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);

let cur = null, idx = 0, rotY = -0.5, rotX = 0.12, vY = 0, dist = 9, tZoom = 0, zoom = 0, imm = false, offX = 0;
let frameDist = 9, frameFov = 35, frameAimY = 0, frameAimX = 0;
let scaleOn = false, scaleFit = null, scaleFor = '';
const diver = createDiver();
diver.visible = false;
stage.add(diver);
const _bv = new THREE.Vector3();
let loadToken = 0;
const flights = [];

const THUMB = {
  dumbo: '#f0a28c', angler: '#5a4a50', vampire: '#8a1f2c', barreleye: '#3b3f48',
  gulper: '#1c1a22', nautilus: '#c4a574', jelly: '#b8d4e8', physalia: '#4a8fd4',
  whale: '#5a6a78', turtle: '#7d8a5a', hammer: '#8e9aa6',
  great_white: '#9aa8b4', manta: '#3d7ea8', frilled_shark: '#5c4a58', oarfish: '#c45a4a',
  clownfish: '#e07a2f', seahorse: '#d4a24a', sunfish: '#8aa0b0', blobfish: '#c9a0b0',
  coelacanth: '#4a6a62', orca: '#1c1c1c', dolphin: '#7aa0b8', sperm_whale: '#6a5a58',
  leatherback: '#2a3a48', giant_squid: '#b85a4a', octopus: '#c46a4a', lionsmane: '#d4783a',
  comb_jelly: '#e8b0d8', spider_crab: '#a05030', mantis_shrimp: '#2fa87a', giant_isopod: '#8a7a68',
  starfish: '#d4783a', urchin: '#7a3a78',
};

/** '' = 全部物种；否则为 GROUPS id。点击当前科目会在组内轮换。 */
let groupFilter = '';

function groupById(id) { return GROUPS.find(g => g.id === id); }

function indicesOf(gid) {
  const out = [];
  SPECIES.forEach((s, i) => { if (!gid || s.group === gid) out.push(i); });
  return out;
}

function renderCarousel() {
  $('#carousel').innerHTML = indicesOf(groupFilter).map(i => {
    const s = SPECIES[i];
    return `<div class="card" data-i="${i}"><span class="thumb" style="--t:${THUMB[s.id] || '#8899aa'}"></span><b>${s.name}</b><i>${s.latin}</i></div>`;
  }).join('');
}

function markNav() {
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', (a.dataset.g || '') === groupFilter));
  document.querySelectorAll('#carousel .card').forEach(c => c.classList.toggle('on', +c.dataset.i === idx));
  document.querySelector('#carousel .card.on')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

/** 搜索或精选跳到别的科目时，把轮播切到该物种所在的组，避免卡片不在列表里。 */
function ensureGroup(i) {
  const g = SPECIES[i].group;
  if (groupFilter && g !== groupFilter) {
    groupFilter = g;
    renderCarousel();
  }
}

function navBuild() {
  const start = +(new URLSearchParams(location.search).get('s') || 0);
  groupFilter = SPECIES[start]?.group || GROUPS[0].id;
  const counts = {};
  SPECIES.forEach(s => { counts[s.group] = (counts[s.group] || 0) + 1; });
  $('#nav').innerHTML =
    `<a data-g="" title="全部物种"><b>全部</b><i>${SPECIES.length}</i></a>` +
    GROUPS.map(g => `<a data-g="${g.id}" title="${g.latin} · ${g.note}"><b>${g.zh}</b><i>${counts[g.id] || 0}</i></a>`).join('');
  $('#nav').onclick = e => {
    const a = e.target.closest('a'); if (!a) return;
    const g = a.dataset.g || '';
    if (g === groupFilter) {
      if (!g) return;
      const idxs = indicesOf(g);
      const pos = Math.max(0, idxs.indexOf(idx));
      select(idxs[(pos + 1) % idxs.length]);
      return;
    }
    groupFilter = g;
    renderCarousel();
    const idxs = indicesOf(g);
    if (g && idxs.length && !idxs.includes(idx)) select(idxs[0]);
    else markNav();
  };
  $('#carousel').onclick = e => { const c = e.target.closest('.card'); c && select(+c.dataset.i); };
  renderCarousel();
  const f = SPECIES[3];
  $('#featName').textContent = f.name; $('#featLatin').textContent = f.latin;
  $('#featCap').textContent = f.caption; $('#featGo').onclick = () => select(3);
}

let actionMode = 'auto'; // UI selection; applied to cur on select / chip click

function rebuildActions(speciesId) {
  const el = $('#actions');
  if (!el) return;
  const behaviors = uniqueBehaviors(speciesId);
  const chips = [
    { id: 'auto', label: '自动' },
    ...behaviors.map(b => ({ id: b.id, label: b.label || behaviorLabel(b.id, speciesId) })),
  ];
  el.innerHTML = chips.map(c =>
    `<button type="button" role="tab" data-b="${c.id}" class="${c.id === actionMode ? 'on' : ''}">${c.label}</button>`
  ).join('');
}

function applyActionMode() {
  if (!cur) return;
  const mode = cur.setMode?.(actionMode) ?? actionMode;
  // Sync chip .on (in case setMode remapped id)
  document.querySelectorAll('#actions button').forEach(b => {
    b.classList.toggle('on', b.dataset.b === (actionMode === 'auto' ? 'auto' : mode));
  });
}

$('#actions')?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-b]');
  if (!btn) return;
  actionMode = btn.dataset.b;
  document.querySelectorAll('#actions button').forEach(b => b.classList.toggle('on', b === btn));
  applyActionMode();
});

function info(s) {
  const el = $('#info'); el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  setTimeout(() => {
    const g = groupById(s.group);
    $('#fam').textContent = g ? `${g.zh} · ${s.family}` : s.family; $('#title').textContent = s.name;
    $('#latin').textContent = `${s.latin} · ${s.en}`;
    const hab = habitatLabel(s.id);
    $('#tags').innerHTML = s.tags.map(t => `<span>${t}</span>`).join('') + (hab ? `<span>${hab}</span>` : '');
    $('#desc').textContent = s.desc;
    $('#traits').innerHTML = Object.entries(s.traits).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('#dTitle').textContent = s.detail.title; $('#dText').textContent = s.detail.text;
    $('#caption').textContent = s.caption;
  }, 240);
  markNav();
}

async function select(i, instant) {
  if (cur && i === idx && !instant) return;
  idx = i;
  const s = SPECIES[i];
  ensureGroup(i);
  const token = ++loadToken;
  actionMode = 'auto';
  applyFrame(s.id, true);
  scaleFor = s.id;
  diver.visible = false;
  scaleFit = null;
  rebuildActions(s.id);
  info(s);
  envx.set(s.id, instant);
  body.classList.toggle('env-dark', !!envx.preset().dark);
  audio.setSpecies(s.id, envx.preset().amb);
  lastBeh = null;
  applyTheme();
  vY = instant ? 0 : 0.05;
  let n;
  // Loading overlay: only appears if the model isn't cached and takes >120 ms
  const cached = isCached(s.id);
  const showT = cached ? 0 : setTimeout(() => loader.show(s.name), 120);
  try {
    n = await loadCreature(s.id, f => { if (token === loadToken) loader.set(f); });
  } catch (err) {
    console.warn('loadCreature failed, procedural fallback', err);
    n = build(s.id);
  }
  clearTimeout(showT);
  if (token === loadToken) loader.hide();
  if (token !== loadToken) {
    disposeCloneMaterials(n.g);
    if (!n.g.userData.fromGlb) n.g.traverse(o => { o.geometry?.dispose(); });
    else if (isMobile() && cur?.s?.id !== s.id) releaseCreature(s.id);
    return;
  }
  if (cur) flights.push({ o: cur, t: 0, out: true });
  n.s = s;
  stage.add(n.g);
  flights.push({ o: n, t: instant ? 1 : 0, out: false });
  cur = n;
  applyActionMode();
  // Desktop only: warm the next species. Phones keep a single GLB resident.
  if (!isMobile()) {
    const nextId = SPECIES[(i + 1) % SPECIES.length].id;
    const idle = window.requestIdleCallback || (fn => setTimeout(fn, 1200));
    setTimeout(() => idle(() => { if (token === loadToken) prefetchCreature(nextId); }), 1500);
  }
}

/** Model-load progress overlay (#loader). */
const loader = (() => {
  const el = document.getElementById('loader');
  const bar = el.querySelector('.bar i'), pct = el.querySelector('.pct'), name = el.querySelector('.nm');
  let shown = false;
  return {
    show(nm) { shown = true; name.textContent = nm; this.set(0); el.classList.add('on'); el.setAttribute('aria-hidden', 'false'); },
    set(f) { const v = Math.round(Math.max(0, Math.min(1, f)) * 100); bar.style.transform = `scaleX(${v / 100})`; pct.textContent = v + '%'; el.setAttribute('aria-valuenow', v); },
    hide() { if (!shown) return; shown = false; this.set(1); setTimeout(() => { el.classList.remove('on'); el.setAttribute('aria-hidden', 'true'); }, 180); },
  };
})();

const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

function flightsStep(dt) {
  for (let k = flights.length - 1; k >= 0; k--) {
    const f = flights[k];
    f.t = Math.min(1, f.t + dt / 0.9);
    const e = ease(f.t), g = f.o.g;
    if (f.out) {
      g.scale.setScalar(Math.max(0.001, 1 - e));
      g.position.set(-e * 5, e * 1.5, -e * 3);
      g.rotation.y = e * 2;
      if (f.t >= 1) {
        stage.remove(g);
        disposeCloneMaterials(g);
        if (!g.userData.fromGlb) g.traverse(o => { o.geometry?.dispose(); });
        else if (isMobile() && f.o.s && f.o.s.id !== cur?.s?.id) releaseCreature(f.o.s.id);
        flights.splice(k, 1);
      }
    } else {
      const d = Math.max(0, (f.t - 0.25) / 0.75), e2 = ease(d);
      g.scale.setScalar(Math.max(0.001, e2));
      g.position.set((1 - e2) * 5, (1 - e2) * -1.2, (1 - e2) * -3);
      g.rotation.y = (1 - e2) * -2;
      if (f.t >= 1) flights.splice(k, 1);
    }
  }
}

function applyTheme() {
  const dark = body.classList.contains('dark');
  glowMats.forEach(m => m.emissiveIntensity = m.userData.base * (dark ? 1.5 : 0.55));
  LB.hemiBase = dark ? 0.55 : 1.35;
  LB.keyBase = dark ? 1.15 : 2.4;
  envx.setDark(dark);
  rim.intensity = dark ? 2.8 : 0.45;
  fill.intensity = dark ? 0.35 : 0.55;
  bounce.intensity = dark ? 0.15 : 0.35;
  pm.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
  pm.needsUpdate = true;
  shadow.material.opacity = dark ? .35 : 1;
  LB.expBase = dark ? 1.15 : 1.02;
  scene.traverse(o => { if (o.isPointLight) o.intensity = dark ? 3 : 1; });
  // fog + bloom
  if (dark) {
    bloomBase.strength = 0.45;
    bloom.strength = isMobile() ? bloomBase.strength * bloomBase.mobileScale : bloomBase.strength;
    bloom.threshold = 0.85;
    bloom.radius = 0.45;
  } else {
    bloomBase.strength = 0.12;
    bloom.strength = isMobile() ? bloomBase.strength * bloomBase.mobileScale : bloomBase.strength;
    bloom.threshold = 0.92;
    bloom.radius = 0.35;
  }
  body.classList.toggle('loading', false);
}

$('#theme').onclick = () => {
  body.classList.toggle('dark'); body.classList.toggle('light');
  applyTheme(); localStorage.oaTheme = body.classList.contains('dark') ? 'dark' : 'light';
};

// orbit
let drag = null; const ptrs = new Map(); let pinch0 = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, e);
  if (ptrs.size === 1) { drag = { x: e.clientX, y: e.clientY }; canvas.classList.add('drag'); }
  else pinch0 = pdist();
});
canvas.addEventListener('pointermove', e => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, e);
  if (ptrs.size === 2) { const d = pdist(); zoomBy((pinch0 - d) * 0.02); pinch0 = d; return; }
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    rotY += dx * 0.008; vY = dx * 0.008;
    rotX = Math.max(-0.7, Math.min(0.9, rotX + dy * 0.005));
    drag = { x: e.clientX, y: e.clientY };
  }
});
const upPtr = e => { ptrs.delete(e.pointerId); if (!ptrs.size) { drag = null; canvas.classList.remove('drag'); } };
canvas.addEventListener('pointerup', upPtr); canvas.addEventListener('pointercancel', upPtr);
const pdist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); };
addEventListener('wheel', e => {
  if (e.target.closest('#right,#left,#carousel,#actions')) return;
  e.preventDefault(); zoomBy(e.deltaY * 0.004);
}, { passive: false });
function zoomBy(d) { tZoom = Math.max(-4.8, Math.min(8, tZoom + d)); setImm(tZoom < -2.2); }
function setImm(v) { if (v === imm) return; imm = v; body.classList.toggle('imm', v); }
$('#bZoom').onclick = () => { tZoom = imm ? 0 : -3.4; setImm(!imm); };
$('#bReset').onclick = () => {
  const f = frameFor(cur?.s?.id);
  rotY = f.yaw; rotX = f.pitch; vY = 0; tZoom = 0; setImm(false);
};
addEventListener('keydown', e => {
  if (e.key === 'Escape') $('#bReset').onclick();
  if (e.target.tagName !== 'INPUT') {
    if (e.key === 'ArrowRight') select((idx + 1) % SPECIES.length);
    if (e.key === 'ArrowLeft') select((idx + SPECIES.length - 1) % SPECIES.length);
  }
});

// search
const q = $('#q'), res = $('#results');
const match = v => SPECIES.map((s, i) => [s, i]).filter(([s]) => {
  const g = groupById(s.group);
  const hay = (s.name + s.latin + s.en + s.nav + s.tags.join('') + (g ? g.zh + g.note : '')).toLowerCase();
  return v && hay.includes(v.toLowerCase());
});
q.oninput = () => {
  const m = match(q.value.trim());
  res.style.display = m.length ? 'block' : 'none';
  res.innerHTML = m.map(([s, i]) => `<div data-i="${i}">${s.name}<i>${s.latin}</i></div>`).join('');
};
res.onclick = e => {
  const d = e.target.closest('div[data-i]');
  if (d) { select(+d.dataset.i); res.style.display = 'none'; q.value = ''; }
};
q.onkeydown = e => {
  if (e.key === 'Enter') {
    const m = match(q.value.trim());
    if (m[0]) { select(m[0][1]); res.style.display = 'none'; q.value = ''; q.blur(); }
  }
};
$('#bSearch').onclick = () => { setImm(false); tZoom = Math.max(tZoom, 0); if (isMobile()) body.classList.add('sheet-open'); q.focus(); };

const MQ_MOBILE = matchMedia('(max-width:820px)');
const DEG_DESK = '360° 拖动旋转 · 滚轮缩放';
const DEG_MOB = '单指拖动旋转 · 双指缩放';
const HINT_DESK = '滚轮 / 双指缩小以退出沉浸模式';
const HINT_MOB = '双指缩小以退出沉浸模式';
let bloomBase = { strength: 0.2, mobileScale: 0.75 };

function isMobile() {
  return innerWidth <= 820
    || screen.width <= 820
    || matchMedia('(max-width:820px)').matches
    || matchMedia('(hover:none) and (pointer:coarse) and (max-width:1024px)').matches;
}

function syncMobileChrome() {
  const mob = isMobile();
  const wasMob = body.classList.contains('mobile');
  body.classList.toggle('mobile', mob);
  if (!mob) {
    body.classList.remove('nav-open', 'sheet-open');
  } else if (!wasMob) {
    // entering mobile — keep sheet collapsed
    body.classList.remove('sheet-open');
  }
  const deg = $('#degTxt'), hint = $('#hint');
  if (deg) deg.textContent = mob ? DEG_MOB : DEG_DESK;
  if (hint) hint.textContent = mob ? HINT_MOB : HINT_DESK;
}

function closeNav() { body.classList.remove('nav-open'); }

function resize() {
  const w = innerWidth, h = innerHeight;
  const mob = isMobile();
  const pr = mob
    ? Math.min(devicePixelRatio, w < 480 ? 1.25 : 1.5)
    : Math.min(devicePixelRatio, 2);
  R.setPixelRatio(pr);
  DR.setPixelRatio(Math.min(pr, 1.5));
  R.setSize(w, h, false);
  cam.aspect = w / h; cam.updateProjectionMatrix();
  composer.setSize(w, h);
  bloom.setSize(w, h);
  // soften bloom a bit on phones
  if (mob) bloom.strength = bloomBase.strength * bloomBase.mobileScale;
  else bloom.strength = bloomBase.strength;
  syncMobileChrome();
}
addEventListener('resize', resize);
MQ_MOBILE.addEventListener?.('change', resize);
matchMedia('(hover:none) and (pointer:coarse) and (max-width:1024px)').addEventListener?.('change', resize);
resize();

// mobile menu + bottom sheet
const menuBtn = $('#menuBtn'), backdrop = $('#backdrop'), sheetHandle = $('#sheetHandle');
menuBtn?.addEventListener('click', () => {
  body.classList.toggle('nav-open');
  if (body.classList.contains('nav-open')) {
    body.classList.remove('sheet-open');
    setImm(false);
  }
});
backdrop?.addEventListener('click', closeNav);
sheetHandle?.addEventListener('click', () => {
  body.classList.toggle('sheet-open');
  if (body.classList.contains('sheet-open')) closeNav();
});
// close drawer after nav pick on mobile
$('#nav')?.addEventListener('click', () => { if (isMobile()) closeNav(); });
$('#featGo')?.addEventListener('click', () => { if (isMobile()) closeNav(); });

let holdView = 0, viewDist = 0, lookY = 0, aimY = 0, camY = 0, frameY = 0;

function applyFrame(id, resetOrbit) {
  const f = frameFor(id);
  frameDist = f.dist;
  frameFov = f.fov;
  frameAimY = f.aimY || 0;
  frameAimX = f.aimX || 0;
  if (resetOrbit) {
    rotY = f.yaw;
    rotX = f.pitch;
    vY = 0;
    tZoom = 0;
    setImm(false);
  }
}

/** Species bbox in stage-local space (bind pose). */
function stageBox(obj) {
  const box = new THREE.Box3();
  obj.updateWorldMatrix(true, true);
  const world = new THREE.Box3().setFromObject(obj);
  if (world.isEmpty()) return box;
  const inv = stage.matrixWorld.clone().invert();
  const { min, max } = world;
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        _bv.set(x, y, z).applyMatrix4(inv);
        if (Number.isFinite(_bv.x) && Number.isFinite(_bv.y) && Number.isFinite(_bv.z)) box.expandByPoint(_bv);
      }
    }
  }
  return box;
}

function layoutScale() {
  if (!scaleOn || !cur?.g) { diver.visible = false; scaleFit = null; return; }
  cur.g.position.x = 0;
  cur.g.updateMatrixWorld(true);
  const box = stageBox(cur.g);
  if (box.isEmpty()) { diver.visible = false; scaleFit = null; return; }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const spec = sizeOf(cur.s.id);
  const worldLen = Math.max(size.x, size.y, size.z, 1e-4);
  const unitsPerM = worldLen / spec.lengthMeters;
  const diverH = DIVER_HEIGHT_M * unitsPerM;
  const halfW = diverH * 0.22;
  // Clear water between the animal's bbox and the diver, including long bodies seen at an angle.
  const gap = Math.max(worldLen * 0.18, diverH * 0.15, 0.22);
  const x = center.x + size.x / 2 + halfW + gap;
  const minX = Math.min(box.min.x, x - halfW);
  const maxX = Math.max(box.max.x, x + halfW);
  const minY = Math.min(box.min.y, center.y - diverH / 2);
  const maxY = Math.max(box.max.y, center.y + diverH / 2);
  const minZ = Math.min(box.min.z, center.z - diverH * 0.14);
  const maxZ = Math.max(box.max.z, center.z + diverH * 0.14);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const hx = Math.max((maxX - minX) / 2, (maxZ - minZ) / 2);
  const hy = (maxY - minY) / 2;
  const hz = (maxZ - minZ) / 2;
  diver.scale.setScalar(unitsPerM);
  diver.position.set(x - cx, center.y, center.z);
  diver.userData.baseY = center.y;
  diver.userData.h = diverH;
  diver.visible = true;
  if (cur.g.position.x !== -cx) cur.g.position.x = -cx;
  diver.quaternion.copy(stage.quaternion).invert();
  const fov = 32;
  const aspect = Math.max(0.55, cam.aspect || 1.4);
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov / 2));
  const tanH = tanV * aspect;
  const pad = isMobile() ? 1.62 : 1.32;
  const distV = (hy * pad) / tanV;
  const distH = (hx * pad) / tanH;
  scaleFit = { dist: Math.max(distV, distH) + hz * 0.35, fov, aimX: 0, aimY: cy + 0.1, shiftX: cx, id: cur.s.id };
  // Snap — a slow lerp leaves tiny species as a cropped giant diver for several frames.
  dist = scaleFit.dist;
  zoom = 0;
  tZoom = 0;
  cam.fov = fov;
  cam.far = Math.max(140, dist * 8);
  cam.updateProjectionMatrix();
  mobFrame.d = 0;
  mobFrame.cy = 0;
}

function clearScaleShift() {
  if (cur?.g) cur.g.position.x = 0;
  diver.visible = false;
  scaleFit = null;
  dist = frameDist;
  cam.fov = frameFov;
  cam.updateProjectionMatrix();
}

{ // 比例对比：1.75 m 潜水员与当前物种并排
  const btn = document.getElementById('bScale');
  const hint = document.getElementById('scaleHint');
  btn?.addEventListener('click', () => {
    scaleOn = !scaleOn;
    btn.classList.toggle('on', scaleOn);
    btn.setAttribute('aria-pressed', String(scaleOn));
    btn.title = scaleOn ? '关闭比例对比' : '比例对比';
    tZoom = 0;
    if (!scaleOn) clearScaleShift();
    else if (cur && cur.s.id === scaleFor && !flights.some(f => f.o === cur)) layoutScale();
    if (hint) {
      const spec = cur && sizeOf(cur.s.id);
      hint.textContent = scaleOn && spec
        ? `比例对比 · 潜水员 ${DIVER_HEIGHT_M.toFixed(2)} 米 · ${cur.s.name}${spec.measure} ${formatMeters(spec.lengthMeters)}`
        : '';
      hint.classList.toggle('on', scaleOn);
    }
  });
}
function formatMeters(m) {
  if (m >= 1) return `${Number(m.toFixed(m >= 10 ? 0 : 1))} 米`;
  return `${Math.round(m * 100)} 厘米`;
}
/**
 * Phones: the free stage is the strip between the species carousel and the behaviour tabs, not the
 * whole canvas. Centre the scene in that strip (view-offset) and pull back so a ~3.4-unit creature
 * fits inside it. Recomputed from live DOM rects (sheet open/close, rotation) and applied unsmoothed
 * so the very first frame is already framed.
 */
const mobFrame = { y: 0, d: 0, cy: 0, at: -1, cur: null, key: '' };
function measureMobileStage() {
  if (!body.classList.contains('mobile')) { mobFrame.y = 0; mobFrame.d = 0; mobFrame.cy = 0; return; }
  const w = innerWidth, h = innerHeight;
  const top = ($('#carousel')?.getBoundingClientRect().bottom || 0) + 10;
  const tabs = $('#actions')?.getBoundingClientRect();
  const bot = (tabs && tabs.height ? tabs.top : h * 0.55) - 10;
  const sh = Math.max(120, bot - top), sw = w - 2 * 12;            // stage strip with small side margins
  const key = [cur?.s?.id, w, h, Math.round(sh)].join();
  mobFrame.y = h / 2 - (top + bot) / 2;
  if (scaleOn && scaleFit) { mobFrame.d = 0; mobFrame.cy = 0; mobFrame.key = key + ':scale'; return; }
  if (key === mobFrame.key) return;
  mobFrame.key = key;
  const f = cur?.fit;
  if (!f?.pts?.length) { mobFrame.d = 0; mobFrame.cy = 0; return; }
  // Exact fit of the motion envelope: the stage spins freely about Y, so test every yaw. For a point
  // (x,y,z) seen from distance D on +Z: |x|/(D-z) <= tanH and |y-cy|/(D-z) <= tanV  =>  D >= z + max(..)
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
  const tanV = tanHalf * (sh / h) * 0.94, tanH = tanHalf * cam.aspect * (sw / w) * 0.94;
  const P = f.pts, pad = 1 + (f.pad || 0);
  let y0 = Infinity, y1 = -Infinity;
  for (let i = 1; i < P.length; i += 3) { y0 = Math.min(y0, P[i]); y1 = Math.max(y1, P[i]); }
  const cy = (y0 + y1) / 2;
  let D = 0;
  const YAWS = 16;
  for (let a = 0; a < YAWS; a++) {
    const c = Math.cos(a / YAWS * Math.PI * 2), sn = Math.sin(a / YAWS * Math.PI * 2);
    for (let i = 0; i < P.length; i += 3) {
      const x = (P[i] * c + P[i + 2] * sn) * pad, z = (-P[i] * sn + P[i + 2] * c) * pad, y = (P[i + 1] - cy) * pad;
      const need = z + Math.max(Math.abs(x) / tanH, Math.abs(y) / tanV);
      if (need > D) D = need;
    }
  }
  mobFrame.d = D - frameDist;              // relative to this species' resting distance
  mobFrame.cy = cy;
}
if (new URLSearchParams(location.search).has('debug')) window.__oa = {};
let last = performance.now(), T0 = last; let fr = 0; const tmp = new THREE.Vector3();
function loop() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05), t = (now - T0) / 1000;
  last = now; fr++;
  const settled = cur && !flights.some(f => f.o === cur);
  if (scaleOn && settled && cur.s.id === scaleFor && scaleFit?.id !== cur.s.id) layoutScale();
  if (scaleOn && settled && scaleFit && cur.g.position.x !== -scaleFit.shiftX) cur.g.position.x = -scaleFit.shiftX;
  if (diver.visible) {
    const bob = Math.sin(t * 1.25) * Math.min(0.06, (diver.userData.h || 1) * 0.03);
    diver.position.y = (diver.userData.baseY || 0) + bob;
  }
  // per-behaviour camera hint — paused while the diver comparison owns the frame
  const vw = !scaleOn && settled ? cur.view?.() : null;
  if (drag) holdView = now + 2500;
  const steer = vw && now > holdView;
  if (!drag) {
    vY *= 0.94;
    if (scaleOn && scaleFit) {
      vY = 0;
      rotY += (0.42 - rotY) * 0.22;
      rotX += (0.06 - rotX) * 0.22;
    } else rotY += vY + (steer && vw.yaw != null ? 0 : dt * 0.08);
  }
  if (steer && vw.yaw != null) { const tgt = vw.yaw + Math.PI * 2 * Math.round((rotY - vw.yaw) / (Math.PI * 2)); rotY += (tgt - rotY) * (1 - Math.exp(-dt * (vw.yawK || 2.4))); }  // frame-rate independent
  if (steer && vw.pitch != null) rotX += (vw.pitch - rotX) * 0.04;
  if (window.__oa) { window.__oa.rotY = rotY; window.__oa.steer = !!(steer && vw.yaw != null); if (window.__oa.setYaw != null) { rotY = window.__oa.setYaw; vY = 0; } }
  const mob = innerWidth < 900; // mobile: stage is the upper part of the screen, so pull back more and aim lower
  viewDist += (((vw && (mob && vw.mobDist != null ? vw.mobDist : vw.dist)) || 0) * (mob && vw?.dist > 0 ? 1.6 : 1) - viewDist) * 0.05; const wantY = vw && vw.track && cur.trackY ? cur.trackY() * 0.9 + (mob ? -1.0 : 0) : ((vw && vw.lookY) || 0) * (mob ? -0.6 : 1);
  lookY += (wantY - lookY) * (vw && vw.track ? 0.12 : 0.05);
  const wantAim = (vw && vw.aimY != null) ? vw.aimY : lookY;
  const wantCam = (vw && vw.camY != null) ? vw.camY : lookY;
  aimY += (wantAim - aimY) * 0.05;
  camY += (wantCam - camY) * 0.05;
  const wantFrame = (vw && vw.frameY) || 0;
  frameY += (wantFrame - frameY) * 0.06;
  if (fr - mobFrame.at > 20 || mobFrame.at < 0 || mobFrame.cur !== cur) { measureMobileStage(); mobFrame.at = fr; mobFrame.cur = cur; }
  if (scaleOn && scaleFit) { mobFrame.d = 0; mobFrame.cy = 0; }
  stage.rotation.set(rotX * 0.5, rotY, 0);
  if (diver.visible) diver.quaternion.copy(stage.quaternion).invert();
  const useScale = !!(scaleOn && scaleFit && settled);
  const baseDist = useScale ? scaleFit.dist : frameDist;
  const baseFov = useScale ? scaleFit.fov : frameFov;
  const baseAimX = useScale ? scaleFit.aimX : frameAimX;
  const baseAimY = useScale ? scaleFit.aimY : frameAimY;
  zoom += (tZoom - zoom) * 0.08;
  const distTarget = baseDist + zoom;
  if (useScale && Math.abs(dist - distTarget) > Math.max(1.2, distTarget * 0.12)) dist = distTarget;
  else dist += (distTarget - dist) * 0.08;
  if (Math.abs(cam.fov - baseFov) > 0.02) {
    cam.fov += (baseFov - cam.fov) * 0.08;
    cam.updateProjectionMatrix();
  }
  const far = Math.max(140, dist * 8);
  if (cam.far !== far) { cam.far = far; cam.updateProjectionMatrix(); }
  const w = innerWidth, h = innerHeight, target = imm || w < 900 ? 0 : (270 - 378) / 2;
  offX += (target - offX) * 0.08;
  cam.setViewOffset(w, h, -offX, frameY + mobFrame.y, w, h);
  const camYpos = 0.6 + rotX * 2.5 + camY + mobFrame.cy;
  const lookYpos = -0.1 + (useScale ? 0 : aimY) + baseAimY + mobFrame.cy;
  cam.position.set(baseAimX, useScale ? lookYpos : camYpos, dist + (useScale ? 0 : viewDist) + mobFrame.d);
  cam.lookAt(baseAimX, lookYpos, 0);
  flightsStep(dt);
  flights.forEach(f => f.o.up(t, dt));
  if (cur && !flights.some(f => f.o === cur)) cur.up(t, dt);
  if (scaleOn && scaleFit && cur?.g) cur.g.position.x = -scaleFit.shiftX;
  pm.uniforms.t.value = t;
  const beh = cur && !flights.some(f => f.o === cur) ? cur.active?.() : null;
  envx.update(t, dt, { beh, cur, lights: LB, fog: scene.fog, renderer: R });
  hemi.intensity = LB.hemiBase * LB.hemiMul / 1.3; key.intensity = LB.keyBase * LB.keyMul;
  if (beh && beh !== lastBeh) { if (lastBeh !== null || actionMode !== 'auto') audio.behavior(cur.s.id, beh); lastBeh = beh; }
  if (useScale && scene.fog?.isFogExp2) {
    const thin = Math.min(1, (frameDist || 9) / Math.max(dist, 0.5));
    scene.fog.density *= thin;
  }
  if (window.__oa) {
    window.__oa.beh = beh; window.__oa.env = envx.id; window.__oa.audio = audio; window.__oa.emit = envx.emit; window.__oa.trackY = cur?.trackY?.();
    let meshes = 0;
    cur?.g?.traverse(o => { if (o.isMesh) meshes++; });
    window.__oa.scale = {
      on: scaleOn, settled, forId: scaleFor, sid: cur?.s?.id, flights: flights.length, meshes,
      fit: scaleFit && { dist: +scaleFit.dist.toFixed(2), aimY: +scaleFit.aimY.toFixed(2), shiftX: +scaleFit.shiftX.toFixed(2), id: scaleFit.id },
      diver: { v: diver.visible, s: +diver.scale.x.toFixed(3), p: diver.position.toArray().map(n => +n.toFixed(2)), h: +(diver.userData.h || 0).toFixed(2) },
      cam: { p: cam.position.toArray().map(n => +n.toFixed(2)), fov: +cam.fov.toFixed(1), far: +cam.far.toFixed(0) },
      gx: cur?.g && +cur.g.position.x.toFixed(2),
    };
  }
  $('#dot').style.transform = `translate(${Math.sin(rotY) * 10}px,${-Math.cos(rotY) * 10}px)`;
  composer.render();
  if (cur && fr % 2 === 0) {
    const p = cur.s.detail.pt; tmp.set(...p);
    cur.raw.localToWorld(tmp);
    const dir = tmp.clone().normalize();
    if (dir.lengthSq() < .01) dir.set(0, 0, 1);
    dir.z = Math.abs(dir.z) + 0.6; dir.normalize();
    dcam.position.copy(tmp).addScaledVector(dir, 1.4); dcam.lookAt(tmp);
    shadow.visible = false; DR.render(scene, dcam); shadow.visible = true;
  }
  requestAnimationFrame(loop);
}

// default theme: light (HTML body.light). Restore dark only if user chose it.
if (localStorage.oaTheme?.includes('dark')) { body.classList.add('dark'); body.classList.remove('light'); }
else { body.classList.add('light'); body.classList.remove('dark'); }
const hp = new URLSearchParams(location.search);
if (hp.get('theme') === 'dark') { body.classList.add('dark'); body.classList.remove('light'); }
if (hp.get('theme') === 'light') { body.classList.add('light'); body.classList.remove('dark'); }
syncMobileChrome();
applyTheme();
navBuild();
select(+(hp.get('s') || 0), true).then(() => {
  if (hp.get('imm')) { tZoom = -4.4; setImm(true); }
});
loop();
