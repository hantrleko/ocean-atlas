/**
 * 展区护照。只记走过的翼、打开过的旗舰、本季特展有没有停过。
 * 没有积分，没有排行，没有每日任务。
 */
import { ACTS, FLAGSHIPS, SEASON } from './journey.js';
import { SPECIES } from './species.js';

const KEY = 'oaPassport';

function empty() {
  return { wings: {}, flagships: {}, season: 0 };
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      wings: raw.wings && typeof raw.wings === 'object' ? raw.wings : {},
      flagships: raw.flagships && typeof raw.flagships === 'object' ? raw.flagships : {},
      season: raw.season ? 1 : 0,
    };
  } catch {
    return empty();
  }
}

function save(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* 隐私模式 */ }
}

export function loadPassport() {
  return load();
}

export function allWingsSeen() {
  const p = load();
  return ACTS.every(a => p.wings[a.id]);
}

export function markVisit(wingId, speciesId) {
  const p = load();
  if (wingId && ACTS.some(a => a.id === wingId)) p.wings[wingId] = 1;
  if (speciesId && FLAGSHIPS.some(f => f.id === speciesId)) p.flagships[speciesId] = 1;
  save(p);
  return p;
}

export function markSeason() {
  const p = load();
  p.season = 1;
  save(p);
  return p;
}

export function passportSummary() {
  const p = load();
  return {
    seasonSeen: !!p.season,
    seasonTitle: SEASON.title,
    seasonKicker: SEASON.kicker,
    wings: ACTS.map(a => ({ id: a.id, title: a.title, kicker: a.kicker, seen: !!p.wings[a.id] })),
    flagships: FLAGSHIPS.map(f => ({
      id: f.id,
      moment: f.moment,
      seen: !!p.flagships[f.id],
      name: SPECIES.find(s => s.id === f.id)?.name || f.id,
    })),
  };
}
