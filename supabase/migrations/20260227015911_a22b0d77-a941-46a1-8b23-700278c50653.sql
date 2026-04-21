
-- Tabela para locais mapeados na campanha
CREATE TABLE public.campanha_locais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL DEFAULT '',
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ponto_de_apoio',
  descricao TEXT NOT NULL DEFAULT '',
  calha_id UUID REFERENCES public.campanha_calhas(id) ON DELETE SET NULL,
  visita_id UUID REFERENCES public.campanha_visitas(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campanha_locais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campanha_locais_select" ON public.campanha_locais FOR SELECT USING (true);
CREATE POLICY "campanha_locais_insert" ON public.campanha_locais FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campanha_locais_update" ON public.campanha_locais FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_locais_delete" ON public.campanha_locais FOR DELETE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_campanha_locais_updated_at
  BEFORE UPDATE ON public.campanha_locais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
