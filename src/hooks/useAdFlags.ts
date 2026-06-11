import { useMemo } from 'react';
import { adFlagsFromConfig } from '../store/useAdConfigStore';
import { useAdConfigStore } from '../store/useAdConfigStore';

export function useAdFlags() {
  const config = useAdConfigStore(s => s.config);

  return useMemo(() => adFlagsFromConfig(config), [config]);
}
