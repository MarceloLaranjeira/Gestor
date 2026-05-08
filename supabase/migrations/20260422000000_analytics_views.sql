-- ── Analytics Views ───────────────────────────────────────────────────────────
-- These views pre-aggregate data so the frontend never hits N+1 queries.
-- All views respect the public schema and use open SELECT policies.

-- 1. Demandas por mês e status
CREATE OR REPLACE VIEW public.analytics_demandas_mensal AS
SELECT
  to_char(created_at, 'YYYY-MM') AS mes,
  status,
  COUNT(*)::int                  AS total
FROM public.demandas
GROUP BY 1, 2
ORDER BY 1 DESC, 2;

-- 2. Demandas por tipo/setor (usa campo 'tipo' se existir, senão agrupa por status)
CREATE OR REPLACE VIEW public.analytics_demandas_por_status AS
SELECT
  status,
  COUNT(*)::int AS total
FROM public.demandas
GROUP BY 1
ORDER BY total DESC;

-- 3. Pessoas por tipo e mês de cadastro
CREATE OR REPLACE VIEW public.analytics_pessoas_mensal AS
SELECT
  to_char(created_at, 'YYYY-MM') AS mes,
  tipo,
  COUNT(*)::int                   AS total
FROM public.pessoas
GROUP BY 1, 2
ORDER BY 1 DESC;

-- 4. Pessoas por tipo (agregado)
CREATE OR REPLACE VIEW public.analytics_pessoas_por_tipo AS
SELECT
  tipo,
  COUNT(*)::int AS total
FROM public.pessoas
GROUP BY 1
ORDER BY total DESC;

-- 5. Tarefas por coordenação com progresso
CREATE OR REPLACE VIEW public.analytics_tarefas_por_coord AS
SELECT
  c.nome                                              AS coordenacao,
  c.slug,
  COUNT(t.id)::int                                    AS total,
  COUNT(t.id) FILTER (WHERE t.status = true)::int     AS concluidas,
  COUNT(t.id) FILTER (WHERE t.status = false)::int    AS pendentes,
  COUNT(t.id) FILTER (WHERE t.status = false AND t.data_fim < CURRENT_DATE)::int AS atrasadas,
  ROUND(
    CASE WHEN COUNT(t.id) > 0
         THEN COUNT(t.id) FILTER (WHERE t.status = true)::numeric / COUNT(t.id) * 100
         ELSE 0
    END, 1
  ) AS pct_concluido
FROM public.coordenacoes c
LEFT JOIN public.secoes s ON s.coordenacao_id = c.id
LEFT JOIN public.tarefas t ON t.secao_id = s.id
GROUP BY c.id, c.nome, c.slug
ORDER BY pct_concluido DESC;

-- 6. Tarefas por mês (criação)
CREATE OR REPLACE VIEW public.analytics_tarefas_mensal AS
SELECT
  to_char(t.created_at, 'YYYY-MM')                          AS mes,
  COUNT(t.id)::int                                           AS total,
  COUNT(t.id) FILTER (WHERE t.status = true)::int            AS concluidas,
  COUNT(t.id) FILTER (WHERE t.status = false)::int           AS pendentes
FROM public.tarefas t
GROUP BY 1
ORDER BY 1 DESC;

-- 7. Financeiro por mês
CREATE OR REPLACE VIEW public.analytics_financeiro_mensal AS
SELECT
  to_char(data, 'YYYY-MM')                                AS mes,
  SUM(valor) FILTER (WHERE tipo = 'receita')::numeric     AS receitas,
  SUM(valor) FILTER (WHERE tipo = 'despesa')::numeric     AS despesas,
  (COALESCE(SUM(valor) FILTER (WHERE tipo = 'receita'), 0)
   - COALESCE(SUM(valor) FILTER (WHERE tipo = 'despesa'), 0))::numeric AS saldo
FROM public.financas
GROUP BY 1
ORDER BY 1 DESC;

-- 8. Financeiro por categoria
CREATE OR REPLACE VIEW public.analytics_financeiro_por_categoria AS
SELECT
  tipo,
  categoria,
  COUNT(*)::int    AS qtd,
  SUM(valor)::numeric AS total
FROM public.financas
GROUP BY 1, 2
ORDER BY total DESC;

-- 9. Eventos por mês e tipo
CREATE OR REPLACE VIEW public.analytics_eventos_mensal AS
SELECT
  to_char(created_at, 'YYYY-MM') AS mes,
  tipo,
  COUNT(*)::int                  AS total
FROM public.eventos
GROUP BY 1, 2
ORDER BY 1 DESC;

-- 10. Campanha — calhas resumo
CREATE OR REPLACE VIEW public.analytics_campanha_calhas AS
SELECT
  nome,
  regiao,
  municipios,
  votos_validos,
  percentual_cristaos::numeric,
  potencial_votos
FROM public.campanha_calhas
ORDER BY potencial_votos DESC;

-- 11. Campanha — visitas por status
CREATE OR REPLACE VIEW public.analytics_campanha_visitas AS
SELECT
  status,
  COUNT(*)::int AS total
FROM public.campanha_visitas
GROUP BY 1;

-- 12. Alertas por tipo e leitura
CREATE OR REPLACE VIEW public.analytics_alertas AS
SELECT
  tipo,
  lido,
  COUNT(*)::int AS total
FROM public.alertas_sistema
GROUP BY 1, 2;

-- Grant SELECT to authenticated users on all analytics views
GRANT SELECT ON public.analytics_demandas_mensal        TO authenticated;
GRANT SELECT ON public.analytics_demandas_por_status    TO authenticated;
GRANT SELECT ON public.analytics_pessoas_mensal         TO authenticated;
GRANT SELECT ON public.analytics_pessoas_por_tipo       TO authenticated;
GRANT SELECT ON public.analytics_tarefas_por_coord      TO authenticated;
GRANT SELECT ON public.analytics_tarefas_mensal         TO authenticated;
GRANT SELECT ON public.analytics_financeiro_mensal      TO authenticated;
GRANT SELECT ON public.analytics_financeiro_por_categoria TO authenticated;
GRANT SELECT ON public.analytics_eventos_mensal         TO authenticated;
GRANT SELECT ON public.analytics_campanha_calhas        TO authenticated;
GRANT SELECT ON public.analytics_campanha_visitas       TO authenticated;
GRANT SELECT ON public.analytics_alertas                TO authenticated;
