// src/store/persist-wrapper.ts
import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import { zustandStorage } from './storage';

export const createPersistStore = <T>(
  storeName: string,
  stateCreator: any, // The actual slice logic
  options?: Partial<PersistOptions<T>>,
) => {
  return create<T>()(
    persist(stateCreator, {
      name: storeName,
      storage: createJSONStorage(() => zustandStorage),
      ...options,
    } as PersistOptions<T>),
  );
};
