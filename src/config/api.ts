import { Platform } from 'react-native';

/**
 * Local WAMP defaults. Set this to the computer's LAN address when testing on
 * a phone, and to the HTTPS API origin used by production builds.
 */
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2/bcs/api/v1'
    : Platform.OS === 'ios'
      ? 'http://127.0.0.1/bcs/api/v1'
      : 'http://127.0.0.1/bcs/api/v1';
