import type { StateCreator } from 'zustand';
import type { MatchSummary } from '../types/match';
import { createPersistStore } from './persist-wrapper';

export interface MatchListState {
  matches: MatchSummary[];
  addMatch: (match: MatchSummary) => void;
  updateMatch: (id: string, updater: (m: MatchSummary) => MatchSummary) => void;
  removeMatch: (id: string) => void;
  clearAllMatches: () => void;
}

const createMatchListState: StateCreator<MatchListState> = set => ({
  matches: [],
  addMatch: match =>
    set(state => ({
      matches: [match, ...state.matches],
    })),
  updateMatch: (id, updater) =>
    set(state => ({
      matches: state.matches.map(m => (m.id === id ? updater(m) : m)),
    })),
  removeMatch: id =>
    set(state => ({
      matches: state.matches.filter(m => m.id !== id),
    })),
  clearAllMatches: () => set({ matches: [] }),
});

export const useMatchStore = createPersistStore<MatchListState>(
  'match-list-storage',
  createMatchListState,
);
