
-- Tabela de municípios por calha
CREATE TABLE public.campanha_municipios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calha_id UUID REFERENCES public.campanha_calhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  votos_validos INTEGER NOT NULL DEFAULT 0,
  percentual_cristaos NUMERIC NOT NULL DEFAULT 0,
  apoiadores_estimados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campanha_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "municipios_select" ON public.campanha_municipios FOR SELECT USING (true);
CREATE POLICY "municipios_insert" ON public.campanha_municipios FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "municipios_update" ON public.campanha_municipios FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "municipios_delete" ON public.campanha_municipios FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));

-- Tabela de tarefas de coordenação
CREATE TABLE public.tarefas_coordenacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coordenador_id UUID REFERENCES public.campanha_coordenadores(id) ON DELETE CASCADE,
  assessor_id UUID REFERENCES public.campanha_assessores(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendente',
  data_limite DATE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tarefas_coordenacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tarefas_coord_select" ON public.tarefas_coordenacao FOR SELECT USING (true);
CREATE POLICY "tarefas_coord_insert" ON public.tarefas_coordenacao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tarefas_coord_update" ON public.tarefas_coordenacao FOR UPDATE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "tarefas_coord_delete" ON public.tarefas_coordenacao FOR DELETE USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'gestor'::app_role));

-- Adicionar campo resumo na tabela de contatos se não existir
ALTER TABLE public.campanha_contatos ADD COLUMN IF NOT EXISTS resumo TEXT NOT NULL DEFAULT '';
