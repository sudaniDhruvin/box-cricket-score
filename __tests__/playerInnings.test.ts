import { runsDelivery, wicketDelivery } from '../src/utils/applyScoringDelivery';
import {
  battingPlayerIds,
  bowlingPlayerIds,
  emptySquad,
  noBatterToCome,
  recordSquadDelivery,
  setCreaseBatter,
  setOpeningCrease,
} from '../src/utils/playerInnings';

const striker = 'bat-a';
const nonStriker = 'bat-b';
const bowler = 'bowl-a';
const otherBowler = 'bowl-b';

function openMatch() {
  return setOpeningCrease(
    emptySquad('g1', [striker, nonStriker, 'bat-c'], [bowler, otherBowler]),
    striker,
    nonStriker,
    bowler,
  );
}

describe('recordSquadDelivery', () => {
  it('credits the striker and swaps ends on a single', () => {
    const next = recordSquadDelivery(openMatch(), 0, runsDelivery(1), {
      changeBowler: false,
    });
    const line = next.batting[0].find(row => row.playerId === striker);
    expect(line).toMatchObject({ runs: 1, balls: 1 });
    expect(next.crease.strikerId).toBe(nonStriker);
    expect(next.crease.nonStrikerId).toBe(striker);
    expect(next.bowling[0][0]).toMatchObject({
      playerId: bowler,
      legalBalls: 1,
      runs: 1,
      wickets: 0,
    });
  });

  it('keeps strike on a four and counts the boundary', () => {
    const next = recordSquadDelivery(openMatch(), 0, runsDelivery(4), {
      changeBowler: false,
    });
    expect(next.batting[0][0]).toMatchObject({
      playerId: striker,
      runs: 4,
      fours: 1,
    });
    expect(next.crease.strikerId).toBe(striker);
  });

  it('does not charge a wide to the batter and does not cross on the penalty', () => {
    const next = recordSquadDelivery(
      openMatch(),
      0,
      { type: 'wide', label: 'Wd', wideRuns: 0 },
      { changeBowler: false },
    );
    expect(next.batting[0][0]).toMatchObject({ runs: 0, balls: 0 });
    expect(next.bowling[0][0]).toMatchObject({ legalBalls: 0, runs: 1 });
    expect(next.crease.strikerId).toBe(striker);
  });

  it('gives a bowler wicket for bowled and clears the striker', () => {
    const next = recordSquadDelivery(
      openMatch(),
      0,
      wicketDelivery('bowled'),
      { changeBowler: false, dismissedPlayerId: striker },
    );
    expect(next.batting[0].find(row => row.playerId === striker)?.dismissal).toBe(
      'bowled',
    );
    expect(next.bowling[0][0].wickets).toBe(1);
    expect(next.crease.strikerId).toBeNull();
    expect(next.crease.nonStrikerId).toBe(nonStriker);
  });

  it('does not give the bowler a run-out wicket', () => {
    const next = recordSquadDelivery(
      openMatch(),
      0,
      wicketDelivery('run-out', { runOutRuns: 1 }),
      { changeBowler: false, dismissedPlayerId: striker },
    );
    expect(next.bowling[0][0].wickets).toBe(0);
    expect(next.crease.nonStrikerId).toBeNull();
    expect(next.crease.strikerId).toBe(nonStriker);
  });

  it('lets the W player bat for both sides and bowl only off the crease', () => {
    const wildcard = 'w-player';
    const squad = setOpeningCrease(
      emptySquad('g1', [striker, nonStriker], [bowler, otherBowler], wildcard),
      striker,
      nonStriker,
      bowler,
    );
    expect(battingPlayerIds(squad, 0)).toEqual([striker, nonStriker, wildcard]);
    expect(battingPlayerIds(squad, 1)).toEqual([bowler, otherBowler, wildcard]);
    expect(bowlingPlayerIds(squad, 0)).toEqual([bowler, otherBowler, wildcard]);

    const atCrease = setOpeningCrease(squad, wildcard, nonStriker, bowler);
    expect(bowlingPlayerIds(atCrease, 0)).toEqual([bowler, otherBowler]);

    const cameInToBat = setCreaseBatter(
      setOpeningCrease(squad, striker, nonStriker, wildcard),
      'striker',
      wildcard,
    );
    expect(cameInToBat.crease.bowlerId).toBeNull();
    expect(cameInToBat.crease.strikerId).toBe(wildcard);
  });

  it('ends the innings when a wicket leaves nobody to come in', () => {
    const open = setOpeningCrease(
      emptySquad('g1', [striker, nonStriker], [bowler, otherBowler]),
      striker,
      nonStriker,
      bowler,
    );
    const oneLeft = recordSquadDelivery(open, 0, wicketDelivery('bowled'), {
      changeBowler: false,
      dismissedPlayerId: striker,
    });
    expect(noBatterToCome(open, 0)).toBe(false);
    expect(oneLeft.crease.strikerId).toBeNull();
    expect(noBatterToCome(oneLeft, 0)).toBe(true);
  });

  it('swaps ends and clears the bowler when the over is finished', () => {
    const next = recordSquadDelivery(openMatch(), 0, runsDelivery(0), {
      changeBowler: true,
    });
    expect(next.crease.strikerId).toBe(nonStriker);
    expect(next.crease.nonStrikerId).toBe(striker);
    expect(next.crease.bowlerId).toBeNull();
    expect(next.lastBowlerId).toBe(bowler);
  });
});
