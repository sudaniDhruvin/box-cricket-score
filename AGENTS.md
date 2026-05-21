# Box Cricket Score — Cursor Agent Guide

> **Read this file first** before changing UI, copy, navigation, or scoring flows.  
> Goal: improve **clarity, speed, and confidence** for people scoring live box cricket on a phone — especially **target**, **runs needed**, and **required run rate** during a chase.

---

## 1. What this app is

**Box Cricket Score** (`displayName`: Cricket Scorer) is a **React Native 0.85** mobile app for scoring **short indoor / box cricket** matches **locally on device** (no accounts, no cloud sync).

| Area               | Detail                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Primary job**    | Tap each ball quickly while the game is live; see score, overs, chase math, and history. |
| **Secondary job**  | Review finished matches, delete mistakes, clear device data.                             |
| **Storage**        | Zustand + MMKV persistence (`useMatchStore`, `useUserStore`)                             |
| **Key screens**    | Onboarding → Home → New Match → Live Scoring → Match Detail                              |
| **Scoring engine** | `src/utils/applyScoringDelivery.ts`, `deliveryScoring.ts`, `cricketFormat.ts`            |
| **Live UI**        | `src/components/LiveScoringPanel.tsx`                                                    |
| **Theme**          | `src/theme/colors.ts` — primary `#01B489`, light surfaces                                |

### Match lifecycle (do not break)

1. **Create** — team names (optional), overs/side, wickets all-out, who bats first → `createLiveMatch()`.
2. **1st innings** — ball-by-ball scoring until all-out or overs done.
3. **Break** — modal / CTA to **Start 2nd innings** (`scoringActiveInnings: 1`).
4. **2nd innings (chase)** — same scorer; show **target**, **runs needed**, **RRR**; auto-complete when chased, tied, or innings ends.
5. **Completed** — `status: 'completed'`, winner + margin; visible on Home + Match Detail.

---

## 2. Who uses it & how

| Persona                | Needs                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Scorer (primary)**   | One-thumb input, instant feedback, cannot mis-tap; chase numbers **glanceable** from 2 m away. |
| **Player on sideline** | Understand “how many to win?” without cricket jargon.                                          |
| **Returning user**     | Resume live match, find today’s games, undo last ball.                                         |

**Context constraints:** outdoor/indoor lighting, standing, possibly one hand, interruptions, ads on screen — **scoring controls beat monetization** for layout priority.

---

## 3. Code map (where to edit)

```
App.tsx                          # Ads, keep-awake, splash
src/navigation/index.tsx         # Onboarding vs drawer + stack
src/screens/HomeScreen.tsx         # Match list, FAB, delete, interstitial
src/screens/NewMatchScreen.tsx     # Match setup form
src/screens/MatchDetailScreen.tsx  # Summary, tabs, continue scoring
src/components/LiveScoringPanel.tsx # ★ Main UX debt — live scoring
src/components/MatchCard.tsx       # Home list cards
src/components/InningsBallByBall.tsx
src/utils/applyScoringDelivery.ts  # ★ Domain logic — change carefully
src/utils/cricketFormat.ts         # Formatting + result copy
src/theme/colors.ts
```

**Rule:** UX copy/layout changes are welcome; **scoring math** changes need tests or manual verification against Section 5.

---

## 4. Cricket domain rules (source of truth)

Agents must preserve these unless the user explicitly changes product rules:

| Rule                | Implementation                                                                   |
| ------------------- | -------------------------------------------------------------------------------- |
| Legal over          | 6 legal balls; wides & no-balls **do not** count as legal (`countsAsLegalBall`). |
| Wide / no-ball runs | +1 penalty + optional bat runs (`wideRuns`, `noBallRuns`).                       |
| Bye                 | 1 run, counts as legal ball.                                                     |
| Chase target        | `firstInningsRuns + 1`.                                                          |
| Runs needed         | `max(0, target - secondInningsRuns)`.                                            |
| RRR                 | `(need × 6) / legalBallsRemaining` when need > 0 and balls remain.               |
| Win by wickets      | 2nd innings passes target before all-out/overs.                                  |
| Tie                 | 2nd innings complete, scores level.                                              |
| Undo                | Up to 40 snapshots in `LiveScoringPanel` (`UNDO_MAX`).                           |

---

## 5. Design principles for this project

When proposing or implementing UI changes, follow these in order:

