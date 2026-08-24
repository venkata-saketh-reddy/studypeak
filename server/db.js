import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required. Add your Neon connection string to .env.');

const sql = neon(connectionString);

function toPostgresQuery(query, values) {
  let index = 0;
  return { text: query.replace(/\?/g, () => `$${++index}`), values };
}

function prepare(query) {
  return {
    async get(...values) {
      const result = await sql.query(...Object.values(toPostgresQuery(query, values)));
      return result[0];
    },
    async all(...values) {
      return sql.query(...Object.values(toPostgresQuery(query, values)));
    },
    async run(...values) {
      const insertQuery = /^\s*INSERT\s/i.test(query) && !/\bRETURNING\b/i.test(query) ? `${query} RETURNING *` : query;
      const result = await sql.query(...Object.values(toPostgresQuery(insertQuery, values)));
      return { changes: result.count ?? result.length, lastInsertRowid: result[0]?.id };
    },
  };
}

const schema = `
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Student', timezone TEXT NOT NULL DEFAULT 'local', theme TEXT NOT NULL DEFAULT 'system'
    CHECK (theme IN ('light','dark','system')), default_study_minutes INTEGER NOT NULL DEFAULT 45,
  default_break_minutes INTEGER NOT NULL DEFAULT 5, notifications_enabled INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_nocase ON users (LOWER(email));
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TIMESTAMP NOT NULL);
CREATE TABLE IF NOT EXISTS habits (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'General',
  target_type TEXT NOT NULL CHECK (target_type IN ('boolean','duration','quantity')), target_value INTEGER NOT NULL DEFAULT 1,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekdays','weekly','custom')),
  weekdays TEXT NOT NULL DEFAULT '[1,2,3,4,5]', interval_weeks INTEGER NOT NULL DEFAULT 1, start_date DATE NOT NULL,
  end_date DATE, active INTEGER NOT NULL DEFAULT 1, color TEXT NOT NULL DEFAULT '#4f7cff',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, active);
CREATE TABLE IF NOT EXISTS habit_completions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE, date DATE NOT NULL, progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0, completed_at TIMESTAMP, UNIQUE (habit_id, date));
CREATE INDEX IF NOT EXISTS idx_completions_user_date ON habit_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_completions_habit ON habit_completions(habit_id, date);
CREATE TABLE IF NOT EXISTS study_sessions (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  habit_id INTEGER REFERENCES habits(id) ON DELETE SET NULL, started_at TIMESTAMP NOT NULL, ended_at TIMESTAMP NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0), date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','abandoned')));
CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON study_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_habit ON study_sessions(habit_id, date);
CREATE TABLE IF NOT EXISTS achievements (id SERIAL PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  description TEXT NOT NULL, icon TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')));
CREATE TABLE IF NOT EXISTS user_achievements (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE, unlocked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seen INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, achievement_id));
ALTER TABLE habits ADD COLUMN IF NOT EXISTS scheduled_time TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'daily';
ALTER TABLE habits ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS end_slot TEXT;
CREATE TABLE IF NOT EXISTS habit_slot_overrides (habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date DATE NOT NULL, scheduled_time TEXT NOT NULL, PRIMARY KEY (habit_id, date));`;

for (const statement of schema.split(';').map((part) => part.trim()).filter(Boolean)) {
  await sql.query(statement);
}

await sql.query(`INSERT INTO achievements (code, name, description, icon, tier) VALUES
  ('first_task', 'First Step', 'Complete your first task', '🎯', 'bronze'), ('first_session', 'Deep Diver', 'Finish your first study session', '⏱️', 'bronze'),
  ('streak_3', 'Warming Up', 'Reach a 3-day streak', '🔥', 'bronze'), ('streak_7', 'One Week Strong', 'Reach a 7-day streak', '🔥', 'silver'),
  ('streak_14', 'Fortnight Focus', 'Reach a 14-day streak', '🔥', 'silver'), ('streak_30', 'Unstoppable', 'Reach a 30-day streak', '🏆', 'gold'),
  ('tasks_100', 'Century Club', 'Complete 100 tasks in total', '💯', 'gold'), ('study_10h', 'Ten Hour Club', 'Study for 10 total hours', '📚', 'bronze'),
  ('study_50h', 'Marathon Mind', 'Study for 50 total hours', '🧠', 'silver'), ('study_100h', 'Grandmaster', 'Study for 100 total hours', '👑', 'platinum')
  ON CONFLICT (code) DO NOTHING`);

export default { prepare };