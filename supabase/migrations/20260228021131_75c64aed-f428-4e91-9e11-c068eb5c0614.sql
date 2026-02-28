
-- Tabela de configuração da integração com agente externo
CREATE TABLE public.integracao_agente_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL DEFAULT 'Agente WhatsApp/Instagram',
  api_url text NOT NULL DEFAULT '',
  api_token text NOT NULL DEFAULT '',
  webhook_secret text NOT NULL DEFAULT gen_random_uuid()::text,
  ativo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integracao_agente_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "config_select" ON public.integracao_agente_config FOR SELECT USING (true);
CREATE POLICY "config_insert" ON public.integracao_agente_config FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "config_update" ON public.integracao_agente_config FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "config_delete" ON public.integracao_agente_config FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

-- Tabela de log de mensagens trocadas
CREATE TABLE public.integracao_agente_mensagens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id uuid NOT NULL REFERENCES public.integracao_agente_config(id) ON DELETE CASCADE,
  direcao text NOT NULL DEFAULT 'enviada', -- 'enviada' ou 'recebida'
  tipo text NOT NULL DEFAULT 'texto', -- tipo da mensagem
  conteudo jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pendente', -- pendente, enviada, erro, processada
  plataforma text NOT NULL DEFAULT '', -- whatsapp, instagram, etc
  contato_externo text NOT NULL DEFAULT '', -- número/id do contato externo
  erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integracao_agente_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mensagens_select" ON public.integracao_agente_mensagens FOR SELECT USING (true);
CREATE POLICY "mensagens_insert" ON public.integracao_agente_mensagens FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.integracao_agente_config c WHERE c.id = config_id AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'gestor'::app_role)))
);
CREATE POLICY "mensagens_delete" ON public.integracao_agente_mensagens FOR DELETE USING (
  has_role(auth.uid(), 'gestor'::app_role)
);

-- Trigger para updated_at
CREATE TRIGGER update_integracao_config_updated_at
  BEFORE UPDATE ON public.integracao_agente_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permissões do módulo
INSERT INTO public.role_permissions (role, module, enabled) VALUES
  ('gestor', 'integracao', true),
  ('assessor', 'integracao', true),
  ('coordenador', 'integracao', false);

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.integracao_agente_mensagens;
