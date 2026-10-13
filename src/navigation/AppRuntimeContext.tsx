import { createContext, useContext } from 'react';

export type AppMode = 'quick' | 'stats';

export type AppRuntime = {
  mode: AppMode | null;
  selectMode: (mode: AppMode | null) => void;
  authenticated: boolean;
  setAuthenticated: (authenticated: boolean) => void;
};

export const AppRuntimeContext = createContext<AppRuntime | null>(null);

export function useAppRuntime(): AppRuntime {
  const value = useContext(AppRuntimeContext);
  if (!value) throw new Error('App runtime context is unavailable.');
  return value;
}
