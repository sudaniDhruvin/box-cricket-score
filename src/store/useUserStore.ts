import type { StateCreator } from 'zustand';
import { createPersistStore } from './persist-wrapper';

export type User = Record<string, unknown> | null;

export interface UserState {
  user: User;
  hasCompletedOnboarding: boolean;
  completedMatchesForReview: number;
  lastInAppReviewPromptAt: number | null;
  updateUser: (user: User) => void;
  completeOnboarding: () => void;
  setCompletedMatchesForReview: (count: number) => void;
  markInAppReviewPrompted: () => void;
  resetReviewPromptState: () => void;
}

const createUserState: StateCreator<UserState> = set => ({
  user: null,
  hasCompletedOnboarding: false,
  completedMatchesForReview: 0,
  lastInAppReviewPromptAt: null,
  updateUser: user => set({ user }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
  setCompletedMatchesForReview: completedMatchesForReview =>
    set({ completedMatchesForReview }),
  markInAppReviewPrompted: () =>
    set({ lastInAppReviewPromptAt: Date.now() }),
  resetReviewPromptState: () =>
    set({ completedMatchesForReview: 0, lastInAppReviewPromptAt: null }),
});

export const useUserStore = createPersistStore<UserState>(
  'user-storage',
  createUserState,
);
