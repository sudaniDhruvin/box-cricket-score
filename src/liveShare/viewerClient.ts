import type { MatchSummary } from '../types/match';
import {
  LIVE_SHARE_PROTOCOL_VERSION,
  buildWsUrl,
  parseMessage,
  serializeMessage,
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

export function connectViewer(
  payload: LiveShareJoinPayload,
  handlers: ViewerClientHandlers,
): ViewerClient {
  let closedByUser = false;
  let ws: WebSocket | null = null;
  let reconnectAttempt = 0;
  const maxReconnects = 3;

  const url = buildWsUrl(payload);

  const open = () => {
    if (closedByUser) {
      return;
    }

    handlers.onStatus(
      reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
    );

    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      reconnectAttempt = 0;
      handlers.onStatus('connected');
      socket.send(
        serializeMessage({
          type: 'session.hello',
          v: LIVE_SHARE_PROTOCOL_VERSION,
          sessionId: payload.sessionId,
          token: payload.token,
        }),
      );
    };

    socket.onmessage = event => {
      const raw = typeof event.data === 'string' ? event.data : '';
      const message = parseMessage(raw);
      if (message == null) {
        return;
      }

      if (message.type === 'match.snapshot' || message.type === 'match.updated') {
        handlers.onMatch(message.match);
        return;
      }

      if (message.type === 'session.ended') {
        closedByUser = true;
        handlers.onEnded(message.reason);
        handlers.onStatus('ended', message.reason);
        socket.close();
        return;
      }

      if (message.type === 'session.error') {
        closedByUser = true;
        handlers.onStatus('error', message.message);
        handlers.onEnded(message.message);
        socket.close();
      }
    };

    socket.onerror = () => {
      // onclose handles reconnect
    };

    socket.onclose = () => {
      if (closedByUser) {
        return;
      }
      if (reconnectAttempt >= maxReconnects) {
        handlers.onStatus('error', 'Connection lost');
        handlers.onEnded('Connection lost');
        return;
      }
      reconnectAttempt += 1;
      handlers.onStatus('reconnecting');
      setTimeout(open, 800 * reconnectAttempt);
    };
  };

  open();

  return {
    disconnect: () => {
      closedByUser = true;
      try {
        ws?.close();
      } catch {
        // ignore
      }
      ws = null;
    },
  };
}
