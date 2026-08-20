import {
  buildJoinPayload,
  encodeJoinPayload,
  parseJoinPayload,
} from '../src/liveShare/qrPayload';
import {
  LIVE_SHARE_PATH,
  LIVE_SHARE_PORT,
  LIVE_SHARE_TYPE,
  buildWsUrl,
  createSessionToken,
  parseMessage,
} from '../src/liveShare/protocol';

describe('liveShare protocol', () => {
  it('creates a 6-char session token', () => {
    const token = createSessionToken();
    expect(token).toHaveLength(6);
    expect(token).toMatch(/^[A-Z0-9]+$/);
  });

  it('encodes and parses a valid join payload', () => {
    const payload = buildJoinPayload({
      host: '192.168.43.1',
      sessionId: 'm-123',
      token: 'ABC123',
      matchName: 'Titans vs Strikers',
    });
    const raw = encodeJoinPayload(payload);
    const parsed = parseJoinPayload(raw);
    expect(parsed).toEqual({
      v: 1,
      type: LIVE_SHARE_TYPE,
      host: '192.168.43.1',
      port: LIVE_SHARE_PORT,
      path: LIVE_SHARE_PATH,
      sessionId: 'm-123',
      token: 'ABC123',
      matchName: 'Titans vs Strikers',
    });
    expect(buildWsUrl(parsed!)).toBe('ws://192.168.43.1:8787/live');
  });

  it('rejects invalid join payloads', () => {
    expect(parseJoinPayload('not-json')).toBeNull();
    expect(parseJoinPayload(JSON.stringify({ v: 2, type: LIVE_SHARE_TYPE }))).toBeNull();
    expect(
      parseJoinPayload(
        JSON.stringify({
          v: 1,
          type: 'other',
          host: '1.1.1.1',
          port: 8787,
          path: '/live',
          sessionId: 'm-1',
          token: 'ABC123',
        }),
      ),
    ).toBeNull();
  });

  it('parses websocket messages', () => {
    expect(parseMessage('{"type":"session.ended"}')).toEqual({
      type: 'session.ended',
    });
    expect(parseMessage('{bad')).toBeNull();
  });
});
