import { applyDeliveryToMatch, finalizeLiveMatchIfNeeded, runsDelivery, wicketDelivery } from '../src/utils/applyScoringDelivery';
import { createLiveMatch } from '../src/utils/createLiveMatch';
import {
  applyCrewAfterDelivery,
  crewReady,
  declareMatchResult,
  deliveryWithCrew,
  fallOfWicketsFor,
  partnershipsFor,
  placeBatter,
  placeBowler,
  suggestedResult,
} from '../src/utils/playerScoring';
import type { InningsCrew, MatchSummary } from '../src/types/match';

const sideA = [
  { userId: 1, name: 'Asha' },
  { userId: 2, name: 'Dev' },
  { userId: 3, name: 'Rae' },
];
const sideB = [
  { userId: 8, name: 'Kai' },
  { userId: 9, name: 'Noor' },
  { userId: 10, name: 'Sam' },
];

function groupMatch() {
  return createLiveMatch({
    id: 'group-test',
    groupId: 4,
    teamAName: 'North',
    teamBName: 'South',
    oversPerSide: 2,
    wicketsPerSide: 3,
    toss: { winnerSide: 1, elected: 'bowl' },
    scorerUserId: 9,
    squads: [{ players: sideA }, { players: sideB }],
  });
}

function ready(match: MatchSummary): MatchSummary {
  const crew = match.crews?.[0];
  if (!crew) throw new Error('missing crew');
  const withBatters = placeBatter(placeBatter(crew, 1, 'striker')!, 2, 'nonStriker')!;
  return { ...match, crews: [placeBowler(withBatters, 9), match.crews![1]] };
}

function ball(match: MatchSummary, delivery: Parameters<typeof applyDeliveryToMatch>[1]) {
  const result = applyDeliveryToMatch(match, delivery);
  if (!result.ok) throw new Error(result.reason);
  return result.match;
}

describe('toss and squads', () => {
  test('bowling after winning the toss sends the other side in', () => {
    const match = groupMatch();
    expect(match.innings[0].teamName).toBe('North');
    expect(match.toss).toEqual({ winnerTeamId: match.innings[1].teamId, elected: 'bowl' });
    expect(match.crews?.[0].yetToBat).toEqual([1, 2, 3]);
    expect(match.scorerUserId).toBe(9);
  });

  test('a quick match stays a team total', () => {
    const match = createLiveMatch({
      teamAName: 'A',
      teamBName: 'B',
      oversPerSide: 1,
      wicketsPerSide: 2,
      batFirst: 0,
    });
    const scored = ball(match, runsDelivery(4));
    expect(scored.innings[0].overReplay?.[0].deliveries[0].players).toBeUndefined();
    expect(scored.crews).toBeUndefined();
  });
});

describe('strike and wickets', () => {
  const base: InningsCrew = {
    strikerId: 1,
    nonStrikerId: 2,
    bowlerId: 9,
    yetToBat: [3],
    dismissedIds: [],
  };

  test('a single rotates the strike and the end of an over rotates it back', () => {
    const afterSingle = applyCrewAfterDelivery(base, runsDelivery(1), false);
    expect(afterSingle.strikerId).toBe(2);
    const lastBall = applyCrewAfterDelivery(base, runsDelivery(1), true);
    expect(lastBall.strikerId).toBe(1);
    expect(lastBall.bowlerId).toBe(9);
  });

  test('a wide penalty does not rotate, but the extra run does', () => {
    const plain = applyCrewAfterDelivery(base, { type: 'wide', label: 'Wd', wideRuns: 0 }, false);
    expect(plain.strikerId).toBe(1);
    const extra = applyCrewAfterDelivery(base, { type: 'wide', label: 'Wd+1', wideRuns: 1 }, false);
    expect(extra.strikerId).toBe(2);
  });

  test('bowled removes the striker, and the last ball of the over leaves the partner on strike', () => {
    const mid = applyCrewAfterDelivery(
      base,
      deliveryWithCrew(base, wicketDelivery('bowled'))!,
      false,
    );
    expect(mid.strikerId).toBeNull();
    expect(mid.nonStrikerId).toBe(2);
    expect(mid.dismissedIds).toEqual([1]);

    const close = applyCrewAfterDelivery(
      base,
      deliveryWithCrew(base, wicketDelivery('bowled'))!,
      true,
    );
    expect(close.strikerId).toBe(2);
    expect(close.nonStrikerId).toBeNull();
  });

  test('a run-out after one run removes the batter who finished at that end', () => {
    const nonStrikerOut = deliveryWithCrew(base, {
      ...wicketDelivery('run-out', { runOutRuns: 1 }),
      players: { strikerId: 1, nonStrikerId: 2, bowlerId: 9, dismissedId: 2, fielderIds: [8] },
    })!;
    const next = applyCrewAfterDelivery(base, nonStrikerOut, false);
    expect(next.strikerId).toBeNull();
    expect(next.nonStrikerId).toBe(1);
    expect(next.dismissedIds).toEqual([2]);
  });

  test('caught and stumped need the fielder who completed the dismissal', () => {
    expect(deliveryWithCrew(base, wicketDelivery('caught'))).toBeNull();
    const caught = deliveryWithCrew(base, {
      ...wicketDelivery('caught'),
      players: { strikerId: 1, nonStrikerId: 2, bowlerId: 9, fielderIds: [10] },
    });
    expect(caught?.players).toMatchObject({ strikerId: 1, bowlerId: 9, dismissedId: 1, fielderIds: [10] });
  });
});

describe('scorecard story', () => {
  test('partnerships and fall of wickets follow the balls', () => {
    let match = ready(groupMatch());
    match = ball(match, runsDelivery(1));
    match = ball(match, runsDelivery(4));
    match = ball(match, {
      ...wicketDelivery('caught'),
      players: { strikerId: 1, nonStrikerId: 2, bowlerId: 9, fielderIds: [10] },
    });
    const innings = match.innings[0];
    const partnerships = partnershipsFor(innings);
    expect(partnerships).toHaveLength(1);
    expect(partnerships[0]).toMatchObject({ batterIds: [1, 2], runs: 5, balls: 3, unbroken: false });
    const fall = fallOfWicketsFor(innings);
    expect(fall).toEqual([
      expect.objectContaining({ score: '5/1', over: '0.3', dismissedId: 2, dismissal: 'caught', fielderIds: [10] }),
    ]);
    expect(crewReady(match.crews![0], 3)).toBe(false);
  });

  test('the scorer confirms the result, and the balls then lock', () => {
    let match = ready(groupMatch());
    match = { ...match, scoringActiveInnings: 1, innings: [ { ...match.innings[0], runs: 5 }, match.innings[1] ] };
    match = { ...match, crews: [match.crews![0], placeBowler(placeBatter(placeBatter(match.crews![1], 8, 'striker')!, 10, 'nonStriker')!, 1)] };
    match = ball(match, runsDelivery(6));
    expect(suggestedResult(match)?.kind).toBe('win');
    expect(finalizeLiveMatchIfNeeded(match).status).toBe('live');
    const closed = declareMatchResult(match, 'win');
    expect(closed.result).toBe('win');
    expect(closed.locked).toBe(true);
    expect(applyDeliveryToMatch(closed, runsDelivery(1)).ok).toBe(false);
    expect(declareMatchResult(match, 'no-result').result).toBe('no-result');
  });
});
