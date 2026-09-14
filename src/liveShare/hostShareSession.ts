import TcpSocket from 'react-native-tcp-socket';
import type Socket from 'react-native-tcp-socket/lib/types/Socket';
import type Server from 'react-native-tcp-socket/lib/types/Server';
import type { MatchSummary } from '../types/match';
import { getLocalIpAddress } from './getLocalIp';
import { buildJoinPayload, encodeJoinPayload } from './qrPayload';
import {
  LIVE_SHARE_PORT,
  LIVE_SHARE_PROTOCOL_VERSION,
  createSessionToken,
  encodeFrame,
  parseMessage,
  type LiveShareJoinPayload,
  type LiveShareServerMessage,
} from './protocol';

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

let activeServer: Server | null = null;

const HEARTBEAT_MS = 1500;

function dataToString(data: string | Uint8Array): string {
  if (typeof data === 'string') {
    return data;
  }
  try {
    return String.fromCharCode(...data);
  } catch {
    return '';
  }
}

function writeMessage(socket: Socket, message: LiveShareServerMessage) {
  try {
    socket.write(encodeFrame(message));
  } catch {
    // dead socket; cleaned up via close/error
  }
}

function attachLineReader(socket: Socket, onLine: (line: string) => void) {
  let buffer = '';
  socket.on('data', data => {
    buffer += dataToString(data as string | Uint8Array);
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        onLine(trimmed);
      }
    }
  });
}

export async function startHostShareSession(
  args: StartHostShareArgs,
): Promise<HostShareSession> {
  if (activeServer) {
    await new Promise<void>(resolve => {
      try {
        activeServer?.close(() => resolve());
      } catch {
        resolve();
      }
      activeServer = null;
    });
    await new Promise<void>(r => setTimeout(r, 200));
  }

  const hostIp = await getLocalIpAddress();
  if (!hostIp) {
    throw new Error(
      'Could not find this phone’s Wi‑Fi IP. Turn Wi‑Fi/hotspot on, then try Share again.',
    );
  }

  const token = createSessionToken();
  const payload = buildJoinPayload({
    host: hostIp,
    sessionId: args.matchId,
    token,
    matchName: args.matchName,
    port: LIVE_SHARE_PORT,
  });

  const viewers = new Set<Socket>();
  let lastSentJson: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const emitViewerCount = () => {
    args.onViewerCountChange?.(viewers.size);
  };

  const broadcastMatch = (match: MatchSummary, force = false) => {
    const message: LiveShareServerMessage = {
      type: 'match.updated',
      match,
    };
    const raw = encodeFrame(message);
    if (!force && raw === lastSentJson) {
      return;
    }
    lastSentJson = raw;
    Array.from(viewers).forEach(socket => {
      try {
        socket.write(raw);
      } catch {
        viewers.delete(socket);
        emitViewerCount();
      }
    });
  };

  const notifyMatchChanged = (match: MatchSummary) => {
    broadcastMatch(match, true);
  };

  const server = await new Promise<Server>((resolve, reject) => {
    let settled = false;

    const created = TcpSocket.createServer((socket: Socket) => {
      let authed = false;

      const removeClient = () => {
        if (viewers.delete(socket)) {
          emitViewerCount();
        }
      };

      const fail = (
        code:
          | 'bad_token'
          | 'bad_session'
          | 'unsupported_version'
          | 'invalid_message',
        text: string,
      ) => {
        writeMessage(socket, { type: 'session.error', code, message: text });
        try {
          socket.destroy();
        } catch {
          // ignore
        }
      };

      attachLineReader(socket, line => {
        const message = parseMessage(line);
        if (!authed) {
          if (message == null || message.type !== 'session.hello') {
            fail('invalid_message', 'Expected session.hello');
            return;
          }
          if (message.v !== LIVE_SHARE_PROTOCOL_VERSION) {
            fail('unsupported_version', 'Update the app to watch this match');
            return;
          }
          if (message.sessionId !== args.matchId) {
            fail('bad_session', 'Session mismatch');
            return;
          }
          if (message.token !== token) {
            fail('bad_token', 'Invalid token — scan a fresh QR');
            return;
          }

          authed = true;
          viewers.add(socket);
          emitViewerCount();

          const match = args.getMatch();
          if (match) {
            writeMessage(socket, { type: 'match.snapshot', match });
            lastSentJson = encodeFrame({
              type: 'match.updated',
              match,
            });
          }
        }
      });

      socket.on('close', removeClient);
      socket.on('error', removeClient);
    });

    created.on('error', (err: Error) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    created.listen(
      { port: LIVE_SHARE_PORT, host: '0.0.0.0', reuseAddress: true },
      () => {
        if (!settled) {
          settled = true;
          resolve(created);
        }
      },
    );
  });

  activeServer = server;
  payload.port = LIVE_SHARE_PORT;

  heartbeatTimer = setInterval(() => {
    if (viewers.size === 0) {
      return;
    }
    const match = args.getMatch();
    if (match) {
      broadcastMatch(match, false);
    }
  }, HEARTBEAT_MS);

  const stop = async () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    const ended: LiveShareServerMessage = {
      type: 'session.ended',
      reason: 'Host stopped sharing',
    };
    const sockets = Array.from(viewers);
    viewers.clear();
    emitViewerCount();

    for (const socket of sockets) {
      writeMessage(socket, ended);
      try {
        socket.destroy();
      } catch {
        // ignore
      }
    }

    await new Promise<void>(resolve => {
      try {
        server.close(() => resolve());
      } catch {
        resolve();
      }
    });
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
