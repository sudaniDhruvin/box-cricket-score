import { NativeModules } from 'react-native';
import { NetworkInfo } from 'react-native-network-info';

type NativeNetworkInfo = {
  getIPV4Address?: () => Promise<string | null>;
  getIPAddress?: () => Promise<string | null>;
  getWIFIIPV4Address?: () => Promise<string | null>;
};

const NativeNet = NativeModules.RNNetworkInfo as NativeNetworkInfo | undefined;

const HOTSPOT_FALLBACK_IPS = [
  '192.168.43.1',
  '192.168.137.1',
  '192.168.42.1',
  '172.20.10.1',
];

function isUsableLanIpv4(ip: string | null | undefined): ip is string {
  if (!ip || typeof ip !== 'string') {
    return false;
  }
  const trimmed = ip.trim().replace(/^\//, '').split('%')[0];
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) {
    return false;
  }
  if (trimmed === '0.0.0.0' || trimmed.startsWith('127.')) {
    return false;
  }
  if (trimmed.startsWith('169.254.')) {
    return false;
  }
  return true;
}

function normalizeIp(ip: string): string {
  return ip.trim().replace(/^\//, '').split('%')[0];
}

function isPrivateLanIpv4(ip: string): boolean {
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

function addCandidate(into: string[], raw: string | null | undefined) {
  if (!isUsableLanIpv4(raw)) {
    return;
  }
  const ip = normalizeIp(raw);
  if (!into.includes(ip)) {
    into.push(ip);
  }
}

/**
 * Host phone LAN IPv4 for QR join.
 * Never use router gateway IP — that is not this device.
 */
export async function getLocalIpAddress(): Promise<string | null> {
  const wifiFirst: string[] = [];
  const others: string[] = [];

  try {
    addCandidate(wifiFirst, await NativeNet?.getWIFIIPV4Address?.());
  } catch {
    // ignore
  }
  try {
    addCandidate(wifiFirst, await NetworkInfo.getIPV4Address());
  } catch {
    // ignore
  }
  try {
    addCandidate(others, await NativeNet?.getIPV4Address?.());
  } catch {
    // ignore
  }
  try {
    addCandidate(others, await NativeNet?.getIPAddress?.());
  } catch {
    // ignore
  }
  try {
    addCandidate(others, await NetworkInfo.getIPAddress());
  } catch {
    // ignore
  }

  const merged: string[] = [];
  for (const ip of [...wifiFirst, ...others]) {
    if (!merged.includes(ip)) {
      merged.push(ip);
    }
  }

  const privateIp = merged.find(isPrivateLanIpv4);
  if (privateIp) {
    return privateIp;
  }

  for (const soft of HOTSPOT_FALLBACK_IPS) {
    if (merged.includes(soft)) {
      return soft;
    }
  }

  return merged[0] ?? null;
}
