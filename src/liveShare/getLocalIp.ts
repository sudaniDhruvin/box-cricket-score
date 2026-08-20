import { NetworkInfo } from 'react-native-network-info';

/**
 * Best-effort LAN / hotspot IP for QR join payloads.
 * Prefer Wi‑Fi IP; fall back to IP address used when acting as hotspot gateway.
 */
export async function getLocalIpAddress(): Promise<string | null> {
  try {
    const wifi = await NetworkInfo.getIPV4Address();
    if (wifi && wifi !== '0.0.0.0') {
      return wifi;
    }
  } catch {
    // ignore
  }

  try {
    const gateway = await NetworkInfo.getGatewayIPAddress();
    if (gateway && gateway !== '0.0.0.0') {
      return gateway;
    }
  } catch {
    // ignore
  }

  return null;
}