1. **Glanceability** — The answer to “who’s winning / how many needed?” must be visible in **< 1 second** without reading four equal-weight boxes.
2. **Plain language** — Prefer “Runs needed to win” over “Need”; “Required rate” over “RRR” (or show both: `RRR 12.50 (req. 12.5/over)`).
3. **One primary action per screen** — Home: start/resume scoring; Live: record next ball; Setup: create match.
4. **Progressive disclosure** — Advanced extras (Wd+4, Nb+6) behind “More extras” if needed; don’t block core 0–6 + Wicket.
5. **Consistent cricket notation** — `142/3 (15.4 ov)` with **tiny labels** only where needed; never ambiguous `(0.2)` alone.
6. **State-aware UI** — 1st innings, innings break, 2nd innings chase, match over — each gets a **distinct layout**, not the same stat grid.
7. **Feedback** — Every tap updates score immediately; undo disabled when empty; errors explain _what to do next_.
8. **Accessibility** — Min 44×44 pt touch targets; contrast ≥ 4.5:1 for text; don’t rely on color alone (add labels/icons).
9. **Respect safe areas & thumb zone** — Primary scoring buttons in **bottom 40%** of screen; avoid ads pushing Wicket off-screen.

---

## 6. Screen-by-screen expected behavior

### 6.1 Home (`HomeScreen`)

**Purpose:** See all matches; start new game; open live or finished match.

| Element               | Expected behavior                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Header CTA            | “Start new innings” → New Match (interstitial ad optional, never blocks > 1 tap).            |
| Sections              | Today / Yesterday / date; newest match first within day.                                     |
| Match card            | **At a glance:** teams, **both innings scores**, LIVE vs FINISHED, **result or chase line**. |
| Live 2nd innings card | Must show: `Target 85 · Need 42 off 28 balls · RR 9.0` (or plain-language equivalent).       |
| Tap card              | → Match Detail.                                                                              |
| Long press            | Delete with confirmation (consider surfacing “Hold to delete” once).                         |
| FAB                   | Same as header CTA; only after scroll — acceptable if not redundant visually.                |

### 6.2 New match (`NewMatchScreen`)

**Purpose:** Minimal steps to start scoring in < 30 seconds.

| Element         | Expected behavior                                                       |
| --------------- | ----------------------------------------------------------------------- |
| Team names      | Optional; defaults Team A / B; inline error if same name.               |
| Overs / wickets | Presets **or** custom field — only one active; selected preset obvious. |
| Bat first       | Two clear choices; updates when team names change.                      |
| Primary CTA     | Sticky bottom **“Create match & score”** visible while scrolling.       |
| Intro copy      | Max 2 lines or “?” help sheet — not a wall of text.                     |
| After create    | Transition to `LiveScoringPanel` on same route.                         |

### 6.3 Live scoring (`LiveScoringPanel`) — **highest priority**

**Purpose:** Fast, error-free ball entry; chase info impossible to miss.

#### 6.3.1 Layout zones (recommended)

```
┌─────────────────────────────────────┐
│ Home · Undo · Edit names            │
├─────────────────────────────────────┤
│ INNINGS + team + match limit        │
├─────────────────────────────────────┤
│ ★ HERO: Runs/Wickets (largest)     │
│ ★ CHASE STRIP (2nd inn only)       │  ← Target · Need · RR (required)
├─────────────────────────────────────┤
│ Overs · Balls this over · CRR      │  secondary row
├─────────────────────────────────────┤
│ Current over (ball chips)           │
├─────────────────────────────────────┤
│ SCORING PAD (sticky bottom)         │
│ 0 1 2 3 4 6 | Wd Nb | Wicket        │
└─────────────────────────────────────┘
```

#### 6.3.2 By innings state

| State                    | Hero content                                    | Secondary                                   |
| ------------------------ | ----------------------------------------------- | ------------------------------------------- |
| **1st innings**          | `0/0` runs-wickets                              | Overs bowled · Overs remaining · Current RR |
| **1st innings complete** | Full score + “Innings complete”                 | Start 2nd innings CTA (blocking)            |
| **2nd innings (chase)**  | `runs/wickets` + **“Need X runs from Y balls”** | **Target N** · **Required rate Z.Z** · CRR  |
| **Target reached**       | “Won!” / highlight                              | Disable scoring except undo                 |
| **Match over**           | Result modal then Home                          | —                                           |

#### 6.3.3 Chase strip (required implementation guidance)

**Problem today:** Target / Need / CRR / RRR sit in **four equal small cells** below the fold; labels are abbreviations; on 1st innings they are absent (correct) but nothing explains what will appear later.

**Expected:**

