import { create } from 'zustand';
import type { AdRemoteConfig } from '../config/adRemoteConfig';

export type AdFlags = {
  isAds: boolean;
  isHomeBanner: boolean;
  isBanner: boolean;
  isOpenApp: boolean;
  isInter: boolean;
  isNative: boolean;
};

const NO_AD_FLAGS: AdFlags = {
  isAds: false,
  isHomeBanner: false,
  isBanner: false,
  isOpenApp: false,
  isInter: false,
  isNative: false,
};

function toAdFlags(config: AdRemoteConfig | null): AdFlags {
  if (!config) {
    return NO_AD_FLAGS;
  }
  const { isAds } = config;
  return {
    isAds,
    isHomeBanner: isAds && config.isHomeBanner,
    isBanner: isAds && config.isBanner,
    isOpenApp: isAds && config.isOpenApp,
    isInter: isAds && config.isInter,
    isNative: isAds && config.isNative,
  };
}

type AdConfigState = {
  ready: boolean;
  config: AdRemoteConfig | null;
  setConfig: (config: AdRemoteConfig | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAdConfigStore = create<AdConfigState>(set => ({
  ready: false,
  config: null,
  setConfig: config => set({ config }),
  setReady: ready => set({ ready }),
}));

export function getAdFlags(): AdFlags {
  const { config } = useAdConfigStore.getState();
  return toAdFlags(config);
}

export function adFlagsFromConfig(config: AdRemoteConfig | null): AdFlags {
  return toAdFlags(config);
}
