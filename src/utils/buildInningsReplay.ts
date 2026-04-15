import type { Delivery, OverReplay, TeamInnings } from '../types/match';

/** Deterministic 0..1 values from a seed (Park–Miller LCG). */
function lcg(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483646;
  if (s <= 0) {
    s += 2147483646;
  }
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickDistinctIndices(
  rng: () => number,
  max: number,
  count: number,
  exclude: Set<number>,
): number[] {
  const out: number[] = [];
  let safety = 0;
  while (out.length < count && safety < max * 80) {
    safety += 1;
    const i = Math.floor(rng() * max);
    if (exclude.has(i)) {
      continue;
    }
    exclude.add(i);
    out.push(i);
  }
  return out;
}

/** Runs off bat on legal balls (approx): total minus simple extras estimate. */
function batRunsTarget(inn: TeamInnings): number {
  const byes = inn.extras.byes ?? 0;
  const offExtras = inn.extras.wides + inn.extras.noBalls + byes;
  return Math.max(0, inn.runs - offExtras);
}

type Slot =
  | { k: 'w' }
  | { k: '6' }
  | { k: '4' }
  | { k: 'r'; runs: number };

function slotRuns(s: Slot): number {
  if (s.k === 'w') {
    return 0;
  }
  if (s.k === '6') {
    return 6;
  }
  if (s.k === '4') {
    return 4;
  }
  return s.runs;
}

function slotToDelivery(s: Slot): Delivery {
  if (s.k === 'w') {
    return { type: 'wicket', label: 'W' };
  }
  if (s.k === '6') {
    return { type: 'six', label: '6' };
  }
  if (s.k === '4') {
    return { type: 'four', label: '4' };
  }
  const r = s.runs;
  if (r === 0) {
    return { type: 'dot', label: '0' };
  }
  if (r === 1) {
    return { type: 'single', label: '1' };
  }
  if (r === 2) {
    return { type: 'two', label: '2' };
  }
  return { type: 'three', label: '3' };
}

/**
 * Builds a plausible over-by-over replay that matches legal ball count, wickets,
 * fours, sixes, and total runs (with a simple extras model). Deterministic per innings.
 */
export function buildInningsReplay(inn: TeamInnings): OverReplay[] {
  const legalBalls = inn.overs.fullOvers * 6 + inn.overs.balls;
  const L = legalBalls;
  const W = Math.min(inn.wickets, L);
  const sixNeed = Math.min(inn.sixes, L - W);
  const fourNeed = Math.min(inn.fours, L - W - sixNeed);

  const seed =
    inn.teamId.split('').reduce((a, c) => Math.imul(31, a) + c.charCodeAt(0), 0) +
    inn.runs * 131 +
    L * 17;
  const rng = lcg(seed);

  const used = new Set<number>();
  const wIx = pickDistinctIndices(rng, L, W, used);
  wIx.forEach(i => used.add(i));
  const sixIx = pickDistinctIndices(rng, L, sixNeed, used);
  sixIx.forEach(i => used.add(i));
  const fourIx = pickDistinctIndices(rng, L, fourNeed, used);
  fourIx.forEach(i => used.add(i));

  const slots: Slot[] = [];
  for (let i = 0; i < L; i++) {
    if (wIx.includes(i)) {
      slots.push({ k: 'w' });
    } else if (sixIx.includes(i)) {
      slots.push({ k: '6' });
    } else if (fourIx.includes(i)) {
      slots.push({ k: '4' });
    } else {
      slots.push({ k: 'r', runs: 0 });
    }
  }

  let target = batRunsTarget(inn);
  let sum = slots.reduce((a, s) => a + slotRuns(s), 0);
  let diff = target - sum;

  const bumpable = () =>
    slots
      .map((s, i) => ({ s, i }))
      .filter(
        ({ s }) =>
          s.k === 'r' && s.runs < 3,
      );

  while (diff > 0) {
    const cands = bumpable();
    if (cands.length === 0) {
      break;
    }
    const pick = cands[Math.floor(rng() * cands.length)];
    (slots[pick.i] as { k: 'r'; runs: number }).runs += 1;
    diff -= 1;
    sum += 1;
  }

  while (diff < 0 && sum > target) {
    const rIdx = slots.findIndex(s => s.k === 'r' && s.runs > 0);
    if (rIdx === -1) {
      break;
    }
    (slots[rIdx] as { k: 'r'; runs: number }).runs -= 1;
    diff += 1;
    sum -= 1;
  }

  const legalDeliveries = slots.map(slotToDelivery);

  const wides = inn.extras.wides;
  const nbs = inn.extras.noBalls;
  const byes = inn.extras.byes ?? 0;

  const extrasPool: Delivery[] = [];

  for (let i = 0; i < wides; i++) {
    const extra = rng() > 0.62 ? 1 + Math.floor(rng() * 3) : 0;
    extrasPool.push({
      type: 'wide',
      label: extra > 0 ? `Wd+${extra}` : 'Wd',
      wideRuns: extra,
    });
  }
  for (let i = 0; i < nbs; i++) {
    const extra = rng() > 0.52 ? Math.floor(rng() * 5) : 0;
    extrasPool.push({
      type: 'no-ball',
      label: extra > 0 ? `Nb+${extra}` : 'Nb',
      noBallRuns: extra,
    });
  }
  for (let i = 0; i < byes; i++) {
    extrasPool.push({ type: 'bye', label: 'By' });
  }

  const numOvers = L === 0 ? 0 : Math.ceil(L / 6);
  const overs: OverReplay[] = [];

  for (let o = 0; o < numOvers; o++) {
    const start = o * 6;
    const chunk = legalDeliveries.slice(start, start + 6);
    overs.push({
      overNumber: o + 1,
      deliveries: [...chunk],
    });
  }

  for (let e = 0; e < extrasPool.length; e++) {
    const o = e % Math.max(1, overs.length);
    if (overs[o]) {
      const insAt = 1 + Math.floor(rng() * (overs[o].deliveries.length + 1));
      overs[o].deliveries.splice(insAt, 0, extrasPool[e]);
    }
  }

  if (overs.length === 0 && extrasPool.length > 0) {
    overs.push({ overNumber: 1, deliveries: [...extrasPool] });
  }

  return overs;
}

export function getInningsReplay(innings: TeamInnings): OverReplay[] {
  if (innings.overReplay !== undefined) {
    return innings.overReplay;
  }
  return buildInningsReplay(innings);
}
