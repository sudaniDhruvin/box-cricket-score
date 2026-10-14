export type JoinType = 'open' | 'request' | 'approval';

export type PlayingRole = 'batter' | 'bowler' | 'all-rounder' | 'wicketkeeper';

export const PLAYING_ROLES: Array<{ value: PlayingRole; label: string }> = [
  { value: 'batter', label: 'Batsman' },
  { value: 'bowler', label: 'Bowler' },
  { value: 'all-rounder', label: 'All-rounder' },
  { value: 'wicketkeeper', label: 'Wicketkeeper' },
];

export const BATTING_STYLES: Array<{ value: string; label: string }> = [
  { value: 'right-handed', label: 'Right-handed' },
  { value: 'left-handed', label: 'Left-handed' },
  { value: 'unspecified', label: 'Not set' },
];

export const BOWLING_STYLES = [
  'Right-arm fast',
  'Right-arm spin',
  'Left-arm fast',
  'Left-arm spin',
];

export const JOIN_TYPES: Array<{ value: JoinType; label: string; hint: string }> = [
  { value: 'open', label: 'Open', hint: 'Anyone can join immediately.' },
  { value: 'request', label: 'Request to join', hint: 'An admin approves or rejects each request.' },
  { value: 'approval', label: 'Admin approval', hint: 'Joining waits for the group admin.' },
];

export function isProfileComplete(profile: {
  profileCompleted?: boolean;
  playingRole?: string;
  displayName?: string;
}): boolean {
  if (typeof profile.profileCompleted === 'boolean') return profile.profileCompleted;
  return Boolean(profile.displayName?.trim()) && Boolean(profile.playingRole) && profile.playingRole !== 'unspecified';
}

export function joinTypeOf(group: { joinType?: string | null; visibility: string }): JoinType {
  if (group.joinType === 'open' || group.joinType === 'request' || group.joinType === 'approval') {
    return group.joinType;
  }
  if (group.visibility === 'public') return 'open';
  if (group.visibility === 'invite-only') return 'approval';
  return 'request';
}

export function visibilityLabel(value: string): string {
  return value === 'public' ? 'Public' : 'Private';
}

export function joinTypeLabel(type: JoinType): string {
  return JOIN_TYPES.find(item => item.value === type)?.label ?? 'Request to join';
}

export function joinButtonLabel(type: JoinType, status: string | null | undefined): string {
  if (status === 'pending') return 'Requested';
  if (status === 'active') return 'Joined';
  if (type === 'open') return 'Join';
  if (type === 'approval') return 'Request approval';
  return 'Request to join';
}

export function roleLabel(role: string | null | undefined): string {
  if (role === 'owner' || role === 'admin') return 'Group Admin';
  if (role === 'captain') return 'Match Captain';
  return 'Member';
}

export function playingRoleLabel(role: string | null | undefined): string {
  return PLAYING_ROLES.find(item => item.value === role)?.label ?? 'Role not set';
}

export function battingStyleLabel(style: string | null | undefined): string {
  if (!style || style === 'unspecified') return 'Batting style not set';
  return BATTING_STYLES.find(item => item.value === style)?.label ?? style;
}
