/**
 * Ocean Atlas sound engine (WebAudio).
 * - Muted by default; the AudioContext is only created after a user tap (autoplay rules).
 * - Choice + volume persisted in localStorage (oaSound = 'on' | 'off', oaVol = 0..1).
 * - Ambience files are lazy-fetched per environment, SFX lazy-fetched per species, and
 *   only once sound is on. A quiet synth pad (the "music" bed) and a few synth SFX need no files.
 */
const BASE = import.meta.env.BASE_URL + 'audio/';
const EXT = (() => { const a = document.createElement('audio'); return a.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? 'm4a' : 'mp3'; })();

// environment → ambience file + pad chord (Hz) + pad filter
const AMB = {
  abyss: { f: 'amb-abyss', chord: [55, 82.4, 110, 164.8], lp: 420, pad: .5 },
  open: { f: 'amb-open', chord: [98, 146.8, 196, 246.9], lp: 900, pad: .45 },
  reef: { f: 'amb-reef', chord: [130.8, 196, 261.6, 329.6], lp: 1100, pad: .32 },
  midwater: { f: 'amb-midwater', chord: [87.3, 130.8, 174.6, 220], lp: 800, pad: .5 },
  surface: { f: 'amb-surface', chord: [146.8, 220, 293.7, 370], lp: 1300, pad: .22 },
  twilight: { f: 'amb-twilight', chord: [73.4, 110, 146.8, 174.6], lp: 600, pad: .5 },
};
// species_behaviour → [file|synth, gain, rate, delay s]
const SFX = {
  whale_song: ['whale-song', 1, 1, .3], whale_blow: ['whale-blow', .9, 1, .4], whale_lobtail: ['whale-lobtail', 1, 1, .9],
  angler_strike: ['jaw-snap', 1, 1, .15], angler_lure: ['@hum', .5], angler_ambush: ['@ping', .25],
  vampire_flee: ['jet-whoosh', .9, 1, 0], vampire_cloak: ['jet-whoosh', .5, .7, 0], vampire_snow: ['@chime', .35],
  nautilus_jet: ['jet-whoosh', .9, .9, 0], nautilus_rise: ['bubbles', .6, 1, 0], nautilus_sink: ['bubbles', .4, .8, 0],
  turtle_breathe: ['bubbles', .8, 1, .2], turtle_graze: ['@crunch', .4],
  barreleye_strike: ['jaw-snap', .8, 1.25, .1], barreleye_gaze: ['@chime', .25],
  gulper_gape: ['jaw-snap', .9, .7, .2], gulper_tailglow: ['@chime', .4],
  dumbo_flap: ['bubbles', .35, 1.2, 0], dumbo_crawl: ['@thud', .35],
  jelly_pulse: ['@pulse', .35], jelly_feed: ['bubbles', .3, 1.3, 0],
  physalia_roll: ['whale-lobtail', .5, 1.5, .2], physalia_hunt: ['@chime', .2],
  hammer_pin: ['@thud', .6], hammer_scan: ['@ping', .3], hammer_sideswim: ['jet-whoosh', .4, .8, 0],
};
const SPLASH = 'whale-breach';
const filesFor = sp => [...new Set(Object.entries(SFX).filter(([k, v]) => k.startsWith(sp + '_') && !v[0].startsWith('@')).map(([, v]) => v[0]).concat(sp === 'whale' ? [SPLASH] : []))];

