-- Migration: Criar coordenadorias e distribuir demandas nos Kanbans corretos
-- Regras de mapeamento:
--   Categoria "Assistência Social"            → coord: assistencia-social
--   Categorias "Doação - Dinheiro" / "Emprego"/ "Outros" → coord: outros
--   Categoria "Infraestrutura"                → coord: infraestrutura
--   Categoria "Saúde"                         → coord: saude
--
--   Descrição contém "Requerimento em elaboração" → Em Andamento
--   Descrição contém "Em análise"                 → Em Andamento
--   Descrição contém "Requerimento elaborado"     → Concluida
--   Descrição contém "Inviável"                   → Cancelada

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Criar coordenadorias faltantes
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.coordenacoes (nome, slug, descricao, cor, icone)
VALUES
  (
    'Assistência Social',
    'assistencia-social',
    'Demandas de assistência social, habitação, cadeiras de rodas e apoio à população',
    'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    'users'
  ),
  (
    'Infraestrutura',
    'infraestrutura',
    'Demandas de infraestrutura urbana: pavimentação, drenagem, iluminação e obras',
    'from-amber-500/20 to-yellow-500/10 border-amber-500/30',
    'building2'
  ),
  (
    'Saúde',
    'saude',
    'Demandas da área de saúde pública e atendimento médico',
    'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
    'building2'
  ),
  (
    'Outros',
    'outros',
    'Demandas diversas: doações financeiras, emprego e solicitações não classificadas',
    'from-violet-500/20 to-purple-500/10 border-violet-500/30',
    'building2'
  )
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Corrigir constraint de status (adicionar 'cancelada' e 'finalizado')
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  ALTER TABLE public.demandas DROP CONSTRAINT IF EXISTS demandas_status_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.demandas
  DROP CONSTRAINT IF EXISTS demandas_status_check;

ALTER TABLE public.demandas
  ADD CONSTRAINT demandas_status_check
  CHECK (status IN ('pendente', 'andamento', 'concluida', 'finalizado', 'cancelada', 'atrasada'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Corrigir constraint de coluna_kanban
--    Valores corretos (usados pelo app): Recebida | Em Andamento | Concluida | Finalizado | Cancelada
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.demandas
  DROP CONSTRAINT IF EXISTS demandas_coluna_kanban_check;

ALTER TABLE public.demandas
  ADD CONSTRAINT demandas_coluna_kanban_check
  CHECK (coluna_kanban IN ('Recebida', 'Em Andamento', 'Concluida', 'Finalizado', 'Cancelada'));

-- Normalizar linhas que possam ter 'Concluída' (com acento) gravado pela migration anterior
UPDATE public.demandas
SET coluna_kanban = 'Concluida'
WHERE coluna_kanban = 'Concluída';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Associar demandas às coordenadorias por categoria
-- ─────────────────────────────────────────────────────────────────────────────

-- Assistência Social
UPDATE public.demandas
SET coordenacao_id = (
      SELECT id FROM public.coordenacoes WHERE slug = 'assistencia-social' LIMIT 1
    ),
    updated_at = NOW()
WHERE categoria = 'Assistência Social'
  AND coordenacao_id IS NULL;

-- Infraestrutura
UPDATE public.demandas
SET coordenacao_id = (
      SELECT id FROM public.coordenacoes WHERE slug = 'infraestrutura' LIMIT 1
    ),
    updated_at = NOW()
WHERE categoria = 'Infraestrutura'
  AND coordenacao_id IS NULL;

-- Saúde
UPDATE public.demandas
SET coordenacao_id = (
      SELECT id FROM public.coordenacoes WHERE slug = 'saude' LIMIT 1
    ),
    updated_at = NOW()
WHERE categoria = 'Saúde'
  AND coordenacao_id IS NULL;

-- Outros (Doação - Dinheiro, Emprego, Outros)
UPDATE public.demandas
SET coordenacao_id = (
      SELECT id FROM public.coordenacoes WHERE slug = 'outros' LIMIT 1
    ),
    updated_at = NOW()
WHERE categoria IN ('Doação - Dinheiro', 'Emprego', 'Outros')
  AND coordenacao_id IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Distribuir nos Kanbans conforme o texto da descrição
--    Aplica apenas nas demandas que acabaram de ganhar coordenacao_id acima
-- ─────────────────────────────────────────────────────────────────────────────

-- EM ANDAMENTO: "Requerimento em elaboração" ou "Em análise"
UPDATE public.demandas
SET coluna_kanban = 'Em Andamento',
    status        = 'andamento',
    updated_at    = NOW()
WHERE (
        descricao ILIKE '%Requerimento em elaboração%'
     OR descricao ILIKE '%Em análise%'
     )
  AND coordenacao_id IN (
        SELECT id FROM public.coordenacoes
        WHERE slug IN ('assistencia-social', 'infraestrutura', 'saude', 'outros')
      );

-- CONCLUIDA: "Requerimento elaborado"
--   (usa NOT ILIKE para não sobrescrever as linhas "em elaboração" acima)
UPDATE public.demandas
SET coluna_kanban = 'Concluida',
    status        = 'concluida',
    updated_at    = NOW()
WHERE descricao ILIKE '%Requerimento elaborado%'
  AND descricao NOT ILIKE '%em elaboração%'
  AND coordenacao_id IN (
        SELECT id FROM public.coordenacoes
        WHERE slug IN ('assistencia-social', 'infraestrutura', 'saude', 'outros')
      );

-- CANCELADA: "Inviável o atendimento" (inclusive "ano eleitoral")
UPDATE public.demandas
SET coluna_kanban = 'Cancelada',
    status        = 'cancelada',
    updated_at    = NOW()
WHERE descricao ILIKE '%Inviável%'
  AND coordenacao_id IN (
        SELECT id FROM public.coordenacoes
        WHERE slug IN ('assistencia-social', 'infraestrutura', 'saude', 'outros')
      );

-- FINALIZADO: caso alguma linha tenha essa palavra (não havia no seed atual, mas previne)
UPDATE public.demandas
SET coluna_kanban = 'Finalizado',
    status        = 'finalizado',
    updated_at    = NOW()
WHERE descricao ILIKE '%Finalizado%'
  AND coluna_kanban NOT IN ('Cancelada', 'Concluida', 'Em Andamento')
  AND coordenacao_id IN (
        SELECT id FROM public.coordenacoes
        WHERE slug IN ('assistencia-social', 'infraestrutura', 'saude', 'outros')
      );
