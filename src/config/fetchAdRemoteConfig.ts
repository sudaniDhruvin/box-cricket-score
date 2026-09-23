import remoteConfig from '@react-native-firebase/remote-config';
import {
  AD_REMOTE_CONFIG_KEY,
  DEFAULT_AD_REMOTE_CONFIG,
  parseAdRemoteConfig,
  type AdRemoteConfig,
} from './adRemoteConfig';
import { useAdConfigStore } from '../store/useAdConfigStore';

export async function initializeAdRemoteConfig(): Promise<AdRemoteConfig> {
  const { setConfig, setReady } = useAdConfigStore.getState();

  try {
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: __DEV__ ? 0 : 3_600_000,
    });
    await remoteConfig().setDefaults({
      [AD_REMOTE_CONFIG_KEY]: JSON.stringify(DEFAULT_AD_REMOTE_CONFIG),
    });
    await remoteConfig().fetchAndActivate();
    const raw = remoteConfig().getValue(AD_REMOTE_CONFIG_KEY).asString();

    const parsed = parseAdRemoteConfig(raw);
    if (!parsed) {
      console.warn(
        `Remote Config "${AD_REMOTE_CONFIG_KEY}" is missing or invalid — using defaults`,
      );
    }

    const config = parsed ?? DEFAULT_AD_REMOTE_CONFIG;
    setConfig(config);
    setReady(true);
    return config;
  } catch (error) {
    console.error(
      'Firebase Remote Config fetch failed — using ad defaults',
      error,
    );
    setConfig(DEFAULT_AD_REMOTE_CONFIG);
    setReady(true);
    return DEFAULT_AD_REMOTE_CONFIG;
  }
}
