# Wi‑Fi + QR Live Score Sharing — Design

**Date:** 2026-08-11  
**Status:** Approved for implementation  
**Product:** Box Cricket Score

## Goal

Let the match organizer (host) share a live match over the local network. Other players scan a QR code, connect, and watch a read-only live scoreboard that updates on every scoring event. No cloud, no accounts, no co-scoring.

## Decisions

| Topic | Choice |
|-------|--------|
| Transport | Same Wi‑Fi or host hotspot + local WebSocket |
| Join UX | QR scan (payload: IP, port, sessionId, token) |
| Viewer role | View-only |
| Source of truth | Host Zustand match store |
| Platforms (v1) | Android-first; iOS best-effort |
| Persist on viewer | Do not save remote matches into local history (v1) |

## Architecture

```text
Host                                 Viewer
────                                 ──────
LiveScoringPanel                     LiveSpectatorScreen
      │                                     ▲
      ▼                                     │
useMatchStore ──subscribe──► HostShareSession
      │                         │
      │                    nitro-http-server (WS)
      │                         │
      └──── QR (ip/port/session/token) ─────┘
                         vision-camera scan
                         built-in WebSocket client
```

## Protocol (JSON over WebSocket)

### QR / join payload

```json
{
  "v": 1,
  "type": "boxcricket.live",
  "host": "192.168.43.1",
  "port": 8787,
  "path": "/live",
  "sessionId": "m-…",
  "token": "A9F3K2",
  "matchName": "Titans vs Strikers"
}
```

### Messages (host → viewer)

- `match.snapshot` — full `MatchSummary` on join and reconnect
- `match.updated` — full `MatchSummary` after any host store change for that match (v1 uses full snapshots for simplicity/correctness)
- `session.ended` — host stopped sharing

### Messages (viewer → host)

- `session.hello` — `{ v, token, sessionId }` on connect; host validates then replies with snapshot

### Rules

- Reject bad token / wrong session / unsupported `v`
- On reconnect, always send fresh snapshot
- Host is sole writer; viewers never call `updateMatch`

## UX

### Host

1. During live scoring, tap **Share**
2. See QR + short instructions (same Wi‑Fi / join hotspot)
3. See viewer count
4. **Stop sharing** ends the session

### Viewer

1. Drawer → **Watch live**
2. Scan QR (camera permission)
3. Connecting → read-only spectator UI
4. Reconnecting banner on drop; final “Host ended” when session closes

## Packages

- `react-native-nitro-http-server` — host WS server
- `react-native-qrcode-svg` + `react-native-svg` — QR display
- `react-native-camera-kit` — QR scan
- `react-native-network-info` — host LAN IP
- Built-in `WebSocket` — viewer client
- Existing `react-native-nitro-modules`

Install with Yarn: `yarn add …`

## Out of scope (v1)

- Bluetooth / Nearby P2P
- Co-scoring
- Saving watched matches locally
- Manual join code (optional later)
- Background host survival guarantees beyond best effort

## Battery

- Prefer venue Wi‑Fi over hotspot when possible
- Stop server when sharing ends or host leaves scoring
- Keep-awake remains host scoring behavior only
