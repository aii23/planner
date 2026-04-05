# Planer — Technical Specification

## 1. Overview

**Planer** is a personal productivity planner web application built around a specific work methodology:

- **50/10 timer rhythm** — 50 minutes of focused work, 10 minutes of rest
- **20-minute work units** — the atomic accounting unit for productivity
- **Weekly target-driven planning** — set a goal (e.g., 80 units), distribute across days, execute, review

The app is responsive (desktop + phone), works as a PWA on mobile, and includes AI-powered assistance via Claude for task planning, estimation, and insights.

---

## 2. Users & Access

- Single user at launch (the owner)
- Authentication via Google OAuth (NextAuth.js)
- All data scoped by `user_id` — architecture supports multi-user without schema changes
- JWT-based sessions, 30-day expiry

---

## 3. Tech Stack

| Layer          | Technology                          |
|----------------|-------------------------------------|
| Framework      | Next.js (App Router)                |
| Language       | TypeScript                          |
| Database       | PostgreSQL (Neon or Supabase)       |
| ORM            | Prisma                              |
| Auth           | NextAuth.js (Google OAuth)          |
| Styling        | Tailwind CSS                        |
| Components     | shadcn/ui                           |
| AI             | Anthropic Claude API (Haiku + Sonnet) |
| Deployment     | Vercel                              |
| PWA            | next-pwa or manual manifest + SW    |

---

## 4. Data Model

### 4.1 User

| Field       | Type     | Notes                    |
|-------------|----------|--------------------------|
| id          | UUID     | Primary key              |
| email       | String   | From OAuth               |
| name        | String   | From OAuth               |
| image       | String?  | Avatar URL               |
| preferences | JSON     | Timer durations, defaults |
| created_at  | DateTime |                          |

### 4.2 Project

| Field      | Type     | Notes                         |
|------------|----------|-------------------------------|
| id         | UUID     | Primary key                   |
| user_id    | UUID     | Foreign key → User            |
| name       | String   |                               |
| color      | String   | Hex color for UI              |
| status     | Enum     | active, archived              |
| created_at | DateTime |                               |

### 4.3 Task

| Field           | Type     | Notes                              |
|-----------------|----------|------------------------------------|
| id              | UUID     | Primary key                        |
| project_id      | UUID     | Foreign key → Project              |
| user_id         | UUID     | Foreign key → User                 |
| title           | String   |                                    |
| description     | String?  | Optional details                   |
| status          | Enum     | backlog, planned, in_progress, done |
| estimated_units | Int      | How many units this task should take |
| completed_units | Int      | Computed or denormalized            |
| created_at      | DateTime |                                    |
| completed_at    | DateTime?|                                    |

### 4.4 Unit

| Field                  | Type     | Notes                                       |
|------------------------|----------|---------------------------------------------|
| id                     | UUID     | Primary key                                 |
| task_id                | UUID     | Foreign key → Task                          |
| user_id                | UUID     | Foreign key → User                          |
| label                  | String?  | Optional short description                  |
| status                 | Enum     | pending, scheduled, in_progress, completed, skipped |
| actual_duration_seconds | Int?    | Real time spent (from timer)                |
| actual_units_consumed  | Int?     | How many 20-min slots it really took        |
| completed_at           | DateTime?|                                             |
| created_at             | DateTime |                                             |

### 4.5 WeeklyPlan

| Field           | Type     | Notes                              |
|-----------------|----------|------------------------------------|
| id              | UUID     | Primary key                        |
| user_id         | UUID     | Foreign key → User                 |
| week_start_date | Date     | Monday of the week                 |
| target_units    | Int      | e.g., 80                           |
| status          | Enum     | planning, active, completed        |
| created_at      | DateTime |                                    |

### 4.6 DailyPlan

| Field          | Type     | Notes                        |
|----------------|----------|------------------------------|
| id             | UUID     | Primary key                  |
| weekly_plan_id | UUID     | Foreign key → WeeklyPlan     |
| user_id        | UUID     | Foreign key → User           |
| date           | Date     |                              |
| target_units   | Int      | e.g., 16                     |

