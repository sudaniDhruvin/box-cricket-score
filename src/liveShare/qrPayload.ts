import {
  LIVE_SHARE_PATH,
  LIVE_SHARE_PORT,
  LIVE_SHARE_PROTOCOL_VERSION,
  LIVE_SHARE_TYPE,
  type LiveShareJoinPayload,
} from './protocol';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function buildJoinPayload(input: {
  host: string;
  sessionId: string;
  token: string;
  matchName?: string;
  port?: number;
  path?: string;
}): LiveShareJoinPayload {
  return {
    v: LIVE_SHARE_PROTOCOL_VERSION,
    type: LIVE_SHARE_TYPE,
    host: input.host.trim(),
    port: input.port ?? LIVE_SHARE_PORT,
    path: input.path ?? LIVE_SHARE_PATH,
    sessionId: input.sessionId,
    token: input.token,
    matchName: input.matchName?.trim() || undefined,
  };
}

export function encodeJoinPayload(payload: LiveShareJoinPayload): string {
  return JSON.stringify(payload);
}

export function parseJoinPayload(raw: string): LiveShareJoinPayload | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

  if (data == null || typeof data !== 'object') {
    return null;
  }

  const obj = data as Record<string, unknown>;
  if (obj.v !== LIVE_SHARE_PROTOCOL_VERSION) {
    return null;
  }
  if (obj.type !== LIVE_SHARE_TYPE) {
    return null;
  }
  if (!isNonEmptyString(obj.host)) {
    return null;
  }
  if (typeof obj.port !== 'number' || !Number.isFinite(obj.port) || obj.port <= 0) {
    return null;
  }
  if (!isNonEmptyString(obj.path)) {
    return null;
  }
  if (!isNonEmptyString(obj.sessionId)) {
    return null;
  }
  if (!isNonEmptyString(obj.token)) {
    return null;
  }

  return {
    v: LIVE_SHARE_PROTOCOL_VERSION,
    type: LIVE_SHARE_TYPE,
    host: obj.host.trim(),
    port: obj.port,
    path: obj.path.startsWith('/') ? obj.path : `/${obj.path}`,
    sessionId: obj.sessionId.trim(),
    token: obj.token.trim(),
    matchName: isNonEmptyString(obj.matchName) ? obj.matchName.trim() : undefined,
  };
}