export function createAudio() {
  let ctx = null, master, ambBus, sfxBus, padBus, on = localStorage.oaSound === 'on', vol = +(localStorage.oaVol ?? .7);
  if (!(vol >= 0 && vol <= 1)) vol = .7;
  const buf = new Map(), pending = new Map();
  let ambKey = null, ambNode = null, pad = null, species = null, unlocked = false;
  const listeners = new Set();

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    ambBus = ctx.createGain(); ambBus.gain.value = .55; ambBus.connect(master);
    padBus = ctx.createGain(); padBus.gain.value = .18; padBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = .9; sfxBus.connect(master);
    return ctx;
  }
  function load(name) {
    if (buf.has(name)) return Promise.resolve(buf.get(name));
    if (pending.has(name)) return pending.get(name);
    const p = fetch(`${BASE}${name}.${EXT}`).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(a => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej)))
      .then(b => { buf.set(name, b); pending.delete(name); return b; })
      .catch(e => { pending.delete(name); console.warn('[audio]', name, e?.message || e); return null; });
    pending.set(name, p); return p;
  }
  const level = () => (on ? vol * vol : 0); // perceptual-ish curve
  function applyLevel(fast) { if (!ctx) return; const g = master.gain, n = ctx.currentTime; g.cancelScheduledValues(n); g.setValueAtTime(g.value, n); g.linearRampToValueAtTime(level(), n + (fast ? .05 : .4)); }

  // ---- ambience: file loop + synth pad, crossfaded ----
  function startPad(cfg) {
    const n = ctx.currentTime, g = ctx.createGain(), lp = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lp.type = 'lowpass'; lp.frequency.value = cfg.lp; lp.Q.value = .6; g.gain.value = 0; g.gain.linearRampToValueAtTime(cfg.pad, n + 3);
    lfo.frequency.value = .07; lg.gain.value = cfg.lp * .35; lfo.connect(lg).connect(lp.frequency); lfo.start();
    const osc = cfg.chord.flatMap((f, i) => [0, 1].map(j => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f * (j ? 1.004 : .997); og.gain.value = .12 / (1 + i * .4);
      // slow per-voice swell so the bed "breathes"
      const sw = ctx.createOscillator(), sg = ctx.createGain(); sw.frequency.value = .05 + i * .021 + j * .013; sg.gain.value = .07 / (1 + i * .4); sw.connect(sg).connect(og.gain); sw.start();
      o.connect(og).connect(lp); o.start(); return [o, sw]; })).flat();
    lp.connect(g).connect(padBus);
    return { stop() { const t = ctx.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 2.5); setTimeout(() => { osc.concat(lfo).forEach(o => { try { o.stop(); } catch {} }); g.disconnect(); }, 2800); } };
  }
  async function setAmb(key) {
    if (!ctx || key === ambKey) return; ambKey = key;
    const cfg = AMB[key] || AMB.abyss;
    pad?.stop(); pad = startPad(cfg);
    const b = await load(cfg.f); if (!b || ambKey !== key) return;
    const old = ambNode, n = ctx.currentTime;
    const src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = b; src.loop = true; g.gain.value = 0; g.gain.linearRampToValueAtTime(1, n + 2);
    src.connect(g).connect(ambBus); src.start(0, Math.random() * b.duration);
    ambNode = { src, g };
    if (old) { old.g.gain.cancelScheduledValues(n); old.g.gain.setValueAtTime(old.g.gain.value, n); old.g.gain.linearRampToValueAtTime(0, n + 2); setTimeout(() => { try { old.src.stop(); } catch {} }, 2300); }
  }

  // ---- synth sfx (no files) ----
  function env(g, n, a, d, peak) { g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(peak, n + a); g.gain.exponentialRampToValueAtTime(.0001, n + a + d); }
  function noise(sec) { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; return s; }
  const SYN = {
    hum(gain) { const n = ctx.currentTime, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), tr = ctx.createOscillator(), tg = ctx.createGain();
      o.frequency.value = 196; o2.frequency.value = 293.7; o.type = 'sine'; o2.type = 'sine'; tr.frequency.value = 5.5; tg.gain.value = gain * .3; tr.connect(tg).connect(g.gain);
      g.gain.setValueAtTime(0, n); g.gain.linearRampToValueAtTime(gain * .6, n + .8); g.gain.linearRampToValueAtTime(gain * .5, n + 2.4); g.gain.linearRampToValueAtTime(0, n + 3.4);
      o.connect(g); o2.connect(g); g.connect(sfxBus); [o, o2, tr].forEach(x => { x.start(n); x.stop(n + 3.5); }); },
    ping(gain) { const n = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), dl = ctx.createDelay(), fb = ctx.createGain();
      o.frequency.value = 1180; o.type = 'sine'; env(g, n, .01, 1.2, gain); dl.delayTime.value = .38; fb.gain.value = .35; g.connect(sfxBus); g.connect(dl).connect(fb).connect(dl); fb.connect(sfxBus); o.connect(g); o.start(n); o.stop(n + 1.4); },
    chime(gain) { const n = ctx.currentTime; [523.3, 784, 1046.5, 1318.5].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f; o.type = 'sine'; env(g, n + i * .12, .02, 1.6, gain * .5); o.connect(g).connect(sfxBus); o.start(n + i * .12); o.stop(n + i * .12 + 1.8); }); },
    pulse(gain) { const n = ctx.currentTime, s = noise(1.2), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(200, n); f.frequency.linearRampToValueAtTime(700, n + .3); f.frequency.linearRampToValueAtTime(150, n + 1.1); env(g, n, .25, .9, gain); s.connect(f).connect(g).connect(sfxBus); s.start(n); },
    thud(gain) { const n = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, n); o.frequency.exponentialRampToValueAtTime(40, n + .35); env(g, n, .005, .45, gain); o.connect(g).connect(sfxBus); o.start(n); o.stop(n + .5);
      const s = noise(.8), f = ctx.createBiquadFilter(), g2 = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 500; env(g2, n, .02, .7, gain * .5); s.connect(f).connect(g2).connect(sfxBus); s.start(n); },
    crunch(gain) { const n = ctx.currentTime; for (let i = 0; i < 4; i++) { const s = noise(.08), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 1500; f.Q.value = 2; env(g, n + i * .16, .003, .07, gain); s.connect(f).connect(g).connect(sfxBus); s.start(n + i * .16); } },
  };
  async function play(name, gain = 1, rate = 1, delay = 0) {
    if (!ctx || !on) return;
    if (name[0] === '@') { setTimeout(() => on && SYN[name.slice(1)]?.(gain), delay * 1000); return; }
    const b = await load(name); if (!b || !on) return;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = rate; g.gain.value = gain;
    s.connect(g).connect(sfxBus); s.start(ctx.currentTime + delay);
  }

  function prefetch() { if (!ctx || !on || !species) return; filesFor(species.id).forEach(load); }
  function emit() { listeners.forEach(f => f(on, vol)); }
  async function setOn(v) {
    on = v; localStorage.oaSound = v ? 'on' : 'off';
    if (v) { ensure(); if (ctx.state !== 'running') { try { await ctx.resume(); } catch {} } unlocked = ctx.state === 'running'; if (species) { setAmb(species.amb); prefetch(); } }
    applyLevel(); emit();
  }
  // If the user previously chose "on", we still need a gesture before audio can start.
  if (on) {
    const unlock = () => { removeEventListener('pointerdown', unlock, true); removeEventListener('keydown', unlock, true); if (on && !unlocked) setOn(true); };
    addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
  }
  return {
    get on() { return on; }, get vol() { return vol; }, get ext() { return EXT; }, get state() { return ctx?.state || 'none'; },
    toggle() { return setOn(!on); }, setOn,
    setVolume(v) { vol = Math.max(0, Math.min(1, v)); localStorage.oaVol = vol.toFixed(2); applyLevel(true); emit(); },
    onChange(f) { listeners.add(f); f(on, vol); },
    /** called on species switch */
    setSpecies(id, amb) { species = { id, amb }; if (ctx && on) { setAmb(amb); prefetch(); } },
    /** called when the active behaviour changes */
    behavior(sp, b) { const e = SFX[`${sp}_${b}`]; if (e) play(e[0], e[1], e[2] ?? 1, e[3] ?? 0); },
    splash(size = 1) { play(SPLASH, Math.min(1, .6 + size * .4), 1, 0); },
    _debug: () => ({ ctx: ctx?.state, ambKey, loaded: [...buf.keys()], ext: EXT }),
  };
}
