# Planer — 5-Hour Build Plan

## Approach

Build a usable MVP of the Planer productivity app in 15 × 20-minute steps.
Desktop-first, deployed to Vercel, using Neon Postgres + Prisma + Next.js App Router + shadcn/ui.
Auth is a simple env-based gate (designed for easy OAuth addition later).
AI features are stretch goals at the end. PWA, drag-and-drop, Trends view, and Weekly Summary view are deferred — but all data is stored so they can be added next weekend.

## Scope

**In:**

- Project scaffolding (Next.js, Tailwind, shadcn/ui, Prisma)
- Neon PostgreSQL setup + full data model from spec
- Simple auth gate (env password, NextAuth-ready architecture)
- App shell with sidebar navigation (5 views)
- Backlog view: Projects, Tasks, Units CRUD
- Weekly Planning view: week/day targets, assign units to days
- Daily/Timer view: 50/10 countdown, unit queue, start/pause/complete
- 20-min checkpoint popups (if time allows)
- Timer state persistence (localStorage)
- Audio/browser notifications for timer
- TimerSession recording to DB
- Settings page (timer durations)
- Vercel deployment

**Out (deferred):**

- Google OAuth (next weekend)
- Drag-and-drop scheduling (next weekend)
- Weekly Summary view (data stored, UI later)
- Trends/History view (data stored, UI later)
- PWA manifest + service worker
- Mobile-optimized layouts (basic responsive only)
- Dark mode

## Action Items

### Step 1 — Project Scaffolding (0:00–0:20)

- `npx create-next-app@latest` with TypeScript, Tailwind, App Router
- Install dependencies: `prisma`, `@prisma/client`, `shadcn/ui` CLI
- Init shadcn/ui, add core components: Button, Input, Card, Dialog, Select, Tabs, Badge
- Set up project folder structure: `app/`, `lib/`, `components/`, `prisma/`
- Create `.env.local` with placeholder values
- Verify dev server runs

### Step 2 — Database & Schema (0:20–0:40)

- Create Neon project (neon.tech console) — get connection string
- Write full Prisma schema: User, Project, Task, Unit, WeeklyPlan, DailyPlan, ScheduledUnit, TimerSession
- Include all enums: ProjectStatus, TaskStatus, UnitStatus, WeeklyPlanStatus, TimerSessionType
- Add `DATABASE_URL` to `.env.local`
- Run `npx prisma migrate dev` — verify tables created
- Create `lib/db.ts` with PrismaClient singleton

### Step 3 — Auth Gate & App Layout (0:40–1:00)

- Create simple middleware: check for `AUTH_PASSWORD` cookie, redirect to `/login` if missing
- Build `/login` page: single password input, sets cookie on match with `AUTH_GATE_PASSWORD` env var
- Design so NextAuth can replace this later (session check in middleware)
- Build root layout: sidebar (desktop) with 5 nav items — Backlog, Weekly Plan, Today, Summary (disabled), Trends (disabled)
- Add user avatar placeholder + settings gear icon in sidebar
- Basic Tailwind theme: clean, minimal, professional

### Step 4 — Backlog: Projects (1:00–1:20)

- Create Server Actions: `createProject`, `updateProject`, `archiveProject`, `getProjects`
- Build Backlog page layout: list of projects as collapsible cards
- "New Project" dialog: name + color picker (hex)
- Project card: name, color indicator, status badge, edit/archive buttons
- Filter: show/hide archived projects
- Seed script: create a default user + 2 sample projects

### Step 5 — Backlog: Tasks (1:20–1:40)

- Create Server Actions: `createTask`, `updateTask`, `deleteTask`, `getTasks`
- Within each project card: expandable task list
- Task row: title, status badge (backlog/planned/in_progress/done), progress bar (completed/estimated units)
- "Add Task" form inline: title, description (optional), estimated units
- Edit task: inline or dialog
- Status transitions: backlog → planned → in_progress → done

### Step 6 — Backlog: Units (1:40–2:00)

- Create Server Actions: `createUnit`, `createBulkUnits`, `updateUnit`, `deleteUnit`
- Within each task: expandable unit list
- Unit row: label (optional), status badge, duration info
- "Add Unit" button: single unit with optional label
- "Add N Units" bulk button: creates N units for a task at once
- Unit status management: pending → scheduled → in_progress → completed / skipped

### Step 7 — Weekly Planning: Structure (2:00–2:20)

- Create Server Actions: `createWeeklyPlan`, `updateWeeklyPlan`, `getDailyPlans`
- Create Server Actions: `createDailyPlan`, `updateDailyPlan` (auto-create 7 days with weekly plan)
- Week selector component: navigate between weeks (current, next, past)
- Weekly target input at the top with running total
- 7-column layout: one column per day (Mon–Sun)
- Each day column: date header, target units input, scheduled count

