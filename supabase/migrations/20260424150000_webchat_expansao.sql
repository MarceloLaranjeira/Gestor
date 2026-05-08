ALTER TABLE public.chat_salas
ADD COLUMN IF NOT EXISTS participantes uuid[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS grupo text NOT NULL DEFAULT 'geral',
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS coordenadoria_slug text,
ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

ALTER TABLE public.chat_mensagens
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
ADD COLUMN IF NOT EXISTS editada boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS editada_em timestamptz,
ADD COLUMN IF NOT EXISTS excluida boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS excluida_em timestamptz;

ALTER TABLE public.chat_salas
DROP CONSTRAINT IF EXISTS chat_salas_tipo_check;

ALTER TABLE public.chat_salas
ADD CONSTRAINT chat_salas_tipo_check
CHECK (tipo IN ('geral', 'coordenacao', 'privado', 'extra'));

ALTER TABLE public.chat_salas
DROP CONSTRAINT IF EXISTS chat_salas_grupo_check;

ALTER TABLE public.chat_salas
ADD CONSTRAINT chat_salas_grupo_check
CHECK (grupo IN ('geral', 'extra', 'coordenadoria', 'privado'));

CREATE UNIQUE INDEX IF NOT EXISTS chat_salas_slug_idx
ON public.chat_salas (slug)
WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS chat_salas_grupo_ordem_idx
ON public.chat_salas (grupo, ordem, nome);

CREATE INDEX IF NOT EXISTS chat_mensagens_sala_id_created_at_idx
ON public.chat_mensagens (sala_id, created_at);

CREATE TABLE IF NOT EXISTS public.chat_mensagem_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.chat_mensagens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL DEFAULT '',
  storage_bucket text NOT NULL DEFAULT 'chat-anexos',
  storage_path text NOT NULL UNIQUE,
  tamanho_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_mensagem_anexos_mensagem_id_idx
ON public.chat_mensagem_anexos (mensagem_id);

ALTER TABLE public.chat_mensagem_anexos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_mensagens'
      AND policyname = 'auth_delete_mensagens'
  ) THEN
    DROP POLICY "auth_delete_mensagens" ON public.chat_mensagens;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_mensagens'
      AND policyname = 'auth_update_mensagens'
  ) THEN
    CREATE POLICY "auth_update_mensagens"
    ON public.chat_mensagens
    FOR UPDATE
    TO authenticated
    USING (
      auth.uid() = user_id
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    )
    WITH CHECK (
      auth.uid() = user_id
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    );
  END IF;
END $$;

CREATE POLICY "auth_delete_mensagens"
ON public.chat_mensagens
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'gestor'::public.app_role)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_mensagem_anexos'
      AND policyname = 'chat_mensagem_anexos_select'
  ) THEN
    CREATE POLICY "chat_mensagem_anexos_select"
    ON public.chat_mensagem_anexos
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_mensagem_anexos'
      AND policyname = 'chat_mensagem_anexos_insert'
  ) THEN
    CREATE POLICY "chat_mensagem_anexos_insert"
    ON public.chat_mensagem_anexos
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chat_mensagem_anexos'
      AND policyname = 'chat_mensagem_anexos_delete'
  ) THEN
    CREATE POLICY "chat_mensagem_anexos_delete"
    ON public.chat_mensagem_anexos
    FOR DELETE
    TO authenticated
    USING (
      auth.uid() = user_id
      OR public.has_role(auth.uid(), 'gestor'::public.app_role)
    );
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-anexos', 'chat-anexos', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_anexos_storage_select'
  ) THEN
    CREATE POLICY "chat_anexos_storage_select"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'chat-anexos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_anexos_storage_insert'
  ) THEN
    CREATE POLICY "chat_anexos_storage_insert"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'chat-anexos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'chat_anexos_storage_delete'
  ) THEN
    CREATE POLICY "chat_anexos_storage_delete"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'chat-anexos' AND auth.uid() IS NOT NULL);
  END IF;
END $$;

UPDATE public.chat_salas
SET grupo = CASE
  WHEN tipo = 'privado' THEN 'privado'
  WHEN tipo = 'coordenacao' THEN 'coordenadoria'
  WHEN tipo = 'extra' THEN 'extra'
  ELSE 'geral'
