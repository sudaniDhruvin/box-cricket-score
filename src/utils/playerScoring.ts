import type {
  Delivery,
  InningsCrew,
  MatchSquad,
  MatchSummary,
  SquadPlayer,
  TeamInnings,
  WicketDismissal,
} from '../types/match';
import { countsAsLegalBall, tallyDeliveryRuns } from './deliveryScoring';

export interface Partnership {
  batterIds: number[];
  runs: number;
  balls: number;
  unbroken: boolean;
}

export interface FallOfWicket {
  wicket: number;
  runs: number;
  score: string;
  /** Cricket notation, first over is 0.1. */
  over: string;
  dismissedId: number;
  dismissal: WicketDismissal;
  bowlerId?: number;
  fielderIds: number[];
}

export type SuggestedResult =
  | { kind: 'win'; teamName: string; detail: string }
  | { kind: 'tie' };

export function emptyCrew(squad: MatchSquad): InningsCrew {
  return {
    strikerId: null,
    nonStrikerId: null,
    bowlerId: null,
    yetToBat: squad.players.map(player => player.userId),
    dismissedIds: [],
  };
}

export function battingSquad(match: MatchSummary, inningsIndex: 0 | 1): MatchSquad | undefined {
  const teamId = match.innings[inningsIndex]?.teamId;
  return match.squads?.find(squad => squad.teamId === teamId);
}

export function bowlingSquad(match: MatchSummary, inningsIndex: 0 | 1): MatchSquad | undefined {
  return battingSquad(match, inningsIndex === 0 ? 1 : 0);
}

export function playerName(squads: MatchSquad[] | undefined, userId: number | null | undefined): string {
  if (userId == null) return 'Player';
  for (const squad of squads ?? []) {
    const found = squad.players.find(player => player.userId === userId);
    if (found) return found.name;
  }
  return 'Player';
}

export function squadPlayer(squad: MatchSquad | undefined, userId: number | null): SquadPlayer | undefined {
  if (userId == null || squad == null) return undefined;
  return squad.players.find(player => player.userId === userId);
}

/** Two batters are required until only one player in the side is left. */
export function crewReady(crew: InningsCrew, squadSize: number): boolean {
  if (crew.bowlerId == null || crew.strikerId == null) return false;
  const notOut = squadSize - crew.dismissedIds.length;
  return notOut < 2 || crew.nonStrikerId != null;
}

export function placeBatter(
  crew: InningsCrew,
  userId: number,
  end: 'striker' | 'nonStriker',
): InningsCrew | null {
  if (!crew.yetToBat.includes(userId)) return null;
  if (end === 'striker' && crew.strikerId != null) return null;
  if (end === 'nonStriker' && crew.nonStrikerId != null) return null;
  return {
    ...crew,
    strikerId: end === 'striker' ? userId : crew.strikerId,
    nonStrikerId: end === 'nonStriker' ? userId : crew.nonStrikerId,
    yetToBat: crew.yetToBat.filter(id => id !== userId),
  };
}

export function placeBowler(crew: InningsCrew, userId: number): InningsCrew {
  return { ...crew, bowlerId: userId };
}

/** Odd bat runs, byes, and extra runs rotate the strike. A wide or no-ball penalty does not. */
export function strikeSwapsForDelivery(delivery: Delivery): boolean {
  switch (delivery.type) {
    case 'single':
    case 'three':
    case 'five':
    case 'bye':
    case 'leg-bye':
      return true;
    case 'wide':
      return (delivery.wideRuns ?? 0) % 2 === 1;
    case 'no-ball':
      return (delivery.noBallRuns ?? 0) % 2 === 1;
    case 'wicket':
      return (delivery.wicketRuns ?? 0) % 2 === 1;
    default:
      return false;
  }
}

function swapEnds(crew: InningsCrew): InningsCrew {
  if (crew.strikerId == null || crew.nonStrikerId == null) return crew;
  return { ...crew, strikerId: crew.nonStrikerId, nonStrikerId: crew.strikerId };
}

function settleCrease(crew: InningsCrew): InningsCrew {
  if (crew.yetToBat.length > 0) return crew;
  if (crew.strikerId == null && crew.nonStrikerId != null) {
    return { ...crew, strikerId: crew.nonStrikerId, nonStrikerId: null };
  }
  return crew;
}

export function deliveryWithCrew(crew: InningsCrew, delivery: Delivery): Delivery | null {
  if (crew.strikerId == null || crew.bowlerId == null) return null;
  const dismissal = delivery.wicketDismissal;
  const needsFielder = dismissal === 'caught' || dismissal === 'stumped' || dismissal === 'run-out';
  const fielders = delivery.players?.fielderIds?.filter(id => id > 0) ?? [];
  if (needsFielder && fielders.length === 0) return null;
  if (dismissal === 'run-out' && delivery.players?.dismissedId == null) return null;
  const dismissedId = delivery.type === 'wicket'
    ? (delivery.players?.dismissedId ?? crew.strikerId)
    : undefined;
  return {
    ...delivery,
    players: {
      strikerId: crew.strikerId,
      ...(crew.nonStrikerId != null ? { nonStrikerId: crew.nonStrikerId } : {}),
      bowlerId: crew.bowlerId,
      ...(dismissedId != null ? { dismissedId } : {}),
      ...(fielders.length > 0 ? { fielderIds: fielders } : {}),
    },
  };
}

/**
 * Rotate the strike for the runs, then again when the over is complete,
 * then take the dismissed batter off the end they finished on.
 */
