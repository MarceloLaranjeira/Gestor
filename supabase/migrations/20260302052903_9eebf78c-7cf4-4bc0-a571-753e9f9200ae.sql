
DROP POLICY IF EXISTS "config_select" ON public.integracao_agente_config;
CREATE POLICY "config_select" ON public.integracao_agente_config
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
