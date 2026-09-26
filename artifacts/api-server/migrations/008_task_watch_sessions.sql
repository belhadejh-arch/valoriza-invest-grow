-- A completion must refer to a real, time-checked watch attempt owned by
-- the same customer. Existing completions and rewards remain untouched.
CREATE TABLE IF NOT EXISTS task_watch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  duration_seconds integer NOT NULL CHECK (duration_seconds BETWEEN 1 AND 3600),
  started_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);

CREATE INDEX IF NOT EXISTS task_watch_sessions_user_task_idx
  ON task_watch_sessions(user_id, task_id, started_at DESC);