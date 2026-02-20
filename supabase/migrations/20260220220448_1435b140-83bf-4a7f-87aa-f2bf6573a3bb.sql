
-- ==========================
-- PESSOAS (Contacts)
-- ==========================
CREATE TABLE public.pessoas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT 'Manaus',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pessoas_select" ON public.pessoas FOR SELECT USING (true);
CREATE POLICY "pessoas_insert" ON public.pessoas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pessoas_update" ON public.pessoas FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "pessoas_delete" ON public.pessoas FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_pessoas_updated_at
  BEFORE UPDATE ON public.pessoas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================
-- DEMANDAS
-- ==========================
CREATE TABLE public.demandas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'andamento', 'concluida', 'atrasada')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('urgente', 'alta', 'media', 'baixa')),
  responsavel TEXT NOT NULL DEFAULT '',
  solicitante TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  data_prazo DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "demandas_select" ON public.demandas FOR SELECT USING (true);
CREATE POLICY "demandas_insert" ON public.demandas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "demandas_update" ON public.demandas FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "demandas_delete" ON public.demandas FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_demandas_updated_at
  BEFORE UPDATE ON public.demandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================
-- EVENTOS
-- ==========================
CREATE TABLE public.eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  data DATE NOT NULL,
  hora TEXT NOT NULL DEFAULT '08:00',
  local TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Interno',
  participantes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eventos_select" ON public.eventos FOR SELECT USING (true);
CREATE POLICY "eventos_insert" ON public.eventos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "eventos_update" ON public.eventos FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "eventos_delete" ON public.eventos FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_eventos_updated_at
  BEFORE UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
