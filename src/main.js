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
import { behaviorCaption } from './behaviors.js';
import { frameFor, distToContain } from './framing.js';
import { createDiver, DIVER_HEIGHT_M } from './diver.js';
import { sizeOf } from './sizes.js';
import { ACTS, actOf, actIndex, nextAct, flagshipOf, lineOf, wingMembers, isGuest, pairOf, stingOf, seasonAmbFor, SEASON } from './journey.js';
import { loadPassport, markVisit, allWingsSeen, markSeason, passportSummary } from './passport.js';

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
const standIn = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.78, 1),
  new THREE.MeshStandardMaterial({
    color: 0x8fb4c8, emissive: 0x1a4a5a, emissiveIntensity: 0.55,
    transparent: true, opacity: 0.38, roughness: 0.4, depthWrite: false,
  })
);
standIn.visible = false;
standIn.name = 'stand-in';
stage.add(standIn);
const detailFill = new THREE.PointLight(0xfff6ea, 0, 8, 1.5);
detailFill.visible = false;
scene.add(detailFill);
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

/** 浏览方式：journey 策展路径（默认）/ all 全部 / group 科目索引。 */
let browse = 'journey';
let actId = ACTS[0].id;
/** '' = 全部物种；否则为 GROUPS id。只在 browse === 'group' 时过滤轮播。 */
let groupFilter = '';
/** 切换物种时把机位缓缓走到下一件展柜，而不是瞬移。 */
let easeY = null, easeX = null, easeT = 0;

function groupById(id) { return GROUPS.find(g => g.id === id); }

function indicesOf(gid) {
  const out = [];
  SPECIES.forEach((s, i) => { if (!gid || s.group === gid) out.push(i); });
  return out;
}

function visibleIndices() {
  if (browse === 'all') return SPECIES.map((_, i) => i);
  if (browse === 'group') return indicesOf(groupFilter);
  const act = ACTS.find(a => a.id === actId) || ACTS[0];
  return wingMembers(act).map(id => SPECIES.findIndex(s => s.id === id)).filter(i => i >= 0);
}

function renderCarousel() {
  const journey = browse === 'journey';
  const act = ACTS.find(a => a.id === actId);
  const pass = loadPassport();
  $('#carousel').innerHTML = visibleIndices().map(i => {
    const s = SPECIES[i];
    const flag = flagshipOf(s.id);
    const flagCls = journey && flag ? ' flag' : '';
    const seenCls = flag ? (pass.flagships[s.id] ? ' seen' : ' unseen') : '';
    const guest = journey && isGuest(act, s.id);
    const guestCls = guest ? ' guest' : '';
    const sub = guest ? `${s.latin} · 借展` : s.latin;
    return `<div class="card${flagCls}${seenCls}${guestCls}" data-i="${i}"><span class="thumb" style="--t:${THUMB[s.id] || '#8899aa'}"></span><b>${s.name}</b><i>${sub}</i></div>`;
  }).join('');
  paintSeals();
}

function markNav() {
  document.querySelectorAll('#acts button').forEach(b => b.classList.toggle('on', browse === 'journey' && b.dataset.act === actId));
  document.querySelectorAll('#nav a').forEach(a => {
    const g = a.dataset.g || '';
    const on = browse === 'all' ? g === '' : browse === 'group' && g === groupFilter;
    a.classList.toggle('on', on);
  });
  document.querySelectorAll('#carousel .card').forEach(c => c.classList.toggle('on', +c.dataset.i === idx));
  document.querySelector('#carousel .card.on')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

/** 搜索跳到当前列表之外时，留在同一种浏览方式里，只把过滤切到那一件所在的展区或科目。 */
function focusSpecies(i) {
  const s = SPECIES[i];
  if (browse === 'journey') {
    const act = ACTS.find(a => a.id === actId);
    if (!act || !wingMembers(act).includes(s.id)) { actId = actOf(s.id).id; renderCarousel(); }
  } else if (browse === 'group' && s.group !== groupFilter) {
    groupFilter = s.group;
    renderCarousel();
  }
}

function stepVisible(d) {
  const idxs = visibleIndices();
  if (!idxs.length) return;
  const pos = Math.max(0, idxs.indexOf(idx));
  select(idxs[(pos + d + idxs.length) % idxs.length]);
}

function goAct(id) {
  browse = 'journey';
  actId = id;
  const leadId = (ACTS.find(a => a.id === id) || ACTS[0]).lead;
  const lead = Math.max(0, SPECIES.findIndex(s => s.id === leadId));
  renderCarousel();
  if (lead !== idx) select(lead);
  else { markNav(); paintWing(); updateFeat(); }
}

function backToJourney() {
  browse = 'journey';
  actId = actOf(SPECIES[idx]?.id).id;
  renderCarousel();
  markNav();
  paintWing();
  updateFeat();
}

function navBuild() {
  const counts = {};
  SPECIES.forEach(s => { counts[s.group] = (counts[s.group] || 0) + 1; });
  $('#acts').innerHTML = ACTS.map((a, n) =>
    `<button type="button" data-act="${a.id}"><b>${a.title}</b><i>${String(n + 1).padStart(2, '0')}</i></button>`
  ).join('');
  $('#nav').innerHTML =
    `<a data-g="" title="全部物种"><b>全部</b><i>${SPECIES.length}</i></a>` +
    GROUPS.map(g => `<a data-g="${g.id}" title="${g.latin} · ${g.note}"><b>${g.zh}</b><i>${counts[g.id] || 0}</i></a>`).join('');
  $('#acts').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const id = b.dataset.act;
    if (browse === 'journey' && id === actId) { stepVisible(1); return; }
    goAct(id);
  };
  $('#nav').onclick = e => {
    const a = e.target.closest('a'); if (!a) return;
    const g = a.dataset.g || '';
    if (!g) {
      if (browse === 'all') return;
      browse = 'all';
      groupFilter = '';
      renderCarousel();
      markNav();
      paintWing();
      updateFeat();
      return;
    }
    if (browse === 'group' && g === groupFilter) { stepVisible(1); return; }
    browse = 'group';
    groupFilter = g;
    renderCarousel();
    const idxs = visibleIndices();
    if (idxs.length && !idxs.includes(idx)) select(idxs[0]);
    else { markNav(); paintWing(); updateFeat(); }
  };
  $('#carousel').onclick = e => { const c = e.target.closest('.card'); c && select(+c.dataset.i); };
  $('#wingCont')?.addEventListener('click', () => {
    if (browse !== 'journey') { backToJourney(); return; }
    const idxs = visibleIndices();
    const pos = idxs.indexOf(idx);
    if (pos >= 0 && pos < idxs.length - 1) select(idxs[pos + 1]);
    else goAct(nextAct(actId).id);
  });
  $('#wingNext')?.addEventListener('click', () => {
    if (browse !== 'journey') { backToJourney(); return; }
    goAct(nextAct(actId).id);
  });
  $('#season')?.addEventListener('click', e => {
    if (e.target.closest('[data-trailer]')) { openTrailer(); return; }
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    const id = b.dataset.id;
    const act = b.dataset.act;
    const i = SPECIES.findIndex(s => s.id === id);
    if (i < 0) return;
    browse = 'journey';
    if (ACTS.some(a => a.id === act)) actId = act;
    markSeason();
    renderCarousel();
    select(i);
    if (isMobile()) closeNav();
  });
  renderCarousel();
  paintWing();
  updateFeat();
  paintSeason();
}

