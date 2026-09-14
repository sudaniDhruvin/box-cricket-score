import TcpSocket from 'react-native-tcp-socket';
import type Socket from 'react-native-tcp-socket/lib/types/Socket';
import type { MatchSummary } from '../types/match';
import {
  LIVE_SHARE_PROTOCOL_VERSION,
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

/**
 * Viewer TCP client (Claude LocalScoreClient pattern):
 * newline-delimited JSON over react-native-tcp-socket.
 */
export function connectViewer(
  payload: LiveShareJoinPayload,
  handlers: ViewerClientHandlers,
): ViewerClient {
  let closedByUser = false;
  let socket: Socket | null = null;
  let reconnectAttempt = 0;
  const maxReconnects = 8;
  let buffer = '';

  const open = () => {
    if (closedByUser) {
      return;
    }

    handlers.onStatus(reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    buffer = '';

    let opened = false;
    const next = TcpSocket.createConnection(
      {
        host: payload.host,
        port: Number(payload.port),
      },
      () => {
        opened = true;
        reconnectAttempt = 0;
        handlers.onStatus('connected');
        try {
          next.write(
            encodeFrame({
              type: 'session.hello',
              v: LIVE_SHARE_PROTOCOL_VERSION,
              sessionId: payload.sessionId,
              token: payload.token,
            }),
          );
        } catch {
          // close/error will reconnect
        }
      },
    );

    socket = next;

    next.on('data', data => {
      buffer += dataToString(data as string | Uint8Array);
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        const message = parseMessage(trimmed);
        if (message == null) {
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
          closedByUser = true;
          handlers.onEnded(message.reason);
          handlers.onStatus('ended', message.reason);
          try {
            next.destroy();
          } catch {
            // ignore
          }
          continue;
        }

        if (message.type === 'session.error') {
          closedByUser = true;
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
      if (closedByUser) {
        return;
      }
      if (reconnectAttempt >= maxReconnects) {
        const detail = opened
          ? 'Connection dropped. Ask the host to Refresh QR and rescan.'
          : `Cannot reach host ${payload.host}:${payload.port}. Same Wi‑Fi/hotspot?`;
        handlers.onStatus('error', detail);
        handlers.onEnded(detail);
        return;
      }
      reconnectAttempt += 1;
      handlers.onStatus('reconnecting');
      setTimeout(open, 600 * reconnectAttempt);
    });
  };

  open();

  return {
    disconnect: () => {
      closedByUser = true;
      try {
        socket?.destroy();
      } catch {
        // ignore
      }
      socket = null;
    },
  };
}
