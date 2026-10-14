import type {
  Delivery,
  MatchSummary,
  OverReplay,
  WicketDismissal,
} from '../types/match';
import { countsAsLegalBall, tallyDeliveryRuns } from './deliveryScoring';
import { dismissalLabel, playerName } from './playerScoring';

const BOWLER_WICKETS: ReadonlySet<WicketDismissal> = new Set([
  'bowled',
  'caught',
  'lbw',
  'stumped',
  'hit-wicket',
]);

export type HowOut =
  | { kind: 'not-out' }
  | { kind: 'retired-hurt'; bowlerId: number | null; bowlerName: string }
  | { kind: 'out'; dismissal: WicketDismissal; bowlerId: number | null; bowlerName: string };

export interface BattingLine {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number | null;
  howOut: HowOut;
  /** Best batting total in one innings of this match. */
  highScore: number;
  highScoreNotOut: boolean;
}

export interface BowlingLine {
  legalBalls: number;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number | null;
  dots: number;
  extras: number;
}

export interface FieldingLine {
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface PlayerMatchLine {
  userId: number;
  name: string;
  batting: BattingLine | null;
  bowling: BowlingLine | null;
  fielding: FieldingLine;
  headline: string;
}

export interface BattingTotals {
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  highScore: number;
  highScoreNotOut: boolean;
  strikeRate: number | null;
  average: number | null;
}

export interface BowlingTotals {
  innings: number;
  overs: string;
  legalBalls: number;
  maidens: number;
  runs: number;
  wickets: number;
  dots: number;
  extras: number;
  economy: number | null;
  average: number | null;
  bestWickets: number;
  bestRuns: number;
}

export interface FieldingTotals {
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface PlayerCareer {
  userId: number;
  name: string;
  photoUrl: string | null;
  matches: number;
  batting: BattingTotals;
  bowling: BowlingTotals;
  fielding: FieldingTotals;
}

export type BoardKind = 'runs' | 'wickets' | 'economy' | 'strikeRate' | 'catches' | 'sixes';

export interface BoardRow {
  userId: number;
  name: string;
  photoUrl: string | null;
  value: number;
  detail: string;
}

export interface GroupLeaderboard {
  mine: PlayerCareer | null;
  players: PlayerCareer[];
  boards: Record<BoardKind, BoardRow[]>;
}

interface InningsBat {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  howOut: HowOut;
}

interface BowlingAcc {
  legalBalls: number;
  maidens: number;
  runs: number;
  wickets: number;
  dots: number;
  extras: number;
}

interface PlayerAcc {
  userId: number;
  name: string;
  bats: InningsBat[];
  bowling: BowlingAcc | null;
  fielding: FieldingLine;
}

export function oversNotation(legalBalls: number): string {
  const balls = Math.max(0, Math.floor(legalBalls));
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export function formatRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'N/A';
  return value.toFixed(2);
}

export function battingStrikeRate(runs: number, balls: number): number | null {
  if (balls <= 0) return null;
  return (runs / balls) * 100;
}

export function bowlingEconomy(runs: number, legalBalls: number): number | null {
  if (legalBalls <= 0) return null;
  return runs / (legalBalls / 6);
}

export function battingAverage(runs: number, innings: number, notOuts: number): number | null {
  const outs = innings - notOuts;
  if (outs <= 0) return null;
  return runs / outs;
}

export interface PlayerRating {
  /** 0–10 to one decimal. Null when the player has no rateable figures. */
  score: number | null;
  batting: number | null;
  bowling: number | null;
}

const RATING_AVERAGE_CAP = 50;
const RATING_STRIKE_CAP = 150;
const RATING_BOWL_AVG_BEST = 12;
const RATING_BOWL_AVG_POOR = 40;
const RATING_ECONOMY_BEST = 4;
const RATING_ECONOMY_POOR = 12;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function higherBetter(value: number, cap: number): number {
  if (!Number.isFinite(value) || cap <= 0) return 0;
  return clamp((value / cap) * 10, 0, 10);
}

function lowerBetter(value: number, best: number, poor: number): number {
  if (!Number.isFinite(value) || poor <= best) return 0;
  return clamp(((poor - value) / (poor - best)) * 10, 0, 10);
}

/**
 * Automatic 0–10 rating. Batting uses average (full marks at 50) and strike rate
 * after six balls (full marks at 150). Bowling uses average (12 or lower is full
 * marks, 40 or higher is zero) and economy after six legal balls (4 or lower is
 * full marks, 12 or higher is zero). Only the parts the player has are averaged,
 * so a batter with no bowling is not marked down. Fielding adds up to one point.
 */
export function playerRating(career: Pick<PlayerCareer, 'matches' | 'batting' | 'bowling' | 'fielding'>): PlayerRating {
  if (career.matches <= 0) return { score: null, batting: null, bowling: null };

  const batParts: number[] = [];
  if (career.batting.innings > 0 && career.batting.average != null) {
    batParts.push(higherBetter(career.batting.average, RATING_AVERAGE_CAP));
  }
  if (career.batting.balls >= 6 && career.batting.strikeRate != null) {
    batParts.push(higherBetter(career.batting.strikeRate, RATING_STRIKE_CAP));
  }
  const batting = batParts.length ? batParts.reduce((sum, part) => sum + part, 0) / batParts.length : null;

  const bowlParts: number[] = [];
  if (career.bowling.wickets > 0 && career.bowling.average != null) {
    bowlParts.push(lowerBetter(career.bowling.average, RATING_BOWL_AVG_BEST, RATING_BOWL_AVG_POOR));
  }
  if (career.bowling.legalBalls >= 6 && career.bowling.economy != null) {
    bowlParts.push(lowerBetter(career.bowling.economy, RATING_ECONOMY_BEST, RATING_ECONOMY_POOR));
  }
  const bowling = bowlParts.length ? bowlParts.reduce((sum, part) => sum + part, 0) / bowlParts.length : null;

  const parts = [batting, bowling].filter((part): part is number => part != null);
  const fieldingEvents = career.fielding.catches + career.fielding.stumpings + career.fielding.runOuts;
  let score: number | null = null;
  if (parts.length > 0) {
    const base = parts.reduce((sum, part) => sum + part, 0) / parts.length;
    const bonus = Math.min(1, fieldingEvents * 0.15);
    score = roundTenth(clamp(base + bonus, 0, 10));
  } else if (fieldingEvents > 0) {
    score = roundTenth(clamp(fieldingEvents, 0, 10));
  }

  return {
    score,
    batting: batting == null ? null : roundTenth(batting),
    bowling: bowling == null ? null : roundTenth(bowling),
  };
}

/** Runs credited to the striker. The no-ball penalty, wides, byes, and penalties are excluded. */
export function batterRuns(delivery: Delivery): number {
  if (delivery.type === 'no-ball') return delivery.noBallRuns ?? 0;
  if (delivery.type === 'wide' || delivery.type === 'bye' || delivery.type === 'leg-bye' || delivery.type === 'penalty') {
    return 0;
  }
  return tallyDeliveryRuns(delivery);
}

/** Runs charged to the bowler. Byes, leg-byes, and penalty runs are not. */
export function bowlerRunsConceded(delivery: Delivery): number {
  if (delivery.type === 'bye' || delivery.type === 'leg-bye' || delivery.type === 'penalty') return 0;
  if (delivery.type === 'wide') return 1 + (delivery.wideRuns ?? 0);
  if (delivery.type === 'no-ball') return 1 + (delivery.noBallRuns ?? 0);
  return tallyDeliveryRuns(delivery);
}

/** Wide penalty plus any extra wides, and the no-ball penalty only. */
export function bowlerExtras(delivery: Delivery): number {
  if (delivery.type === 'wide') return 1 + (delivery.wideRuns ?? 0);
  if (delivery.type === 'no-ball') return 1;
  return 0;
}

export function howOutLabel(how: HowOut): string {
  if (how.kind === 'not-out') return 'Not out';
  if (how.kind === 'retired-hurt') {
    return how.bowlerName ? `Retired hurt, facing ${how.bowlerName}` : 'Retired hurt';
  }
  const titled = dismissalLabel(how.dismissal).replace(/\b\w/g, letter => letter.toUpperCase());
  const credited = BOWLER_WICKETS.has(how.dismissal);
  if (credited && how.bowlerName) return `${titled} by ${how.bowlerName}`;
  if (how.bowlerName) return `${titled}, facing ${how.bowlerName}`;
  return titled;
}

export function performanceHeadline(line: Pick<PlayerMatchLine, 'batting' | 'bowling' | 'fielding'>): string {
  const parts: string[] = [];
  if (line.batting) {
    const star = line.batting.howOut.kind === 'out' ? '' : '*';
    parts.push(`${line.batting.runs}${star} (${line.batting.balls})`);
  }
  if (line.bowling) parts.push(`${line.bowling.wickets}/${line.bowling.runs}`);
  if (parts.length > 0) return parts.join(' • ');
  const fielding: string[] = [];
  if (line.fielding.catches > 0) {
    fielding.push(`${line.fielding.catches} ${line.fielding.catches === 1 ? 'catch' : 'catches'}`);
  }
  if (line.fielding.stumpings > 0) {
    fielding.push(`${line.fielding.stumpings} ${line.fielding.stumpings === 1 ? 'stumping' : 'stumpings'}`);
  }
  if (line.fielding.runOuts > 0) {
    fielding.push(`${line.fielding.runOuts} ${line.fielding.runOuts === 1 ? 'run-out' : 'run-outs'}`);
  }
  return fielding.join(' • ') || 'No batting or bowling';
}

export function hasMatchFigures(line: PlayerMatchLine): boolean {
  return line.batting != null
    || line.bowling != null
    || line.fielding.catches > 0
    || line.fielding.stumpings > 0
    || line.fielding.runOuts > 0;
}

export function opponentName(match: MatchSummary, userId: number): string {
  const squads = match.squads ?? [];
  const mine = squads.find(squad => squad.players.some(player => player.userId === userId));
  if (mine) {
    const other = squads.find(squad => squad.teamId !== mine.teamId);
    if (other?.name) return other.name;
  }
  const named = squads.map(squad => squad.name).find(name => name.trim().length > 0);
  return named || 'Opponent';
}

export function matchPlayerLines(match: MatchSummary): PlayerMatchLine[] {
  const names = new Map<number, string>();
  const players = new Map<number, PlayerAcc>();
  for (const squad of match.squads ?? []) {
    for (const player of squad.players) {
      if (player.userId <= 0) continue;
      names.set(player.userId, player.name.trim() || 'Player');
      ensure(players, player.userId, names.get(player.userId) ?? 'Player');
    }
  }

  for (const innings of match.innings ?? []) {
    const inningsBatting = new Map<number, InningsBat>();
    for (const over of innings.overReplay ?? []) {
      const maiden = maidenBowler(over);
      if (maiden != null) {
        const row = ensure(players, maiden, names.get(maiden) ?? playerName(match.squads, maiden));
        row.bowling = row.bowling ?? emptyBowling();
        row.bowling.maidens += 1;
      }
      for (const delivery of over.deliveries ?? []) {
        applyDelivery(players, names, inningsBatting, delivery, match);
      }
    }
    for (const [userId, bat] of inningsBatting) {
      ensure(players, userId, names.get(userId) ?? 'Player').bats.push(bat);
    }
  }

  return [...players.values()]
    .map(row => toLine(row))
    .sort((left, right) => left.name.localeCompare(right.name) || left.userId - right.userId);
}

export function aggregateLines(
  userId: number,
  lines: PlayerMatchLine[],
  photoUrl: string | null = null,
): PlayerCareer {
  const career = emptyCareer(userId, lines.find(line => line.name && line.name !== 'Player')?.name ?? 'Player', photoUrl);
  for (const line of lines) {
    if (line.name && line.name !== 'Player') career.name = career.name === 'Player' ? line.name : career.name;
    career.matches += 1;
    if (line.batting) addBatting(career, line.batting);
    if (line.bowling) addBowling(career, line.bowling);
    career.fielding.catches += line.fielding.catches;
    career.fielding.stumpings += line.fielding.stumpings;
    career.fielding.runOuts += line.fielding.runOuts;
  }
  career.batting.strikeRate = battingStrikeRate(career.batting.runs, career.batting.balls);
  career.batting.average = battingAverage(career.batting.runs, career.batting.innings, career.batting.notOuts);
  career.bowling.overs = oversNotation(career.bowling.legalBalls);
  career.bowling.economy = bowlingEconomy(career.bowling.runs, career.bowling.legalBalls);
  career.bowling.average = career.bowling.wickets > 0 ? career.bowling.runs / career.bowling.wickets : null;
  return career;
}

export function phoneCareer(matches: MatchSummary[], userId: number): PlayerCareer | null {
  const lines = matches.flatMap(match => matchPlayerLines(match).filter(line => line.userId === userId));
  if (lines.length === 0) return null;
  return aggregateLines(userId, lines);
}

export function groupLeaderboard(matches: MatchSummary[], userId: number | null): GroupLeaderboard {
  const grouped = new Map<number, PlayerMatchLine[]>();
  for (const match of matches) {
    for (const line of matchPlayerLines(match)) {
      const bucket = grouped.get(line.userId) ?? [];
      bucket.push(line);
      grouped.set(line.userId, bucket);
    }
  }
  const players = [...grouped.entries()]
    .map(([id, lines]) => aggregateLines(id, lines))
    .sort((left, right) => left.name.localeCompare(right.name) || left.userId - right.userId);
  return {
    mine: userId == null ? null : players.find(player => player.userId === userId) ?? null,
    players,
    boards: buildBoards(players),
  };
}

export function hasExpandedCareer(stats: { batting?: unknown; bowling?: unknown; fielding?: unknown } | null | undefined): boolean {
  return Boolean(stats && stats.batting && stats.bowling && stats.fielding);
}

export function buildBoards(players: PlayerCareer[]): Record<BoardKind, BoardRow[]> {
  const row = (player: PlayerCareer, value: number, kind: BoardKind): BoardRow => ({
    userId: player.userId,
    name: player.name,
    photoUrl: player.photoUrl,
    value,
    detail: kind === 'economy' || kind === 'strikeRate' ? value.toFixed(2) : String(Math.round(value)),
  });
  return {
    runs: sortBoard(players.filter(player => player.batting.runs > 0).map(player => row(player, player.batting.runs, 'runs')), 'desc'),
    wickets: sortBoard(players.filter(player => player.bowling.wickets > 0).map(player => row(player, player.bowling.wickets, 'wickets')), 'desc'),
    economy: sortBoard(
      players.filter(player => player.bowling.legalBalls >= 6 && player.bowling.economy != null).map(player => row(player, player.bowling.economy ?? 0, 'economy')),
      'asc',
    ),
    strikeRate: sortBoard(
      players.filter(player => player.batting.balls >= 6 && player.batting.strikeRate != null).map(player => row(player, player.batting.strikeRate ?? 0, 'strikeRate')),
      'desc',
    ),
    catches: sortBoard(players.filter(player => player.fielding.catches > 0).map(player => row(player, player.fielding.catches, 'catches')), 'desc'),
    sixes: sortBoard(players.filter(player => player.batting.sixes > 0).map(player => row(player, player.batting.sixes, 'sixes')), 'desc'),
  };
}

function sortBoard(rows: BoardRow[], direction: 'asc' | 'desc'): BoardRow[] {
  return [...rows].sort((left, right) => {
    const diff = direction === 'asc' ? left.value - right.value : right.value - left.value;
    if (diff !== 0) return diff;
    return left.name.localeCompare(right.name) || left.userId - right.userId;
  });
}

function emptyBowling(): BowlingAcc {
  return { legalBalls: 0, maidens: 0, runs: 0, wickets: 0, dots: 0, extras: 0 };
}

function emptyFielding(): FieldingLine {
  return { catches: 0, stumpings: 0, runOuts: 0 };
}

function emptyCareer(userId: number, name: string, photoUrl: string | null): PlayerCareer {
  return {
    userId,
    name,
    photoUrl,
    matches: 0,
    batting: {
      innings: 0,
      notOuts: 0,
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      highScore: 0,
      highScoreNotOut: false,
      strikeRate: null,
      average: null,
    },
    bowling: {
      innings: 0,
      overs: '0.0',
      legalBalls: 0,
      maidens: 0,
      runs: 0,
      wickets: 0,
      dots: 0,
      extras: 0,
      economy: null,
      average: null,
      bestWickets: 0,
      bestRuns: 0,
    },
    fielding: emptyFielding(),
  };
}

function ensure(players: Map<number, PlayerAcc>, userId: number, name: string): PlayerAcc {
  if (userId <= 0) {
    return { userId, name: 'Player', bats: [], bowling: null, fielding: emptyFielding() };
  }
  const existing = players.get(userId);
  if (existing) {
    if (existing.name === 'Player' && name && name !== 'Player') existing.name = name;
    return existing;
  }
  const created: PlayerAcc = { userId, name: name || 'Player', bats: [], bowling: null, fielding: emptyFielding() };
  players.set(userId, created);
  return created;
}

function applyDelivery(
  players: Map<number, PlayerAcc>,
  names: Map<number, string>,
  inningsBatting: Map<number, InningsBat>,
  delivery: Delivery,
  match: MatchSummary,
): void {
  const playersOnBall = delivery.players;
  if (!playersOnBall) return;
  const nameOf = (userId: number) => names.get(userId) ?? playerName(match.squads, userId);

  if (playersOnBall.strikerId > 0) {
    const striker = inningsBatting.get(playersOnBall.strikerId) ?? createBat(inningsBatting, playersOnBall.strikerId);
    striker.runs += batterRuns(delivery);
    if (delivery.type !== 'wide') striker.balls += 1;
    const boundary = boundaryCount(delivery);
    striker.fours += boundary.fours;
    striker.sixes += boundary.sixes;
    ensure(players, playersOnBall.strikerId, nameOf(playersOnBall.strikerId));
  }

  if (delivery.type === 'wicket' && playersOnBall.dismissedId != null && playersOnBall.dismissedId > 0) {
    const dismissed = inningsBatting.get(playersOnBall.dismissedId) ?? createBat(inningsBatting, playersOnBall.dismissedId);
    if (dismissed.howOut.kind !== 'out') dismissed.howOut = howOutFor(delivery, nameOf);
    ensure(players, playersOnBall.dismissedId, nameOf(playersOnBall.dismissedId));
  }

  if (playersOnBall.bowlerId > 0) {
    const bowler = ensure(players, playersOnBall.bowlerId, nameOf(playersOnBall.bowlerId));
    bowler.bowling = bowler.bowling ?? emptyBowling();
    const conceded = bowlerRunsConceded(delivery);
    bowler.bowling.runs += conceded;
    bowler.bowling.extras += bowlerExtras(delivery);
    if (countsAsLegalBall(delivery)) {
      bowler.bowling.legalBalls += 1;
      if (conceded === 0) bowler.bowling.dots += 1;
    }
    if (delivery.type === 'wicket' && delivery.wicketDismissal != null && BOWLER_WICKETS.has(delivery.wicketDismissal)) {
      bowler.bowling.wickets += 1;
    }
  }

  if (delivery.type === 'wicket' && delivery.wicketDismissal) {
    const seen = new Set<number>();
    for (const fielderId of playersOnBall.fielderIds ?? []) {
      if (fielderId <= 0 || seen.has(fielderId)) continue;
      seen.add(fielderId);
      const fielder = ensure(players, fielderId, nameOf(fielderId));
      if (delivery.wicketDismissal === 'caught') fielder.fielding.catches += 1;
      else if (delivery.wicketDismissal === 'stumped') fielder.fielding.stumpings += 1;
      else if (delivery.wicketDismissal === 'run-out') fielder.fielding.runOuts += 1;
    }
  }
}

function createBat(map: Map<number, InningsBat>, userId: number): InningsBat {
  const created: InningsBat = { runs: 0, balls: 0, fours: 0, sixes: 0, howOut: { kind: 'not-out' } };
  map.set(userId, created);
  return created;
}

function howOutFor(delivery: Delivery, nameOf: (userId: number) => string): HowOut {
  const bowlerId = delivery.players?.bowlerId ?? null;
  const bowlerName = bowlerId != null && bowlerId > 0 ? nameOf(bowlerId) : '';
  const dismissal = delivery.wicketDismissal ?? 'other';
  if (dismissal === 'retired-hurt') return { kind: 'retired-hurt', bowlerId, bowlerName };
  return { kind: 'out', dismissal, bowlerId, bowlerName };
}

function boundaryCount(delivery: Delivery): { fours: number; sixes: number } {
  if (delivery.type === 'four' || (delivery.type === 'no-ball' && delivery.noBallRuns === 4)) return { fours: 1, sixes: 0 };
  if (delivery.type === 'six' || (delivery.type === 'no-ball' && delivery.noBallRuns === 6)) return { fours: 0, sixes: 1 };
  return { fours: 0, sixes: 0 };
}

function maidenBowler(over: OverReplay): number | null {
  const deliveries = over.deliveries ?? [];
  if (deliveries.length === 0) return null;
  let bowler: number | null = null;
  let legal = 0;
  let runs = 0;
  for (const delivery of deliveries) {
    const bowlerId = delivery.players?.bowlerId;
    if (bowlerId == null || bowlerId <= 0) return null;
    if (bowler == null) bowler = bowlerId;
    else if (bowler !== bowlerId) return null;
    if (countsAsLegalBall(delivery)) legal += 1;
    runs += bowlerRunsConceded(delivery);
  }
  if (legal !== 6 || runs !== 0) return null;
  return bowler;
}

function toLine(row: PlayerAcc): PlayerMatchLine {
  const batting = foldBatting(row.bats);
  const bowling = row.bowling
    ? {
        ...row.bowling,
        overs: oversNotation(row.bowling.legalBalls),
        economy: bowlingEconomy(row.bowling.runs, row.bowling.legalBalls),
      }
    : null;
  const line: PlayerMatchLine = {
    userId: row.userId,
    name: row.name,
    batting,
    bowling,
    fielding: row.fielding,
    headline: '',
  };
  line.headline = performanceHeadline(line);
  return line;
}

function foldBatting(bats: InningsBat[]): BattingLine | null {
  if (bats.length === 0) return null;
  let highScore = -1;
  let highScoreNotOut = false;
  let howOut: HowOut = { kind: 'not-out' };
  const totals = { runs: 0, balls: 0, fours: 0, sixes: 0 };
  for (const bat of bats) {
    totals.runs += bat.runs;
    totals.balls += bat.balls;
    totals.fours += bat.fours;
    totals.sixes += bat.sixes;
    const notOut = bat.howOut.kind !== 'out';
    if (bat.runs > highScore || (bat.runs === highScore && notOut && !highScoreNotOut)) {
      highScore = bat.runs;
      highScoreNotOut = notOut;
    }
    if (howOut.kind !== 'out') {
      if (bat.howOut.kind === 'out' || (bat.howOut.kind === 'retired-hurt' && howOut.kind === 'not-out')) {
        howOut = bat.howOut;
      }
    }
  }
  return {
    ...totals,
    strikeRate: battingStrikeRate(totals.runs, totals.balls),
    howOut,
    highScore: Math.max(0, highScore),
    highScoreNotOut,
  };
}

function addBatting(career: PlayerCareer, batting: BattingLine): void {
  career.batting.innings += 1;
  if (batting.howOut.kind !== 'out') career.batting.notOuts += 1;
  career.batting.runs += batting.runs;
  career.batting.balls += batting.balls;
  career.batting.fours += batting.fours;
  career.batting.sixes += batting.sixes;
  const notOut = batting.highScoreNotOut;
  if (
    career.batting.innings === 1
    || batting.highScore > career.batting.highScore
    || (batting.highScore === career.batting.highScore && notOut && !career.batting.highScoreNotOut)
  ) {
    career.batting.highScore = batting.highScore;
    career.batting.highScoreNotOut = notOut;
  }
}

function addBowling(career: PlayerCareer, bowling: BowlingLine): void {
  const first = career.bowling.innings === 0;
  career.bowling.innings += 1;
  career.bowling.legalBalls += bowling.legalBalls;
  career.bowling.maidens += bowling.maidens;
  career.bowling.runs += bowling.runs;
  career.bowling.wickets += bowling.wickets;
  career.bowling.dots += bowling.dots;
  career.bowling.extras += bowling.extras;
  if (
    first
    || bowling.wickets > career.bowling.bestWickets
    || (bowling.wickets === career.bowling.bestWickets && bowling.runs < career.bowling.bestRuns)
  ) {
    career.bowling.bestWickets = bowling.wickets;
    career.bowling.bestRuns = bowling.runs;
  }
}