function paintSeals() {
  const p = loadPassport();
  document.querySelectorAll('#acts button').forEach(b => b.classList.toggle('seen', !!p.wings[b.dataset.act]));
  document.querySelectorAll('#carousel .card').forEach(c => {
    const s = SPECIES[+c.dataset.i];
    const flag = s && flagshipOf(s.id);
    c.classList.toggle('unseen', !!(flag && !p.flagships[s.id]));
    c.classList.toggle('seen', !!(flag && p.flagships[s.id]));
  });
  const seal = $('#wingSeal');
  if (seal) seal.hidden = !(browse === 'journey' && p.wings[actId]);
}

function paintSeason() {
  const el = $('#season');
  if (!el) return;
  const dots = SEASON.stops.map(stop => {
    const s = SPECIES.find(x => x.id === stop.id);
    if (!s) return '';
    const on = browse === 'journey' && actId === stop.act && SPECIES[idx]?.id === stop.id;
    const guest = isGuest(ACTS.find(a => a.id === stop.act), stop.id);
    return `<button type="button" data-act="${stop.act}" data-id="${stop.id}" class="${on ? 'on' : ''}">${s.name}${guest ? ' · 借' : ''}</button>`;
  }).join('<span class="season-dot" aria-hidden="true">·</span>');
  const trailer = trailerReady
    ? `<button type="button" class="season-trailer" data-trailer="1">本季预告</button>`
    : '';
  el.innerHTML = `<span class="season-k">${SEASON.kicker}</span><b>${SEASON.title}</b>${trailer}<span class="season-stops">${dots}</span>`;
}

function paintWing() {
  paintSeason();
  paintSeals();
  const kicker = $('#wingKicker'), title = $('#wingTitle'), copy = $('#wingCopy');
  const cont = $('#wingCont'), next = $('#wingNext');
  if (!kicker || !title || !copy) return;
  if (browse === 'journey') {
    const act = ACTS.find(a => a.id === actId) || ACTS[0];
    const n = actIndex(act.id);
    const nxt = nextAct(act.id);
    const idxs = visibleIndices();
    const atEnd = idxs.length > 0 && idxs[idxs.length - 1] === idx;
    const pos = idxs.indexOf(idx);
    const nextSpecies = pos >= 0 ? SPECIES[idxs[pos + 1]] : null;
    const partner = pairOf(SPECIES[idx]?.id);
    const nudge = !atEnd && partner && nextSpecies?.id === partner.id;
    kicker.textContent = `${act.kicker} · ${String(n + 1).padStart(2, '0')} / ${String(ACTS.length).padStart(2, '0')}`;
    title.textContent = act.title;
    copy.textContent = act.copy;
    const seal = $('#wingSeal');
    if (seal) seal.hidden = !loadPassport().wings[act.id];
    if (cont) {
      cont.hidden = false;
      cont.textContent = atEnd ? `前往${nxt.title}` : (nudge ? `对看 · ${partner.label}` : '继续');
      cont.title = atEnd ? `进入${nxt.title}` : (nudge ? partner.note : '本展区下一件');
    }
    if (next) {
      next.hidden = false;
      next.textContent = n === ACTS.length - 1 ? `回到${nxt.title}` : '下一展区';
    }
    return;
  }
  if (cont) cont.hidden = true;
  if (next) { next.hidden = false; next.textContent = '回到策展'; }
  if (browse === 'group') {
    const g = groupById(groupFilter);
    kicker.textContent = '科目索引';
    title.textContent = g ? g.zh : '科目';
    copy.textContent = g ? `${g.note}。这一组按分类排在一起，策展路径仍可随时回去。` : '';
    return;
  }
  kicker.textContent = '全部馆藏';
  title.textContent = '三十三件';
  copy.textContent = '全部物种按你自己的顺序摊开。想跟着灯走，就回到策展路径。';
}

function updateFeat() {
  const act = browse === 'journey'
    ? (ACTS.find(a => a.id === actId) || ACTS[0])
    : actOf(SPECIES[idx]?.id);
  const lead = SPECIES.find(s => s.id === act.lead) || SPECIES[0];
  const onLead = browse === 'journey' && SPECIES[idx]?.id === lead.id;
  const portal = onLead ? 'next' : (browse === 'journey' ? 'lead' : 'enter');
  $('#featKicker').textContent = browse === 'journey' ? '本展区专题 · FEATURED' : '策展入口 · FEATURED';
  $('#featName').textContent = act.title;
  $('#featLatin').textContent = `${lead.name} · ${lead.latin}`;
  $('#featCap').textContent = act.copy;
  const nxt = nextAct(act.id);
  $('#featGo').textContent = portal === 'next'
    ? (actIndex(act.id) === ACTS.length - 1 ? `回到${nxt.title}` : '下一展区 →')
    : (browse === 'journey' ? '进入专题 →' : '进入该展区 →');
  $('#featGo').onclick = () => {
    if (portal === 'next') goAct(nxt.id);
    else if (portal === 'lead') {
      const i = SPECIES.findIndex(s => s.id === lead.id);
      if (i >= 0) select(i);
    } else goAct(act.id);
  };
}

let invalidDeepLink = '';

function indexFromSearch(hp) {
  const id = hp.get('id');
  if (id) {
    const i = SPECIES.findIndex(s => s.id === id);
    if (i >= 0) return i;
    invalidDeepLink = id.length > 32 ? `${id.slice(0, 32)}…` : id;
  }
  const s = hp.get('s');
  if (s != null && s !== '') {
    const n = +s;
    if (Number.isFinite(n)) return Math.min(SPECIES.length - 1, Math.max(0, n));
  }
  const lead = SPECIES.findIndex(s => s.id === ACTS[0].lead);
  return lead >= 0 ? lead : 0;
}

function actFromSearch(hp, speciesIndex) {
  const id = SPECIES[speciesIndex]?.id;
  const wing = hp.get('wing');
  if (id && wing) {
    const act = ACTS.find(a => a.id === wing);
    if (act && wingMembers(act).includes(id)) return act.id;
  }
  return actOf(id).id;
}

function syncTitle(s) {
  const line = lineOf(s);
  document.title = `${s.name} · ${line} · 深海图鉴`;
  const md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', `${s.name}（${s.latin}）：${line}`);
}

