# Nearby Live Score Sharing — Options for Team Review

**Product:** Box Cricket Score (Cricket Scorer)  
**Date:** 2026-08-11  
**Status:** Decision document (not yet an approved implementation spec)  
**Goal:** Let other players see the same live match as the organizer, updated on every scoring event, without accounts or a cloud backend.

---

## 1. Product decisions already agreed

| Decision | Choice |
|----------|--------|
| Viewer role (v1) | **View-only** — only the organizer scores |
| Join UX | **QR scan** to connect to the host session |
| Sync requirement | Every scoring event (runs, extras, wicket, undo, over complete, innings change, match complete) updates connected devices |
| Backend | None — nearby / on-device networking only |

---

## 2. What we are solving

Today the app is **local-first**: match state lives in Zustand + MMKV on one phone. Other phones cannot see that match.

We want:

1. Organizer creates/starts a match and becomes **Host**.
2. Host shows a **QR code**.
3. Other players scan QR and become **Viewers**.
4. Host scores as usual.
5. Viewers see the same scoreboard / ball-by-ball / chase info update in near real time.

```text
┌─────────────┐  score events   ┌──────────────┐
│ Host phone  │ ───────────────►│ Viewer phone │
│ (scorer)    │                 │ (read-only)  │
└─────────────┘                 └──────────────┘
       │                               ▲
       │         same session          │
       └─────────── QR join ───────────┘
```

---

## 3. Option A — Local Wi‑Fi / Hotspot + QR + Host server

### 3.1 Idea

The host phone runs a **small local server** (typically WebSocket).  
The QR encodes the join address (IP, port, session id, short token).  
Viewers must be on the **same local network** as the host, then scan and connect.

This is **offline from the internet** (no cloud), but phones still need a shared LAN.

### 3.2 How “offline” works

“Offline” here means:

- No internet required
- No Firebase / API / user accounts for sync
- Match data never leaves the local network

Viewers still need one of:

1. **Same venue Wi‑Fi** (even if that Wi‑Fi has no internet), or  
2. **Host mobile hotspot** — organizer turns on hotspot; viewers join that hotspot; then scan QR

If phones are on different networks, the QR URL cannot reach the host.

### 3.3 User flow

**Host**

1. Start or open a live match.
2. Tap **Share live score**.
3. App starts local server + shows QR (+ optional short code).
4. Optionally turn on hotspot and tell viewers the hotspot name/password (or show that in UI).
5. Score normally.

**Viewer**

1. Join host Wi‑Fi / hotspot (if required).
2. In app: **Scan to watch**.
3. Scan QR → connect → see live read-only match UI.
4. Stay connected; disconnect when match ends or they leave.

### 3.4 Technical shape

| Piece | Responsibility |
|-------|----------------|
| Host sync server | Accept viewer connections; send snapshot + event stream |
| QR payload | `protocol`, host IP, port, `matchId` / `sessionId`, auth token, app version |
| Event bus | On each host state change, broadcast event (or full snapshot) |
| Viewer store | Apply remote events into a read-only match view (do not write to host) |
| Permissions | Local network / hotspot guidance; camera for QR |

**Suggested message types**

- `session.hello` — viewer connects, sends app version
- `match.snapshot` — full current `MatchSummary` (on join / reconnect)
- `match.event` — incremental update (`delivery`, `undo`, `edit`, `startSecondInnings`, `matchComplete`, …)
- `session.ping` / `session.error`

**Recommended sync model for v1**

- On join/reconnect: send **full snapshot**
- During match: send **events** (or snapshot-on-every-change if payload stays small)
- Host remains **single source of truth**

### 3.5 Pros

- Reliable for multiple viewers
- Natural fit for React Native (TCP/WebSocket patterns are mature)
- Easy to reason about: one host, many clients
- Good match for existing Zustand match model
- Works with no internet once LAN/hotspot is up

### 3.6 Cons

- Viewers may need a **manual hotspot / Wi‑Fi join** step before QR
- Host IP can change if network changes mid-match (need reconnect / new QR)
- Some phones/OS versions restrict hosting servers on cellular / background
- Feels slightly less “magic” than pure Bluetooth tap-to-join
- Corporate / guest Wi‑Fi may block device-to-device traffic (hotspot avoids this)

### 3.7 Platform notes

