ALTER TABLE public.demandas
ADD COLUMN IF NOT EXISTS coordenacao_id uuid REFERENCES public.coordenacoes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS solicitante_cpf text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS solicitante_telefone text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS coluna_kanban text NOT NULL DEFAULT 'Recebida',
ADD COLUMN IF NOT EXISTS notas_internas text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS nivel_alerta text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS alerta_observacao text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS alerta_manual boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS alerta_vencimento_em date;

UPDATE public.demandas
SET coluna_kanban = CASE
  WHEN status = 'andamento' THEN 'Em Andamento'
  WHEN status = 'concluida' THEN 'Concluída'
  WHEN status = 'cancelada' THEN 'Cancelada'
  WHEN status = 'atrasada' THEN 'Em Andamento'
  ELSE 'Recebida'
END
WHERE coluna_kanban IS NULL
   OR coluna_kanban = ''
   OR coluna_kanban = 'Recebida';

UPDATE public.demandas
SET alerta_vencimento_em = data_prazo
WHERE alerta_vencimento_em IS NULL
  AND data_prazo IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'demandas_coluna_kanban_check'
  ) THEN
    ALTER TABLE public.demandas
    ADD CONSTRAINT demandas_coluna_kanban_check CHECK (
      coluna_kanban IN ('Recebida', 'Em Andamento', 'Concluída', 'Cancelada', 'Atrasada')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'demandas_nivel_alerta_check'
  ) THEN
    ALTER TABLE public.demandas
    ADD CONSTRAINT demandas_nivel_alerta_check CHECK (
      nivel_alerta IN ('none', 'info', 'warning', 'danger')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS demandas_coluna_kanban_idx
ON public.demandas (coluna_kanban);

CREATE INDEX IF NOT EXISTS demandas_coordenacao_id_idx
ON public.demandas (coordenacao_id);

CREATE TABLE IF NOT EXISTS public.demanda_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demanda_id uuid NOT NULL REFERENCES public.demandas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL DEFAULT '',
  storage_bucket text NOT NULL DEFAULT 'demanda-anexos',
  storage_path text NOT NULL UNIQUE,
  tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS demanda_anexos_demanda_id_idx
ON public.demanda_anexos (demanda_id);

ALTER TABLE public.demanda_anexos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_anexos'
      AND policyname = 'demanda_anexos_select'
  ) THEN
    CREATE POLICY "demanda_anexos_select"
    ON public.demanda_anexos
    FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_anexos'
      AND policyname = 'demanda_anexos_insert'
  ) THEN
    CREATE POLICY "demanda_anexos_insert"
    ON public.demanda_anexos
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'demanda_anexos'
      AND policyname = 'demanda_anexos_delete'
  ) THEN
    CREATE POLICY "demanda_anexos_delete"
    ON public.demanda_anexos
    FOR DELETE
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'gestor'::public.app_role));
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('demanda-anexos', 'demanda-anexos', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'demanda_anexos_storage_select'
  ) THEN
    CREATE POLICY "demanda_anexos_storage_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'demanda-anexos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'demanda_anexos_storage_insert'
  ) THEN
    CREATE POLICY "demanda_anexos_storage_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'demanda-anexos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'demanda_anexos_storage_delete'
  ) THEN
    CREATE POLICY "demanda_anexos_storage_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'demanda-anexos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
