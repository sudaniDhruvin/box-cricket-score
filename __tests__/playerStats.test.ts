import { applyDeliveryToMatch, runsDelivery } from '../src/utils/applyScoringDelivery';
import { createLiveMatch } from '../src/utils/createLiveMatch';
import { placeBatter, placeBowler } from '../src/utils/playerScoring';
import {
  groupLeaderboard,
  howOutLabel,
  matchPlayerLines,
  opponentName,
  phoneCareer,
  playerRating,
  type PlayerCareer,
} from '../src/utils/playerStats';
import type { Delivery, DeliveryPlayers, MatchSummary, OverReplay, TeamInnings } from '../src/types/match';

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

const facing: DeliveryPlayers = { strikerId: 1, nonStrikerId: 2, bowlerId: 9 };

function delivery(partial: Delivery, players?: Partial<DeliveryPlayers>): Delivery {
  return { ...partial, players: { ...facing, ...partial.players, ...players } };
}

function innings(teamId: string, teamName: string, overs: OverReplay[]): TeamInnings {
  return {
    teamId,
    teamName,
    runs: 0,
    wickets: 0,
    overs: { fullOvers: 0, balls: 0 },
    fours: 0,
    sixes: 0,
    extras: { wides: 0, noBalls: 0 },
    overReplay: overs,
  };
}

function played(first: OverReplay[], second: OverReplay[] = []): MatchSummary {
  return {
    id: 'stats-match',
    playedAt: '2026-08-12T10:00:00.000Z',
    groupId: 4,
    innings: [innings('a', 'North', first), innings('b', 'South', second)],
    winnerTeamId: 'a',
    loserTeamId: 'b',
    margin: { kind: 'tie' },
    squads: [
      { teamId: 'a', name: 'North', players: sideA },
      { teamId: 'b', name: 'South', players: sideB },
    ],
  };
}

function over(deliveries: Delivery[], overNumber = 1): OverReplay {
  return { overNumber, deliveries };
}

function line(match: MatchSummary, userId: number) {
  const found = matchPlayerLines(match).find(item => item.userId === userId);
  if (!found) throw new Error(`missing player ${userId}`);
  return found;
}

describe('batting, bowling, and fielding for one match', () => {
  const match = played([
    over([
      delivery({ type: 'four', label: '4' }),
      delivery({ type: 'no-ball', label: 'Nb+4', noBallRuns: 4 }),
      delivery({ type: 'wide', label: 'Wd+4', wideRuns: 4 }),
      delivery({ type: 'bye', label: 'B' }),
      delivery({ type: 'six', label: '6' }),
      delivery({ type: 'wicket', label: 'W', wicketDismissal: 'bowled', players: { ...facing, dismissedId: 1 } }),
    ]),
  ]);

  test('credits the striker and the bowler without charging byes or the no-ball bat runs as extras', () => {
    const asha = line(match, 1);
    expect(asha.batting).toMatchObject({ runs: 14, balls: 5, fours: 2, sixes: 1, strikeRate: 280 });
    expect(asha.batting?.howOut).toMatchObject({ kind: 'out', dismissal: 'bowled', bowlerId: 9, bowlerName: 'Noor' });
    expect(asha.headline).toBe('14 (5)');
    expect(howOutLabel(asha.batting!.howOut)).toBe('Bowled by Noor');

    const noor = line(match, 9);
    expect(noor.bowling).toMatchObject({
      legalBalls: 4,
      overs: '0.4',
      maidens: 0,
      runs: 20,
      wickets: 1,
      dots: 2,
      extras: 6,
      economy: 30,
    });
    expect(noor.headline).toBe('1/20');
    expect(opponentName(match, 1)).toBe('South');
  });

  test('the headline joins batting and bowling for the same player', () => {
    const combined = played(
      [over([delivery({ type: 'four', label: '4' })])],
      [over([
        delivery({
          type: 'wicket',
          label: 'W',
          wicketDismissal: 'bowled',
          players: { strikerId: 8, nonStrikerId: 10, bowlerId: 1, dismissedId: 8 },
        }),
      ])],
    );
    expect(line(combined, 1).headline).toBe('4* (1) • 1/0');
  });

  test('a wide boundary is not a four for the batter', () => {
    expect(line(match, 1).batting?.fours).toBe(2);
  });

  test('a squad player who never faces has no batting line', () => {
    const rae = line(match, 3);
    expect(rae.batting).toBeNull();
    expect(rae.bowling).toBeNull();
    expect(rae.headline).toBe('No batting or bowling');
  });
});

