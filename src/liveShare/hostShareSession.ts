import { ConfigServer } from 'react-native-nitro-http-server';
import type { MatchSummary } from '../types/match';
import { getLocalIpAddress } from './getLocalIp';
import { buildJoinPayload, encodeJoinPayload } from './qrPayload';
import {
  LIVE_SHARE_PATH,
  LIVE_SHARE_PORT,
  LIVE_SHARE_PROTOCOL_VERSION,
  createSessionToken,
  parseMessage,
  serializeMessage,
  type LiveShareJoinPayload,
  type LiveShareServerMessage,
} from './protocol';

type AuthedSocket = {
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  readyState: number;
};

export type HostShareSession = {
  payload: LiveShareJoinPayload;
  qrValue: string;
  stop: () => Promise<void>;
  getViewerCount: () => number;
  notifyMatchChanged: (match: MatchSummary) => void;
};

type StartHostShareArgs = {
  matchId: string;
  matchName: string;
  getMatch: () => MatchSummary | undefined;
  onViewerCountChange?: (count: number) => void;
};

let activeServer: ConfigServer | null = null;

function sendJson(ws: AuthedSocket, message: LiveShareServerMessage) {
  if (ws.readyState === 1) {
    ws.send(serializeMessage(message));
  }
}

export async function startHostShareSession(
  args: StartHostShareArgs,
): Promise<HostShareSession> {
  if (activeServer) {
    await activeServer.stop();
    activeServer = null;
  }

  const hostIp = await getLocalIpAddress();
  if (!hostIp) {
    throw new Error(
      'Could not find a local IP. Join Wi‑Fi or turn on a hotspot, then try again.',
    );
  }

  const token = createSessionToken();
  const payload = buildJoinPayload({
    host: hostIp,
    sessionId: args.matchId,
    token,
    matchName: args.matchName,
  });

  const server = new ConfigServer();
  const viewers = new Set<AuthedSocket>();

  const emitViewerCount = () => {
    args.onViewerCountChange?.(viewers.size);
  };

  const notifyMatchChanged = (match: MatchSummary) => {
    const raw = serializeMessage({ type: 'match.updated', match });
    viewers.forEach(ws => {
      if (ws.readyState === 1) {
        ws.send(raw);
      }
    });
  };

  server.onWebSocket(LIVE_SHARE_PATH, ws => {
    ws.onmessage = event => {
      const raw = typeof event.data === 'string' ? event.data : '';
      const message = parseMessage(raw);
      if (message == null || message.type !== 'session.hello') {
        sendJson(ws, {
          type: 'session.error',
          code: 'invalid_message',
          message: 'Expected session.hello',
        });
        ws.close(1008, 'invalid_message');
        return;
      }

      if (message.v !== LIVE_SHARE_PROTOCOL_VERSION) {
        sendJson(ws, {
          type: 'session.error',
          code: 'unsupported_version',
          message: 'Update the app to watch this match',
        });
        ws.close(1008, 'unsupported_version');
        return;
      }

      if (message.sessionId !== args.matchId) {
        sendJson(ws, {
          type: 'session.error',
          code: 'bad_session',
          message: 'Session mismatch',
        });
        ws.close(1008, 'bad_session');
        return;
      }

      if (message.token !== token) {
        sendJson(ws, {
          type: 'session.error',
          code: 'bad_token',
          message: 'Invalid token',
        });
        ws.close(1008, 'bad_token');
        return;
      }

      viewers.add(ws);
      emitViewerCount();

      const match = args.getMatch();
      if (match) {
        sendJson(ws, { type: 'match.snapshot', match });
      }
    };

    ws.onclose = () => {
      if (viewers.delete(ws)) {
        emitViewerCount();
      }
    };

    ws.onerror = () => {
      if (viewers.delete(ws)) {
        emitViewerCount();
      }
    };
  });

  await server.start(
    LIVE_SHARE_PORT,
    async () => ({
      statusCode: 200,
      body: 'Box Cricket live share',
      headers: { 'content-type': 'text/plain' },
    }),
    {
      mounts: [{ type: 'websocket', path: LIVE_SHARE_PATH }],
    },
    { host: '0.0.0.0', autoRestart: true },
  );

  activeServer = server;

  const stop = async () => {
    const ended = serializeMessage({
      type: 'session.ended',
      reason: 'Host stopped sharing',
    });
    viewers.forEach(ws => {
      try {
        if (ws.readyState === 1) {
          ws.send(ended);
        }
        ws.close(1000, 'ended');
      } catch {
        // ignore
      }
    });
    viewers.clear();
    emitViewerCount();
    await server.stop();
    if (activeServer === server) {
      activeServer = null;
    }
  };

  return {
    payload,
    qrValue: encodeJoinPayload(payload),
    stop,
    getViewerCount: () => viewers.size,
    notifyMatchChanged,
  };
}
