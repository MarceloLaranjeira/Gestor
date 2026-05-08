CREATE TABLE IF NOT EXISTS public.demanda_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contexto text NOT NULL CHECK (contexto IN ('sac', 'coordenadoria')),
  tipo text NOT NULL CHECK (tipo IN ('info', 'warning', 'danger', 'success')),
  origem text NOT NULL CHECK (origem IN ('manual', 'automatico')),
  titulo text NOT NULL,
  mensagem text NOT NULL DEFAULT '',
  causa text NOT NULL,
  referencia text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  tratado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demanda_alertas_demanda_id_idx
ON public.demanda_alertas (demanda_id);

CREATE INDEX IF NOT EXISTS demanda_alertas_user_id_idx
ON public.demanda_alertas (user_id);

CREATE INDEX IF NOT EXISTS demanda_alertas_ativo_idx
ON public.demanda_alertas (ativo);

CREATE UNIQUE INDEX IF NOT EXISTS demanda_alertas_active_unique_idx
ON public.demanda_alertas (demanda_id, user_id, causa, referencia)
WHERE ativo = true;

ALTER TABLE public.demanda_alertas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_alertas'
      AND policyname = 'demanda_alertas_select'
  ) THEN
    CREATE POLICY "demanda_alertas_select"
    ON public.demanda_alertas
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_alertas'
      AND policyname = 'demanda_alertas_insert'
  ) THEN
    CREATE POLICY "demanda_alertas_insert"
    ON public.demanda_alertas
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_alertas'
      AND policyname = 'demanda_alertas_update'
  ) THEN
    CREATE POLICY "demanda_alertas_update"
    ON public.demanda_alertas
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_alertas'
      AND policyname = 'demanda_alertas_delete'
  ) THEN
    CREATE POLICY "demanda_alertas_delete"
    ON public.demanda_alertas
    FOR DELETE
    USING (
      auth.uid() = user_id
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'demanda_alertas_updated_at'
  ) THEN
    CREATE TRIGGER demanda_alertas_updated_at
    BEFORE UPDATE ON public.demanda_alertas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;
