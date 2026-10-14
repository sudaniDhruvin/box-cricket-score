import { API_BASE_URL } from '../config/api';
import type { BattingTotals, BowlingTotals, FieldingTotals, GroupLeaderboard } from '../utils/playerStats';
import { getAccessToken } from './session';

type ApiEnvelope<T> = {
  data: T;
  meta?: Record<string, unknown>;
  error?: { message?: string; details?: Record<string, unknown> } | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  authenticated?: boolean;
};

const baseUrl = API_BASE_URL.replace(/\/+$/, '');

function isTechnicalMessage(message: string): boolean {
  return /json|boolean|integer|\bobject\b|\burl\b|\bfield\b|oauth|firebase|\bapi\b|sql|exception|payload|endpoint|yyyy-mm-dd|bytes|clientUpdatedAt|profilePublic|scheduledAt|src\/|token|stack|undefined|\bnull\b|status code|\(\d{3}\)/i.test(message);
}

function toUserMessage(message: string | undefined, status: number, fallback: string): string {
  const text = message?.trim() ?? '';
  if (text && !isTechnicalMessage(text)) return text;
  if (status === 401) return 'Please sign in again.';
  if (status === 403) return 'You cannot do that.';
  if (status === 404) return 'That could not be found.';
  if (status === 409) return 'That is already saved or no longer available.';
  if (status === 422) return 'Check the details and try again.';
  if (status === 429) return 'Too many attempts. Wait a few minutes and try again.';
  return fallback;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (!baseUrl) {
    throw new ApiError('Sign-in is not available right now. Try again later.', 0);
  }
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (options.authenticated !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(
      'Could not connect. Check your internet and try again.',
      0,
    );
  }

  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('Something went wrong. Try again.', response.status);
  }
  if (!response.ok || envelope.error) {
    throw new ApiError(
      toUserMessage(envelope.error?.message, response.status, 'Something went wrong. Try again.'),
      response.status,
      envelope.error?.details,
    );
  }
  return envelope.data;
}

export type ApiUser = {
  id: number;
  email: string;
  username: string;
  displayName: string;
  createdAt?: string | null;
};

export type AuthResult = {
  token: string;
  user: ApiUser;
  expiresIn: number;
};

export type CloudMatch = {
  clientId: string;
  match: import('../types/match').MatchSummary;
  clientUpdatedAt: string;
  revision: number;
  eventComplete: boolean;
  updatedAt: string;
};

export type GroupJoinType = 'open' | 'request' | 'approval';

export type CommunityGroup = {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  visibility: 'public' | 'private' | 'invite-only';
  joinType?: GroupJoinType;
  photoUrl?: string | null;
  coverUrl?: string | null;
  memberCount?: number;
  myRole: 'owner' | 'admin' | 'scorer' | 'member' | null;
  membershipStatus: 'active' | 'pending' | null;
};

export type PlayerSearchResult = {
  userId: number;
  username: string;
  displayName: string;
  playingRole: string;
  photoUrl: string | null;
};

export type CareerStats = {
  matches: number;
  runs: number;
  wickets: number;
  groups: number;
  captaincies: number;
  batting?: BattingTotals;
  bowling?: BowlingTotals;
  fielding?: FieldingTotals;
};

export type { GroupLeaderboard };

export type GroupMember = {
  userId: number;
  username: string;
  displayName: string;
  role: string;
  status: string;
  joinedAt: string | null;
  photoUrl?: string | null;
};

export type GroupPoll = {
  id: number;
  groupId: number;
  question: string;
  description: string | null;
  multipleChoice: boolean;
  anonymous: boolean;
  allowVoteChange: boolean;
  startsAt: string | null;
  closesAt: string | null;
  status: 'open' | 'closed';
  myRole: string;
  author?: { userId: number; username: string; displayName: string; photoUrl: string | null } | null;
  myOptionIds: number[];
  options: Array<{ id: number; label: string; position: number; votes: number }>;
  createdAt: string;
};

export type PostTopic = 'match' | 'practice' | 'meme' | 'announcement' | 'talk';

export type GroupPost = {
  id: number;
  groupId: number;
  body: string;
  topic?: PostTopic | string;
  pinned?: boolean;
  pinnedAt?: string | null;
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
  author: { userId: number; username: string; displayName: string; photoUrl?: string | null };
  photos: Array<{
    id: number;
    url: string;
    mimeType: string;
    width: number | null;
    height: number | null;
    kind?: 'photo' | 'video';
  }>;
  createdAt: string;
  updatedAt: string | null;
};

export type PostComment = {
  id: number;
  postId: number;
  body: string;
  author: { userId: number; username: string; displayName: string; photoUrl?: string | null };
  createdAt: string;
};

