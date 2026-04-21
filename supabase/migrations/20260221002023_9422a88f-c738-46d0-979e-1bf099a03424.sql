
-- Tabela de Movimentos (bandeiras do mandato)
CREATE TABLE public.movimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  icone TEXT NOT NULL DEFAULT 'Heart',
  cor TEXT NOT NULL DEFAULT 'bg-primary/10 text-primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "movimentos_select" ON public.movimentos FOR SELECT USING (true);
CREATE POLICY "movimentos_insert" ON public.movimentos FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "movimentos_update" ON public.movimentos FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "movimentos_delete" ON public.movimentos FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_movimentos_updated_at
  BEFORE UPDATE ON public.movimentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de Ações vinculadas a um Movimento
CREATE TABLE public.acoes_movimento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  movimento_id UUID NOT NULL REFERENCES public.movimentos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  responsavel TEXT NOT NULL DEFAULT '',
  data_prazo DATE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.acoes_movimento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acoes_select" ON public.acoes_movimento FOR SELECT USING (true);
CREATE POLICY "acoes_insert" ON public.acoes_movimento FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "acoes_update" ON public.acoes_movimento FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "acoes_delete" ON public.acoes_movimento FOR DELETE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_acoes_movimento_updated_at
  BEFORE UPDATE ON public.acoes_movimento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