describe('dismissals and fielding', () => {
  test('retired hurt is not out and does not credit the bowler', () => {
    const match = played([
      over([
        delivery({
          type: 'wicket',
          label: 'Ret',
          wicketDismissal: 'retired-hurt',
          players: { ...facing, dismissedId: 1 },
        }),
      ]),
    ]);
    const asha = line(match, 1);
    expect(asha.batting?.howOut.kind).toBe('retired-hurt');
    expect(asha.headline).toBe('0* (1)');
    expect(line(match, 9).bowling?.wickets).toBe(0);
    const career = phoneCareer([match], 1);
    expect(career?.batting.notOuts).toBe(1);
    expect(career?.batting.average).toBeNull();
  });

  test('a run-out credits every named fielder once and gives completed runs to the striker', () => {
    const match = played([
      over([
        delivery({
          type: 'wicket',
          label: 'RO+1',
          wicketDismissal: 'run-out',
          wicketRuns: 1,
          players: { ...facing, dismissedId: 2, fielderIds: [8, 10, 10] },
        }),
      ]),
    ]);
    expect(line(match, 1).batting).toMatchObject({ runs: 1, balls: 1 });
    expect(line(match, 1).batting?.howOut.kind).toBe('not-out');
    expect(line(match, 2).batting).toMatchObject({ runs: 0, balls: 0 });
    expect(line(match, 2).batting?.howOut).toMatchObject({ kind: 'out', dismissal: 'run-out', bowlerName: 'Noor' });
    expect(howOutLabel(line(match, 2).batting!.howOut)).toBe('Run Out, facing Noor');
    expect(line(match, 9).bowling).toMatchObject({ wickets: 0, runs: 1 });
    expect(line(match, 8).fielding.runOuts).toBe(1);
    expect(line(match, 10).fielding.runOuts).toBe(1);
  });

  test('the bowler keeps the catch, and a stumping is not a catch', () => {
    const caught = played([
      over([
        delivery({
          type: 'wicket',
          label: 'W',
          wicketDismissal: 'caught',
          players: { ...facing, dismissedId: 1, fielderIds: [9] },
        }),
      ]),
    ]);
    expect(line(caught, 9).fielding.catches).toBe(1);
    expect(line(caught, 9).bowling?.wickets).toBe(1);

    const stumped = played([
      over([
        delivery({
          type: 'wicket',
          label: 'W',
          wicketDismissal: 'stumped',
          players: { ...facing, dismissedId: 1, fielderIds: [10, 10] },
        }),
      ]),
    ]);
    expect(line(stumped, 10).fielding).toMatchObject({ catches: 0, stumpings: 1, runOuts: 0 });
    expect(line(stumped, 9).bowling?.wickets).toBe(1);
  });

  test('other and a four completed before a wicket do not become a boundary or a bowler wicket', () => {
    const match = played([
      over([
        delivery({
          type: 'wicket',
          label: 'W+4',
          wicketDismissal: 'other',
          wicketRuns: 4,
          players: { ...facing, dismissedId: 1 },
        }),
      ]),
    ]);
    expect(line(match, 1).batting).toMatchObject({ runs: 4, fours: 0, sixes: 0 });
    expect(line(match, 9).bowling).toMatchObject({ wickets: 0, runs: 4, dots: 0 });
  });
});