export type GroupMatch = {
  id: number;
  clientId: string;
  title: string;
  format: string;
  status: string;
  scheduledAt: string | null;
  teamSize: number;
  oversPerSide: number;
  teams: [string, string];
  scorerUserId?: number | null;
};

export type NotificationItem = {
  id: number;
  kind: string;
  title: string;
  body: string;
  resourceType: string | null;
  resourceId: number | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationInbox = {
  items: NotificationItem[];
  unreadCount: number;
  offset: number;
  limit: number;
  postActivity?: boolean;
};

export type ContentReport = {
  id: number;
  reporterUserId: number;
  resourceType: 'post' | 'photo' | 'poll';
  resourceId: number;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

export type MatchTeam = {
  side: 1 | 2;
  name: string;
  captain: { userId: number; username: string; displayName: string } | null;
  players: Array<{ userId: number; username: string; displayName: string; order: number; status: string }>;
};

export type PlayerProfile = ApiUser & {
  biography: string | null;
  location: string | null;
  playingRole: string;
  battingStyle: string;
  bowlingStyle: string | null;
  dateOfBirth: string | null;
  profilePublic: boolean;
  photoUrl?: string | null;
  profileCompleted?: boolean;
  privacy: {
    showLocation: boolean;
    showGroups: boolean;
    showMatchHistory: boolean;
    showStatistics: boolean;
    showDateOfBirth: boolean;
  };
};

/** Exchange a Google ID token for the cricket API session token. */
export function exchangeGoogleIdToken(idToken: string): Promise<AuthResult> {
  return apiRequest('/auth/google', {
    method: 'POST',
    authenticated: false,
    body: { idToken },
  });
}

export function getPlayerStatistics(username: string): Promise<{
  available: boolean;
  data: CareerStats | null;
  message?: string;
}> {
  return apiRequest(`/players/${encodeURIComponent(username)}/statistics`, {
    authenticated: false,
  });
}

export function getMyStatistics(): Promise<{
  available: boolean;
  data: CareerStats | null;
  message?: string;
}> {
  return apiRequest('/me/statistics');
}

export function searchPlayers(search: string): Promise<PlayerSearchResult[]> {
  return apiRequest(`/players?search=${encodeURIComponent(search.trim())}`);
}

export function getMyProfile(): Promise<PlayerProfile> {
  return apiRequest('/me');
}

export function logoutAccount(): Promise<{ loggedOut: boolean }> {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export function listCloudMatches(): Promise<CloudMatch[]> {
  return apiRequest('/matches?limit=100');
}

export function putCloudMatch(
  clientId: string,
  match: import('../types/match').MatchSummary,
  clientUpdatedAt: string,
): Promise<CloudMatch> {
  const score = { ...match };
  delete score.syncMeta;
  return apiRequest(`/matches/${encodeURIComponent(clientId)}`, {
    method: 'PUT',
    body: {
      match: score,
      clientUpdatedAt,
      groupId: match.groupId ?? null,
      visibility: match.visibility ?? (match.groupId ? 'group' : 'private'),
    },
  });
}

export function deleteCloudMatch(clientId: string): Promise<{ deleted: boolean }> {
  return apiRequest(`/matches/${encodeURIComponent(clientId)}`, {
    method: 'DELETE',
  });
}

export function listGroups(search = ''): Promise<CommunityGroup[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return apiRequest(`/groups${query}`);
}

export function createGroup(input: {
  name: string;
  description?: string;
  location?: string;
  visibility: 'public' | 'private';
  joinType: GroupJoinType;
}): Promise<CommunityGroup> {
  return apiRequest('/groups', { method: 'POST', body: input });
}

export function updateGroup(
  groupId: number,
  input: {
    name?: string;
    description?: string;
    location?: string;
    visibility?: 'public' | 'private';
    joinType?: GroupJoinType;
  },
): Promise<CommunityGroup> {
  return apiRequest(`/groups/${groupId}`, { method: 'PATCH', body: input });
}

export function addGroupMember(groupId: number, username: string): Promise<GroupMember> {
  return apiRequest(`/groups/${groupId}/members`, { method: 'POST', body: { username } });
}

export function removeGroupMember(groupId: number, userId: number): Promise<{ removed: boolean }> {
  return apiRequest(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
}

export function transferGroupAdmin(groupId: number, userId: number): Promise<{ userId: number; role: string }> {
  return apiRequest(`/groups/${groupId}/transfer-admin`, { method: 'POST', body: { userId } });
}

export function joinGroup(groupId: number): Promise<{ status: string }> {
  return apiRequest(`/groups/${groupId}/join-requests`, { method: 'POST', body: {} });
}

export function acceptGroupInvitation(code: string): Promise<{ groupId: number; name: string }> {
  return apiRequest(`/group-invitations/${encodeURIComponent(code)}/accept`, { method: 'POST', body: {} });
}

export function createGroupInvitation(groupId: number, email?: string): Promise<{ invitationCode: string; expiresAt: string }> {
  return apiRequest(`/groups/${groupId}/invitations`, {
    method: 'POST',
    body: email ? { email } : {},
  });
}

export function listGroupMembers(groupId: number): Promise<GroupMember[]> {
  return apiRequest(`/groups/${groupId}/members`);
}

export function updateGroupMember(
  groupId: number,
  userId: number,
  input: { role?: string; status?: string },
): Promise<{ userId: number; role: string; status: string }> {
  return apiRequest(`/groups/${groupId}/members/${userId}`, { method: 'PATCH', body: input });
}

export function listGroupPolls(groupId: number): Promise<GroupPoll[]> {
  return apiRequest(`/groups/${groupId}/polls`);
}

export function createGroupPoll(
  groupId: number,
  input: { question: string; options: string[]; multipleChoice: boolean; anonymous: boolean; allowVoteChange: boolean },
): Promise<GroupPoll> {
  return apiRequest(`/groups/${groupId}/polls`, { method: 'POST', body: input });
}

export function voteInPoll(pollId: number, optionIds: number[]): Promise<GroupPoll> {
  return apiRequest(`/polls/${pollId}/votes`, { method: 'POST', body: { optionIds } });
}

export function closeGroupPoll(pollId: number): Promise<GroupPoll> {
  return apiRequest(`/polls/${pollId}/close`, { method: 'POST', body: {} });
}

export function reportGroupContent(
  groupId: number,
  resourceType: ContentReport['resourceType'],
  resourceId: number,
  reason: string,
): Promise<{ id: number; status: string }> {
  return apiRequest(`/groups/${groupId}/reports`, {
    method: 'POST',
    body: { resourceType, resourceId, reason },
  });
}

export function listGroupReports(groupId: number): Promise<ContentReport[]> {
  return apiRequest(`/groups/${groupId}/reports`);
}

export function reviewGroupReport(
  groupId: number,
  reportId: number,
  status: 'reviewed' | 'dismissed' | 'actioned',
): Promise<{ id: number; status: string }> {
  return apiRequest(`/groups/${groupId}/reports/${reportId}`, { method: 'PATCH', body: { status } });
}

export function listGroupPosts(groupId: number, offset = 0): Promise<GroupPost[]> {
  return apiRequest(`/groups/${groupId}/posts?limit=20&offset=${offset}`);
}

export function createGroupPost(groupId: number, body: string, topic: PostTopic = 'talk'): Promise<GroupPost> {
  return apiRequest(`/groups/${groupId}/posts`, { method: 'POST', body: { body, topic } });
}

export function deleteGroupPost(postId: number): Promise<{ deleted: boolean }> {
  return apiRequest(`/posts/${postId}`, { method: 'DELETE' });
}

export function togglePostLike(postId: number): Promise<GroupPost> {
  return apiRequest(`/posts/${postId}/like`, { method: 'POST', body: {} });
}

export function listPostComments(postId: number): Promise<PostComment[]> {
  return apiRequest(`/posts/${postId}/comments`);
}

export function createPostComment(postId: number, body: string): Promise<PostComment> {
  return apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: { body } });
}

export function deletePostComment(commentId: number): Promise<{ deleted: boolean }> {
  return apiRequest(`/comments/${commentId}`, { method: 'DELETE' });
}

export function pinGroupPost(postId: number, pinned: boolean): Promise<GroupPost> {
  return apiRequest(`/posts/${postId}/pin`, { method: 'POST', body: { pinned } });
}

export async function uploadPostPhotos(
  postId: number,
  photos: UploadFile[],
  videos: UploadFile[] = [],
): Promise<Array<{ id: number; mimeType: string; width: number | null; height: number | null; kind?: 'photo' | 'video' }>> {
  const token = getAccessToken();
  if (!token) throw new ApiError('Sign in before sharing a photo or video.', 401);
  const form = new FormData();
  for (const photo of photos) {
    form.append('photos[]', {
      uri: photo.uri,
      type: photo.type,
      name: photo.fileName,
    } as unknown as Blob);
  }
  for (const video of videos) {
    form.append('videos[]', {
      uri: video.uri,
      type: video.type,
      name: video.fileName,
    } as unknown as Blob);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/posts/${postId}/photos`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Could not upload the photo or video. Check your internet and try again.', 0);
  }
  let envelope: ApiEnvelope<Array<{ id: number; mimeType: string; width: number | null; height: number | null; kind?: 'photo' | 'video' }>>;
  try {
    envelope = (await response.json()) as typeof envelope;
  } catch {
    throw new ApiError('The photo or video could not be uploaded. Try again.', response.status);
  }
  if (!response.ok || envelope.error) {
    throw new ApiError(
      toUserMessage(envelope.error?.message, response.status, 'The photo or video could not be uploaded. Try again.'),
      response.status,
      envelope.error?.details,
    );
  }
  return envelope.data;
}

export function listGroupMatches(groupId: number): Promise<GroupMatch[]> {
  return apiRequest(`/groups/${groupId}/matches`);
}

export function getGroupLeaderboard(groupId: number): Promise<GroupLeaderboard> {
  return apiRequest(`/groups/${groupId}/leaderboard`);
}

export function getGroupMatchScorecard(
  groupId: number,
  matchId: number,
): Promise<{ match: import('../types/match').MatchSummary; status: string; eventComplete: boolean; revision: number }> {
  return apiRequest(`/groups/${groupId}/matches/${matchId}/scorecard`);
}

export function createGroupMatch(
  groupId: number,
  input: { title: string; teams: [string, string]; oversPerSide: number; teamSize: number; format?: string; scheduledAt?: string },
): Promise<{ id: number; clientId: string; status: string; teams: [string, string]; teamSize: number; oversPerSide: number }> {
  return apiRequest(`/groups/${groupId}/matches`, { method: 'POST', body: input });
}

export function getMatchTeams(matchId: number): Promise<MatchTeam[]> {
  return apiRequest(`/matches/${matchId}/teams`);
}

export function selectMatchCaptains(matchId: number, captainUserIds: [number, number]): Promise<{ captainUserIds: number[] }> {
  return apiRequest(`/matches/${matchId}/captains`, { method: 'POST', body: { captainUserIds } });
}

export function pickMatchPlayer(matchId: number, teamSide: 1 | 2, playerUserId: number): Promise<unknown> {
  return apiRequest(`/matches/${matchId}/picks`, { method: 'POST', body: { teamSide, playerUserId } });
}

export function finalizeMatchTeams(matchId: number): Promise<{ status: string; teams: MatchTeam[] }> {
  return apiRequest(`/matches/${matchId}/finalize-teams`, { method: 'POST', body: {} });
}

export function assignMatchScorer(matchId: number, userId: number): Promise<{ scorerUserId: number }> {
  return apiRequest(`/matches/${matchId}/scorer`, { method: 'POST', body: { userId } });
}

export function listNotifications(): Promise<NotificationInbox> {
  return apiRequest('/notifications?limit=50');
}

export function updateNotificationSettings(postActivity: boolean): Promise<{ postActivity: boolean }> {
  return apiRequest('/notifications/settings', { method: 'PATCH', body: { postActivity } });
}

export function markNotificationRead(id: number): Promise<{ read: boolean }> {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH', body: {} });
}

export function updateMyProfile(input: Partial<Pick<PlayerProfile,
  'username' | 'displayName' | 'biography' | 'location' | 'playingRole' | 'battingStyle' | 'bowlingStyle' | 'dateOfBirth' | 'profilePublic' | 'privacy'
>>): Promise<PlayerProfile> {
  return apiRequest('/me', { method: 'PATCH', body: input });
}

export type UploadFile = { uri: string; type: string; fileName: string };

async function uploadMultipart<T>(path: string, field: string, file: UploadFile): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError('Please sign in again.', 401);
  const form = new FormData();
  form.append(field, { uri: file.uri, type: file.type, name: file.fileName } as unknown as Blob);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new ApiError('Could not upload the photo. Check your internet and try again.', 0);
  }
  let envelope: ApiEnvelope<T>;
  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('The photo could not be uploaded. Try again.', response.status);
  }
  if (!response.ok || envelope.error) {
    throw new ApiError(
      toUserMessage(envelope.error?.message, response.status, 'The photo could not be uploaded. Try again.'),
      response.status,
      envelope.error?.details ?? {},
    );
  }
  return envelope.data;
}

export function uploadProfilePhoto(file: UploadFile): Promise<PlayerProfile> {
  return uploadMultipart('/me/photo', 'photo', file);
}

export function uploadGroupPhoto(groupId: number, file: UploadFile): Promise<CommunityGroup> {
  return uploadMultipart(`/groups/${groupId}/photo`, 'photo', file);
}

export function uploadGroupCover(groupId: number, file: UploadFile): Promise<CommunityGroup> {
  return uploadMultipart(`/groups/${groupId}/cover`, 'photo', file);
}

export function mediaUri(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = baseUrl.replace(/\/api\/v1\/?$/, '');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

