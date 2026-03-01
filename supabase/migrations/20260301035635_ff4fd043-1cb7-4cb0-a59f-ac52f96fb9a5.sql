
-- Add UPDATE policy for messages (to support editing)
CREATE POLICY "mensagens_update"
ON public.integracao_agente_mensagens
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM integracao_agente_config c
    WHERE c.id = integracao_agente_mensagens.config_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'gestor'::app_role))
  )
);

-- Add DELETE policy for messages (allow owner or gestor)
DROP POLICY IF EXISTS "mensagens_delete" ON public.integracao_agente_mensagens;
CREATE POLICY "mensagens_delete"
ON public.integracao_agente_mensagens
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM integracao_agente_config c
    WHERE c.id = integracao_agente_mensagens.config_id
    AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'gestor'::app_role))
  )
);
