import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SPECIES } from './species.js';
import { build, glowMats, loadCreature } from './creatures.js';
import { uniqueBehaviors, behaviorLabel } from './aliveMotion.js';

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

let cur = null, idx = 0, rotY = -0.5, rotX = 0.12, vY = 0, dist = 9, tDist = 9, imm = false, offX = 0;
let loadToken = 0;
const flights = [];

const THUMB = {
  dumbo: '#f0a28c', angler: '#5a4a50', vampire: '#8a1f2c', barreleye: '#3b3f48',
  gulper: '#1c1a22', nautilus: '#c4a574', jelly: '#b8d4e8', physalia: '#4a8fd4',
  whale: '#5a6a78', turtle: '#7d8a5a', hammer: '#8e9aa6'
};

function navBuild() {
  const groups = {}; SPECIES.forEach((s, i) => (groups[s.nav] ??= []).push(i));
  const order = ['首页', '精选', '鮟鱇鱼', '章鱼', '鱿鱼', '水母', '鲨鱼', '管水母'];
  $('#nav').innerHTML = order.map(n =>
    `<a data-n="${n}">${n}<i>${n === '首页' ? '' : n === '精选' ? (groups[n]?.length || 0) : (groups[n] ? SPECIES[groups[n][0]].en.split(' ').pop() : '')}</i></a>`
  ).join('');
  $('#nav').onclick = e => {
    const a = e.target.closest('a'); if (!a) return;
    const n = a.dataset.n;
    if (n === '首页') return select(0);
    select(groups[n][n === '精选' ? (groups[n].indexOf(idx) + 1) % groups[n].length : 0]);
  };
  $('#carousel').innerHTML = SPECIES.map((s, i) =>
    `<div class="card" data-i="${i}"><span class="thumb" style="--t:${THUMB[s.id] || '#8899aa'}"></span><b>${s.name}</b><i>${s.latin}</i></div>`
  ).join('');
  $('#carousel').onclick = e => { const c = e.target.closest('.card'); c && select(+c.dataset.i); };
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
    $('#fam').textContent = s.family; $('#title').textContent = s.name;
    $('#latin').textContent = `${s.latin} · ${s.en}`;
    $('#tags').innerHTML = s.tags.map(t => `<span>${t}</span>`).join('');
    $('#desc').textContent = s.desc;
    $('#traits').innerHTML = Object.entries(s.traits).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    $('#dTitle').textContent = s.detail.title; $('#dText').textContent = s.detail.text;
    $('#caption').textContent = s.caption;
  }, 240);
  document.querySelectorAll('.card').forEach((c, i) => c.classList.toggle('on', i === idx));
  document.querySelector('.card.on')?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.n === s.nav || (a.dataset.n === '首页' && false)));
}

