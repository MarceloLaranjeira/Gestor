
-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);

-- apoiadores
DROP POLICY IF EXISTS "apoiadores_select" ON public.apoiadores;
CREATE POLICY "apoiadores_select" ON public.apoiadores FOR SELECT USING (auth.uid() IS NOT NULL);

-- pessoas
DROP POLICY IF EXISTS "pessoas_select" ON public.pessoas;
CREATE POLICY "pessoas_select" ON public.pessoas FOR SELECT USING (auth.uid() IS NOT NULL);

-- campanha_assessores
DROP POLICY IF EXISTS "campanha_assessores_select" ON public.campanha_assessores;
CREATE POLICY "campanha_assessores_select" ON public.campanha_assessores FOR SELECT USING (auth.uid() IS NOT NULL);

-- campanha_coordenadores
DROP POLICY IF EXISTS "campanha_coordenadores_select" ON public.campanha_coordenadores;
CREATE POLICY "campanha_coordenadores_select" ON public.campanha_coordenadores FOR SELECT USING (auth.uid() IS NOT NULL);

-- movimentos_financeiros
DROP POLICY IF EXISTS "fin_select" ON public.movimentos_financeiros;
CREATE POLICY "fin_select" ON public.movimentos_financeiros FOR SELECT USING (auth.uid() IS NOT NULL);

-- demandas
DROP POLICY IF EXISTS "demandas_select" ON public.demandas;
CREATE POLICY "demandas_select" ON public.demandas FOR SELECT USING (auth.uid() IS NOT NULL);

-- eventos
DROP POLICY IF EXISTS "eventos_select" ON public.eventos;
CREATE POLICY "eventos_select" ON public.eventos FOR SELECT USING (auth.uid() IS NOT NULL);

-- campanha_visitas
DROP POLICY IF EXISTS "campanha_visitas_select" ON public.campanha_visitas;
CREATE POLICY "campanha_visitas_select" ON public.campanha_visitas FOR SELECT USING (auth.uid() IS NOT NULL);

-- campanha_contatos
DROP POLICY IF EXISTS "campanha_contatos_select" ON public.campanha_contatos;
CREATE POLICY "campanha_contatos_select" ON public.campanha_contatos FOR SELECT USING (auth.uid() IS NOT NULL);

-- historico_apoiadores
DROP POLICY IF EXISTS "historico_apoiadores_select" ON public.historico_apoiadores;
CREATE POLICY "historico_apoiadores_select" ON public.historico_apoiadores FOR SELECT USING (auth.uid() IS NOT NULL);

-- acoes_movimento
DROP POLICY IF EXISTS "acoes_select" ON public.acoes_movimento;
CREATE POLICY "acoes_select" ON public.acoes_movimento FOR SELECT USING (auth.uid() IS NOT NULL);

-- integracao_agente_mensagens
DROP POLICY IF EXISTS "mensagens_select" ON public.integracao_agente_mensagens;
CREATE POLICY "mensagens_select" ON public.integracao_agente_mensagens FOR SELECT USING (auth.uid() IS NOT NULL);

-- agent_conversations
DROP POLICY IF EXISTS "agent_conversations_select" ON public.agent_conversations;
CREATE POLICY "agent_conversations_select" ON public.agent_conversations FOR SELECT USING (auth.uid() IS NOT NULL);

-- campanha_locais
DROP POLICY IF EXISTS "campanha_locais_select" ON public.campanha_locais;
CREATE POLICY "campanha_locais_select" ON public.campanha_locais FOR SELECT USING (auth.uid() IS NOT NULL);
