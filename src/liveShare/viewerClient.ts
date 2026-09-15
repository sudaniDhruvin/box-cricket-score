import TcpSocket from 'react-native-tcp-socket';
import type Socket from 'react-native-tcp-socket/lib/types/Socket';
import type { MatchSummary } from '../types/match';
import {
  LIVE_SHARE_KEEPALIVE_MS,
  LIVE_SHARE_PROTOCOL_VERSION,
  LIVE_SHARE_STALE_MS,
  createViewerId,
  encodeFrame,
  parseMessage,
  type LiveShareJoinPayload,
} from './protocol';

export type ViewerConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error';

export type ViewerClientHandlers = {
  onMatch: (match: MatchSummary) => void;
  onStatus: (status: ViewerConnectionStatus, detail?: string) => void;
  onEnded: (reason?: string) => void;
};

export type ViewerClient = {
  disconnect: () => void;
  /** Retry the same QR/session immediately (host does not need a new QR). */
  reconnectNow: () => void;
};

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

const RECONNECT_DETAIL =
  'You got disconnected. Connecting again… Stay on this screen.';
const RETRY_DETAIL =
  'You got disconnected. Tap Connect again — the same QR still works if the host is sharing.';

/**
 * Viewer TCP client (Claude LocalScoreClient pattern):
 * newline-delimited JSON over react-native-tcp-socket.
 */
export function connectViewer(
  payload: LiveShareJoinPayload,
  handlers: ViewerClientHandlers,
): ViewerClient {
  let closedByUser = false;
  let fatal = false;
  let socket: Socket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let hadConnected = false;
  let lastHostAt = 0;
  let buffer = '';
  const viewerId = createViewerId();

  const clearReconnectTimer = () => {
    if (reconnectTimer != null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const clearKeepaliveTimer = () => {
    if (keepaliveTimer != null) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
  };

  const destroySocket = () => {
    const current = socket;
    socket = null;
    try {
      current?.destroy();
    } catch {
      // ignore
    }
  };

  const canRetry = () => !closedByUser && !fatal;

  const scheduleReconnect = () => {
    if (!canRetry()) {
      return;
    }
    reconnectAttempt += 1;
    handlers.onStatus('reconnecting', RECONNECT_DETAIL);
    const delay = Math.min(5000, 400 * reconnectAttempt);
    clearReconnectTimer();
    reconnectTimer = setTimeout(open, delay);
  };

  const markHostAlive = () => {
    lastHostAt = Date.now();
  };

  const sendPing = (target: Socket) => {
    try {
      target.write(encodeFrame({ type: 'session.ping' }));
    } catch {
      // close/error will reconnect
    }
  };

  const open = () => {
    if (!canRetry()) {
      return;
    }

    clearReconnectTimer();
    clearKeepaliveTimer();
    destroySocket();
    buffer = '';

    const dropped = hadConnected || reconnectAttempt > 0;
    handlers.onStatus(
      dropped ? 'reconnecting' : 'connecting',
      dropped ? RECONNECT_DETAIL : undefined,
    );

    let opened = false;
    const next = TcpSocket.createConnection(
      {
        host: payload.host,
        port: Number(payload.port),
      },
      () => {
        opened = true;
        hadConnected = true;
        reconnectAttempt = 0;
        markHostAlive();
        handlers.onStatus('connected');
        try {
          next.write(
            encodeFrame({
              type: 'session.hello',
              v: LIVE_SHARE_PROTOCOL_VERSION,
              sessionId: payload.sessionId,
              token: payload.token,
              viewerId,
            }),
          );
        } catch {
          // close/error will reconnect
        }
      },
    );

    socket = next;

    keepaliveTimer = setInterval(() => {
      if (socket !== next || !opened || !canRetry()) {
        return;
      }
      if (Date.now() - lastHostAt > LIVE_SHARE_STALE_MS) {
        handlers.onStatus('reconnecting', RECONNECT_DETAIL);
        destroySocket();
        return;
      }
      sendPing(next);
    }, LIVE_SHARE_KEEPALIVE_MS);

    next.on('data', data => {
      buffer += dataToString(data as string | Uint8Array);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      markHostAlive();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const message = parseMessage(trimmed);
        if (message == null) {
          continue;
        }

        if (message.type === 'session.heartbeat') {
          continue;
        }

        if (
          message.type === 'match.snapshot' ||
          message.type === 'match.updated'
        ) {
          handlers.onMatch(message.match);
          continue;
        }

        if (message.type === 'session.ended') {
          fatal = true;
          clearReconnectTimer();
          clearKeepaliveTimer();
          handlers.onEnded(message.reason);
          handlers.onStatus(
            'ended',
            message.reason ?? 'The host stopped sharing.',
          );
          try {
            next.destroy();
          } catch {
            // ignore
          }
          continue;
        }

        if (message.type === 'session.error') {
          fatal = true;
          clearReconnectTimer();
          clearKeepaliveTimer();
          handlers.onStatus('error', message.message);
          handlers.onEnded(message.message);
          try {
            next.destroy();
          } catch {
            // ignore
          }
        }
      }
    });

    next.on('error', () => {
      // close handles reconnect
    });

    next.on('close', () => {
      if (socket === next) {
        socket = null;
      }
      clearKeepaliveTimer();
      if (!canRetry()) {
        return;
      }
      if (!opened && reconnectAttempt >= 12) {
        handlers.onStatus('error', RETRY_DETAIL);
        return;
      }
      scheduleReconnect();
    });
  };

  open();

  return {
    disconnect: () => {
      closedByUser = true;
      clearReconnectTimer();
      clearKeepaliveTimer();
      destroySocket();
    },
    reconnectNow: () => {
      if (fatal || closedByUser) {
        return;
      }
      reconnectAttempt = 0;
      handlers.onStatus('reconnecting', RECONNECT_DETAIL);
      open();
    },
  };
}
