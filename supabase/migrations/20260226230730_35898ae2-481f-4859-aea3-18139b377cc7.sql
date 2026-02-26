
-- Calhas (regiões eleitorais)
CREATE TABLE public.campanha_calhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  municipios INTEGER NOT NULL DEFAULT 0,
  votos_validos INTEGER NOT NULL DEFAULT 0,
  percentual_cristaos NUMERIC(5,2) NOT NULL DEFAULT 0,
  potencial_votos INTEGER NOT NULL DEFAULT 0,
  regiao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coordenadores de campanha
CREATE TABLE public.campanha_coordenadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  calha_id UUID REFERENCES public.campanha_calhas(id) ON DELETE SET NULL,
  ultimo_contato TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Assessores de campanha
CREATE TABLE public.campanha_assessores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  coordenador_id UUID REFERENCES public.campanha_coordenadores(id) ON DELETE SET NULL,
  funcao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contatos realizados
CREATE TABLE public.campanha_contatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coordenador_id UUID REFERENCES public.campanha_coordenadores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  data_contato TIMESTAMPTZ NOT NULL DEFAULT now(),
  tipo TEXT NOT NULL DEFAULT 'telefone',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Visitas planejadas
CREATE TABLE public.campanha_visitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calha_id UUID REFERENCES public.campanha_calhas(id) ON DELETE CASCADE,
  coordenador_id UUID REFERENCES public.campanha_coordenadores(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  data_visita DATE NOT NULL,
  objetivo TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planejada',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campanha_calhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_coordenadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_assessores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanha_visitas ENABLE ROW LEVEL SECURITY;

-- RLS policies - SELECT (all authenticated)
CREATE POLICY "campanha_calhas_select" ON public.campanha_calhas FOR SELECT USING (true);
CREATE POLICY "campanha_coordenadores_select" ON public.campanha_coordenadores FOR SELECT USING (true);
CREATE POLICY "campanha_assessores_select" ON public.campanha_assessores FOR SELECT USING (true);
CREATE POLICY "campanha_contatos_select" ON public.campanha_contatos FOR SELECT USING (true);
CREATE POLICY "campanha_visitas_select" ON public.campanha_visitas FOR SELECT USING (true);

-- INSERT
CREATE POLICY "campanha_calhas_insert" ON public.campanha_calhas FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_coordenadores_insert" ON public.campanha_coordenadores FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_assessores_insert" ON public.campanha_assessores FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_contatos_insert" ON public.campanha_contatos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campanha_visitas_insert" ON public.campanha_visitas FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "campanha_calhas_update" ON public.campanha_calhas FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_coordenadores_update" ON public.campanha_coordenadores FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_assessores_update" ON public.campanha_assessores FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_contatos_update" ON public.campanha_contatos FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_visitas_update" ON public.campanha_visitas FOR UPDATE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

-- DELETE
CREATE POLICY "campanha_calhas_delete" ON public.campanha_calhas FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_coordenadores_delete" ON public.campanha_coordenadores FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_assessores_delete" ON public.campanha_assessores FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_contatos_delete" ON public.campanha_contatos FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "campanha_visitas_delete" ON public.campanha_visitas FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'gestor'::app_role));

-- Timestamps trigger
CREATE TRIGGER update_campanha_calhas_updated_at BEFORE UPDATE ON public.campanha_calhas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campanha_coordenadores_updated_at BEFORE UPDATE ON public.campanha_coordenadores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campanha_assessores_updated_at BEFORE UPDATE ON public.campanha_assessores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_campanha_visitas_updated_at BEFORE UPDATE ON public.campanha_visitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add permission module
INSERT INTO public.role_permissions (role, module, enabled) VALUES
  ('gestor', 'campanha', true),
  ('coordenador', 'campanha', false),
  ('assessor', 'campanha', false)
ON CONFLICT DO NOTHING;
