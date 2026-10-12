import type { Delivery, WicketDismissal } from '../types/match';
import type {
  BattingLine,
  BowlingLine,
  Crease,
  MatchSquad,
} from '../types/squad';
import { countsAsLegalBall, tallyDeliveryRuns } from './deliveryScoring';

export function emptyCrease(): Crease {
  return { strikerId: null, nonStrikerId: null, bowlerId: null };
}

export function emptySquad(
  groupId: string,
  firstInningsPlayerIds: string[],
  secondInningsPlayerIds: string[],
  wildcardPlayerId: string | null = null,
): MatchSquad {
  return {
    groupId,
    firstInningsPlayerIds: [...firstInningsPlayerIds],
    secondInningsPlayerIds: [...secondInningsPlayerIds],
    batting: [[], []],
    bowling: [[], []],
    crease: emptyCrease(),
    lastBowlerId: null,
    wildcardPlayerId,
  };
}

function withWildcard(ids: string[], wildcardPlayerId: string | null | undefined): string[] {
  if (wildcardPlayerId == null || ids.includes(wildcardPlayerId)) {
    return ids;
  }
  return [...ids, wildcardPlayerId];
}

export function battingPlayerIds(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
): string[] {
  const side =
    inningsIndex === 0
      ? squad.firstInningsPlayerIds
      : squad.secondInningsPlayerIds;
  return withWildcard(side, squad.wildcardPlayerId);
}

export function bowlingPlayerIds(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
): string[] {
  const fielders =
    inningsIndex === 0
      ? squad.secondInningsPlayerIds
      : squad.firstInningsPlayerIds;
  const wildcardId = squad.wildcardPlayerId;
  if (wildcardId == null) {
    return fielders;
  }
  const batting = wildcardId === squad.crease.strikerId || wildcardId === squad.crease.nonStrikerId;
  if (batting) {
    return fielders;
  }
  return withWildcard(fielders, wildcardId);
}

export function creaseReady(crease: Crease): boolean {
  return (
    crease.strikerId != null &&
    crease.nonStrikerId != null &&
    crease.bowlerId != null
  );
}

/** Runs that make the batters cross. The wide or no-ball penalty does not. */
export function crossingRuns(d: Delivery): number {
  switch (d.type) {
    case 'dot':
      return 0;
    case 'single':
      return 1;
    case 'two':
      return 2;
    case 'three':
      return 3;
    case 'four':
      return 4;
    case 'five':
      return 5;
    case 'six':
      return 6;
    case 'wide':
      return d.wideRuns ?? 0;
    case 'no-ball':
      return d.noBallRuns ?? 0;
    case 'bye':
      return 1;
    case 'wicket':
      return d.wicketRuns ?? 0;
    default:
      return 0;
  }
}

/** Runs credited to the batter who faced the ball. Byes and wides stay extras. */
export function batterRuns(d: Delivery): number {
  switch (d.type) {
    case 'dot':
      return 0;
    case 'single':
      return 1;
    case 'two':
      return 2;
    case 'three':
      return 3;
    case 'four':
      return 4;
    case 'five':
      return 5;
    case 'six':
      return 6;
    case 'no-ball':
      return d.noBallRuns ?? 0;
    case 'wicket':
      return d.wicketRuns ?? 0;
    default:
      return 0;
  }
}

function freshBatting(playerId: string): BattingLine {
  return {
    playerId,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    dismissal: null,
  };
}

function freshBowling(playerId: string): BowlingLine {
  return { playerId, legalBalls: 0, runs: 0, wickets: 0 };
}

function mapLine<T extends { playerId: string }>(
  lines: T[],
  playerId: string,
  create: (id: string) => T,
  patch: (line: T) => T,
): T[] {
  const idx = lines.findIndex(line => line.playerId === playerId);
  if (idx < 0) {
    return [...lines, patch(create(playerId))];
  }
  return lines.map((line, i) => (i === idx ? patch(line) : line));
}

function swapEnds(strikerId: string | null, nonStrikerId: string | null) {
  return { strikerId: nonStrikerId, nonStrikerId: strikerId };
}

export function dismissedPlayers(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
): Set<string> {
  return new Set(
    squad.batting[inningsIndex]
      .filter(line => line.dismissal != null)
      .map(line => line.playerId),
  );
}

export function waitingBatters(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
): string[] {
  const out = dismissedPlayers(squad, inningsIndex);
  const crease = squad.crease;
  const occupied = new Set(
    [crease.strikerId, crease.nonStrikerId].filter(
      (id): id is string => id != null,
    ),
  );
  return battingPlayerIds(squad, inningsIndex).filter(
    id => !out.has(id) && !occupied.has(id),
  );
}

/**
 * A wicket left an empty crease and every other batter is already out.
 * The innings cannot continue, even if the wicket cap is one higher.
 */
export function noBatterToCome(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
): boolean {
  const { strikerId, nonStrikerId } = squad.crease;
  if (strikerId != null && nonStrikerId != null) {
    return false;
  }
  return waitingBatters(squad, inningsIndex).length === 0;
}

/** Live group name when it still resolves, otherwise the name saved on the over. */
export function overBowlerLabel(
  over: { bowlerId?: string | null; bowlerName?: string | null },
  nameOf?: (playerId: string) => string,
): string | null {
  if (over.bowlerId && nameOf) {
    const live = nameOf(over.bowlerId);
    if (live && live !== 'Player') {
      return live;
    }
  }
  if (over.bowlerName && over.bowlerName !== 'Player') {
    return over.bowlerName;
  }
  return null;
}

