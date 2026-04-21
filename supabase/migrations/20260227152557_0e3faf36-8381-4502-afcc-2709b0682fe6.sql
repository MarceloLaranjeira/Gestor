
-- Tabela: Calhas do Logbook
CREATE TABLE public.logbook_calhas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.logbook_calhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logbook_calhas_select" ON public.logbook_calhas FOR SELECT USING (true);
CREATE POLICY "logbook_calhas_insert" ON public.logbook_calhas FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "logbook_calhas_update" ON public.logbook_calhas FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "logbook_calhas_delete" ON public.logbook_calhas FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_logbook_calhas_updated_at BEFORE UPDATE ON public.logbook_calhas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: Municípios do Logbook
CREATE TABLE public.logbook_municipios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  calha_id UUID NOT NULL REFERENCES public.logbook_calhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  populacao_2022 INTEGER NOT NULL DEFAULT 0,
  percentual_cristaos_2010 NUMERIC NOT NULL DEFAULT 0,
  percentual_cristaos_2022 NUMERIC NOT NULL DEFAULT 0,
  percentual_nao_cristaos_2010 NUMERIC NOT NULL DEFAULT 0,
  percentual_nao_cristaos_2022 NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.logbook_municipios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logbook_municipios_select" ON public.logbook_municipios FOR SELECT USING (true);
CREATE POLICY "logbook_municipios_insert" ON public.logbook_municipios FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "logbook_municipios_update" ON public.logbook_municipios FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "logbook_municipios_delete" ON public.logbook_municipios FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_logbook_municipios_updated_at BEFORE UPDATE ON public.logbook_municipios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela: Votos Históricos
CREATE TYPE public.cargo_eleicao AS ENUM ('federal', 'estadual');

CREATE TABLE public.logbook_votos_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  municipio_id UUID NOT NULL REFERENCES public.logbook_municipios(id) ON DELETE CASCADE,
  ano_eleicao INTEGER NOT NULL,
  cargo public.cargo_eleicao NOT NULL,
  votos_validos_totais INTEGER NOT NULL DEFAULT 0,
  votos_candidato INTEGER NOT NULL DEFAULT 0,
  percentual_votos_candidato NUMERIC GENERATED ALWAYS AS (
    CASE WHEN votos_validos_totais > 0 THEN ROUND((votos_candidato::NUMERIC / votos_validos_totais) * 100, 2) ELSE 0 END
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(municipio_id, ano_eleicao, cargo)
);

ALTER TABLE public.logbook_votos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logbook_votos_select" ON public.logbook_votos_historico FOR SELECT USING (true);
CREATE POLICY "logbook_votos_insert" ON public.logbook_votos_historico FOR INSERT WITH CHECK (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "logbook_votos_update" ON public.logbook_votos_historico FOR UPDATE USING (has_role(auth.uid(), 'gestor'::app_role));
CREATE POLICY "logbook_votos_delete" ON public.logbook_votos_historico FOR DELETE USING (has_role(auth.uid(), 'gestor'::app_role));

CREATE TRIGGER update_logbook_votos_updated_at BEFORE UPDATE ON public.logbook_votos_historico FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