function writeDeepLink(id) {
  const url = new URL(location.href);
  const act = ACTS.find(a => a.id === actId);
  const guest = browse === 'journey' && isGuest(act, id);
  const sameId = url.searchParams.get('id') === id && !url.searchParams.has('s');
  const sameWing = guest ? url.searchParams.get('wing') === actId : !url.searchParams.has('wing');
  if (sameId && sameWing) return;
  url.searchParams.set('id', id);
  url.searchParams.delete('s');
  if (guest) url.searchParams.set('wing', actId);
  else url.searchParams.delete('wing');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}

function syncCaption(species = cur?.s) {
  const el = $('#caption');
  if (!el || !species) return;
  let beh = null;
  if (cur?.s?.id === species.id) beh = actionMode === 'auto' ? cur.active?.() : actionMode;
  else if (actionMode !== 'auto') beh = actionMode;
  const line = beh && beh !== 'auto' ? behaviorCaption(species.id, beh) : '';
  el.textContent = line || species.caption;
}

function paintTabs(activeId) {
  document.querySelectorAll('#actions button').forEach(b => {
    const on = b.dataset.b === activeId;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
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
  el.innerHTML = chips.map(c => {
    const on = c.id === actionMode;
    return `<button type="button" role="tab" data-b="${c.id}" class="${on ? 'on' : ''}" aria-selected="${on ? 'true' : 'false'}">${c.label}</button>`;
  }).join('');
}

function applyActionMode() {
  if (!cur) return;
  const mode = cur.setMode?.(actionMode) ?? actionMode;
  paintTabs(actionMode === 'auto' ? 'auto' : mode);
  syncCaption();
}

$('#actions')?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-b]');
  if (!btn) return;
  actionMode = btn.dataset.b;
  paintTabs(actionMode);
  applyActionMode();
  maybeFlagshipVoice(cur?.s?.id || SPECIES[idx]?.id);
});

function info(s) {
  const el = $('#info'); el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  setTimeout(() => {
    const g = groupById(s.group);
    $('#fam').textContent = g ? `${g.zh} · ${s.family}` : s.family; $('#title').textContent = s.name;
    $('#latin').textContent = `${s.latin} · ${s.en}`;
    const hab = habitatLabel(s.id);
    const act = ACTS.find(a => a.id === actId);
    const guest = browse === 'journey' && isGuest(act, s.id);
    $('#tags').innerHTML = s.tags.map(t => `<span>${t}</span>`).join('')
      + (hab ? `<span>${hab}</span>` : '')
      + (guest ? '<span>本季借展</span>' : '');
    paintPair(s);
    $('#desc').textContent = s.desc;
    $('#traits').innerHTML = Object.entries(s.traits).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('#dTitle').textContent = s.detail.title; $('#dText').textContent = s.detail.text;
    const pull = $('#pull'); if (pull) pull.textContent = lineOf(s);
    const spName = $('#spName'); if (spName) spName.textContent = s.name;
    syncTitle(s);
    const card = document.querySelector('#info .detail');
    if (card) card.hidden = !!s.detail.hide;
    syncCaption(s);
    paintPair(s);
  }, 240);
  paintPair(s);
  markNav();
}

function dropCreature(o, keepId) {
  if (!o?.g) return;
  try { o.mixer?.stopAllAction(); } catch { /* mixer already torn down */ }
  o.g.removeFromParent();
  disposeCloneMaterials(o.g);
  if (!o.g.userData.fromGlb) o.g.traverse(obj => { obj.geometry?.dispose(); });
  else if (isMobile() && o.s && o.s.id !== keepId) releaseCreature(o.s.id);
}

/** 换柜之前先把上一只从舞台上卸干净。不允许两只模型同时留在展柜里。 */
function evictStage() {
  const doomed = [];
  if (cur) doomed.push(cur);
  for (const f of flights) if (f.o && !doomed.includes(f.o)) doomed.push(f.o);
  flights.length = 0;
  for (const o of doomed) dropCreature(o, null);
  cur = null;
  diver.visible = false;
  scaleFit = null;
  hideStandIn();
}

function paintPair(species) {
  const p = species ? pairOf(species.id) : null;
  for (const id of ['pair', 'pairCap']) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (!p) { el.hidden = true; el.dataset.id = ''; continue; }
    el.hidden = false;
    el.textContent = `对看 · ${p.label}`;
    el.title = p.note || '';
    el.dataset.id = p.id;
  }
}

function goPair(partnerId) {
  const i = SPECIES.findIndex(s => s.id === partnerId);
  if (i < 0) return;
  const here = ACTS.find(a => a.id === actId);
  const stay = browse === 'journey' && here && wingMembers(here).includes(partnerId);
  browse = 'journey';
  if (!stay) actId = actOf(partnerId).id;
  renderCarousel();
  select(i);
  if (isMobile()) closeNav();
}

function viewingHabitat(speciesId) {
  if (browse !== 'journey') return null;
  const act = ACTS.find(a => a.id === actId);
  if (act && isGuest(act, speciesId) && act.env) return act.env;
  return null;
}

function hearingAmb(speciesId) {
  const seasonal = seasonAmbFor(browse === 'journey' ? actId : '', speciesId);
  return seasonal || envx.preset().amb;
}

const PLAQUE_KEY = 'oaPlaque';
const WHISPER_KEY = 'oaWhisper';
const plaqueMem = new Set();
let audioFrom = null;
let landGreet = false;
let whisperQueued = false;
let whisperActive = false;
let greetGen = 0;
let chainPlaque = false;
let voiceSkipped = false;
let trailerReady = false;
let soundGateReady = false;