export function applyCrewAfterDelivery(
  crew: InningsCrew,
  delivery: Delivery,
  overCompleted: boolean,
): InningsCrew {
  let next = strikeSwapsForDelivery(delivery) ? swapEnds(crew) : crew;
  if (overCompleted) next = swapEnds(next);
  const dismissedId = delivery.type === 'wicket' ? delivery.players?.dismissedId : undefined;
  if (dismissedId != null && !next.dismissedIds.includes(dismissedId)) {
    next = {
      ...next,
      dismissedIds: [...next.dismissedIds, dismissedId],
      strikerId: next.strikerId === dismissedId ? null : next.strikerId,
      nonStrikerId: next.nonStrikerId === dismissedId ? null : next.nonStrikerId,
    };
  }
  return settleCrease(next);
}

export function partnershipsFor(innings: TeamInnings): Partnership[] {
  const found: Partnership[] = [];
  for (const over of innings.overReplay ?? []) {
    for (const delivery of over.deliveries) {
      const players = delivery.players;
      if (players?.strikerId == null) continue;
      const ids = [players.strikerId, players.nonStrikerId]
        .filter((id): id is number => id != null)
        .sort((a, b) => a - b);
      const key = ids.join('-');
      const previous = found[found.length - 1];
      if (previous == null || previous.batterIds.join('-') !== key) {
        if (previous) previous.unbroken = false;
        found.push({ batterIds: ids, runs: 0, balls: 0, unbroken: true });
      }
      const current = found[found.length - 1];
      current.runs += tallyDeliveryRuns(delivery);
      if (countsAsLegalBall(delivery)) current.balls += 1;
      if (delivery.type === 'wicket') current.unbroken = false;
    }
  }
  return found;
}

export function fallOfWicketsFor(innings: TeamInnings): FallOfWicket[] {
  const rows: FallOfWicket[] = [];
  let runs = 0;
  let wicket = 0;
  for (const over of innings.overReplay ?? []) {
    let legal = 0;
    for (const delivery of over.deliveries) {
      runs += tallyDeliveryRuns(delivery);
      if (countsAsLegalBall(delivery)) legal += 1;
      if (delivery.type !== 'wicket' || delivery.wicketDismissal == null) continue;
      const dismissedId = delivery.players?.dismissedId;
      if (dismissedId == null) continue;
      wicket += 1;
      rows.push({
        wicket,
        runs,
        score: `${runs}/${wicket}`,
        over: `${over.overNumber - 1}.${legal}`,
        dismissedId,
        dismissal: delivery.wicketDismissal,
        bowlerId: delivery.players?.bowlerId,
        fielderIds: delivery.players?.fielderIds ?? [],
      });
    }
  }
  return rows;
}

export function dismissalLabel(kind: WicketDismissal): string {
  switch (kind) {
    case 'bowled':
      return 'bowled';
    case 'caught':
      return 'caught';
    case 'lbw':
      return 'lbw';
    case 'run-out':
      return 'run out';
    case 'stumped':
      return 'stumped';
    case 'hit-wicket':
      return 'hit wicket';
    case 'retired-hurt':
      return 'retired hurt';
    default:
      return 'out';
  }
}

function legalBalls(innings: TeamInnings): number {
  return innings.overs.fullOvers * 6 + innings.overs.balls;
}

function inningsFinished(innings: TeamInnings, overs: number, wickets: number): boolean {
  if (innings.wickets >= wickets) return true;
  return overs > 0 && legalBalls(innings) >= overs * 6;
}

/** A winner or a tie can be suggested only after the chase is decided. */
export function suggestedResult(match: MatchSummary): SuggestedResult | null {
  if ((match.scoringActiveInnings ?? 0) !== 1) return null;
  const first = match.innings[0];
  const second = match.innings[1];
  const wickets = match.wicketsPerSide ?? 10;
  if (second.runs > first.runs) {
    const left = Math.max(0, wickets - second.wickets);
    return { kind: 'win', teamName: second.teamName, detail: `by ${left} ${left === 1 ? 'wicket' : 'wickets'}` };
  }
  const overs = match.oversPerSide;
  if (overs == null || !inningsFinished(second, overs, wickets)) return null;
  if (second.runs === first.runs) return { kind: 'tie' };
  const margin = first.runs - second.runs;
  return { kind: 'win', teamName: first.teamName, detail: `by ${margin} ${margin === 1 ? 'run' : 'runs'}` };
}

export function declareMatchResult(
  match: MatchSummary,
  outcome: 'win' | 'tie' | 'draw' | 'no-result',
): MatchSummary {
  if (outcome === 'win' || outcome === 'tie') {
    const suggestion = suggestedResult(match);
    if (suggestion?.kind !== outcome) return match;
  }
  const closed: MatchSummary = { ...match, status: 'completed', locked: true, result: outcome };
  if (outcome === 'draw' || outcome === 'no-result' || outcome === 'tie') {
    return { ...closed, margin: { kind: 'tie' } };
  }
  const first = match.innings[0];
  const second = match.innings[1];
  const wickets = match.wicketsPerSide ?? 10;
  if (second.runs > first.runs) {
    const overs = match.oversPerSide ?? 0;
    const ballsRemaining = Math.max(0, overs * 6 - legalBalls(second));
    return {
      ...closed,
      winnerTeamId: second.teamId,
      loserTeamId: first.teamId,
      margin: {
        kind: 'wickets',
        wicketsRemaining: Math.max(0, wickets - second.wickets),
        ...(ballsRemaining > 0 ? { ballsRemaining } : {}),
      },
    };
  }
  return {
    ...closed,
    winnerTeamId: first.teamId,
    loserTeamId: second.teamId,
    margin: { kind: 'runs', byRuns: first.runs - second.runs },
  };
}