END
WHERE grupo IS NULL
   OR grupo NOT IN ('geral', 'extra', 'coordenadoria', 'privado');

UPDATE public.chat_salas
SET slug = CASE
  WHEN nome = 'Geral' THEN 'geral'
  WHEN nome IN ('Equipe', 'Equipe Assessores') THEN 'equipe'
  WHEN nome = 'Gestores' THEN 'gestores'
  WHEN nome = 'Campanha 2026' THEN 'campanha-2026'
  WHEN nome = 'Demandas Urgentes' THEN 'demandas-urgentes'
  WHEN nome = 'Financeiro' THEN 'financeiro'
  ELSE slug
END
WHERE slug IS NULL;

UPDATE public.chat_salas
SET nome = 'Equipe',
    descricao = 'Comunicação interna da equipe',
    tipo = 'geral',
    grupo = 'geral',
    slug = 'equipe',
    ordem = 20
WHERE nome = 'Equipe Assessores';

UPDATE public.chat_salas
SET tipo = 'geral',
    grupo = 'geral',
    slug = 'geral',
    ordem = 10,
    descricao = COALESCE(NULLIF(descricao, ''), 'Canal principal do gabinete')
WHERE nome = 'Geral';

UPDATE public.chat_salas
SET tipo = 'extra',
    grupo = 'extra',
    slug = 'campanha-2026',
    ordem = 30
WHERE nome = 'Campanha 2026';

UPDATE public.chat_salas
SET tipo = 'extra',
    grupo = 'extra',
    slug = 'demandas-urgentes',
    ordem = 40
WHERE nome = 'Demandas Urgentes';

UPDATE public.chat_salas
SET tipo = 'extra',
    grupo = 'extra',
    slug = 'financeiro',
    ordem = 50
WHERE nome = 'Financeiro';

INSERT INTO public.chat_salas (nome, descricao, tipo, grupo, slug, icone, cor, created_by, ordem)
SELECT
  'Gestores',
  'Canal de alinhamento entre gestores do sistema',
  'extra',
  'extra',
  'gestores',
  'Users',
  'bg-amber-500/10 text-amber-600',
  created_by,
  25
FROM (
  SELECT COALESCE(
    (
      SELECT created_by
      FROM public.chat_salas
      WHERE created_by IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    ),
    auth.uid()
  ) AS created_by
) seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_salas WHERE slug = 'gestores'
);

INSERT INTO public.chat_salas (nome, descricao, tipo, grupo, slug, icone, cor, created_by, ordem)
SELECT
  c.nome,
  COALESCE(NULLIF(c.descricao, ''), 'Canal da coordenadoria ' || c.nome),
  'coordenacao',
  'coordenadoria',
  'coord-' || c.slug,
  'Hash',
  'bg-primary/10 text-primary',
  seed.created_by,
  100 + ROW_NUMBER() OVER (ORDER BY c.nome)
FROM public.coordenacoes c
CROSS JOIN (
  SELECT COALESCE(
    (
      SELECT created_by
      FROM public.chat_salas
      WHERE created_by IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    ),
    auth.uid()
  ) AS created_by
) seed
WHERE NOT EXISTS (
  SELECT 1
  FROM public.chat_salas s
  WHERE s.slug = 'coord-' || c.slug
     OR s.coordenadoria_slug = c.slug
     OR s.nome = c.nome
);

UPDATE public.chat_salas s
SET
  tipo = 'coordenacao',
  grupo = 'coordenadoria',
  slug = COALESCE(s.slug, 'coord-' || c.slug),
  coordenadoria_slug = c.slug,
  ordem = COALESCE(NULLIF(s.ordem, 0), 100),
  descricao = COALESCE(NULLIF(s.descricao, ''), c.descricao)
FROM public.coordenacoes c
WHERE s.coordenadoria_slug = c.slug
   OR s.slug = 'coord-' || c.slug;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'chat_salas_updated_at'
    ) THEN
      CREATE TRIGGER chat_salas_updated_at
      BEFORE UPDATE ON public.chat_salas
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'chat_mensagens_updated_at'
    ) THEN
      CREATE TRIGGER chat_mensagens_updated_at
      BEFORE UPDATE ON public.chat_mensagens
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;