function plaqueHeard(id) {
  if (plaqueMem.has(id)) return true;
  try { return JSON.parse(sessionStorage.getItem(PLAQUE_KEY) || '[]').includes(id); }
  catch { return false; }
}
function markPlaque(id) {
  plaqueMem.add(id);
  try {
    const arr = JSON.parse(sessionStorage.getItem(PLAQUE_KEY) || '[]');
    if (!arr.includes(id)) arr.push(id);
    sessionStorage.setItem(PLAQUE_KEY, JSON.stringify(arr));
  } catch { /* 隐私模式 */ }
}
function whisperHeard() {
  try { return sessionStorage.getItem(WHISPER_KEY) === '1'; }
  catch { return false; }
}
function markWhisper() {
  try { sessionStorage.setItem(WHISPER_KEY, '1'); } catch { /* 隐私模式 */ }
}
function showEar(text) {
  const el = $('#ear');
  if (!el || !text) return;
  el.hidden = false;
  el.textContent = text;
  clearTimeout(showEar._t);
  showEar._t = setTimeout(() => { el.hidden = true; }, 3400);
}
function trailerSrc() {
  return import.meta.env.BASE_URL + (SEASON.trailer || 'media/season-trailer.mp4');
}
function probeTrailer() {
  const v = document.createElement('video');
  v.preload = 'metadata';
  v.muted = true;
  v.addEventListener('loadedmetadata', () => { trailerReady = true; paintSeason(); }, { once: true });
  v.addEventListener('error', () => { trailerReady = false; }, { once: true });
  v.src = trailerSrc();
}
function openTrailer() {
  const root = $('#trailer');
  const vid = $('#trailerVid');
  if (!root || !vid) return;
  if (!vid.getAttribute('src')) vid.src = trailerSrc();
  const title = $('#trailerTitle');
  if (title) title.textContent = SEASON.title ? `${SEASON.title} · 预告` : '本季预告';
  root.hidden = false;
  vid.play?.().catch(() => { /* 交给控件 */ });
}
function closeTrailer() {
  const vid = $('#trailerVid');
  if (vid) { try { vid.pause(); } catch { /* 未开始 */ } }
  const root = $('#trailer');
  if (root) root.hidden = true;
}
async function maybeWelcome() {
  if (!allWingsSeen() || whisperHeard()) { landGreet = false; whisperQueued = false; return false; }
  if (!audio.on) { whisperQueued = true; return false; }
  const gen = ++greetGen;
  whisperQueued = false;
  audio.skipVoice();
  whisperActive = true;
  const ok = await audio.voice('vo-welcome-back', 0.38);
  if (gen !== greetGen) return false;
  if (!ok) {
    whisperActive = false;
    whisperQueued = true;
    landGreet = true;
    return false;
  }
  markWhisper();
  landGreet = false;
  chainPlaque = true;
  return true;
}
function maybeFlagshipVoice(speciesId) {
  if (!speciesId || landGreet || whisperActive) return;
  const flag = flagshipOf(speciesId);
  const open = !!(flag && actionMode === flag.behavior);
  if (!open) { audio.skipVoice(); return; }
  if (plaqueHeard(speciesId) || !audio.on) return;
  void audio.voice(`vo-${speciesId}`, 0.9).then(ok => {
    if (ok && SPECIES[idx]?.id === speciesId && actionMode === flag.behavior) markPlaque(speciesId);
  });
}
async function armCues(nextId, fromId) {
  if (whisperActive && fromId && fromId !== nextId) {
    greetGen += 1;
    chainPlaque = false;
    voiceSkipped = true;
    audio.skipVoice();
    whisperActive = false;
    landGreet = false;
    whisperQueued = false;
    markWhisper();
  } else if (fromId && fromId !== nextId) audio.skipVoice();
  const stingName = stingOf(fromId, nextId);
  const act = ACTS.find(a => a.id === actId);
  const loan = !stingName && fromId !== nextId && browse === 'journey' && isGuest(act, nextId) && SEASON.loanSting;
  if (stingName) {
    showEar(pairOf(fromId)?.note || '对看。');
    await audio.sting(stingName);
  } else if (loan) {
    showEar('借展。这一件仍住在原来的翼。');
    await audio.sting(SEASON.loanSting);
  }
  if (SPECIES[idx]?.id !== nextId) return;
  maybeFlagshipVoice(nextId);
}
function onSoundGate(on) {
  if (!soundGateReady) return;
  if (!on) return;
  if (whisperQueued || landGreet) {
    void maybeWelcome();
    return;
  }
  maybeFlagshipVoice(SPECIES[idx]?.id);
}

async function select(i, instant) {
  const s = SPECIES[i];
  if (!s) return;
  if (cur && i === idx && !instant) {
    // 同一只，但可能从户籍翼改走到借展（或反过来）。铭牌跟着展区走，模型不重载。
    envx.set(s.id, false, viewingHabitat(s.id));
    body.classList.toggle('env-dark', !!envx.preset().dark);
    audio.setSpecies(s.id, hearingAmb(s.id));
    writeDeepLink(s.id);
    info(s);
    paintWing();
    updateFeat();
    if (browse === 'journey') markVisit(actId, s.id);
    paintSeals();
    return;
  }
  const token = ++loadToken;
  // 先卸掉上一只，再改铭牌。加载中舞台上不留旧模型。
  evictStage();
  idx = i;
  focusSpecies(i);
  const fromId = audioFrom;
  audioFrom = s.id;
  const moment = flagshipOf(s.id);
  actionMode = moment?.behavior || 'auto';
  void armCues(s.id, fromId);
  applyFrame(s.id, true, instant);
  scaleFor = s.id;
  diver.visible = false;
  scaleFit = null;
  refreshScaleHint(s);
  updateFeat();
  paintWing();
  writeDeepLink(s.id);
  considerScaleNudge(s);
  rebuildActions(s.id);
  info(s);
  envx.set(s.id, instant, viewingHabitat(s.id));
  body.classList.toggle('env-dark', !!envx.preset().dark);
  audio.setSpecies(s.id, hearingAmb(s.id));
  lastBeh = null;
  applyTheme();
  vY = instant ? 0 : 0.05;
  body.classList.add('staging');
  showStandIn(s.id);
  const cached = isCached(s.id);
  if (!cached) loader.show(s.name);
  let n;
  try {
    n = await loadCreature(s.id, f => { if (token === loadToken) loader.set(f); });
  } catch (err) {
    console.warn('loadCreature failed, procedural fallback', err);
    n = build(s.id);
  }
  if (token !== loadToken) {
    dropCreature(n, null);
    return;
  }
  loader.hide();
  hideStandIn();
  body.classList.remove('staging');
  n.s = s;
  n.g.position.set(0, 0, 0);
  n.g.rotation.set(0, 0, 0);
  n.g.scale.set(1, 1, 1);
  stage.add(n.g);
  cur = n;
  applyActionMode();
  syncCaption(s);
  refineLargeFrame(n.g, s.id);
  if (s.id === 'giant_squid') refineSquidFrame(n.g);
  const here = ACTS.find(a => a.id === actId);
  const inWing = browse === 'journey' && here && wingMembers(here).includes(s.id);
  markVisit(inWing ? actId : null, s.id);
  paintSeals();
  paintWing();
  if (n.refineFit) n.refineFit(fit => {
    if (token !== loadToken || cur !== n) return;
    n.fit = fit;
    mobFrame.key = '';
  });
  if (s.id === 'sperm_whale' || s.id === 'giant_squid' || s.id === 'whale' || s.id === 'lionsmane') {
    setTimeout(() => {
      if (token !== loadToken || cur !== n) return;
      refineLargeFrame(n.g, s.id);
      if (s.id === 'giant_squid') refineSquidFrame(n.g);
    }, 480);
  }
  prefetchNeighbors(i, token);
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
    f.t = Math.min(1, f.t + dt / 1.15);
    const e = ease(f.t), g = f.o.g;
    if (f.out) {
      // Hold the previous case in the room and ease it back into the fog.
      g.scale.setScalar(Math.max(0.001, 1 - e * 0.22));
      g.position.set(-e * 1.35, e * 0.2, -e * 2.6);
      g.rotation.y = e * 0.35;
      if (f.t >= 1) {
        stage.remove(g);
        disposeCloneMaterials(g);
        if (!g.userData.fromGlb) g.traverse(o => { o.geometry?.dispose(); });
        else if (isMobile() && f.o.s && f.o.s.id !== cur?.s?.id) releaseCreature(f.o.s.id);
        flights.splice(k, 1);
      }
    } else {
      const d = Math.max(0, (f.t - 0.12) / 0.88), e2 = ease(d);
      g.scale.setScalar(Math.max(0.001, 0.86 + 0.14 * e2));
      g.position.set((1 - e2) * 1.5, (1 - e2) * -0.28, (1 - e2) * -2.4);
      g.rotation.y = (1 - e2) * -0.35;
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
function setImm(v) {
  if (v === imm) return;
  imm = v;
  body.classList.toggle('imm', v);
  if (v) maybeFlagshipVoice(SPECIES[idx]?.id);
  const hint = $('#hint');
  if (!hint) return;
  clearTimeout(setImm._t);
  if (v) {
    hint.classList.add('show');
    setImm._t = setTimeout(() => hint.classList.remove('show'), 2600);
  } else hint.classList.remove('show');
}
$('#bZoom').onclick = () => { tZoom = imm ? 0 : -3.4; setImm(!imm); };
$('#bReset').onclick = () => {
  const f = frameFor(cur?.s?.id);
  rotY = f.yaw; rotX = f.pitch; vY = 0; tZoom = 0; setImm(false);
};
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#trailer') && !$('#trailer').hidden) { closeTrailer(); return; }
    if ($('#share') && !$('#share').hidden) { closeShare(); return; }
    if ($('#passport') && !$('#passport').hidden) { closePassport(); return; }
    $('#bReset').onclick();
  }
  const cardOpen = ($('#share') && !$('#share').hidden) || ($('#passport') && !$('#passport').hidden) || ($('#trailer') && !$('#trailer').hidden);
  if (e.target.tagName !== 'INPUT' && !cardOpen) {
    if (e.key === 'ArrowRight') stepVisible(1);
    if (e.key === 'ArrowLeft') stepVisible(-1);
  }
});

