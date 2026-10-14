import {
  isProfileComplete,
  joinButtonLabel,
  joinTypeOf,
  roleLabel,
} from '../src/social/labels';

describe('player profile', () => {
  test('a new account still needs a role', () => {
    expect(isProfileComplete({ profileCompleted: false, displayName: 'Asha', playingRole: 'unspecified' })).toBe(false);
  });

  test('a saved role completes the profile', () => {
    expect(isProfileComplete({ profileCompleted: true, displayName: 'Asha', playingRole: 'batter' })).toBe(true);
  });

  test('older profiles without the flag use the chosen role', () => {
    expect(isProfileComplete({ displayName: 'Asha', playingRole: 'bowler' })).toBe(true);
    expect(isProfileComplete({ displayName: 'Asha', playingRole: 'unspecified' })).toBe(false);
  });
});

describe('group joining', () => {
  test('open groups join immediately and requests wait for an admin', () => {
    expect(joinButtonLabel('open', null)).toBe('Join');
    expect(joinButtonLabel('request', null)).toBe('Request to join');
    expect(joinButtonLabel('approval', null)).toBe('Request approval');
    expect(joinButtonLabel('request', 'pending')).toBe('Requested');
  });

  test('older public groups stay open when join type is missing', () => {
    expect(joinTypeOf({ visibility: 'public' })).toBe('open');
    expect(joinTypeOf({ visibility: 'private' })).toBe('request');
    expect(joinTypeOf({ visibility: 'invite-only' })).toBe('approval');
  });

  test('group roles use the admin and member names', () => {
    expect(roleLabel('owner')).toBe('Group Admin');
    expect(roleLabel('member')).toBe('Member');
    expect(roleLabel('captain')).toBe('Match Captain');
  });
});