- **Dedicated horizontal strip** directly under main score, only when `activeIdx === 1` and 1st innings done.
- **Largest number:** runs still needed (e.g. **42**).
- **Second line:** `to win from 28 balls (4.4 overs)` — not just `RRR 9.00`.
- **Target** always shown: `Target: 85` (first innings + 1).
- When `need === 0`: show **“Target reached — X runs to win”** (not `Need 0` and `RRR —`).
- **Tooltip / help (optional):** “Required rate = runs needed per over for the rest of the innings.”

**Copy defaults:**

| Internal key | Preferred UI label |
| ------------ | ------------------ |
| `target`     | Target             |
| `need`       | Runs to win        |
| `currentRR`  | Current rate       |
| `chase.rrr`  | Required rate      |

#### 6.3.4 Scoring pad

- **Runs 0–6:** large tappable grid; **remove stray `00`** from section title (known bug: label reads `Runs off the bat 00` in `LiveScoringPanel.tsx`).
- **Extras:** Wd, Nb, By + “More” for Wd+n / Nb+n.
- **Wicket:** always visible in thumb zone; red, full width.
- **Undo:** disabled + muted when stack empty.
- **Legal this over:** rename to **“Balls this over”** or `3/6 balls`.

### 6.4 Match detail (`MatchDetailScreen`)

- LIVE: prominent **Continue scoring** + chase summary if 2nd innings.
- FINISHED: result headline + both innings + ball-by-ball.
- Tabs: 1st / 2nd innings with winner badge.

### 6.5 Drawer / legal / onboarding

- Onboarding: one screen, short value prop, Get started.
- Drawer: Terms, Privacy, Clear all data (destructive, confirmed).

---

## 7. UX & usability issues register

Use IDs when fixing or discussing work (e.g. “fix UX-012”).

**Severity:** P0 = blocks understanding / scoring; P1 = major friction; P2 = polish; P3 = nice-to-have.

### Live scoring (`LiveScoringPanel`) — P0/P1

| ID     | Sev | Issue                                                                                               | Expected fix                                                 |
| ------ | --- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| UX-001 | P0  | **Target / runs needed / required rate** buried in four equal stat cells; easy to miss during chase | Add dedicated **Chase strip** under hero score (§6.3.3)      |
| UX-002 | P0  | Abbreviations **CRR / RRR / Need** unclear to casual users                                          | Plain-language labels + optional abbreviation in parentheses |
| UX-003 | P0  | **RRR shows "—"** when need is 0 instead of celebratory / clear state                               | “Target reached” messaging                                   |
| UX-004 | P1  | Section title **`Runs off the bat 00`** — meaningless “00”                                          | Rename to `Runs off the bat`; remove typo                    |
| UX-005 | P1  | **“Legal this over”** jargon                                                                        | `Balls this over` + `3/6`                                    |
| UX-006 | P1  | **runs / wickets** label too small under hero score                                                 | Larger hierarchy or combined `Runs 0 · Wickets 0`            |
| UX-007 | P1  | **Overs left 8.0** at start of 8-over game confuses (is it remaining or limit?)                     | Label `Overs remaining` vs `Limit 8 ov`                      |
| UX-008 | P1  | **Wicket + extras** require excessive scroll; thumb-unfriendly                                      | Sticky bottom scoring pad; collapse extras                   |
| UX-009 | P1  | No **legend** for Wd/Nb/By colors on live screen                                                    | Inline legend or icons on buttons                            |
| UX-010 | P1  | **Undo** always looks enabled                                                                       | Disabled state when `undoRef` empty                          |
| UX-011 | P2  | **Pencil icon** unclear (edit team names)                                                           | Label “Teams” or edit icon + text                            |
| UX-012 | P2  | **“Home”** during live scoring — users fear losing data                                             | `Save & exit` or subtitle “Match saved”                      |
| UX-013 | P2  | **Current over** empty state low contrast                                                           | Stronger empty state; first ball hint                        |
| UX-014 | P2  | **Recent overs** collapsed by default                                                               | Show last over summary inline                                |
| UX-015 | P2  | **5 runs** uncommon — causes mis-taps                                                               | Consider 0–4 + 6 only, 5 under “other”                       |
| UX-016 | P3  | **Banner ad** competes with scoring area                                                            | Reduce height or hide during active over                     |

### Home & match cards (`HomeScreen`, `MatchCard`) — P0/P1