export function nextBowlerOptions(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
): string[] {
  const all = bowlingPlayerIds(squad, inningsIndex);
  const blocked = squad.lastBowlerId;
  const others = blocked != null ? all.filter(id => id !== blocked) : all;
  return others.length > 0 ? others : all;
}

export type RecordSquadOptions = {
  /** True when this legal ball completed the over and the innings is still going. */
  changeBowler: boolean;
  dismissedPlayerId?: string | null;
};

/**
 * Credits the facing batter and the bowler, crosses for odd runs, drops an
 * out batter, and at the end of a continuing over swaps ends and clears the bowler.
 */
export function recordSquadDelivery(
  squad: MatchSquad,
  inningsIndex: 0 | 1,
  delivery: Delivery,
  options: RecordSquadOptions,
): MatchSquad {
  const crease = squad.crease;
  const strikerId = crease.strikerId;
  const bowlerId = crease.bowlerId;
  if (strikerId == null || bowlerId == null) {
    return squad;
  }

  const faced = countsAsLegalBall(delivery);
  const runsForBatter = batterRuns(delivery);
  const isFour =
    delivery.type === 'four' ||
    (delivery.type === 'no-ball' && delivery.noBallRuns === 4);
  const isSix =
    delivery.type === 'six' ||
    (delivery.type === 'no-ball' && delivery.noBallRuns === 6);

  const batting = [...squad.batting] as [BattingLine[], BattingLine[]];
  batting[inningsIndex] = mapLine(
    batting[inningsIndex],
    strikerId,
    freshBatting,
    line => ({
      ...line,
      runs: line.runs + runsForBatter,
      balls: line.balls + (faced ? 1 : 0),
      fours: line.fours + (isFour ? 1 : 0),
      sixes: line.sixes + (isSix ? 1 : 0),
    }),
  );

  const bowling = [...squad.bowling] as [BowlingLine[], BowlingLine[]];
  const bowlerWicket =
    delivery.type === 'wicket' && delivery.wicketDismissal !== 'run-out';
  bowling[inningsIndex] = mapLine(
    bowling[inningsIndex],
    bowlerId,
    freshBowling,
    line => ({
      ...line,
      legalBalls: line.legalBalls + (faced ? 1 : 0),
      runs: line.runs + tallyDeliveryRuns(delivery),
      wickets: line.wickets + (bowlerWicket ? 1 : 0),
    }),
  );

  let nextStriker: string | null = strikerId;
  let nextNonStriker: string | null = crease.nonStrikerId;
  if (crossingRuns(delivery) % 2 === 1) {
    const swapped = swapEnds(nextStriker, nextNonStriker);
    nextStriker = swapped.strikerId;
    nextNonStriker = swapped.nonStrikerId;
  }

  const dismissedId = options.dismissedPlayerId ?? null;
  if (dismissedId != null && delivery.type === 'wicket') {
    const howOut: WicketDismissal = delivery.wicketDismissal ?? 'other';
    batting[inningsIndex] = mapLine(
      batting[inningsIndex],
      dismissedId,
      freshBatting,
      line => ({ ...line, dismissal: howOut }),
    );
    if (nextStriker === dismissedId) {
      nextStriker = null;
    }
    if (nextNonStriker === dismissedId) {
      nextNonStriker = null;
    }
  }

  let nextBowler: string | null = bowlerId;
  let lastBowlerId = squad.lastBowlerId;
  if (options.changeBowler) {
    const swapped = swapEnds(nextStriker, nextNonStriker);
    nextStriker = swapped.strikerId;
    nextNonStriker = swapped.nonStrikerId;
    lastBowlerId = bowlerId;
    nextBowler = null;
  }

  return {
    ...squad,
    batting,
    bowling,
    lastBowlerId,
    crease: {
      strikerId: nextStriker,
      nonStrikerId: nextNonStriker,
      bowlerId: nextBowler,
    },
  };
}

export function setCreaseBatter(
  squad: MatchSquad,
  end: 'striker' | 'nonStriker',
  playerId: string,
): MatchSquad {
  const crease: Crease = {
    ...squad.crease,
    strikerId: end === 'striker' ? playerId : squad.crease.strikerId,
    nonStrikerId:
      end === 'nonStriker' ? playerId : squad.crease.nonStrikerId,
  };
  if (
    crease.bowlerId != null &&
    (crease.bowlerId === crease.strikerId ||
      crease.bowlerId === crease.nonStrikerId)
  ) {
    crease.bowlerId = null;
  }
  return { ...squad, crease };
}

export function setCreaseBowler(squad: MatchSquad, playerId: string): MatchSquad {
  return {
    ...squad,
    crease: { ...squad.crease, bowlerId: playerId },
  };
}

/** Opens an innings: two batters and a bowler, with no previous bowler to exclude. */
export function setOpeningCrease(
  squad: MatchSquad,
  strikerId: string,
  nonStrikerId: string,
  bowlerId: string,
): MatchSquad {
  return {
    ...squad,
    lastBowlerId: null,
    crease: { strikerId, nonStrikerId, bowlerId },
  };
}
