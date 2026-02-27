
-- Enum for prioridade
CREATE TYPE public.prioridade_apoiador AS ENUM ('alta', 'media', 'baixa');

-- Enum for status historico
CREATE TYPE public.status_historico AS ENUM ('concluido', 'pendente', 'em_andamento');

-- Tabela de Apoiadores
CREATE TABLE public.apoiadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL DEFAULT '',
  regiao TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  data_nascimento DATE,
  organizacao TEXT NOT NULL DEFAULT '',
  funcao TEXT NOT NULL DEFAULT '',
  segmento TEXT NOT NULL DEFAULT '',
  cargo TEXT NOT NULL DEFAULT '',
  beneficios_relacionados TEXT NOT NULL DEFAULT '',
  resumo TEXT NOT NULL DEFAULT '',
  grau_influencia INTEGER NOT NULL DEFAULT 3,
  prioridade public.prioridade_apoiador NOT NULL DEFAULT 'media',
  origem_contato TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de Histórico do Apoiador
CREATE TABLE public.historico_apoiadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apoiador_id UUID NOT NULL REFERENCES public.apoiadores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  data TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL DEFAULT '',
  responsavel TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  status public.status_historico NOT NULL DEFAULT 'pendente',
  data_prevista TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_apoiadores_user_id ON public.apoiadores(user_id);
CREATE INDEX idx_apoiadores_prioridade ON public.apoiadores(prioridade);
CREATE INDEX idx_apoiadores_grau ON public.apoiadores(grau_influencia);
CREATE INDEX idx_historico_apoiador_id ON public.historico_apoiadores(apoiador_id);
CREATE INDEX idx_historico_status ON public.historico_apoiadores(status);

-- Triggers
CREATE TRIGGER update_apoiadores_updated_at
  BEFORE UPDATE ON public.apoiadores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.apoiadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_apoiadores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for apoiadores
CREATE POLICY "apoiadores_select" ON public.apoiadores FOR SELECT USING (true);
CREATE POLICY "apoiadores_insert" ON public.apoiadores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "apoiadores_update" ON public.apoiadores FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "apoiadores_delete" ON public.apoiadores FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

-- RLS Policies for historico_apoiadores
CREATE POLICY "historico_apoiadores_select" ON public.historico_apoiadores FOR SELECT USING (true);
CREATE POLICY "historico_apoiadores_insert" ON public.historico_apoiadores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "historico_apoiadores_update" ON public.historico_apoiadores FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "historico_apoiadores_delete" ON public.historico_apoiadores FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

-- Add permission module for prontuario
INSERT INTO public.role_permissions (role, module, enabled) VALUES
  ('gestor', 'prontuario', true),
  ('coordenador', 'prontuario', false),
  ('assessor', 'prontuario', false);