// search
const q = $('#q'), res = $('#results');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const match = v => SPECIES.map((s, i) => [s, i]).filter(([s]) => {
  const g = groupById(s.group);
  const hay = (s.name + s.latin + s.en + s.nav + s.tags.join('') + (g ? g.zh + g.note : '')).toLowerCase();
  return v && hay.includes(v.toLowerCase());
});
function closeSearch() {
  res.style.display = 'none';
  res.innerHTML = '';
  q.setAttribute('aria-expanded', 'false');
}
q.oninput = () => {
  const v = q.value.trim();
  if (!v) { closeSearch(); return; }
  const m = match(v);
  res.style.display = 'block';
  q.setAttribute('aria-expanded', 'true');
  if (!m.length) {
    const shown = v.length > 24 ? `${v.slice(0, 24)}…` : v;
    res.innerHTML = `<div class="empty" role="status">没有找到「${esc(shown)}」</div>`;
    return;
  }
  res.innerHTML = m.map(([s, i]) => `<div data-i="${i}"><b>${esc(s.name)}</b><i>${esc(s.latin)}</i></div>`).join('');
};
res.onclick = e => {
  const d = e.target.closest('div[data-i]');
  if (!d) return;
  select(+d.dataset.i);
  q.value = '';
  closeSearch();
  q.blur();
};
q.onkeydown = e => {
  if (e.key === 'Escape') { closeSearch(); q.blur(); e.stopPropagation(); return; }
  if (e.key === 'Enter') {
    const m = match(q.value.trim());
    if (m[0]) { select(m[0][1]); q.value = ''; closeSearch(); q.blur(); }
  }
};
document.addEventListener('pointerdown', e => {
  if (!e.target.closest('.search')) closeSearch();
});
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