| Platform | Notes |
|----------|--------|
| Android | Hotspot + local server is common and practical |
| iOS | Local Network permission; hosting is more constrained; hotspot join UX is clunkier |
| Cross-platform | Same Wi‑Fi usually easiest; Android host + Android viewers is the lowest-risk first ship |

### 3.8 Rough effort (engineering)

| Workstream | Estimate |
|------------|----------|
| Host server + protocol + QR | Medium |
| Viewer join + read-only UI | Medium |
| Reconnect / snapshot recovery | Medium |
| Hotspot guidance UX + edge cases | Medium |
| Hardening (permissions, background, version mismatch) | Medium |

**Overall:** Medium — best v1 candidate.

---

## 4. Option B — True peer-to-peer / Bluetooth-style nearby

### 4.1 Idea

Devices discover and connect **directly** without a shared router account.  
Transport may be Bluetooth Low Energy (BLE), Bluetooth Classic, Wi‑Fi Direct, or a higher-level nearby API that picks the best radio.

QR still helps: instead of browsing a noisy device list, scan to select the correct host/session.

### 4.2 How it works (conceptually)

1. Host advertises a nearby session (`BoxCricket-<sessionId>`).
2. QR encodes session identity + connection bootstrap data.
3. Viewer scans → app initiates P2P/BLE connection to that host.
4. Host streams the same snapshot + events as Option A.
5. Application protocol can be almost identical; only the transport differs.

```text
Host  ←── BLE / Wi‑Fi Direct / Nearby ──► Viewer 1
  │
  └──► Viewer 2 ...
```

### 4.3 Possible technology paths

| Path | Summary | Fit for this app |
|------|---------|------------------|
| **BLE GATT** | Low energy; good for small packets; phone-as-peripheral/central roles | Possible, but awkward for many viewers + larger snapshots |
| **Bluetooth Classic SPP** | Stream-like sockets | Android-friendly; weak/awkward on iOS |
| **Wi‑Fi Direct** | Peer Wi‑Fi without router | Powerful; OS UX/permissions are heavy |
| **Google Nearby Connections** | Higher-level Android P2P (strategies: cluster/star/point-to-point) | Strong Android option; not a clean shared iOS story |
| **Apple Multipeer Connectivity** | iOS/mac nearby | iOS-only; needs separate Android design |

### 4.4 Pros

- Closer to user mental model of “Bluetooth share”
- No venue Wi‑Fi dependency
- Often no manual hotspot password step (depending on stack)
- Feels more seamless when it works

### 4.5 Cons

- Significantly harder to make reliable in React Native
- Android ↔ iOS nearby is the painful matrix
- BLE throughput / connection limits make multi-viewer sync harder
- More OS permission prompts (Bluetooth, location, nearby devices)
- More flaky indoors (interference, OEM Bluetooth stacks)
- Higher QA surface (pair, reconnect, role switch, background kill)
- Longer time-to-stable-v1

### 4.6 Rough effort (engineering)

| Workstream | Estimate |
|------------|----------|
| Transport integration + permissions | High |
| Discovery + QR bootstrap | Medium–High |
| Multi-viewer reliability | High |
| Cross-platform parity | High |
| Fallback behavior when P2P fails | Medium |

**Overall:** High — better as v2 / platform-specific enhancement after Option A.

---

## 5. Side-by-side comparison

| Criteria | A: Wi‑Fi / Hotspot + QR | B: True P2P / Bluetooth |
|----------|-------------------------|-------------------------|
| Internet required | No | No |
| Shared router required | Yes, or host hotspot | No |
| Join UX | Join network (if needed) → scan QR | Scan QR / nearby connect |
| Multi-viewer reliability | Strong | Harder |
| React Native maturity | Better | Weaker / fragmented |
| Android-first ship | Excellent | Good (Nearby/BLE), still complex |
| iOS support | Possible with caveats | Harder / separate stack |
| Fits current app architecture | Excellent | Good protocol-wise, hard transport-wise |
| Engineering risk | Medium | High |
| Time to useful beta | Faster | Slower |
| User “wow” factor | Good | Higher when seamless |

---

## 6. Shared application design (same for A or B)

Regardless of transport, keep one **match sync protocol** so we can swap networking later.

### 6.1 Roles

- **Host:** owns match state; only device that can score/edit/undo.
- **Viewer:** receives snapshot + events; UI is read-only.

