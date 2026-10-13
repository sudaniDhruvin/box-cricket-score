import type { StateCreator } from 'zustand';
import type { MatchSummary } from '../types/match';
import { createPersistStore } from './persist-wrapper';

export interface MatchListState {
  matches: MatchSummary[];
  cloudDeletions: { clientId: string; ownerId: number }[];
  addMatch: (match: MatchSummary) => void;
  updateMatch: (id: string, updater: (m: MatchSummary) => MatchSummary) => void;
  removeMatch: (id: string) => void;
  clearAllMatches: () => void;
  markMatchSynced: (id: string, ownerId: number, clientId: string, revision: number, updatedAt: string) => void;
  mergeCloudMatches: (rows: MatchSummary[], ownerId: number) => void;
  markCloudDeletionSynced: (clientId: string, ownerId: number) => void;
}

const createMatchListState: StateCreator<MatchListState> = set => ({
  matches: [],
  cloudDeletions: [],
  addMatch: match =>
    set(state => ({
      matches: [
        {
          ...match,
          syncMeta: { state: 'pending', updatedAt: new Date().toISOString() },
        },
        ...state.matches,
      ],
    })),
  updateMatch: (id, updater) =>
    set(state => ({
      matches: state.matches.map(m => {
        if (m.id !== id) return m;
        const updated = updater(m);
        return {
          ...updated,
          syncMeta: {
            ...m.syncMeta,
            state: 'pending',
            updatedAt: new Date().toISOString(),
          },
        };
      }),
    })),
  removeMatch: id =>
    set(state => ({
      matches: state.matches.filter(m => m.id !== id),
      cloudDeletions: addCloudDeletion(state.cloudDeletions, state.matches.find(m => m.id === id)),
    })),
  clearAllMatches: () =>
    set(state => ({
      matches: [],
      cloudDeletions: state.matches.reduce(
        (deletions, match) => addCloudDeletion(deletions, match),
        state.cloudDeletions,
      ),
    })),
  markMatchSynced: (id, ownerId, clientId, revision, updatedAt) =>
    set(state => ({
      matches: state.matches.map(match => {
        if (match.id !== id) return match;
        return {
          ...match,
          syncMeta: {
            state: 'synced',
            updatedAt,
            ownerId,
            clientId,
            revision,
          },
        };
      }),
    })),
  mergeCloudMatches: (rows, ownerId) =>
    set(state => {
      const matches = [...state.matches];
      for (const row of rows) {
        const clientId = row.syncMeta?.clientId ?? row.id;
        let index = matches.findIndex(
          match =>
            match.syncMeta?.ownerId === ownerId &&
            match.syncMeta.clientId === clientId,
        );
        if (index < 0) {
          index = matches.findIndex(match => match.id === clientId);
        }
        const current = index >= 0 ? matches[index] : undefined;
        const localIsNewer =
          current?.syncMeta?.state === 'pending' &&
          Date.parse(current.syncMeta.updatedAt) >
            Date.parse(row.syncMeta?.updatedAt ?? '');
        if (localIsNewer) continue;
        const belongsToAnotherAccount =
          current?.syncMeta?.ownerId !== undefined &&
          current.syncMeta.ownerId !== ownerId;
        const merged = {
          ...row,
          id: belongsToAnotherAccount
            ? `cloud-${ownerId}-${clientId}`
            : current?.id ?? row.id,
          syncMeta: {
            state: 'synced' as const,
            ownerId,
            clientId,
            revision: row.syncMeta?.revision,
            updatedAt: row.syncMeta?.updatedAt ?? new Date().toISOString(),
          },
        };
        if (index >= 0 && !belongsToAnotherAccount) matches[index] = merged;
        else matches.unshift(merged);
      }
      return { matches };
    }),
  markCloudDeletionSynced: (clientId, ownerId) =>
    set(state => ({
      cloudDeletions: state.cloudDeletions.filter(
        item => item.clientId !== clientId || item.ownerId !== ownerId,
      ),
    })),
});

function addCloudDeletion(
  deletions: MatchListState['cloudDeletions'],
  match: MatchSummary | undefined,
): MatchListState['cloudDeletions'] {
  const ownerId = match?.syncMeta?.ownerId;
  const clientId = match?.syncMeta?.clientId;
  if (!ownerId || !clientId) return deletions;
  if (deletions.some(item => item.ownerId === ownerId && item.clientId === clientId)) return deletions;
  return [...deletions, { ownerId, clientId }];
}

export const useMatchStore = createPersistStore<MatchListState>(
  'match-list-storage',
  createMatchListState,
);
