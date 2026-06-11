import remoteConfig from '@react-native-firebase/remote-config';
import {
  AD_REMOTE_CONFIG_KEY,
  parseAdRemoteConfig,
  type AdRemoteConfig,
} from './adRemoteConfig';
import { useAdConfigStore } from '../store/useAdConfigStore';

export async function initializeAdRemoteConfig(): Promise<AdRemoteConfig | null> {
  const { setConfig, setReady } = useAdConfigStore.getState();

  try {
    await remoteConfig().setConfigSettings({
      minimumFetchIntervalMillis: __DEV__ ? 0 : 3_600_000,
    });
    await remoteConfig().fetchAndActivate();
    const raw = remoteConfig().getValue(AD_REMOTE_CONFIG_KEY).asString();

    const config = parseAdRemoteConfig(raw);

    if (!config) {
      console.warn(
        `Remote Config "${AD_REMOTE_CONFIG_KEY}" is missing or invalid`,
      );
    }

    setConfig(config);
    setReady(true);
    return config;
  } catch (error) {
    console.error('Firebase Remote Config fetch failed', error);
    setConfig(null);
    setReady(true);
    return null;
  }
}
