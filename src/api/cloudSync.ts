import type { MatchSummary } from '../types/match';
import {
  deleteCloudMatch,
  listCloudMatches,
  putCloudMatch,
  type CloudMatch,
} from './client';
import { useMatchStore } from '../store/useMatchStore';
import { getAccessToken } from './session';

function asLocalMatch(row: CloudMatch, ownerId: number): MatchSummary {
  const { match, clientId, clientUpdatedAt, revision } = row;
  return {
    ...match,
    syncMeta: {
      state: 'synced',
      ownerId,
      clientId,
      revision,
      updatedAt: clientUpdatedAt,
    },
  };
}

export async function syncMatches(ownerId: number): Promise<{
  uploaded: number;
  downloaded: number;
  deleted: number;
}> {
  if (!getAccessToken()) throw new Error('Sign in before updating your matches.');
  const store = useMatchStore.getState();
  let uploaded = 0;
  let deleted = 0;
  const snapshot = [...store.matches];

  for (const removal of store.cloudDeletions) {
    if (removal.ownerId !== ownerId) continue;
    try {
      await deleteCloudMatch(removal.clientId);
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 404)) {
        throw error;
      }
    }
    useMatchStore.getState().markCloudDeletionSynced(removal.clientId, ownerId);
    deleted += 1;
  }

  for (const match of snapshot) {
    const owner = match.syncMeta?.ownerId;
    if (owner !== undefined && owner !== ownerId) continue;
    if (match.syncMeta?.state === 'synced') continue;
    const clientId = match.syncMeta?.clientId ?? match.id;
    const changedAt = match.syncMeta?.updatedAt ?? match.playedAt;
    const saved = await putCloudMatch(clientId, match, changedAt);
    const localChangedAt = Date.parse(changedAt);
    const serverChangedAt = Date.parse(saved.clientUpdatedAt);
    if (serverChangedAt > localChangedAt) {
      useMatchStore.getState().mergeCloudMatches(
        [asLocalMatch(saved, ownerId)],
        ownerId,
      );
    } else {
      useMatchStore
        .getState()
        .markMatchSynced(
          match.id,
          ownerId,
          saved.clientId,
          saved.revision,
          saved.clientUpdatedAt,
        );
    }
    uploaded += 1;
  }

  const remote = await listCloudMatches();
  // Team-selection drafts share the matches table, but they are not scorecards.
  const scorecards = remote.filter(
    row => Array.isArray(row.match?.innings) && row.match.innings.length === 2,
  );
  const beforeCount = useMatchStore.getState().matches.length;
  useMatchStore
    .getState()
    .mergeCloudMatches(scorecards.map(row => asLocalMatch(row, ownerId)), ownerId);
  const afterCount = useMatchStore.getState().matches.length;
  return {
    uploaded,
    downloaded: Math.max(0, afterCount - beforeCount),
    deleted,
  };
}
