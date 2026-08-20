# Wi‑Fi + QR Live Score Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host shares a live match over LAN/hotspot via QR; viewers watch a read-only scoreboard updated on every host score change.

**Architecture:** Host runs `react-native-nitro-http-server` WebSocket; Zustand match updates broadcast full `MatchSummary` snapshots; viewers scan QR and connect with built-in `WebSocket`.

**Tech Stack:** React Native 0.85, Zustand, nitro-http-server, qrcode-svg, vision-camera (+ barcode scanner), network-info.

## Global Constraints

- View-only spectators; host is sole scorer
- Do not persist remote matches into `useMatchStore` in v1
- Protocol version `v: 1`, type `boxcricket.live`
- Prefer full snapshots over incremental events in v1
- Android-first; add camera + cleartext permissions

---

### Task 1: Protocol + QR payload helpers

**Files:**
- Create: `src/liveShare/protocol.ts`
- Create: `src/liveShare/qrPayload.ts`
- Test: `__tests__/liveShareProtocol.test.ts`

**Interfaces:**
- Produces: `LiveShareJoinPayload`, `parseJoinPayload`, `encodeJoinPayload`, `createSessionToken`, `LiveShareMessage` types, `LIVE_SHARE_PATH`, `LIVE_SHARE_PORT`

- [ ] Add protocol types and encode/decode with validation
- [ ] Add Jest tests for valid/invalid QR payloads
- [ ] Run: `npm test -- --testPathPattern=liveShareProtocol`

---

### Task 2: Install native deps + permissions

**Files:**
- Modify: `package.json`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: iOS `Info.plist` (camera usage string)

- [ ] Install: nitro-http-server, qrcode-svg, svg, network-info, vision-camera, nitro-image, vision-camera-barcode-scanner
- [ ] Add Android `CAMERA`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`
- [ ] Ensure cleartext allowed for `ws://`
- [ ] Add iOS `NSCameraUsageDescription`

---

### Task 3: Host share session service

**Files:**
- Create: `src/liveShare/hostShareSession.ts`
- Create: `src/liveShare/getLocalIp.ts`

**Interfaces:**
- Produces: `startHostShareSession({ matchId, getMatch, onViewerCount })`, `stopHostShareSession()`, subscribe to match updates and broadcast `match.updated`

- [ ] Start WS server on fixed port `8787` path `/live`
- [ ] Validate `session.hello` token
- [ ] Broadcast snapshots; stop cleans connections

---

### Task 4: Viewer client service

**Files:**
- Create: `src/liveShare/viewerClient.ts`

**Interfaces:**
- Produces: `connectViewer({ payload, onMatch, onEnded, onStatus })`, disconnect helper

- [ ] Connect `ws://host:port/path`
- [ ] Send hello; handle snapshot/updated/ended; reconnect with backoff once or twice

---

### Task 5: Share Live Score UI (host)

**Files:**
- Create: `src/screens/ShareLiveScoreModal.tsx` (or screen)
- Modify: `src/components/LiveScoringPanel.tsx` — Share button in toolbar

- [ ] Start session on open; show QR + IP hint + viewer count + Stop
- [ ] Stop session on close / unmount

---

### Task 6: Scan + Spectator UI (viewer)

**Files:**
- Create: `src/screens/ScanToWatchScreen.tsx`
- Create: `src/screens/LiveSpectatorScreen.tsx`
- Modify: `src/navigation/types.ts`, `src/navigation/index.tsx`, `src/navigation/CustomDrawerContent.tsx`

- [ ] Drawer “Watch live” → Scan → connect → Spectator read-only scoreboard
- [ ] Reuse ball-by-ball / score summary patterns from MatchDetail without scoring controls

---

### Task 7: Smoke verification

- [ ] Typecheck / lint touched files
- [ ] Jest protocol tests pass
- [ ] Manual checklist documented in plan footer