| ID     | Sev | Issue                                                              | Expected fix                                           |
| ------ | --- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| UX-020 | P0  | **Live chase not visible** on home card — only “Match in progress” | Chase line: `Need 42 off 28 · Target 85`               |
| UX-021 | P1  | **RESULT panel** large but low information during live             | Replace with chase/status strip                        |
| UX-022 | P1  | Scores `1/0 (0.2)` — **no R/W/Ov labels**                          | Tooltip or `1 run · 0 wkts · 0.2 ov`                   |
| UX-023 | P1  | Stats row **RUNS/4S/6S/OV** wrong emphasis for live chase          | Prioritize need/target; hide aggregates until complete |
| UX-024 | P1  | **View match** weak affordance                                     | Primary button on card for live matches                |
| UX-025 | P2  | **Long-press delete** undiscoverable                               | Hint on empty state or card menu (⋯)                   |
| UX-026 | P2  | **Extras expand** on card rarely needed                            | Move to detail only or collapse by default             |
| UX-027 | P2  | Subtitle **“newest first under each day”** — meta noise            | Remove or move to help                                 |
| UX-028 | P2  | Placeholder team names **“1” vs “2”**                              | Validate names or show “Unnamed teams”                 |
| UX-029 | P3  | **Native ads** between cards break scan rhythm                     | Limit frequency or section footer only                 |

### New match (`NewMatchScreen`) — P1/P2

| ID     | Sev | Issue                                                     | Expected fix                                              |
| ------ | --- | --------------------------------------------------------- | --------------------------------------------------------- |
| UX-030 | P1  | **Long instructional paragraph** truncated / overwhelming | Short helper + link                                       |
| UX-031 | P1  | **Preset + manual input** redundancy without clear state  | Mutual exclusivity UI; hide keyboard when preset selected |
| UX-032 | P1  | **“Who bats first?”** below fold; CTA not sticky          | Sticky footer CTA                                         |
| UX-033 | P2  | Selected chip **low contrast** (pale teal)                | Stronger selected: filled primary + white text            |
| UX-034 | P2  | Inconsistent controls: **chips vs cards**                 | Unified selection pattern                                 |
| UX-035 | P2  | No **match summary** before create                        | Preview: “Team A vs B · 8 ov · 10 wkts”                   |
| UX-036 | P3  | Defaults 8 ov / 10 wkts not explained for box cricket     | Hint: “Typical box: 6–8 overs, 4–6 wickets”               |

### Cross-cutting — P1/P2

| ID     | Sev | Issue                                                  | Expected fix                              |
| ------ | --- | ------------------------------------------------------ | ----------------------------------------- |
| UX-040 | P1  | **Inconsistent terminology** (Need, RRR, Ov, wkts)     | Glossary §9; one term per concept         |
| UX-041 | P1  | **Information hierarchy** — too many same-weight boxes | One hero metric per screen                |
| UX-042 | P2  | **No haptic / animation** on ball record               | Light feedback on `apply()`               |
| UX-043 | P2  | **Accessibility** — small stat labels (9–10px)         | Min 12px semantic labels                  |
| UX-044 | P2  | **Interstitial** before new match adds delay           | Show only if loaded; cap frequency        |
| UX-045 | P3  | **No in-app “?”** scoring help                         | Optional rules sheet (wide = 1 run, etc.) |

---

## 8. Implementation playbook for agents

When asked to “improve UX”:

1. **Read issue IDs** relevant to the screen (Section 7).
2. **Confirm innings state** — 1st vs 2nd vs complete (logic in `LiveScoringPanel`, `applyScoringDelivery`).
3. **Extract presentational components** — e.g. `ChaseStrip.tsx`, `ScoreHero.tsx`, `ScoringPad.tsx` from `LiveScoringPanel.tsx` rather than one 1700-line file.
4. **Use theme tokens** from `colors.ts`; no hardcoded random hex.
5. **Use existing formatters** — `formatOvers`, `formatRunRate`, `formatMatchResult`.
6. **Do not change chase math** without updating Section 4 and verifying edge cases (all-out, overs done, tie, mid-over win).
7. **Test manually:**
   - New match → 1st innings few balls → 2nd innings → chase visible
   - Target reached mid-over
   - Undo after wicket
   - Resume from Home
8. **Keep ads** unless user asks to remove — but deprioritize layout (UX-016).

### Suggested first sprint (user-reported priorities)

1. UX-001, UX-002, UX-003, UX-020 — chase visibility (live + home)
2. UX-004, UX-005 — quick wins on live scoring copy
3. UX-030, UX-032 — new match setup friction

---

## 9. Copy & terminology glossary