### 4.7 ScheduledUnit

| Field         | Type | Notes                        |
|---------------|------|------------------------------|
| id            | UUID | Primary key                  |
| daily_plan_id | UUID | Foreign key → DailyPlan      |
| unit_id       | UUID | Foreign key → Unit           |
| sort_order    | Int  | Position within the day      |

### 4.8 TimerSession

| Field      | Type     | Notes                                  |
|------------|----------|----------------------------------------|
| id         | UUID     | Primary key                            |
| user_id    | UUID     | Foreign key → User                     |
| unit_id    | UUID?    | Foreign key → Unit (null for rest)     |
| type       | Enum     | work, rest                             |
| started_at | DateTime |                                        |
| ended_at   | DateTime?|                                        |

### Key Relationships

```
User
 └── Project (1:N)
      └── Task (1:N)
           └── Unit (1:N)

User
 └── WeeklyPlan (1:N)
      └── DailyPlan (1:7)
           └── ScheduledUnit (1:N) ──→ Unit

User
 └── TimerSession (1:N) ──→ Unit (optional)
```

---

## 5. Application Views

### 5.1 Backlog View

**Purpose:** Global pool of projects, tasks, and units.

**Features:**
- List all projects (collapsible)
- Within each project: list tasks with progress (completed_units / estimated_units)
- Within each task: list units with status
- Create / edit / archive projects
- Create / edit tasks (title, description, estimated units)
- Create units within tasks (individual or bulk: "Add N units")
- Filter by project, task status
- AI button: "Help me break this down" on tasks (see Section 8)

### 5.2 Weekly Planning View

**Purpose:** Set weekly + daily targets, schedule units into days.

**Features:**
- Week selector (current week, next week, past weeks)
- Weekly target input at the top
- 7 daily target inputs with running sum and validation hint
- Layout:
  - Desktop: 7 columns side by side, backlog panel on the left
  - Mobile: single day view with horizontal swipe between days
- Drag units from backlog into day columns (desktop)
- Tap-to-assign on mobile (select unit → pick day)
- Per-day capacity indicator: "12/16 scheduled"
- Per-week capacity indicator: "76/80 scheduled"
- "Carry Forward" banner for unfinished units from previous week
- Reorder units within a day
- AI button: "Get plan suggestions" (see Section 8)
- Plan is always editable mid-week — no save step

### 5.3 Daily / Timer View

**Purpose:** The primary work screen. Execute your day.

