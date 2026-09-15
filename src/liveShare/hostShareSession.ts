import TcpSocket from 'react-native-tcp-socket';
import type Socket from 'react-native-tcp-socket/lib/types/Socket';
import type Server from 'react-native-tcp-socket/lib/types/Server';
import type { MatchSummary } from '../types/match';
import { getLocalIpAddress } from './getLocalIp';
import { buildJoinPayload, encodeJoinPayload } from './qrPayload';
import {
  LIVE_SHARE_KEEPALIVE_MS,
  LIVE_SHARE_PORT,
  LIVE_SHARE_PROTOCOL_VERSION,
  LIVE_SHARE_STALE_MS,
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
  getMatch: () => MatchSummary | undefined;
  onViewerCountChange?: (count: number) => void;
};

type ViewerEntry = {
  socket: Socket;
  lastSeen: number;
};

let activeServer: Server | null = null;

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
    port: LIVE_SHARE_PORT,
  });

  /** Keyed by viewerId (or a fallback) so the same phone can reconnect without a new QR. */
  const viewers = new Map<string, ViewerEntry>();
  let lastSentJson: string | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let anonSeq = 0;

  const emitViewerCount = () => {
    args.onViewerCountChange?.(viewers.size);
  };

  const dropViewer = (key: string, socket?: Socket) => {
    const current = viewers.get(key);
    if (!current) {
      return;
    }
    if (socket && current.socket !== socket) {
      return;
    }
    viewers.delete(key);
    emitViewerCount();
  };

  const touchViewer = (key: string) => {
    const current = viewers.get(key);
    if (current) {
      current.lastSeen = Date.now();
    }
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
    Array.from(viewers.entries()).forEach(([key, entry]) => {
      try {
        entry.socket.write(raw);
      } catch {
        dropViewer(key, entry.socket);
      }
    });
  };

  const notifyMatchChanged = (match: MatchSummary) => {
    broadcastMatch(match, true);
  };

  const pruneStaleViewers = () => {
    const now = Date.now();
    let dropped = false;
    Array.from(viewers.entries()).forEach(([key, entry]) => {
      if (now - entry.lastSeen <= LIVE_SHARE_STALE_MS) {
        return;
      }
      viewers.delete(key);
      dropped = true;
      try {
        entry.socket.destroy();
      } catch {
        // ignore
      }
    });
    if (dropped) {
      emitViewerCount();
    }
  };

  const sendHeartbeat = () => {
    Array.from(viewers.entries()).forEach(([key, entry]) => {
      try {
        entry.socket.write(encodeFrame({ type: 'session.heartbeat' }));
      } catch {
        dropViewer(key, entry.socket);
      }
    });
  };

  const server = await new Promise<Server>((resolve, reject) => {
    let settled = false;

    const created = TcpSocket.createServer((socket: Socket) => {
      let authed = false;
      let viewerKey: string | null = null;

      const removeClient = () => {
        if (viewerKey) {
          dropViewer(viewerKey, socket);
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
          const fromHello =
            typeof message.viewerId === 'string' ? message.viewerId.trim() : '';
          viewerKey = fromHello || `anon-${++anonSeq}`;
          const previous = viewers.get(viewerKey);
          viewers.set(viewerKey, { socket, lastSeen: Date.now() });
          if (previous && previous.socket !== socket) {
            try {
              previous.socket.destroy();
            } catch {
              // ignore — close handler must not drop the new socket
            }
          }
          emitViewerCount();

          const match = args.getMatch();
          if (match) {
            writeMessage(socket, { type: 'match.snapshot', match });
            lastSentJson = encodeFrame({
              type: 'match.updated',
              match,
            });
          }
          return;
        }

        if (viewerKey) {
          touchViewer(viewerKey);
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
    pruneStaleViewers();
    if (viewers.size === 0) {
      return;
    }
    sendHeartbeat();
    const match = args.getMatch();
    if (match) {
      broadcastMatch(match, false);
    }
  }, LIVE_SHARE_KEEPALIVE_MS);

  const stop = async () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }

    const ended: LiveShareServerMessage = {
      type: 'session.ended',
      reason: 'Host stopped sharing',
    };
    const sockets = Array.from(viewers.values()).map(entry => entry.socket);
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