| Concept           | User-facing term        | Avoid                                 |
| ----------------- | ----------------------- | ------------------------------------- |
| First innings     | 1st innings             | Innings 0                             |
| Second innings    | 2nd innings             | Chase innings only internally         |
| Runs / wickets    | 142/3 or “142 for 3”    | Bare slash without context            |
| Overs             | 15.4 overs or “15.4 ov” | Decimal without “ov”                  |
| Target            | Target 85               | Par score                             |
| Runs still to win | **42 runs to win**      | Need 42                               |
| Current run rate  | Current rate 6.20       | CRR alone                             |
| Required run rate | Required rate 9.00      | RRR alone                             |
| Wides / no-balls  | Wide, No-ball           | Wd/Nb only on buttons (OK with color) |
| Legal balls       | Balls this over         | Legal                                 |
| All out           | All out (4 wickets)     | max wkts                              |

---

## 10. Visual reference (current vs target)

### Chase (2nd innings) — target pattern

```
┌──────────────────────────────────────────┐
│  2ND INNINGS · Thunder                   │
│                                          │
│         48/2                             │
│    42 RUNS TO WIN                        │  ← 28–32px bold
│    from 28 balls · Target 85             │  ← 14–16px muted
│                                          │
│  Current 6.2    Required 9.0             │  ← secondary row
└──────────────────────────────────────────┘
```

### Home live card — target pattern

```
[LIVE]  11:04 AM
Thunder 48/2 (8.0)  vs  Strikers 52/1 (7.2)
Need 4 runs from 12 balls · Target 53
[ Continue scoring ]
```

---

## 11. What NOT to do

- Do **not** add cloud login, sync, or tournaments unless explicitly requested.
- Do **not** rewrite scoring engine while doing UI-only tasks.
- Do **not** hide chase info behind expand/collapse.
- Do **not** use more abbreviations to “save space.”
- Do **not** remove undo or ball-by-ball replay.
- Do **not** change AdMob IDs in `src/config/adUnitIds.ts` without user consent.
- Do **not** commit secrets or replace `google-services.json`.

---

## 12. Files to attach for screenshot-led UX work

When the user shares UI screenshots, compare against:

- `LiveScoringPanel.tsx` — scoring pad, stat grid, modals
- `MatchCard.tsx` — home list
- `NewMatchScreen.tsx` — setup form
- `HomeScreen.tsx` — list layout, FAB, empty state

---

## 13. Review checklist (before marking UX work done)

- [ ] **2nd innings:** Target, runs to win, and required rate visible without scrolling on 6" phone
- [ ] **1st innings:** No chase strip; overs remaining clear
- [ ] **Home live card:** Chase line present for 2nd innings
- [ ] **Need = 0:** Clear winning state, not “—”
- [ ] **No `Runs off the bat 00`** label
- [ ] **Touch targets** ≥ 44pt on main scoring buttons
- [ ] **Undo** disabled when empty
- [ ] **Scoring math** unchanged or tests updated
- [ ] **Readable in sunlight** (contrast on primary teal/white)

---

You are allowed to add new screens, tabs, navigation flows, components, sections, modals, bottom sheets, filters, or other UI/UX improvements whenever necessary to improve the overall application experience.

However, you must strictly follow these rules at all times:

- Do not break any existing functionality, logic, API integration, state handling, navigation flow, or UI behavior.
- All current features must continue working exactly as before.
- Any new implementation must be fully compatible with the existing project architecture and application flow.
- Always maintain the current application theme, design language, spacing system, typography, colors, and component behavior.
- Do not create UI that feels visually disconnected from the rest of the application.
- Focus heavily on usability, readability, accessibility, responsiveness, consistency, and user experience improvements.
- You may restructure layouts or improve flows if needed, but changes must remain practical, scalable, maintainable, and production-ready.
- Before modifying any screen, first understand the purpose, workflow, business logic, and user journey of that screen.
- Prefer improving existing components instead of unnecessarily replacing them.
- Avoid overengineering or adding unnecessary complexity.
- Maintain clean code structure, reusable components, proper naming conventions, and optimized performance.
- Ensure all changes work properly on both Android and iOS platforms.
- Preserve backward compatibility wherever possible.
- Carefully verify all edge cases before finalizing any implementation.
- If there is any uncertainty about existing logic, first analyze the surrounding implementation before making changes.

The final result should feel like a polished, modern, and highly improved version of the same application — not a completely redesigned or unrelated application.

_Last updated: 2026-05-21 — expand this register when new UX issues are found; reference IDs in PRs and commits._