### Step 8 — Weekly Planning: Unit Scheduling (2:20–2:40)

- Create Server Actions: `scheduleUnit`, `unscheduleUnit`, `reorderUnits`
- Left panel: backlog of unscheduled units (grouped by project → task)
- Each unit has "Assign to day" dropdown/button
- Per-day capacity indicator: "12/16 scheduled"
- Per-week capacity indicator: "76/80 scheduled"
- Reorder within a day: up/down arrow buttons
- Unschedule button: return unit to backlog

### Step 9 — Timer: Core UI & Countdown (2:40–3:00)

- Build Timer page layout: large centered countdown, current unit info, controls below
- Timer state machine: IDLE → WORK_RUNNING → WORK_PAUSED → WORK_ENDED → REST_RUNNING → REST_PAUSED → REST_ENDED → IDLE
- Implement countdown logic: `setInterval` + timestamp-based accuracy
- Controls: Start, Pause/Resume, Skip Rest
- Display: current unit title + project name + color
- Below controls: today's unit queue (ordered list)
- Auto-select next unit from queue when starting work

### Step 10 — Timer: Unit Queue & Completion (3:00–3:20)

- Queue interactions: mark unit complete, skip unit, reorder (up/down)
- "Complete Unit" button: marks current unit as completed, advances queue
- Work → Rest transition: auto-start rest countdown after 50 min
- Rest → Idle transition: notification, wait for manual start
- Quick-add button: create an unplanned unit on the fly
- Time projection: "~4 units left, done by 3:40 PM"

### Step 11 — Timer: Persistence & Notifications (3:20–3:40)

- localStorage persistence: timer_state, timer_start, elapsed_before_pause, current_unit_id
- On page load: restore timer state, calculate elapsed, resume if running
- Browser Notification API: request permission on first use
- Audio notification: bundle a short chime sound, play at work end / rest end
- 20-min checkpoint popup (stretch): at every 20-min mark during work
  - Options: ✓ Complete & next, → Continue, + Split
  - Non-blocking: timer keeps running behind popup
- Save TimerSession to DB on work/rest completion (Server Action)

### Step 12 — Settings & Polish (3:40–4:00)

- Settings page: work_duration, rest_duration, unit_duration inputs
- Store in DB (User.preferences JSON field)
- Load preferences on timer page, apply to countdown
- Notification sound toggle
- UI polish pass: consistent spacing, loading states, empty states
- Error handling: toast notifications for failed actions
- Fix any broken responsive behavior on desktop

### Step 13 — Integration Testing & Bug Fixes (4:00–4:20)

- End-to-end walkthrough: create project → task → units → schedule → run timer
- Verify timer persistence across page refresh
- Verify unit status transitions are correct throughout the flow
- Fix any data inconsistencies (completed_units count, etc.)
- Test week boundaries: creating plans for different weeks
- Ensure "disabled" nav items (Summary, Trends) show a "Coming Soon" placeholder

### Step 14 — Vercel Deployment (4:20–4:40)

- Initialize git repo, commit all code
- Connect to Vercel: `vercel` CLI or GitHub integration
- Set environment variables in Vercel: DATABASE_URL, AUTH_GATE_PASSWORD
- Deploy, verify build succeeds
- Test on production URL: full walkthrough
- Verify Neon DB connectivity from Vercel

### Step 15 — AI Features (Stretch) (4:40–5:00)

- If time remains: implement Task Splitter
  - API route `/api/ai/split-task`
  - Send task title + description + project context to Claude Haiku
  - Return suggested units with labels
  - UI: "Help me break this down" button on tasks in Backlog
  - Review/accept/reject suggestions
- If more time: Unit Fit Check ("Does this fit in 20 min?")
- If even more time: Daily Check-in prompt on Today page

## Open Questions

1. Do you want a specific color scheme / visual style, or is shadcn/ui defaults fine?
2. Should the timer show elapsed time (counting up) or remaining time (counting down)?
3. For the auth gate password — do you have a preferred password, or shall I generate one?

## Risk Mitigation

- **Steps run long:** Steps 11 (checkpoint popup) and 15 (AI) have built-in "stretch" items that can be skipped
- **Neon setup issues:** Fallback to local SQLite via Prisma provider swap (2 min)
- **Vercel deploy issues:** Can use `vercel --prod` directly from CLI as fallback
- **shadcn/ui component issues:** Fall back to plain HTML + Tailwind if a component is problematic

