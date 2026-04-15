import type { StateCreator } from 'zustand';
import { createPersistStore } from './persist-wrapper';

export type User = Record<string, unknown> | null;

export interface UserState {
  user: User;
  hasCompletedOnboarding: boolean;
  updateUser: (user: User) => void;
  completeOnboarding: () => void;
}

const createUserState: StateCreator<UserState> = set => ({
  user: null,
  hasCompletedOnboarding: false,
  updateUser: user => set({ user }),
  completeOnboarding: () => set({ hasCompletedOnboarding: true }),
});

export const useUserStore = createPersistStore<UserState>(
  'user-storage',
  createUserState,
);
