import type {
  Delivery,
  MatchSummary,
  OverReplay,
  TeamInnings,
  WicketDismissal,
} from '../types/match';
import { countsAsLegalBall, tallyDeliveryRuns } from './deliveryScoring';

export type ApplyDeliveryResult =
  | { ok: true; match: MatchSummary; overJustCompleted?: OverReplay }
  | {
      ok: false;
      reason:
        | 'innings_overs_complete'
        | 'all_out'
        | 'match_complete';
    };

const MAX_WICKETS = 10;

function cloneInnings(inn: TeamInnings): TeamInnings {
  return {
    ...inn,
    overs: { ...inn.overs },
    extras: {
      wides: inn.extras.wides,
      noBalls: inn.extras.noBalls,
      byes: inn.extras.byes ?? 0,
    },
    overReplay: inn.overReplay
      ? inn.overReplay.map(o => ({
          overNumber: o.overNumber,
          deliveries: [...o.deliveries],
        }))
      : undefined,
  };
}

function legalBallsBowled(inn: TeamInnings): number {
  return inn.overs.fullOvers * 6 + inn.overs.balls;
}

function advanceOvers(o: TeamInnings['overs']): TeamInnings['overs'] {
  const { fullOvers, balls } = o;
  if (balls < 5) {
    return { fullOvers, balls: balls + 1 };
  }
  return { fullOvers: fullOvers + 1, balls: 0 };
}

export function legalCountInOver(deliveries: Delivery[]): number {
  return deliveries.filter(countsAsLegalBall).length;
}

function ensureCurrentOverSlice(replay: OverReplay[]): OverReplay[] {
  if (replay.length === 0) {
    return [{ overNumber: 1, deliveries: [] }];
  }
  const last = replay[replay.length - 1];
  if (legalCountInOver(last.deliveries) >= 6) {
    return [...replay, { overNumber: last.overNumber + 1, deliveries: [] }];
  }
  return replay;
}

function appendToOverReplay(inn: TeamInnings, d: Delivery): TeamInnings {
  const base: OverReplay[] =
    inn.overReplay != null
      ? inn.overReplay.map(o => ({
          overNumber: o.overNumber,
          deliveries: [...o.deliveries],
        }))
      : [{ overNumber: 1, deliveries: [] }];

  const withSlot = ensureCurrentOverSlice(base);
  const idx = withSlot.length - 1;
  const last = withSlot[idx];
  const nextOver = {
    ...last,
    deliveries: [...last.deliveries, d],
  };
  const nextReplay = [...withSlot.slice(0, idx), nextOver];
  return { ...inn, overReplay: nextReplay };
}

function applyStats(inn: TeamInnings, d: Delivery): TeamInnings {
  let next = { ...inn };
  const runs = tallyDeliveryRuns(d);
  next.runs += runs;

  switch (d.type) {
    case 'wide':
      next.extras = { ...next.extras, wides: next.extras.wides + 1 };
      break;
    case 'no-ball':
      next.extras = { ...next.extras, noBalls: next.extras.noBalls + 1 };
      break;
    case 'bye':
      next.extras = {
        ...next.extras,
        byes: (next.extras.byes ?? 0) + 1,
      };
      break;
    case 'four':
      next.fours += 1;
      break;
    case 'five':
      break;
    case 'six':
      next.sixes += 1;
      break;
    case 'wicket':
      next.wickets += 1;
      break;
    default:
      break;
  }

  if (countsAsLegalBall(d)) {
    next.overs = advanceOvers(next.overs);
  }

  return next;
}

export function wicketDelivery(dismissal: WicketDismissal): Delivery {
  const label = dismissal === 'run-out' ? 'RO' : 'W';
  return {
    type: 'wicket',
    label,
    wicketDismissal: dismissal,
  };
}

export function runsDelivery(runs: 0 | 1 | 2 | 3 | 4 | 5 | 6): Delivery {
  switch (runs) {
    case 0:
      return { type: 'dot', label: '0' };
    case 1:
      return { type: 'single', label: '1' };
    case 2:
      return { type: 'two', label: '2' };
    case 3:
      return { type: 'three', label: '3' };
    case 4:
      return { type: 'four', label: '4' };
    case 5:
      return { type: 'five', label: '5' };
    case 6:
      return { type: 'six', label: '6' };
    default:
      return { type: 'dot', label: '0' };
  }
}

