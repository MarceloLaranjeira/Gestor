
-- Create movimentos_financeiros table
CREATE TABLE public.movimentos_financeiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'receita', -- 'receita' | 'despesa'
  descricao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  observacao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.movimentos_financeiros ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "fin_select" ON public.movimentos_financeiros
  FOR SELECT USING (true);

CREATE POLICY "fin_insert" ON public.movimentos_financeiros
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "fin_update" ON public.movimentos_financeiros
  FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE POLICY "fin_delete" ON public.movimentos_financeiros
  FOR DELETE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_movimentos_financeiros_updated_at
  BEFORE UPDATE ON public.movimentos_financeiros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
