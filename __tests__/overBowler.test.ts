import {
  applyDeliveryToMatch,
  prepareNextOverSlot,
  runsDelivery,
} from '../src/utils/applyScoringDelivery';
import { createLiveMatch } from '../src/utils/createLiveMatch';
import { setCreaseBowler, setOpeningCrease } from '../src/utils/playerInnings';

describe('over bowler', () => {
  it('records who bowled each over in a group match', () => {
    let match = createLiveMatch({
      teamAName: 'A',
      teamBName: 'B',
      oversPerSide: 2,
      wicketsPerSide: 6,
      batFirst: 0,
      groupId: 'g1',
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
    });
    match = {
      ...match,
      squad: setOpeningCrease(match.squad!, 'a1', 'a2', 'b1'),
    };

    for (let ball = 0; ball < 6; ball += 1) {
      const result = applyDeliveryToMatch(match, runsDelivery(0), 'Rahul');
      expect(result.ok).toBe(true);
      if (result.ok) {
        match = result.match;
      }
    }

    expect(match.innings[0].overReplay?.[0]).toMatchObject({
      overNumber: 1,
      bowlerId: 'b1',
      bowlerName: 'Rahul',
    });

    const prepared = prepareNextOverSlot(match.innings[0]);
    expect(prepared.overReplay?.[0].bowlerId).toBe('b1');
    expect(prepared.overReplay?.[1]?.bowlerId).toBeUndefined();

    match = {
      ...match,
      innings: [prepared, match.innings[1]],
      squad: setCreaseBowler(match.squad!, 'b2'),
    };
    const next = applyDeliveryToMatch(match, runsDelivery(1), 'Amit');
    expect(next.ok).toBe(true);
    if (!next.ok) {
      return;
    }
    expect(next.match.innings[0].overReplay?.[0].bowlerId).toBe('b1');
    expect(next.match.innings[0].overReplay?.[1]).toMatchObject({
      bowlerId: 'b2',
      bowlerName: 'Amit',
    });
  });
});
