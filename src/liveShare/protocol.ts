import type { MatchSummary } from '../types/match';

export const LIVE_SHARE_PROTOCOL_VERSION = 1 as const;
export const LIVE_SHARE_TYPE = 'boxcricket.live' as const;
/** Kept for QR compatibility; TCP ignores path. */
export const LIVE_SHARE_PATH = '/live';
/** Local TCP port (Claude suggestion / react-native-tcp-socket). */
export const LIVE_SHARE_PORT = 8899;
/** Host and viewer ping interval. */
export const LIVE_SHARE_KEEPALIVE_MS = 1500;
/** Treat the link as dropped if no keepalive arrives in this window. */
export const LIVE_SHARE_STALE_MS = 5000;

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
  /** Stable per viewer app session so the host can accept the same phone again after a drop. */
  viewerId?: string;
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

/** Host → viewer keepalive so drops are noticed even when the score is unchanged. */
export type SessionHeartbeatMessage = {
  type: 'session.heartbeat';
};

/** Viewer → host keepalive so the host can drop stale sockets. */
export type SessionPingMessage = {
  type: 'session.ping';
};

export type LiveShareServerMessage =
  | MatchSnapshotMessage
  | MatchUpdatedMessage
  | SessionEndedMessage
  | SessionErrorMessage
  | SessionHeartbeatMessage;

export type LiveShareClientMessage = SessionHelloMessage | SessionPingMessage;

export type LiveShareMessage = LiveShareServerMessage | LiveShareClientMessage;

export function createSessionToken(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function createViewerId(): string {
  return `v-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** @deprecated TCP does not use WebSocket URLs; kept for older helpers/tests. */
export function buildWsUrl(payload: LiveShareJoinPayload): string {
  return `tcp://${payload.host}:${payload.port}`;
}

export function serializeMessage(message: LiveShareMessage): string {
  return JSON.stringify(message);
}

/** Newline-delimited JSON frame for TCP streams. */
export function encodeFrame(message: LiveShareMessage): string {
  return `${serializeMessage(message)}\n`;
}

export function parseMessage(raw: string): LiveShareMessage | null {
  try {
    const data = JSON.parse(raw) as Partial<LiveShareMessage>;
    if (
      data == null ||
      typeof data !== 'object' ||
      typeof data.type !== 'string'
    ) {
      return null;
    }
    return data as LiveShareMessage;
  } catch {
    return null;
  }
}