function applyFrame(id, resetOrbit, snap) {
  const f = frameFor(id);
  frameDist = f.dist;
  frameFov = f.fov;
  frameAimY = f.aimY || 0;
  frameAimX = f.aimX || 0;
  if (resetOrbit) {
    vY = 0;
    if (snap) {
      rotY = f.yaw;
      rotX = f.pitch;
      easeT = 0;
    } else {
      easeY = f.yaw;
      easeX = f.pitch;
      easeT = 0.95;
    }
    if (!imm) tZoom = 0;
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
  const extras = stage.children.filter(o => o !== diver && o !== standIn && o !== cur.g);
  if (extras.length) { diver.visible = false; scaleFit = null; return; }
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

function showStandIn(id) {
  const hex = THUMB[id] || '#8fb4c8';
  standIn.material.color.set(hex);
  standIn.material.emissive.set(hex);
  standIn.visible = true;
}
function hideStandIn() { standIn.visible = false; }

function stageGap() {
  if (innerWidth <= 820) return 0.92;
  return Math.max(0.4, (innerWidth - 304 - 378) / innerWidth);
}

const LARGE_FRAME = new Set(['sperm_whale', 'whale', 'giant_squid', 'orca', 'lionsmane']);

/** 大型或竖起来的动物：只把镜头拉远，不把已经取好的景推近。 */
function refineLargeFrame(obj, id) {
  if (!obj || scaleOn || !LARGE_FRAME.has(id)) return;
  const box = stageBox(obj);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const pad = id === 'sperm_whale' ? 1.46 : 1.22;
  const D = distToContain(
    { x: Math.max(size.x, 0.2) / 2, y: Math.max(size.y, 0.2) / 2, z: Math.max(size.z, 0.2) / 2 },
    { yaw: rotY, pitch: rotX * 0.5, fov: frameFov, aspect: Math.max(0.6, cam.aspect), gap: stageGap(), pad },
  );
  if (D > frameDist + 0.25) {
    frameDist = D;
    frameAimY = center.y * 0.45;
    dist = Math.max(dist, frameDist);
  }
}

/** Pull the default camera back until the squid's mantle fits the gap between the panels. */
function refineSquidFrame(obj) {
  const box = stageBox(obj);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const D = distToContain(
    { x: Math.max(size.x, 0.2) / 2, y: Math.max(size.y, 0.2) / 2, z: Math.max(size.z, 0.2) / 2 },
    { yaw: rotY, pitch: rotX * 0.5, fov: frameFov, aspect: Math.max(0.6, cam.aspect), gap: stageGap(), pad: 1.22 },
  );
  frameDist = Math.max(9.6, D);
  frameAimX = center.x;
  frameAimY = center.y + 0.04;
  dist = frameDist;
}

function prefetchNeighbors(i, token) {
  if (isMobile()) return;
  const list = visibleIndices();
  const pos = list.indexOf(i);
  if (pos < 0) return;
  const ids = [1, -1, 2].map(d => list[pos + d]).filter(j => j != null).map(j => SPECIES[j].id);
  const idle = window.requestIdleCallback || (fn => setTimeout(fn, 700));
  ids.forEach((id, n) => {
    setTimeout(() => idle(() => { if (token === loadToken) prefetchCreature(id); }, { timeout: 4000 }), 500 + n * 450);
  });
}

function sayHint(m) {
  const hint = $('#sndHint');
  if (!hint) return;
  hint.textContent = m;
  hint.classList.add('on');
  clearTimeout(sayHint._t);
  sayHint._t = setTimeout(() => hint.classList.remove('on'), 1800);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}
function shareContext(s) {
  const here = ACTS.find(a => a.id === actId);
  const act = (browse === 'journey' && here && wingMembers(here).includes(s.id)) ? here : actOf(s.id);
  const guest = isGuest(act, s.id);
  const flag = flagshipOf(s.id);
  const mode = cur?.s?.id === s.id
    ? (actionMode === 'auto' ? (cur.active?.() || 'auto') : actionMode)
    : actionMode;
  const moment = flag && mode === flag.behavior ? flag.moment : '';
  const wing = guest ? `${act.title} · 借展` : (act?.title || '');
  return { act, guest, moment, wing };
}
function sharePayload(s) {
  const url = new URL(location.href);
  url.searchParams.set('id', s.id);
  url.searchParams.delete('s');
  const ctx = shareContext(s);
  if (ctx.guest) url.searchParams.set('wing', ctx.act.id);
  else url.searchParams.delete('wing');
  const line = lineOf(s);
  const card = [ctx.wing, ctx.moment, s.name, line, s.latin, url.toString()].filter(Boolean).join('\n');
  const text = [ctx.wing, ctx.moment, s.name, line].filter(Boolean).join('\n');
  return {
    s, line, url: url.toString(), card, ctx,
    data: { title: `${s.name} · 深海图鉴`, text, url: url.toString() },
  };
}
const CARD_FONT = '"WenQuanYi Micro Hei","Noto Sans SC","PingFang SC",sans-serif';
function grabStill() {
  try {
    composer.render();
    const side = Math.min(canvas.width, canvas.height);
    const shot = document.createElement('canvas');
    shot.width = side;
    shot.height = side;
    const sx = Math.max(0, (canvas.width - side) / 2);
    const maxSy = Math.max(0, canvas.height - side);
    const sy = Math.min(maxSy, Math.max(0, (canvas.height - side) * 0.35));
    shot.getContext('2d').drawImage(canvas, sx, sy, side, side, 0, 0, side, side);
    return shot;
  } catch (err) {
    console.warn('stage capture failed', err);
    return null;
  }
}
function roundImage(g, img, x, y, w, h, r) {
  g.save();
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.clip();
  g.drawImage(img, x, y, w, h);
  g.restore();
}
function wrapText(g, text, x, y, max, lineH, limit) {
  const lines = [];
  let curLine = '';
  for (const ch of text) {
    if (g.measureText(curLine + ch).width > max) { lines.push(curLine); curLine = ch; }
    else curLine += ch;
  }
  if (curLine) lines.push(curLine);
  lines.slice(0, limit).forEach((ln, n) => g.fillText(ln, x, y + n * lineH));
  return Math.min(lines.length, limit);
}
function paintMuseumCard(c, { kicker, wing, moment, title, latin, line, url, still, extra }) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, '#071422');
  grd.addColorStop(0.55, '#0c3048');
  grd.addColorStop(1, '#14324a');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  const pad = Math.round(W * 0.072);
  g.fillStyle = '#7ec8d4';
  g.font = `500 ${Math.round(W * 0.028)}px ${CARD_FONT}`;
  g.fillText(kicker || '深海图鉴  ·  OCEAN ATLAS', pad, Math.round(H * 0.07));
  let y = Math.round(H * 0.1);
  g.font = `500 ${Math.round(W * 0.026)}px ${CARD_FONT}`;
  const chips = [wing, moment].filter(Boolean);
  chips.forEach(chip => {
    const tw = g.measureText(chip).width + 28;
    g.strokeStyle = 'rgba(183,212,222,.55)';
    g.lineWidth = 2;
    g.strokeRect(pad, y, tw, Math.round(H * 0.032));
    g.fillStyle = '#d5e8f0';
    g.fillText(chip, pad + 14, y + Math.round(H * 0.023));
    y += Math.round(H * 0.046);
  });
  const imgTop = y + Math.round(H * 0.02);
  const imgH = extra?.length ? Math.round(H * 0.22) : Math.round(H * 0.4);
  const imgW = W - pad * 2;
  if (still) roundImage(g, still, pad, imgTop, imgW, imgH, 28);
  else {
    g.fillStyle = '#0a2236';
    g.fillRect(pad, imgTop, imgW, imgH);
  }
  y = imgTop + imgH + Math.round(H * 0.06);
  g.fillStyle = '#f4fbff';
  g.font = `600 ${Math.round(W * 0.064)}px ${CARD_FONT}`;
  g.fillText(title || '', pad, y);
  y += Math.round(H * 0.04);
  g.fillStyle = '#9fb6c2';
  g.font = `italic ${Math.round(W * 0.03)}px ${CARD_FONT}`;
  g.fillText(latin || '', pad, y);
  y += Math.round(H * 0.05);
  g.fillStyle = '#f7fbff';
  g.font = `italic ${Math.round(W * 0.038)}px ${CARD_FONT}`;
  const used = wrapText(g, line || '', pad, y, W - pad * 2, Math.round(H * 0.042), extra?.length ? 2 : 4);
  y += used * Math.round(H * 0.042) + Math.round(H * 0.02);
  if (extra) {
    g.fillStyle = '#c5d8e2';
    g.font = `${Math.round(W * 0.026)}px ${CARD_FONT}`;
    extra.slice(0, 16).forEach(row => { g.fillText(row, pad, y); y += Math.round(H * 0.03); });
  }
  g.fillStyle = '#6f8e9c';
  g.font = `${Math.round(W * 0.024)}px ${CARD_FONT}`;
  const shown = (url || '').replace(/^https?:\/\//, '');
  g.fillText(shown.length > 64 ? `${shown.slice(0, 64)}…` : shown, pad, H - Math.round(H * 0.045));
}
function downloadCanvas(c, name) {
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = name;
  a.click();
}
function openShare() {
  const s = cur?.s || SPECIES[idx];
  if (!s) return;
  const p = sharePayload(s);
  $('#shareTitle').textContent = s.name;
  $('#shareLatin').textContent = `${s.latin} · ${s.en}`;
  $('#shareLine').textContent = p.line;
  $('#shareUrl').textContent = p.url.replace(/^https?:\/\//, '');
  const wing = $('#shareWing');
  if (wing) wing.textContent = p.ctx.wing;
  const moment = $('#shareMoment');
  if (moment) {
    moment.hidden = !p.ctx.moment;
    moment.textContent = p.ctx.moment || '';
  }
  const still = grabStill();
  const img = $('#shareStill');
  if (img) {
    img.src = still ? still.toDataURL('image/png') : '';
    img.alt = still ? `${s.name}的展柜静帧` : '';
    img.hidden = !still;
  }
  const root = $('#share');
  root.hidden = false;
  root.dataset.card = p.card;
  root._still = still;
  $('#shareSys').hidden = !navigator.share;
}
function closeShare() {
  const root = $('#share');
  if (root) root.hidden = true;
}
async function shareSpecies() { openShare(); }
$('#bShare')?.addEventListener('click', () => { shareSpecies(); });
$('#shareClose')?.addEventListener('click', closeShare);
$('#share')?.addEventListener('click', e => { if (e.target.id === 'share') closeShare(); });
$('#shareCopy')?.addEventListener('click', async () => {
  const ok = await copyText($('#share')?.dataset.card || '');
  sayHint(ok ? '卡片已复制' : '无法复制');
});
$('#shareSys')?.addEventListener('click', async () => {
  const s = cur?.s || SPECIES[idx];
  if (!s || !navigator.share) return;
  const { data } = sharePayload(s);
  try { await navigator.share(data); closeShare(); }
  catch (err) { if (err?.name !== 'AbortError') sayHint('无法打开系统分享'); }
});
$('#shareImg')?.addEventListener('click', () => {
  const s = cur?.s || SPECIES[idx];
  if (!s) return;
  const p = sharePayload(s);
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1440;
  paintMuseumCard(c, {
    kicker: '深海图鉴  ·  OCEAN ATLAS',
    wing: p.ctx.wing,
    moment: p.ctx.moment,
    title: s.name,
    latin: s.latin,
    line: p.line,
    url: p.url,
    still: $('#share')._still || grabStill(),
  });
  downloadCanvas(c, `ocean-atlas-${s.id}.png`);
});
function onPairClick(e) {
  const id = e.currentTarget.dataset.id;
  if (id) goPair(id);
}
document.getElementById('pair')?.addEventListener('click', onPairClick);
document.getElementById('pairCap')?.addEventListener('click', onPairClick);
function passportRows() {
  const sum = passportSummary();
  const wings = sum.wings.map(w => `${w.seen ? '过' : '·'}  ${w.title}`);
  const flags = sum.flagships.map(f => `${f.seen ? '看' : '·'}  ${f.name} · ${f.moment}`);
  return { sum, wings, flags };
}
function openPassport() {
  const { sum, wings, flags } = passportRows();
  const back = sum.wings.every(w => w.seen);
  const bodyEl = $('#passBody');
  if (bodyEl) {
    bodyEl.innerHTML = (back ? `<p class="pass-note">欢迎回来。灯还在原来的地方。</p>` : '')
      + `<p class="pass-note">${SEASON.copy}</p>`
      + `<h3>展区</h3><ul>${wings.map(w => `<li>${w}</li>`).join('')}</ul>`
      + `<h3>旗舰</h3><ul>${flags.map(w => `<li>${w}</li>`).join('')}</ul>`
      + `<p class="pass-note">${sum.seasonSeen ? '本季特展走过了。' : '本季特展还没停过。'}</p>`;
  }
  const root = $('#passport');
  if (root) root.hidden = false;
  if (back) void maybeWelcome();
}
function closePassport() {
  const root = $('#passport');
  if (root) root.hidden = true;
}
$('#bPass')?.addEventListener('click', openPassport);
$('#passClose')?.addEventListener('click', closePassport);
$('#passport')?.addEventListener('click', e => { if (e.target.id === 'passport') closePassport(); });
$('#passImg')?.addEventListener('click', () => {
  const { sum, wings, flags } = passportRows();
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1440;
  paintMuseumCard(c, {
    kicker: '深海图鉴  ·  展区护照',
    wing: '我走过的路',
    moment: sum.seasonTitle,
    title: '护照',
    latin: '没有积分，只有路过的灯',
    line: '四翼还在原来的地方。',
    url: location.href,
    still: grabStill(),
    extra: ['展区', ...wings, '旗舰', ...flags, sum.seasonSeen ? `${sum.seasonKicker} · 走过` : `${sum.seasonKicker} · 未停`],
  });
  downloadCanvas(c, 'ocean-atlas-passport.png');
});

function formatMeters(m) {
  if (m >= 1) return `${Number(m.toFixed(m >= 10 ? 0 : 1))} 米`;
  return `${Math.round(m * 100)} 厘米`;
}
function refreshScaleHint(species = cur?.s) {
  const hint = document.getElementById('scaleHint');
  const btn = document.getElementById('bScale');
  if (btn) {
    btn.classList.toggle('on', scaleOn);
    btn.setAttribute('aria-pressed', String(scaleOn));
    btn.title = scaleOn ? '关闭比例对比' : '比例对比';
  }
  if (!hint) return;
  const spec = species && sizeOf(species.id);
  hint.textContent = scaleOn && spec
    ? `比例对比 · 潜水员 ${DIVER_HEIGHT_M.toFixed(2)} 米 · ${species.name}${spec.measure} ${formatMeters(spec.lengthMeters)}`
    : '';
  hint.classList.toggle('on', !!(scaleOn && spec));
}
const SCALE_NUDGE_KEY = 'oaScaleNudge';
function nudgeSeen() {
  try { return sessionStorage.getItem(SCALE_NUDGE_KEY) === '1'; } catch { return true; }
}
function markNudge() {
  try { sessionStorage.setItem(SCALE_NUDGE_KEY, '1'); } catch { /* private mode */ }
}
function hideScaleOffer() {
  const offer = document.getElementById('scaleOffer');
  if (offer) offer.hidden = true;
}
function considerScaleNudge(species) {
  clearTimeout(considerScaleNudge._t);
  const offer = document.getElementById('scaleOffer');
  if (!offer || nudgeSeen() || scaleOn) { hideScaleOffer(); return; }
  const flag = flagshipOf(species.id);
  if (!flag || (flag.scale !== 'tiny' && flag.scale !== 'large')) { hideScaleOffer(); return; }
  const spec = sizeOf(species.id);
  considerScaleNudge._t = setTimeout(() => {
    if (scaleOn || cur?.s?.id !== species.id || nudgeSeen()) return;
    const text = document.getElementById('scaleOfferText');
    if (text) {
      text.textContent = flag.scale === 'tiny'
        ? `${species.name}大约只有 ${formatMeters(spec.lengthMeters)}。要不要请潜水员站到旁边？`
        : `${species.name}大约有 ${formatMeters(spec.lengthMeters)}。要不要请潜水员站到旁边？`;
    }
    offer.hidden = false;
    markNudge();
  }, 2800);
}
function enableScale() {
  if (scaleOn) return;
  scaleOn = true;
  tZoom = 0;
  easeT = 0;
  if (cur && cur.s.id === scaleFor && !flights.some(f => f.o === cur)) layoutScale();
  refreshScaleHint();
}
{ // 比例对比：1.75 m 潜水员与当前物种并排
  const btn = document.getElementById('bScale');
  btn?.addEventListener('click', () => {
    scaleOn = !scaleOn;
    tZoom = 0;
    easeT = 0;
    hideScaleOffer();
    markNudge();
    if (!scaleOn) clearScaleShift();
    else if (cur && cur.s.id === scaleFor && !flights.some(f => f.o === cur)) layoutScale();
    refreshScaleHint();
  });
  document.getElementById('scaleOfferGo')?.addEventListener('click', () => {
    hideScaleOffer();
    markNudge();
    enableScale();
  });
  document.getElementById('scaleOfferNo')?.addEventListener('click', () => {
    hideScaleOffer();
    markNudge();
  });
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
  if (standIn.visible) {
    standIn.rotation.y = t * 0.55;
    standIn.position.y = Math.sin(t * 1.5) * 0.1;
    standIn.scale.setScalar(0.94 + Math.sin(t * 2.1) * 0.05);
  }
  // per-behaviour camera hint — paused while the diver comparison owns the frame
  const vw = !scaleOn && settled ? cur.view?.() : null;
  if (drag) holdView = now + 2500;
  const steer = vw && now > holdView;
  if (!drag) {
    vY *= 0.94;
    if (scaleOn && scaleFit) {
      vY = 0;
      easeT = 0;
      rotY += (0.42 - rotY) * 0.22;
      rotX += (0.06 - rotX) * 0.22;
    } else if (easeT > 0 && easeY != null) {
      easeT = Math.max(0, easeT - dt);
      const k = 1 - Math.exp(-dt * 3.1);
      rotY += (easeY - rotY) * k;
      rotX += (easeX - rotX) * k;
      vY = 0;
    } else rotY += vY + (steer && vw.yaw != null ? 0 : dt * 0.08);
  }
  const easing = easeT > 0 && !scaleOn;
  if (!easing && steer && vw.yaw != null) { const tgt = vw.yaw + Math.PI * 2 * Math.round((rotY - vw.yaw) / (Math.PI * 2)); rotY += (tgt - rotY) * (1 - Math.exp(-dt * (vw.yawK || 2.4))); }  // frame-rate independent
  if (!easing && steer && vw.pitch != null) rotX += (vw.pitch - rotX) * 0.04;
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
  let beh = null;
  if (cur && !flights.some(f => f.o === cur)) beh = cur.active?.() || null;
  const roomBeh = beh || (!cur && actionMode !== 'auto' ? actionMode : null);
  envx.update(t, dt, { beh: roomBeh, cur, lights: LB, fog: scene.fog, renderer: R, camDist: Math.max(dist, cam.position.length()) });
  hemi.intensity = LB.hemiBase * LB.hemiMul / 1.3; key.intensity = LB.keyBase * LB.keyMul;
  if (audio.on && fr % 8 === 0) audio.setSpace?.(cam.position.length(), imm);
  if (beh && beh !== lastBeh) {
    if (cur && (lastBeh !== null || actionMode !== 'auto')) audio.behavior(cur.s.id, beh);
    lastBeh = beh;
    if (actionMode === 'auto') syncCaption();
  }
  if (useScale && scene.fog?.isFogExp2) {
    const thin = Math.min(1, (frameDist || 9) / Math.max(dist, 0.5));
    scene.fog.density *= thin;
  }
  if (window.__oa) {
    window.__oa.beh = beh; window.__oa.env = envx.id; window.__oa.audio = audio; window.__oa.emit = envx.emit; window.__oa.trackY = cur?.trackY?.();
    let meshes = 0;
    cur?.g?.traverse(o => { if (o.isMesh) meshes++; });
    window.__oa.creatures = stage.children.filter(o => o !== diver && o !== standIn).length;
    window.__oa.stand = standIn.visible;
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
  if (cur && fr % 2 === 0 && !cur.s.detail.hide) {
    const spec = cur.s.detail;
    let aimed = false;
    if (spec.bone) {
      const bone = cur.raw.getObjectByName(spec.bone);
      if (bone) { bone.getWorldPosition(tmp); aimed = true; }
    }
    if (!aimed) { tmp.set(...spec.pt); cur.raw.localToWorld(tmp); }
    _bv.set(0.35, 0.2, 1).applyQuaternion(stage.quaternion).normalize();
    dcam.position.copy(tmp).addScaledVector(_bv, spec.cam || 0.9);
    dcam.lookAt(tmp);
    const stash = [];
    const hideFx = o => { if (o.userData?.noDetail && o.visible) { stash.push(o); o.visible = false; } };
    if (diver.visible) { stash.push(diver); diver.visible = false; }
    cur.g.traverse(hideFx);
    shadow.visible = false;
    if (spec.fill) {
      detailFill.visible = true;
      detailFill.intensity = spec.fill;
      detailFill.position.copy(dcam.position);
    }
    DR.render(scene, dcam);
    detailFill.visible = false;
    shadow.visible = true;
    for (const o of stash) o.visible = true;
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
idx = indexFromSearch(hp);
actId = actFromSearch(hp, idx);
browse = 'journey';
const returnVisit = allWingsSeen();
landGreet = returnVisit && !whisperHeard();
audio.onChange(onSoundGate);
audio.onVoice(playing => {
  const btn = $('#voSkip');
  if (btn) btn.hidden = !playing;
  if (playing) return;
  whisperActive = false;
  const chain = chainPlaque && !voiceSkipped;
  chainPlaque = false;
  voiceSkipped = false;
  if (chain) maybeFlagshipVoice(SPECIES[idx]?.id);
});
soundGateReady = true;
probeTrailer();
$('#voSkip')?.addEventListener('click', () => { voiceSkipped = true; audio.skipVoice(); });
$('#trailerClose')?.addEventListener('click', closeTrailer);
$('#trailer')?.addEventListener('click', e => { if (e.target.id === 'trailer') closeTrailer(); });
navBuild();
select(idx, true).then(() => {
  if (hp.get('imm')) { tZoom = -4.4; setImm(true); }
  if (invalidDeepLink) {
    sayHint(`没有「${invalidDeepLink}」这一柜，先从${SPECIES[idx].name}看起。`);
    invalidDeepLink = '';
  }
  if (returnVisit) {
    let seenHello = false;
    try { seenHello = sessionStorage.getItem('oaHello') === '1'; } catch { seenHello = true; }
    if (!seenHello) {
      try { sessionStorage.setItem('oaHello', '1'); } catch { /* 隐私模式 */ }
      const hello = $('#hello');
      if (hello) {
        hello.hidden = false;
        hello.textContent = '四翼都走过了。灯还在原来的地方。这一季，冰缘多了两件借展。';
        setTimeout(() => { hello.hidden = true; }, 5600);
      }
    }
    void maybeWelcome();
  }
});
loop();