describe('maidens and dots', () => {
  test('six dots by one bowler is a maiden, including an over of byes', () => {
    const dots = played([over(Array.from({ length: 6 }, () => delivery({ type: 'dot', label: '0' })))]);
    expect(line(dots, 9).bowling).toMatchObject({ maidens: 1, dots: 6, legalBalls: 6, overs: '1.0', runs: 0, economy: 0 });

    const byes = played([over(Array.from({ length: 6 }, () => delivery({ type: 'bye', label: 'B' })))]);
    expect(line(byes, 9).bowling).toMatchObject({ maidens: 1, dots: 6, runs: 0 });
  });

  test('a split over, a short over, and a wide are not maidens', () => {
    const split = played([
      over([
        ...Array.from({ length: 3 }, () => delivery({ type: 'dot', label: '0' })),
        ...Array.from({ length: 3 }, () => delivery({ type: 'dot', label: '0' }, { bowlerId: 8 })),
      ]),
    ]);
    expect(line(split, 9).bowling?.maidens).toBe(0);
    expect(line(split, 8).bowling?.maidens).toBe(0);

    const short = played([over(Array.from({ length: 5 }, () => delivery({ type: 'dot', label: '0' })))]);
    expect(line(short, 9).bowling?.maidens).toBe(0);

    const withWide = played([
      over([
        delivery({ type: 'wide', label: 'Wd' }),
        ...Array.from({ length: 6 }, () => delivery({ type: 'dot', label: '0' })),
      ]),
    ]);
    expect(line(withWide, 9).bowling).toMatchObject({ maidens: 0, legalBalls: 6, extras: 1, runs: 1 });
  });

  test('a penalty is not charged to the bowler and still counts as a dot ball', () => {
    const match = played([over([delivery({ type: 'penalty', label: 'p+5' })])]);
    expect(line(match, 1).batting).toMatchObject({ runs: 0, balls: 1 });
    expect(line(match, 9).bowling).toMatchObject({ runs: 0, dots: 1, extras: 0, legalBalls: 1 });
  });
});

describe('career and leaderboards', () => {
  const first = played([
    over([
      delivery({ type: 'four', label: '4' }),
      delivery({ type: 'six', label: '6' }),
    ]),
  ]);

  test('one batting innings per match, with the higher innings kept as the high score', () => {
    const both = played(
      [over([delivery({ type: 'single', label: '1' })])],
      [over([delivery({ type: 'four', label: '4' }, { strikerId: 1, bowlerId: 8 })])],
    );
    const asha = line(both, 1);
    expect(asha.batting).toMatchObject({ runs: 5, balls: 2, highScore: 4, highScoreNotOut: true });
    const career = phoneCareer([first, both], 1);
    expect(career?.batting).toMatchObject({
      innings: 2,
      notOuts: 2,
      runs: 15,
      highScore: 10,
      highScoreNotOut: true,
      average: null,
    });
  });

  test('an out innings sets the average, and the best bowling is the larger haul', () => {
    const out = played([
      over([
        delivery({ type: 'single', label: '1' }),
        delivery({ type: 'wicket', label: 'W', wicketDismissal: 'lbw', players: { ...facing, dismissedId: 1 } }),
      ]),
    ]);
    const haul = played([
      over([
        delivery({ type: 'dot', label: '0' }, { strikerId: 8, bowlerId: 1 }),
        delivery({
          type: 'wicket',
          label: 'W',
          wicketDismissal: 'bowled',
          players: { strikerId: 8, nonStrikerId: 10, bowlerId: 1, dismissedId: 8 },
        }),
        delivery({
          type: 'wicket',
          label: 'W',
          wicketDismissal: 'caught',
          players: { strikerId: 10, nonStrikerId: 9, bowlerId: 1, dismissedId: 10, fielderIds: [2] },
        }),
      ]),
    ]);
    const career = phoneCareer([out, haul], 1);
    expect(career?.batting).toMatchObject({ innings: 1, notOuts: 0, runs: 1, average: 1 });
    expect(career?.bowling).toMatchObject({ innings: 1, wickets: 2, runs: 0, bestWickets: 2, bestRuns: 0 });
    expect(career?.fielding.catches).toBe(0);
    expect(phoneCareer([haul], 2)?.fielding.catches).toBe(1);
  });

  test('economy and strike rate need an over, and equal runs are ordered by name', () => {
    const tied = played([
      over([
        delivery({ type: 'four', label: '4' }),
        delivery({ type: 'six', label: '6' }),
        delivery({ type: 'four', label: '4' }, { strikerId: 2 }),
        delivery({ type: 'six', label: '6' }, { strikerId: 2 }),
      ]),
    ]);
    const rates = played([
      over(Array.from({ length: 3 }, () => delivery({ type: 'single', label: '1' }))),
      over(Array.from({ length: 6 }, () => delivery({ type: 'dot', label: '0' }, { strikerId: 2 })), 2),
    ]);
    const boards = groupLeaderboard([tied, rates], 1).boards;
    expect(boards.runs.map(item => item.userId)).toEqual([1, 2]);
    expect(boards.runs[0].detail).toBe('13');
    expect(boards.strikeRate.map(item => item.userId)).toEqual([2]);
    expect(boards.economy.map(item => item.name)).toEqual(['Noor']);
    expect(boards.sixes.map(item => item.userId)).toEqual([1, 2]);
    expect(boards.wickets).toEqual([]);
    expect(boards.catches).toEqual([]);
    expect(groupLeaderboard([tied], 3).mine?.batting.runs).toBe(0);
  });
});