**Layout:**
- Top: large countdown timer (center of screen)
- Below timer: current unit title + project name
- Controls: Start / Pause / Complete Unit / Skip
- Below controls: unit queue (today's scheduled units in order)
- Bottom: time projection ("~4 units left, done by 3:40 PM")
- Quick-add button for unplanned units

**Timer behavior:**
- Configurable durations (default: 50 min work, 10 min rest)
- Cycle: Work → Rest → Work → Rest → ...
- Starting work prompts unit selection (or auto-selects next in queue)

**20-minute checkpoints:**
- At every 20-minute mark within a work session: audio + popup
- Popup options:
  - ✓ Complete & start next unit
  - → Continue this unit (actual_units_consumed increments)
  - + Split: mark done, create follow-up unit
- Popup is non-blocking — timer keeps running

**50-minute boundary:**
- Audio + visual notification
- If mid-unit: "Work period over. Rest now or finish this unit?"
- Auto-transition to rest if no unit is active

**Rest period:**
- Shows rest countdown
- When rest ends: notification, waits for manual start of next work period

**Unit queue interactions:**
- Reorder by drag (desktop) or move buttons (mobile)
- Mark as skipped
- Move to another day
- Add new unit on the fly

**Technical:**
- Client-side timer using `setInterval` + timestamp-based accuracy
- Timer state persisted in localStorage (survives page refresh)
- TimerSession records saved to server on completion
- Service Worker for background notifications (phone)
- Notification API for audio/visual alerts

### 5.4 Weekly Summary View

**Purpose:** Review the completed week.

**Features:**
- Target vs actual units (prominent number + progress bar)
- Planned units vs actual unit-slots consumed (estimation accuracy)
- Breakdown by project (bar or pie chart)
- List of completed tasks
- List of unfinished units with actions:
  - Carry forward to next week
  - Return to backlog
  - Mark as skipped
- AI button: "Generate review" (see Section 8)

### 5.5 Trends / History View

**Purpose:** See patterns across weeks and months.

**Features:**
- Line chart: weekly target vs actual over time
- Average units per week / per day
- Project-level breakdown over time (stacked bar chart)
- Estimation accuracy trend (estimated vs actual unit-slots consumed)
- Consistency metrics (streaks, most/least productive days)
- AI button: "Analyze my patterns" (available after 4+ weeks of data)

---

## 6. Navigation

**Desktop (>768px):**
- Left sidebar with 5 items: Backlog, Weekly Plan, Today, Summary, Trends
- Persistent — always visible

**Mobile (<768px):**
- Bottom tab bar with 5 tabs matching the same views
- No sidebar

---

## 7. Timer System — Technical Details

### State Machine

```
IDLE
 ├── [Start] → WORK_RUNNING
 │                ├── [Pause] → WORK_PAUSED
 │                │               └── [Resume] → WORK_RUNNING
 │                ├── [20-min mark] → show checkpoint popup (timer keeps running)
 │                └── [50-min mark] → WORK_ENDED
 │                                      └── [auto] → REST_RUNNING
 │
REST_RUNNING
 ├── [Pause] → REST_PAUSED
 │               └── [Resume] → REST_RUNNING
 └── [10-min mark] → REST_ENDED
                       └── [manual start] → IDLE (ready for next cycle)
```

### Checkpoint Popup Logic

During a WORK_RUNNING session, a checkpoint fires every 20 minutes:

```
elapsed = now - session_start_time
if elapsed % (20 * 60) === 0 AND elapsed < work_duration:
    show checkpoint popup
```

### Persistence

- Active timer state stored in localStorage:
  - `timer_state`: IDLE | WORK_RUNNING | WORK_PAUSED | REST_RUNNING | REST_PAUSED
  - `timer_start`: ISO timestamp when current period started
  - `timer_elapsed_before_pause`: seconds elapsed before last pause
  - `current_unit_id`: which unit is active
- On page load: if state is RUNNING, calculate elapsed from timestamp and resume

### Notifications

- Use Notification API (`Notification.requestPermission()`)
- Audio: short chime sound (bundled as static asset)
- Service Worker registration for background notifications on mobile

---

## 8. AI Integration

### 8.1 General Architecture

- All AI calls go through Next.js Server Actions (server-side)
- Claude API key stored as `ANTHROPIC_API_KEY` environment variable
- All features are user-initiated (manual button press)
- No cost guardrails in-app — cost limits configured on Anthropic dashboard
- If API key is missing/invalid: AI buttons show with error message, never hidden
- Shared system prompt explains the Planer methodology; per-feature prompts layered on top
- AI responses appear as inline sections (expandable cards) with a loading indicator
- Responses arrive as complete blocks (no streaming)
- All features gracefully degrade — work from day 1, richer with more historical data

### 8.2 System Prompt Context

The shared system prompt teaches the AI:
- **20-minute units** — the atomic accounting unit for productivity
- **50/10 timer rhythm** — 50 min work, 10 min rest
- **AI-augmented worker** — the user uses AI tools heavily, so tasks like "build a REST API" or "write a full component" can genuinely fit in a 20-minute unit when prompting/reviewing AI output
- **Coach tone** — supportive, direct, actionable advice

### 8.3 Model Selection

| Feature              | Model         | Estimated Cost/Call |
|----------------------|---------------|---------------------|
| Weekly plan review   | Claude Sonnet | ~$0.10–0.30         |
| Daily check-in       | Claude Sonnet | ~$0.03–0.05         |
| Weekly review        | Claude Sonnet | ~$0.10–0.20         |

**Estimated weekly cost:** $1–3 with regular use.

### 8.4 Feature Details (Priority — Build Now)

#### Weekly Plan Review
- **Trigger:** "Review my plan" button in Weekly Planning view (manual)
- **Input:** current week's scheduled units per day, daily targets, weekly target, last 4 weeks of history (if available)
- **Output:** structured review with:
  - Flagged units that are unclear or too large for 20 minutes
  - Day load balance analysis (overloaded/underloaded days)
  - Suggestions for redistribution or improvement
- **UI:** inline card below the week grid
- **Note:** AI reviews the user's existing plan — it does NOT generate plans from scratch

#### Daily Check-in
- **Trigger:** "Get daily briefing" button in Today view (manual, not automatic)
- **Input:** today's scheduled units with task/project context, historical patterns for this day of week (if available)
- **Output:**
  - Summary: "16 units planned, you typically complete 14 on Wednesdays"
  - Suggested reorder: batch related units together for flow
  - Any adjustments or warnings
- **Reorder UX:** preview + confirm — shows suggested order side-by-side with current order, user clicks "Apply" or "Keep mine"

#### End-of-Week Review
- **Trigger:** "Generate review" button in Weekly Summary view (manual)
- **Input:** full week data — planned vs actual, per-project breakdown, estimation accuracy
- **Output:** coach-tone written summary with structured headers:
  - Performance Summary (narrative paragraph)
  - Projects Breakdown (what progressed, what fell behind)
  - Estimation Accuracy (observations on planned vs actual)
  - Advice for Next Week (actionable recommendations)
- **UI:** inline card within the summary page

### 8.5 Deferred Features

#### Task Splitter — deferred
#### Unit Fit Check — deferred
#### Historical Pattern Analysis — deferred (nice-to-have, implement later)

---

## 9. User Preferences

Stored in the `User.preferences` JSON field:

| Setting             | Default | Notes                          |
|---------------------|---------|--------------------------------|
| work_duration_min   | 50      | Work period in minutes         |
| rest_duration_min   | 10      | Rest period in minutes         |
| unit_duration_min   | 20      | Unit checkpoint interval       |
| week_start_day      | monday  | When the week begins           |
| daily_checkin       | true    | Enable AI daily check-in       |
| notification_sound  | true    | Audio notifications            |

Accessible from a Settings page (gear icon in sidebar/tab bar).

---

## 10. PWA Configuration

- `manifest.json`:
  - `name`: "Planer"
  - `display`: "standalone"
  - `theme_color`: light theme primary color
  - App icon in multiple sizes
  - `start_url`: "/today"
- Service Worker:
  - Notification handling only (no offline caching)
  - Background timer notifications
- "Add to Home Screen" prompt on mobile

---

## 11. Responsive Breakpoints

| Breakpoint | Target        | Layout Changes                              |
|------------|---------------|---------------------------------------------|
| < 640px    | Phone         | Bottom tabs, single-column, swipe navigation |
| 640–768px  | Large phone   | Bottom tabs, slightly wider cards            |
| 768–1024px | Tablet        | Sidebar, 2–3 column weekly view              |
| > 1024px   | Desktop       | Full sidebar, 7-column weekly view           |

---

## 12. API Routes

All routes under `/api/`:

### Data CRUD (Server Actions preferred, API routes as fallback)
- `projects/` — CRUD for projects
- `tasks/` — CRUD for tasks
- `units/` — CRUD for units
- `weekly-plans/` — CRUD for weekly plans
- `daily-plans/` — CRUD for daily plans
- `scheduled-units/` — schedule/unschedule/reorder units
- `timer-sessions/` — create/complete timer sessions

### AI Endpoints
- `ai/split-task` — task splitter
- `ai/check-unit-fit` — unit fit check
- `ai/weekly-plan` — smart weekly planning
- `ai/daily-checkin` — daily check-in
- `ai/weekly-review` — end-of-week review
- `ai/analyze-patterns` — historical analysis

### Auth
- Handled by NextAuth.js (`/api/auth/[...nextauth]`)

---

## 13. Non-Functional Requirements

| Requirement     | Target                                                    |
|-----------------|-----------------------------------------------------------|
| Performance     | < 1s page load, timer renders at 60fps                    |
| Scale           | Single user, < 10K records total — no optimization needed |
| Availability    | Vercel uptime (99.9%)                                     |
| Security        | OAuth only, API key server-side, HTTPS enforced           |
| Data privacy    | Single-tenant, no data sharing                            |
| Browser support | Chrome, Safari, Firefox (latest 2 versions)               |
| Mobile          | iOS Safari, Android Chrome (PWA)                          |

---

## 14. Implementation Phases

### Phase 1: Core (MVP)
- Project setup (Next.js, Prisma, PostgreSQL, Tailwind, shadcn/ui)
- Auth (NextAuth.js + Google OAuth)
- Data model + seed script
- Backlog view (projects, tasks, units CRUD)
- Weekly Planning view (targets, scheduling)
- Daily / Timer view (50/10 timer, 20-min checkpoints, unit queue)
- Basic responsive layout
- PWA manifest + notifications

### Phase 2: Intelligence
- AI: task splitter
- AI: unit fit check
- AI: smart weekly planning
- AI: daily check-in with batching suggestions
- Unit actuals tracking (actual_duration, actual_units_consumed)

### Phase 3: Insights
- Weekly Summary view (target vs actual, project breakdown, carry forward)
- Trends / History view (charts, averages, streaks)
- AI: end-of-week review
- AI: historical pattern analysis

### Phase 4: Polish
- Dark mode
- Settings page (timer durations, preferences)
- Improved mobile UX (gestures, transitions)
- Performance optimization if needed

---

## 15. Decision Log

| # | Decision | Alternatives Considered | Why This Option |
|---|----------|------------------------|-----------------|
| 1 | 50/10 timer and 20-min units are independent systems | Linking units to timer slots | Matches actual workflow — rhythm and accounting are separate |
| 2 | Projects → Tasks → Units hierarchy | Flat unit list | Enables project-level tracking and progress visibility |
| 3 | Next.js full-stack with PostgreSQL | SQLite/Turso, separate backend | Best balance of simplicity, query power, and future multi-user support |
| 4 | Prisma ORM | Drizzle, raw SQL | Type-safe, mature ecosystem, great Next.js integration |
| 5 | Claude API for AI (Haiku + Sonnet) | OpenAI, provider-agnostic | User preference, cost-effective with tiered model usage |
| 6 | AI is proactive but user-controlled | Fully autonomous, on-demand only | Draft plans + daily check-ins add real value; user always has final say |
| 7 | 20-min checkpoints within work sessions | No checkpoints, end-of-session only | Matches unit accounting — each 20 min is a decision point |
| 8 | Track actual duration + actual units consumed | Track estimated only | Enables estimation accuracy analysis and AI-driven improvement |
| 9 | Google OAuth via NextAuth.js | Email/password, magic links | Simplest for single user, no password management |
| 10 | Server-first, no offline mode | Local-first with sync | Dramatically simpler; acceptable for connected devices |
| 11 | Tailwind + shadcn/ui | MUI, Chakra, custom CSS | Lightweight, customizable, excellent responsive support |
| 12 | Light mode only for v1 | Dark mode, both | Keep scope small, add dark mode later trivially |
| 13 | PWA for mobile experience | Native app, responsive-only | Native feel on phone without the cost of a separate app |

---

## 16. Assumptions

- The 50/10 timer durations are configurable but default to 50/10
- The 20-minute unit duration is the default and primary mode
- Weekly target is set manually — not auto-calculated
- AI features are progressive — the app works fully without AI enabled
- No real-time collaboration or sharing needed
- Responsive web + PWA is sufficient — no native mobile app
- Authentication is required for cross-device sync
- Week starts on Monday by default (configurable)