### 6.2 Source of truth

- Host Zustand/MMKV store remains canonical.
- Viewers keep an in-memory (or local cache) copy of the remote match for display.
- Viewers never mutate host state.

### 6.3 Events to sync

At minimum, mirror host actions that change `MatchSummary`:

- Delivery applied (runs / wide / no-ball / bye / wicket)
- Undo
- Over complete acknowledgment (if it changes state)
- Start second innings
- Mid-match edit (names / overs / wickets)
- Match finalized (winner / margin / completed)
- Host ended sharing / session closed

### 6.4 Reconnect rules

- Viewer disconnects → show “Reconnecting…”
- On reconnect → request fresh **snapshot** (do not replay a partial event log only)
- If host stops sharing → viewers show “Host ended live share”

### 6.5 Security (lightweight, local)

- QR includes a short random **session token**
- Reject connections without token
- Optional: rotate token when regenerating QR
- Assume nearby physical trust (people at the ground); this is not a public internet API

### 6.6 Versioning

- QR / hello handshake includes protocol version
- If viewer app is too old/new, show clear “Update app to watch this match”

---

## 7. UX outline (both options)

### Host

- Live match screen action: **Share live score**
- Screen shows:
  - QR code
  - Session status (`Waiting` / `N watching`)
  - Stop sharing
  - For Option A: hotspot/Wi‑Fi instructions

### Viewer

- Home / drawer action: **Scan to watch**
- Camera permission → scan → connecting → **Live spectator** screen
- Spectator UI reuses scoreboard / ball-by-ball / chase panels in read-only mode
- Clear badge: `Watching live` + host connection state

### Failure states

- Camera permission denied
- Not on same network (Option A)
- Host not found / Bluetooth off (Option B)
- Host left / match ended
- App version mismatch

---

## 8. Recommendation

### Recommended path

1. **Ship v1 with Option A** (Host hotspot or same Wi‑Fi + QR + WebSocket-style sync, view-only).
2. Design the **sync protocol and spectator UI** so they are transport-agnostic.
3. Evaluate **Option B** later as an Android enhancement (e.g. Nearby Connections) if hotspot join friction shows up in real matches.

### Why

- Current app is Android-leaning and already event-driven around a single match store.
- View-only + host authority avoids conflict complexity.
- Option A gets a real “everyone watches the score” experience to users sooner.
- Option B solves the remaining UX friction, but is the wrong first bet for reliability.

### Suggested team decision

| Question | Options |
|----------|---------|
| v1 transport | **A** / B / A then B |
| Platforms in v1 | Android only / Android + iOS |
| Max viewers target | e.g. 4 / 8 / 15 |
| Must work with zero manual Wi‑Fi steps? | Yes (forces B or very polished hotspot UX) / No |

---

## 9. Open questions for the team

1. Is **Android-only** acceptable for the first nearby-share release?
2. What is the expected **viewer count** per match (2–4 friends vs larger group)?
3. Is asking viewers to **join host hotspot** acceptable for v1?
4. Should a viewer be able to **save a copy** of the completed match locally after watching?
5. Do we need a fallback **manual code** if QR camera fails?

---

## 10. Appendix — example QR payload (Option A)

Illustrative only:

```json
{
  "v": 1,
  "type": "boxcricket.live",
  "host": "192.168.43.1",
  "port": 8787,
  "sessionId": "m-1723123456789",
  "token": "A9F3K2",
  "matchName": "Titans vs Strikers"
}
```

Encoded as QR content (JSON or compact URL-like string). App scanner accepts only known `type` + supported `v`.

---

## 11. Appendix — fit with current codebase

Relevant existing pieces:

- Match model: `src/types/match.ts`
- Persist/store: `src/store` (Zustand + MMKV)
- Scoring engine: `src/utils/applyScoringDelivery.ts`, `deliveryScoring.ts`
- Live UI: `src/components/LiveScoringPanel.tsx`
- Match detail / history: `src/screens/MatchDetailScreen.tsx`

Implication: networking should wrap **host match updates**, not rewrite the scoring engine. Spectator mode should render the same match model read-only.

---

## Document history

| Version | Date | Notes |
|---------|------|-------|
| 0.1 | 2026-08-11 | Initial options doc for team sharing (A: LAN/hotspot+QR, B: P2P/Bluetooth) |
