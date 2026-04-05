# Planer — Gap Analysis (Spec vs Current Build)

Generated: 2026-04-05

## Legend

- ✅ **Done** — fully implemented
- 🔶 **Partial** — built but missing some spec details
- ❌ **Missing** — not built yet
- 🔜 **Deferred** — explicitly out-of-scope per PLAN.md

---

## 1. Core Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js + TypeScript + App Router | ✅ | v16.2.2 |
| PostgreSQL (Neon) + Prisma | ✅ | Full schema, all 8 models + enums |
| Tailwind CSS + shadcn/ui | ✅ | 10 UI primitives installed |
| Auth gate (password-based) | ✅ | HMAC-signed cookie, proxy middleware |
| App shell + sidebar navigation | ✅ | 5 nav items, settings, sign out |
| Toaster (sonner) | ✅ | Global error/success notifications |
| Component organization | ✅ | 5 subdirectories: backlog, weekly, timer, settings, layout |

## 2. Backlog View (Spec §5.1)

| Feature | Status | Notes |
|---------|--------|-------|
| List all projects (collapsible) | ✅ | |
| Tasks with progress within projects | ✅ | Expandable, progress bar |
| Units with status within tasks | ✅ | Expandable, single + bulk add |
| Create / edit / archive projects | ✅ | |
| Create / edit / delete tasks | ✅ | Inline + dialog |
| Create units (individual + bulk) | ✅ | |
| Filter by task status | ❌ | Only archived/active project filter exists |
| Filter by project | ❌ | All active projects shown, no filter |
| AI: "Help me break this down" | 🔜 | Phase 2 / Step 15 stretch |
| Seed script (sample data) | ❌ | No prisma/seed.ts |

## 3. Weekly Planning View (Spec §5.2)

| Feature | Status | Notes |
|---------|--------|-------|
| Week selector (current, next, past) | ✅ | |
| Weekly target input + running total | ✅ | |
| 7-column layout (desktop) | ✅ | |
| 7 daily target inputs with sum | ✅ | |
| Backlog panel on the left | ✅ | Grouped by project → task |
| Assign units to days | ✅ | Click calendar → pick day |
| Per-day capacity indicator | ✅ | |
| Per-week capacity indicator | ✅ | |
| Reorder units within a day | ✅ | Up/down arrows |
| Unschedule (return to backlog) | ✅ | |
| Plan always editable mid-week | ✅ | No save step |
| Drag-and-drop scheduling | 🔜 | PLAN.md deferred |
| Mobile: single day + swipe | 🔜 | PLAN.md deferred |
| "Carry Forward" banner | ❌ | Not built |
| AI: "Get plan suggestions" | 🔜 | Phase 2 |

## 4. Daily / Timer View (Spec §5.3)

| Feature | Status | Notes |
|---------|--------|-------|
| Large centered countdown | ✅ | SVG circular progress ring |
| Current unit info (title + project + color) | ✅ | |
| Controls: Start / Pause / Resume | ✅ | |
| Complete Unit button | ✅ | Emerald green, during work |
| Skip Rest | ✅ | |
| End Early (work → rest) | ✅ | |
| Unit queue (ordered list) | ✅ | With complete/skip per item |
| Auto-select next unit | ✅ | |
| Time projection ("done by X:XX") | ✅ | |
| Quick-add unplanned unit | ✅ | |
| Timer state machine (7 states) | ✅ | |
| setInterval + timestamp accuracy | ✅ | 250ms tick |
| localStorage persistence | ✅ | Survives page refresh |
| TimerSession saved to DB | ✅ | On work/rest completion |
| 20-min checkpoint popup | ✅ | Complete & Next, Continue |
| Checkpoint: Split option | ❌ | "Mark done + create follow-up" not built |
| actual_units_consumed tracking | ❌ | Field exists in DB but never written during checkpoints |
| Browser Notification API | ✅ | Permission request + notifications |
| Audio chime (Web Audio) | ✅ | Synthesized 3-tone chime |
| Configurable durations from settings | ✅ | |
| Unit queue: move to another day | ❌ | Only skip/complete, no reschedule |
| Service Worker for background notif | 🔜 | PWA deferred |

## 5. Weekly Summary View (Spec §5.4)

| Feature | Status | Notes |
|---------|--------|-------|
| Target vs actual units | ❌ | Placeholder page |
| Breakdown by project | ❌ | |
| List of completed tasks | ❌ | |
| Unfinished units actions | ❌ | |
| AI: "Generate review" | 🔜 | Phase 3 |

**Entire view is a "Coming Soon" placeholder. Data is stored and queryable — only UI is missing.**

## 6. Trends / History View (Spec §5.5)

| Feature | Status | Notes |
|---------|--------|-------|
| All chart/metrics features | ❌ | Placeholder page |
| AI: "Analyze my patterns" | 🔜 | Phase 3 |

**Entire view is a "Coming Soon" placeholder.**

## 7. Navigation (Spec §6)

| Feature | Status | Notes |
|---------|--------|-------|
| Desktop sidebar (>768px) | ✅ | |
| Mobile bottom tab bar (<768px) | ❌ | No responsive nav |

## 8. Settings & Preferences (Spec §9)

| Feature | Status | Notes |
|---------|--------|-------|
| work_duration_min | ✅ | |
| rest_duration_min | ✅ | |
| unit_duration_min | ✅ | |
| week_start_day | ✅ | Select in UI but not used in date logic |
| daily_checkin toggle | ✅ | Toggle in UI, AI feature not built |
| notification_sound toggle | ✅ | Toggle in UI, not wired to chime playback |

## 9. PWA (Spec §10)

| Feature | Status | Notes |
|---------|--------|-------|
| manifest.json | ❌ | |
| Service Worker | ❌ | |
| App icons | ❌ | |
| "Add to Home Screen" | ❌ | |

**Entire PWA setup deferred per PLAN.md.**

## 10. AI Integration (Spec §8)

| Feature | Status | Notes |
|---------|--------|-------|
| Task splitter | 🔜 | PLAN.md Step 15 stretch |
| Unit fit check | 🔜 | Phase 2 |
| Smart weekly planning | 🔜 | Phase 2 |
| Daily check-in | 🔜 | Phase 2 |
| End-of-week review | 🔜 | Phase 3 |
| Pattern analysis | 🔜 | Phase 3 |

**All AI features deferred. ANTHROPIC_API_KEY placeholder in .env.local.**

## 11. Auth (Spec §2)

| Feature | Status | Notes |
|---------|--------|-------|
| Simple password gate | ✅ | With HMAC-signed cookie |
| Google OAuth (NextAuth.js) | 🔜 | Deferred per PLAN.md |

---

## Priority Gaps (actionable now, no spec deferral)

These are features the spec expects in Phase 1 MVP but are currently missing:

1. **Backlog filters** — filter by task status (backlog/planned/in_progress/done)
2. **Carry Forward banner** — show unfinished units from last week in weekly plan
3. **Checkpoint Split option** — mark current unit done + create follow-up
4. **actual_units_consumed** — increment at each 20-min checkpoint continuation
5. **notification_sound preference wiring** — toggle should suppress/allow chime
6. **week_start_day preference wiring** — should affect getMonday() logic
7. **Seed script** — sample user + projects for onboarding/testing
8. **Mobile bottom tab bar** — responsive nav for phone screens
