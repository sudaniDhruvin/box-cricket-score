/** Firebase Remote Config key — value is a JSON string of {@link AdRemoteConfig}. */
export const AD_REMOTE_CONFIG_KEY = 'ads';

export type AdRemoteConfig = {
  isAds: boolean;
  isHomeBanner: boolean;
  isBanner: boolean;
  isOpenApp: boolean;
  isInter: boolean;
  isNative: boolean;
};

function isAdRemoteConfig(value: unknown): value is AdRemoteConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const flags = value as Record<string, unknown>;
  return (
    typeof flags.isAds === 'boolean' &&
    typeof flags.isHomeBanner === 'boolean' &&
    typeof flags.isBanner === 'boolean' &&
    typeof flags.isOpenApp === 'boolean' &&
    typeof flags.isInter === 'boolean' &&
    typeof flags.isNative === 'boolean'
  );
}

export function parseAdRemoteConfig(raw: string): AdRemoteConfig | null {
  if (!raw.trim()) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isAdRemoteConfig(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
