# Studypeak

A gamified habit tracker and study companion for students. Plan recurring habits,
run focus sessions with a real timer, and watch your consistency build up on a
GitHub-style activity calendar — with "Bolt", a robot companion who reacts to your progress.

## Tech stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + Recharts + React Router + Lucide icons
- **Backend:** Node.js + Express
- **Database:** Neon serverless PostgreSQL with foreign keys, unique constraints, and indexes
- **Auth:** Email/password (scrypt hashing) with httpOnly session cookies

## Getting started

```bash
npm install
copy .env.example .env
# Set DATABASE_URL to the pooled connection string from your Neon project.
npm run dev            # starts API on :3001 and Vite dev server on :5173
```

Open http://localhost:5173, create an account, and add your first habit.

### Production build

```bash
npm run build    # type-checks and builds the frontend into dist/
npm start        # serves the API (serve dist/ statically behind any web server if desired)
```

## Features

- **Habits** — boolean / duration / quantity targets, daily / weekdays / weekly-interval / custom-weekday schedules, start & end dates, pause/resume, color coding.
- **Today's tasks** — auto-generated from habit schedules; one-tap completion with undo.
- **Study timer** — presets (25/45/60/custom), breaks, timestamp-based accuracy that survives refreshes, full-screen Focus Mode.
- **Sessions** — every finished session is persisted server-side and feeds analytics and duration-based habits automatically.
- **Analytics** — weekly, monthly, yearly, and per-habit views with charts (Recharts).
- **Activity heatmap** — full-year GitHub-style calendar with a 6-step color scale and clickable day details.
- **Streaks** — computed server-side from *expected task completion* (not logins); days with no scheduled tasks are neutral.
- **Achievements** — 10 unlockable milestones with a polished celebration popup.
- **Robot companion** — scripted, contextual dialogue driven by app state; tap to advance, dismissible, respects `prefers-reduced-motion`.
- **Settings** — name, timezone-aware day boundaries, light/dark/system theme, default durations, optional browser notifications, password change.

## Data integrity

- Duplicate completions are impossible: `UNIQUE(habit_id, date)` on `habit_completions` with upsert semantics.
- All streak/analytics calculations run server-side from persisted data.
- Each user's data is isolated by authenticated user ID on every query.

## Project structure

```
server/          Express API, Neon schema, auth, streak/achievement logic
src/
  components/    ui, layout, habits, timer, calendar, analytics, robot, achievements
  contexts/      Auth, Theme, Robot, Timer, Achievements providers
  pages/         Dashboard, Habits, Timer, Calendar, Analytics, Achievements, Settings, Auth
  services/      typed API client
  types/         shared TypeScript types
  utils/         date/formatting helpers, heatmap scale, aggregation math
```