describe('live scoring stamps', () => {
  test('a four entered with the crew is the striker four and one ball for the bowler', () => {
    const created = createLiveMatch({
      id: 'group-test',
      groupId: 4,
      teamAName: 'North',
      teamBName: 'South',
      oversPerSide: 2,
      wicketsPerSide: 3,
      toss: { winnerSide: 1, elected: 'bowl' },
      squads: [{ players: sideA }, { players: sideB }],
    });
    const crew = placeBowler(placeBatter(placeBatter(created.crews![0], 1, 'striker')!, 2, 'nonStriker')!, 9);
    const started = { ...created, crews: [crew, created.crews![1]] as typeof created.crews };
    const scored = applyDeliveryToMatch(started, runsDelivery(4));
    if (!scored.ok) throw new Error(scored.reason);
    expect(line(scored.match, 1).headline).toBe('4* (1)');
    expect(line(scored.match, 9).bowling).toMatchObject({ legalBalls: 1, runs: 4, dots: 0 });
    expect(matchPlayerLines(createLiveMatch({ teamAName: 'A', teamBName: 'B', oversPerSide: 1, wicketsPerSide: 2 }))).toEqual([]);
  });
});

function rated(patch: {
  matches?: number;
  batting?: Partial<PlayerCareer['batting']>;
  bowling?: Partial<PlayerCareer['bowling']>;
  fielding?: Partial<PlayerCareer['fielding']>;
}): PlayerCareer {
  return {
    userId: 1,
    name: 'Asha',
    photoUrl: null,
    matches: patch.matches ?? 1,
    batting: {
      innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, highScore: 0, highScoreNotOut: false, strikeRate: null, average: null,
      ...patch.batting,
    },
    bowling: {
      innings: 0, overs: '0.0', legalBalls: 0, maidens: 0, runs: 0, wickets: 0, dots: 0, extras: 0, economy: null, average: null, bestWickets: 0, bestRuns: 0,
      ...patch.bowling,
    },
    fielding: { catches: 0, stumpings: 0, runOuts: 0, ...patch.fielding },
  };
}

describe('player rating', () => {
  test('a player with no matches stays unrated', () => {
    expect(playerRating(rated({ matches: 0 }))).toEqual({ score: null, batting: null, bowling: null });
  });

  test('a batter is rated from average and strike rate, with no bowling penalty', () => {
    const rating = playerRating(rated({
      batting: { innings: 4, average: 40, balls: 20, strikeRate: 120 },
    }));
    expect(rating.batting).toBe(8);
    expect(rating.bowling).toBeNull();
    expect(rating.score).toBe(8);
  });

  test('bowling uses a lower average and economy as a better score', () => {
    const strong = playerRating(rated({
      bowling: { wickets: 3, average: 12, legalBalls: 12, economy: 4 },
    }));
    const poor = playerRating(rated({
      bowling: { wickets: 1, average: 40, legalBalls: 12, economy: 12 },
    }));
    expect(strong).toMatchObject({ batting: null, bowling: 10, score: 10 });
    expect(poor).toMatchObject({ batting: null, bowling: 0, score: 0 });
  });

  test('batting and bowling are averaged, and fielding adds at most one point', () => {
    const mixed = playerRating(rated({
      batting: { innings: 2, average: 40, balls: 20, strikeRate: 120 },
      bowling: { wickets: 2, average: 26, legalBalls: 3, economy: null },
      fielding: { catches: 2 },
    }));
    expect(mixed).toMatchObject({ batting: 8, bowling: 5, score: 6.8 });
    const capped = playerRating(rated({
      batting: { innings: 1, average: 50, balls: 20, strikeRate: 200 },
      fielding: { catches: 10 },
    }));
    expect(capped.score).toBe(10);
  });

  test('a short not-out innings is unrated, and fielding alone still scores', () => {
    expect(playerRating(rated({
      batting: { innings: 1, notOuts: 1, balls: 3, average: null, strikeRate: 100 },
    })).score).toBeNull();
    expect(playerRating(rated({ fielding: { catches: 2, runOuts: 1 } })).score).toBe(3);
  });
});
