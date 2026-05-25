-- Restore the activity log table when migration history exists but the table is absent.
-- Keep the canonical origin/origem_id contract used across modules.
CREATE TABLE IF NOT EXISTS public.logbook_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  origem text NOT NULL,
  origem_id uuid,
  acao text NOT NULL,
  descricao text DEFAULT '',
  dados jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.logbook_entradas ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.logbook_entradas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.logbook_entradas TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can manage their own logbook_entradas" ON public.logbook_entradas;

CREATE POLICY "Users can manage their own logbook_entradas"
  ON public.logbook_entradas
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS logbook_entradas_origem_created_at_idx
  ON public.logbook_entradas (origem, origem_id, created_at DESC);
