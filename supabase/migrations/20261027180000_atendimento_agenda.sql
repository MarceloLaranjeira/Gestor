-- Fase 2 do Atendimento: agendas por especialidade, retorno automático,
-- anamnese, etapas da investigação neuropsicológica e controle de faltas.

ALTER TABLE public.especialidades
  ADD COLUMN IF NOT EXISTS retorno_dias INT CHECK (retorno_dias IS NULL OR retorno_dias BETWEEN 1 AND 365);

UPDATE public.especialidades SET retorno_dias = 15 WHERE slug = 'psicologia';

-- ─── Agendamentos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  especialidade_slug TEXT NOT NULL REFERENCES public.especialidades (slug),
  lista_espera_id UUID REFERENCES public.lista_espera (id) ON DELETE SET NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_min INT NOT NULL DEFAULT 50 CHECK (duracao_min BETWEEN 10 AND 480),
  tipo TEXT NOT NULL DEFAULT 'sessao'
    CHECK (tipo IN ('primeiro_atendimento', 'sessao', 'retorno', 'avaliacao', 'devolutiva')),
  etapa TEXT CHECK (etapa IS NULL OR etapa IN ('entrevista_inicial', 'testagem', 'correcao', 'devolutiva')),
  profissional TEXT CHECK (char_length(profissional) <= 120),
  status TEXT NOT NULL DEFAULT 'agendado'
    CHECK (status IN ('agendado', 'confirmado', 'presente', 'falta', 'cancelado')),
  motivo_cancelamento TEXT CHECK (char_length(motivo_cancelamento) <= 500),
  evolucao TEXT CHECK (char_length(evolucao) <= 8000),
  observacoes TEXT CHECK (char_length(observacoes) <= 2000),
  retorno_gerado_id UUID REFERENCES public.agendamentos (id) ON DELETE SET NULL,
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agendamentos_esp_data_idx ON public.agendamentos (especialidade_slug, data_hora);
CREATE INDEX IF NOT EXISTS agendamentos_paciente_idx ON public.agendamentos (paciente_id, data_hora);
CREATE INDEX IF NOT EXISTS agendamentos_status_idx ON public.agendamentos (status, data_hora);

CREATE TRIGGER agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY agendamentos_all ON public.agendamentos
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'atendimento'))
  WITH CHECK (public.has_module_access(auth.uid(), 'atendimento'));

-- ─── Anamnese (uma por paciente e especialidade) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.anamneses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  especialidade_slug TEXT NOT NULL REFERENCES public.especialidades (slug),
  queixa_principal TEXT CHECK (char_length(queixa_principal) <= 8000),
  gestacao_parto TEXT CHECK (char_length(gestacao_parto) <= 8000),
  desenvolvimento TEXT CHECK (char_length(desenvolvimento) <= 8000),
  saude_medicamentos TEXT CHECK (char_length(saude_medicamentos) <= 8000),
  historico_familiar TEXT CHECK (char_length(historico_familiar) <= 8000),
  escola_social TEXT CHECK (char_length(escola_social) <= 8000),
  comportamento TEXT CHECK (char_length(comportamento) <= 8000),
  observacoes TEXT CHECK (char_length(observacoes) <= 8000),
  created_by UUID DEFAULT auth.uid(),
  updated_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, especialidade_slug)
);

CREATE TRIGGER anamneses_updated_at
  BEFORE UPDATE ON public.anamneses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.anamneses ENABLE ROW LEVEL SECURITY;

CREATE POLICY anamneses_all ON public.anamneses
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'atendimento'))
  WITH CHECK (public.has_module_access(auth.uid(), 'atendimento'));

-- ─── Regras automáticas ──────────────────────────────────────────────────
-- Sábado e domingo caem para a segunda-feira seguinte.
CREATE OR REPLACE FUNCTION public.proximo_dia_util(_ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE extract(isodow FROM _ts AT TIME ZONE 'America/Manaus')
    WHEN 6 THEN _ts + interval '2 days'
    WHEN 7 THEN _ts + interval '1 day'
    ELSE _ts
  END;
$$;

CREATE OR REPLACE FUNCTION public.agendamento_regras()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_retorno_dias int;
  v_novo uuid;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.lista_espera_id IS NOT NULL THEN
    UPDATE lista_espera SET status = 'agendado'
    WHERE id = NEW.lista_espera_id AND status = 'aguardando';
  END IF;

  IF NEW.status = 'presente' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'presente') THEN
    IF NEW.lista_espera_id IS NOT NULL THEN
      UPDATE lista_espera SET status = 'em_atendimento'
      WHERE id = NEW.lista_espera_id AND status IN ('aguardando', 'agendado');
    END IF;

    -- Devolutiva realizada encerra a investigação na lista de espera.
    IF NEW.etapa = 'devolutiva' AND NEW.lista_espera_id IS NOT NULL THEN
      UPDATE lista_espera SET status = 'concluido' WHERE id = NEW.lista_espera_id;
    END IF;

    SELECT retorno_dias INTO v_retorno_dias FROM especialidades WHERE slug = NEW.especialidade_slug;

    IF v_retorno_dias IS NOT NULL
       AND NEW.retorno_gerado_id IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM agendamentos
         WHERE paciente_id = NEW.paciente_id
           AND especialidade_slug = NEW.especialidade_slug
           AND data_hora > NEW.data_hora
           AND status IN ('agendado', 'confirmado')
       ) THEN
      INSERT INTO agendamentos (
        paciente_id, especialidade_slug, lista_espera_id, data_hora, duracao_min, tipo, profissional, created_by
      ) VALUES (
        NEW.paciente_id, NEW.especialidade_slug, NEW.lista_espera_id,
        proximo_dia_util(NEW.data_hora + make_interval(days => v_retorno_dias)),
        NEW.duracao_min, 'retorno', NEW.profissional, auth.uid()
      )
      RETURNING id INTO v_novo;

      UPDATE agendamentos SET retorno_gerado_id = v_novo WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER agendamentos_regras
  AFTER INSERT OR UPDATE OF status ON public.agendamentos
  FOR EACH ROW EXECUTE FUNCTION public.agendamento_regras();