export function applyDeliveryToMatch(
  match: MatchSummary,
  d: Delivery,
): ApplyDeliveryResult {
  if (match.status === 'completed') {
    return { ok: false, reason: 'match_complete' };
  }

  const idx = match.scoringActiveInnings ?? 0;
  const oversCap = match.oversPerSide;
  if (oversCap == null) {
    return { ok: false, reason: 'innings_overs_complete' };
  }

  let inn = cloneInnings(match.innings[idx]);

  const legalSoFar = legalBallsBowled(inn);
  const limitBalls = oversCap * 6;
  if (legalSoFar >= limitBalls) {
    return { ok: false, reason: 'innings_overs_complete' };
  }

  if (inn.wickets >= MAX_WICKETS) {
    return { ok: false, reason: 'all_out' };
  }

  inn = applyStats(inn, d);
  inn = appendToOverReplay(inn, d);

  let overJustCompleted: OverReplay | undefined;
  if (countsAsLegalBall(d) && inn.overReplay && inn.overReplay.length > 0) {
    const last = inn.overReplay[inn.overReplay.length - 1];
    if (legalCountInOver(last.deliveries) === 6) {
      overJustCompleted = {
        overNumber: last.overNumber,
        deliveries: [...last.deliveries],
      };
    }
  }

  const nextInnings: [TeamInnings, TeamInnings] =
    idx === 0 ? [inn, match.innings[1]] : [match.innings[0], inn];

  return {
    ok: true,
    match: {
      ...match,
      innings: nextInnings,
    },
    ...(overJustCompleted != null ? { overJustCompleted } : {}),
  };
}

export function isInningsComplete(
  inn: TeamInnings,
  oversPerSide: number,
): boolean {
  if (inn.wickets >= MAX_WICKETS) {
    return true;
  }
  if (oversPerSide > 0) {
    return legalBallsBowled(inn) >= oversPerSide * 6;
  }
  return false;
}

/**
 * After a delivery in the second innings, set status + winner/margin when the
 * match outcome is decided (chase, all-out/overs exhausted, or tie).
 */
export function finalizeLiveMatchIfNeeded(match: MatchSummary): MatchSummary {
  if (match.status === 'completed') {
    return match;
  }
  if (match.scoringActiveInnings !== 1) {
    return match;
  }
  const oversCap = match.oversPerSide;
  if (oversCap == null) {
    return match;
  }

  const first = match.innings[0];
  const second = match.innings[1];

  if (second.runs > first.runs) {
    const ballsRem = Math.max(0, oversCap * 6 - legalBallsBowled(second));
    return {
      ...match,
      status: 'completed',
      winnerTeamId: second.teamId,
      loserTeamId: first.teamId,
      margin: {
        kind: 'wickets',
        wicketsRemaining: MAX_WICKETS - second.wickets,
        ballsRemaining: ballsRem > 0 ? ballsRem : undefined,
      },
    };
  }

  if (!isInningsComplete(second, oversCap)) {
    return match;
  }

  if (second.runs === first.runs) {
    return {
      ...match,
      status: 'completed',
      winnerTeamId: first.teamId,
      loserTeamId: second.teamId,
      margin: { kind: 'tie' },
    };
  }

  return {
    ...match,
    status: 'completed',
    winnerTeamId: first.teamId,
    loserTeamId: second.teamId,
    margin: { kind: 'runs', byRuns: first.runs - second.runs },
  };
}

/**
 * After 6 legal balls, the replay ends with that full over. Append an empty next
 * over so the scorer UI is on the new over before any ball is entered.
 */
export function prepareNextOverSlot(inn: TeamInnings): TeamInnings {
  const replay = inn.overReplay;
  if (replay == null || replay.length === 0) {
    return inn;
  }
  const last = replay[replay.length - 1];
  if (last.deliveries.length === 0) {
    return inn;
  }
  if (legalCountInOver(last.deliveries) !== 6) {
    return inn;
  }
  const nextNum = last.overNumber + 1;
  const nextReplay: OverReplay[] = [
    ...replay.map(o => ({
      overNumber: o.overNumber,
      deliveries: [...o.deliveries],
    })),
    { overNumber: nextNum, deliveries: [] },
  ];
  return { ...inn, overReplay: nextReplay };
}
