import type { MatchSummary } from '../types/match';

export const LIVE_SHARE_PROTOCOL_VERSION = 1 as const;
export const LIVE_SHARE_TYPE = 'boxcricket.live' as const;
export const LIVE_SHARE_PATH = '/live';
export const LIVE_SHARE_PORT = 8787;

export type LiveShareJoinPayload = {
  v: typeof LIVE_SHARE_PROTOCOL_VERSION;
  type: typeof LIVE_SHARE_TYPE;
  host: string;
  port: number;
  path: string;
  sessionId: string;
  token: string;
  matchName?: string;
};

export type SessionHelloMessage = {
  type: 'session.hello';
  v: typeof LIVE_SHARE_PROTOCOL_VERSION;
  sessionId: string;
  token: string;
};

export type MatchSnapshotMessage = {
  type: 'match.snapshot';
  match: MatchSummary;
};

export type MatchUpdatedMessage = {
  type: 'match.updated';
  match: MatchSummary;
};

export type SessionEndedMessage = {
  type: 'session.ended';
  reason?: string;
};

export type SessionErrorMessage = {
  type: 'session.error';
  code: 'bad_token' | 'bad_session' | 'unsupported_version' | 'invalid_message';
  message: string;
};

export type LiveShareServerMessage =
  | MatchSnapshotMessage
  | MatchUpdatedMessage
  | SessionEndedMessage
  | SessionErrorMessage;

export type LiveShareClientMessage = SessionHelloMessage;

export type LiveShareMessage = LiveShareServerMessage | LiveShareClientMessage;

export function createSessionToken(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function buildWsUrl(payload: LiveShareJoinPayload): string {
  const path = payload.path.startsWith('/') ? payload.path : `/${payload.path}`;
  return `ws://${payload.host}:${payload.port}${path}`;
}

export function serializeMessage(message: LiveShareMessage): string {
  return JSON.stringify(message);
}

export function parseMessage(raw: string): LiveShareMessage | null {
  try {
    const data = JSON.parse(raw) as Partial<LiveShareMessage>;
    if (data == null || typeof data !== 'object' || typeof data.type !== 'string') {
      return null;
    }
    return data as LiveShareMessage;
  } catch {
    return null;
  }
}