async function select(i, instant) {
  if (cur && i === idx && !instant) return;
  idx = i;
  const s = SPECIES[i];
  const token = ++loadToken;
  actionMode = 'auto';
  rebuildActions(s.id);
  info(s);
  applyTheme();
  vY = instant ? 0 : 0.05;
  let n;
  try {
    n = await loadCreature(s.id);
  } catch (err) {
    console.warn('loadCreature failed, procedural fallback', err);
    n = build(s.id);
  }
  if (token !== loadToken) {
    // superseded — drop unused group
    n.g.traverse(o => { if (!n.g.userData.fromGlb) o.geometry?.dispose(); });
    return;
  }
  if (cur) flights.push({ o: cur, t: 0, out: true });
  n.s = s;
  stage.add(n.g);
  flights.push({ o: n, t: instant ? 1 : 0, out: false });
  cur = n;
  applyActionMode();
}

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
        if (!g.userData.fromGlb) g.traverse(o => { o.geometry?.dispose(); });
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
  hemi.intensity = dark ? 0.55 : 1.35;
  hemi.color.set(dark ? 0x9fd8ff : 0xfff8f0);
  hemi.groundColor.set(dark ? 0x061a2e : 0x9aa8b8);
  key.intensity = dark ? 1.15 : 2.4;
  key.color.set(dark ? 0xd8f0ff : 0xfff6ea);
  rim.intensity = dark ? 2.8 : 0.45;
  fill.intensity = dark ? 0.35 : 0.55;
  bounce.intensity = dark ? 0.15 : 0.35;
  pm.uniforms.col.value.set(dark ? 0x9ff6ff : 0x8a96a8);
  pm.uniforms.op.value = dark ? .85 : .4;
  pm.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
  pm.needsUpdate = true;
  shadow.material.opacity = dark ? .35 : 1;
  R.toneMappingExposure = dark ? 1.15 : 1.02;
  scene.traverse(o => { if (o.isPointLight) o.intensity = dark ? 3 : 1; });
  // fog + bloom
  if (dark) {
    scene.fog = new THREE.FogExp2(0x071018, 0.045);
    bloomBase.strength = 0.45;
    bloom.strength = isMobile() ? bloomBase.strength * bloomBase.mobileScale : bloomBase.strength;
    bloom.threshold = 0.85;
    bloom.radius = 0.45;
  } else {
    scene.fog = new THREE.FogExp2(0xe8e0d0, 0.022);
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
function zoomBy(d) { tDist = Math.max(3.6, Math.min(12, tDist + d)); setImm(tDist < 6.6); }
function setImm(v) { if (v === imm) return; imm = v; body.classList.toggle('imm', v); }
$('#bZoom').onclick = () => { tDist = imm ? 9 : 5.2; setImm(!imm); };
$('#bReset').onclick = () => { rotY = -0.5; rotX = 0.12; tDist = 9; setImm(false); };
addEventListener('keydown', e => {
  if (e.key === 'Escape') $('#bReset').onclick();
  if (e.target.tagName !== 'INPUT') {
    if (e.key === 'ArrowRight') select((idx + 1) % SPECIES.length);
    if (e.key === 'ArrowLeft') select((idx + SPECIES.length - 1) % SPECIES.length);
  }
});

// search
const q = $('#q'), res = $('#results');
const match = v => SPECIES.map((s, i) => [s, i]).filter(([s]) =>
  v && (s.name + s.latin + s.en + s.tags.join('')).toLowerCase().includes(v.toLowerCase())
);
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
$('#bSearch').onclick = () => { setImm(false); tDist = Math.max(tDist, 9); if (isMobile()) body.classList.add('sheet-open'); q.focus(); };

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

let holdView = 0, viewDist = 0, lookY = 0;
let last = performance.now(), T0 = last; let fr = 0; const tmp = new THREE.Vector3();
function loop() {
  const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05), t = (now - T0) / 1000;
  last = now; fr++;
  // per-behaviour camera hint (e.g. angler front-3/4 for the jaw, whale pull-back for breach)
  const vw = cur && !flights.some(f => f.o === cur) ? cur.view?.() : null;
  if (drag) holdView = now + 2500;
  const steer = vw && now > holdView;
  if (!drag) { vY *= 0.94; rotY += vY + (steer && vw.yaw != null ? 0 : dt * 0.08); }
  if (steer && vw.yaw != null) { const tgt = vw.yaw + Math.PI * 2 * Math.round((rotY - vw.yaw) / (Math.PI * 2)); rotY += (tgt - rotY) * 0.04; }
  if (steer && vw.pitch != null) rotX += (vw.pitch - rotX) * 0.04;
  const mob = innerWidth < 900; // mobile: stage is the upper part of the screen, so pull back more and aim lower
  viewDist += (((vw && vw.dist) || 0) * (mob && vw?.dist > 0 ? 1.6 : 1) - viewDist) * 0.05; lookY += (((vw && vw.lookY) || 0) * (mob ? -0.6 : 1) - lookY) * 0.05;
  stage.rotation.set(rotX * 0.5, rotY, 0);
  dist += (tDist - dist) * 0.08;
  const w = innerWidth, h = innerHeight, target = imm || w < 900 ? 0 : (270 - 378) / 2;
  offX += (target - offX) * 0.08;
  cam.setViewOffset(w, h, -offX, 0, w, h);
  cam.position.set(0, 0.6 + rotX * 2.5 + lookY, dist + viewDist); cam.lookAt(0, -0.1 + lookY, 0);
  flightsStep(dt);
  flights.forEach(f => f.o.up(t, dt));
  if (cur && !flights.some(f => f.o === cur)) cur.up(t, dt);
  pm.uniforms.t.value = t;
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
  if (hp.get('imm')) { tDist = 4.6; setImm(true); }
});
loop();
