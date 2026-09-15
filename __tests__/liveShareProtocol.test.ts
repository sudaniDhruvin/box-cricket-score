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
  createViewerId,
  encodeFrame,
  parseMessage,
} from '../src/liveShare/protocol';

describe('liveShare protocol', () => {
  it('creates a 6-char session token', () => {
    const token = createSessionToken();
    expect(token).toHaveLength(6);
    expect(token).toMatch(/^[A-Z0-9]+$/);
  });

  it('creates a viewer id for reconnecting the same phone', () => {
    const id = createViewerId();
    expect(id.startsWith('v-')).toBe(true);
    expect(id.length).toBeGreaterThan(6);
  });

  it('parses a session hello that includes viewerId', () => {
    expect(
      parseMessage(
        '{"type":"session.hello","v":1,"sessionId":"m-1","token":"ABC123","viewerId":"v-abc"}',
      ),
    ).toEqual({
      type: 'session.hello',
      v: 1,
      sessionId: 'm-1',
      token: 'ABC123',
      viewerId: 'v-abc',
    });
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
    expect(LIVE_SHARE_PORT).toBe(8899);
    expect(buildWsUrl(parsed!)).toBe('tcp://192.168.43.1:8899');
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
          port: 8899,
          path: '/live',
          sessionId: 'm-1',
          token: 'ABC123',
        }),
      ),
    ).toBeNull();
  });

  it('parses TCP newline frames', () => {
    expect(parseMessage('{"type":"session.ended"}')).toEqual({
      type: 'session.ended',
    });
    expect(encodeFrame({ type: 'session.ended' })).toBe(
      '{"type":"session.ended"}\n',
    );
    expect(parseMessage('{bad')).toBeNull();
  });

  it('parses keepalive frames', () => {
    expect(parseMessage('{"type":"session.heartbeat"}')).toEqual({
      type: 'session.heartbeat',
    });
    expect(parseMessage('{"type":"session.ping"}')).toEqual({
      type: 'session.ping',
    });
    expect(encodeFrame({ type: 'session.heartbeat' })).toBe(
      '{"type":"session.heartbeat"}\n',
    );
  });
});
