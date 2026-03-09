-- Table to store temporary OAuth state tokens for Google Calendar CSRF protection
CREATE TABLE IF NOT EXISTS google_calendar_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text UNIQUE NOT NULL,
  user_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Only service role can access this table
ALTER TABLE google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;

-- No public access; edge function uses service role key
CREATE POLICY "No public access" ON google_calendar_oauth_states
  FOR ALL USING (false);
