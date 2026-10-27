-- Fase 1 do módulo de Atendimento: especialidades, cadastro de pacientes,
-- lista de espera por especialidade e inscrição pública pelas famílias.

-- ─── Acesso por módulo (gestor ou papel com o módulo habilitado) ─────────
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'gestor')
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.role_permissions rp ON rp.role::text = ur.role::text
      WHERE ur.user_id = _user_id
        AND rp.module = _module
        AND rp.enabled
    );
$$;

-- Mesmo acesso de quem já trabalha com as Demandas SAC.
INSERT INTO public.role_permissions (role, module, enabled)
SELECT role, 'atendimento', enabled
FROM public.role_permissions
WHERE module = 'movimentos'
ON CONFLICT (role, module) DO NOTHING;

-- ─── Validação de CPF (dígitos verificadores) ────────────────────────────
CREATE OR REPLACE FUNCTION public.cpf_valido(_cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d int[];
  soma int;
  dv int;
  i int;
BEGIN
  IF _cpf IS NULL OR _cpf !~ '^\d{11}$' OR _cpf ~ '^(\d)\1{10}$' THEN
    RETURN false;
  END IF;
  d := string_to_array(_cpf, NULL)::int[];

  soma := 0;
  FOR i IN 1..9 LOOP soma := soma + d[i] * (11 - i); END LOOP;
  dv := (soma * 10) % 11 % 10;
  IF dv <> d[10] THEN RETURN false; END IF;

  soma := 0;
  FOR i IN 1..10 LOOP soma := soma + d[i] * (12 - i); END LOOP;
  dv := (soma * 10) % 11 % 10;
  RETURN dv = d[11];
END;
$$;

-- ─── Especialidades ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.especialidades (
  slug TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.especialidades (slug, nome, descricao, ordem) VALUES
  ('neuropsicologia', 'Neuropsicóloga — Investigação', 'Investigação e avaliação neuropsicológica.', 1),
  ('psicologia', 'Psicóloga — Terapias', 'Atendimentos terapêuticos com retorno programado.', 2),
  ('neuropediatria', 'Neuropediatra', 'Avaliação médica final.', 3)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  descricao = EXCLUDED.descricao,
  ordem = EXCLUDED.ordem;

ALTER TABLE public.especialidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY especialidades_select ON public.especialidades
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY especialidades_write ON public.especialidades
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'gestor'))
  WITH CHECK (public.has_role(auth.uid(), 'gestor'));

-- ─── Pacientes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL CHECK (char_length(nome) BETWEEN 3 AND 160),
  data_nascimento DATE,
  cpf TEXT CHECK (cpf IS NULL OR public.cpf_valido(cpf)),
  cartao_sus TEXT CHECK (cartao_sus IS NULL OR cartao_sus ~ '^\d{15}$'),
  responsavel_nome TEXT CHECK (char_length(responsavel_nome) <= 160),
  responsavel_cpf TEXT CHECK (responsavel_cpf IS NULL OR public.cpf_valido(responsavel_cpf)),
  telefone TEXT CHECK (telefone IS NULL OR telefone ~ '^\d{10,13}$'),
  cep TEXT CHECK (cep IS NULL OR cep ~ '^\d{8}$'),
  endereco TEXT CHECK (char_length(endereco) <= 300),
  possui_laudo BOOLEAN,
  origem_conhecimento TEXT CHECK (char_length(origem_conhecimento) <= 200),
  observacoes TEXT CHECK (char_length(observacoes) <= 4000),
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pacientes_cpf_key ON public.pacientes (cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS pacientes_nome_nasc_idx ON public.pacientes (lower(nome), data_nascimento);

CREATE TRIGGER pacientes_updated_at
  BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY pacientes_all ON public.pacientes
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'atendimento'))
  WITH CHECK (public.has_module_access(auth.uid(), 'atendimento'));

-- ─── Lista de espera ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lista_espera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID NOT NULL REFERENCES public.pacientes (id) ON DELETE CASCADE,
  especialidade_slug TEXT NOT NULL REFERENCES public.especialidades (slug),
  status TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'agendado', 'em_atendimento', 'concluido', 'cancelado')),
  prioridade TEXT NOT NULL DEFAULT 'normal' CHECK (prioridade IN ('normal', 'alta')),
  motivo TEXT CHECK (char_length(motivo) <= 500),
  descricao_sintomas TEXT CHECK (char_length(descricao_sintomas) <= 4000),
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('formulario', 'manual')),
  -- Cópia do que a família enviou; não sobrescreve o cadastro existente.
  dados_inscricao JSONB,
  observacoes TEXT CHECK (char_length(observacoes) <= 4000),
  created_by UUID DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lista_espera_ativa_key
  ON public.lista_espera (paciente_id, especialidade_slug)
  WHERE status IN ('aguardando', 'agendado', 'em_atendimento');
CREATE INDEX IF NOT EXISTS lista_espera_fila_idx
  ON public.lista_espera (especialidade_slug, status, created_at);

CREATE TRIGGER lista_espera_updated_at
  BEFORE UPDATE ON public.lista_espera
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY lista_espera_all ON public.lista_espera
  FOR ALL TO authenticated
  USING (public.has_module_access(auth.uid(), 'atendimento'))
  WITH CHECK (public.has_module_access(auth.uid(), 'atendimento'));

-- ─── Inscrição (formulário público e cadastro interno) ───────────────────
CREATE OR REPLACE FUNCTION public.inscrever_paciente(p jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_interno boolean := auth.uid() IS NOT NULL AND public.has_module_access(auth.uid(), 'atendimento');
  v_nome text := nullif(btrim(regexp_replace(p->>'nome', '\s+', ' ', 'g')), '');
  v_nasc date;
  v_cpf text := nullif(regexp_replace(coalesce(p->>'cpf', ''), '\D', '', 'g'), '');
  v_resp_nome text := nullif(btrim(p->>'responsavel_nome'), '');
  v_resp_cpf text := nullif(regexp_replace(coalesce(p->>'responsavel_cpf', ''), '\D', '', 'g'), '');
  v_tel text := nullif(regexp_replace(coalesce(p->>'telefone', ''), '\D', '', 'g'), '');
  v_cep text := nullif(regexp_replace(coalesce(p->>'cep', ''), '\D', '', 'g'), '');
  v_sus text := nullif(regexp_replace(coalesce(p->>'cartao_sus', ''), '\D', '', 'g'), '');
  v_endereco text := nullif(btrim(p->>'endereco'), '');
  v_origem_conh text := nullif(btrim(p->>'origem_conhecimento'), '');
  v_laudo boolean := (p->>'possui_laudo')::boolean;
  v_esp text := p->>'especialidade';
  v_motivo text := nullif(btrim(p->>'motivo'), '');
  v_sintomas text := nullif(btrim(p->>'descricao_sintomas'), '');
  v_paciente uuid;
  v_entrada uuid;
BEGIN
  -- Campo invisível no formulário: robôs preenchem, pessoas não.
  IF coalesce(p->>'website', '') <> '' THEN
    RETURN jsonb_build_object('ok', true, 'protocolo', upper(substr(md5(random()::text), 1, 8)));
  END IF;

  IF NOT v_interno THEN
    IF coalesce((p->>'consentimento')::boolean, false) IS NOT TRUE THEN
      RAISE EXCEPTION 'É necessário autorizar o uso dos dados para o atendimento.' USING ERRCODE = '22023';
    END IF;
    -- shortcut: teto global contra envio em massa; trocar por limite por IP (edge function) se houver abuso.
    IF (SELECT count(*) FROM public.lista_espera
        WHERE origem = 'formulario' AND created_at > now() - interval '1 hour') >= 300 THEN
      RAISE EXCEPTION 'Muitas inscrições no momento. Tente novamente em alguns minutos.' USING ERRCODE = '54000';
    END IF;
  END IF;

  BEGIN
    v_nasc := (p->>'data_nascimento')::date;
  EXCEPTION WHEN others THEN
    v_nasc := NULL;
  END;

  IF v_nome IS NULL OR char_length(v_nome) NOT BETWEEN 3 AND 160 THEN
    RAISE EXCEPTION 'Informe o nome completo do paciente.' USING ERRCODE = '22023';
  END IF;
  IF v_nasc IS NULL OR v_nasc > current_date OR v_nasc < date '1900-01-01' THEN
    RAISE EXCEPTION 'Informe uma data de nascimento válida.' USING ERRCODE = '22023';
  END IF;
  IF v_resp_nome IS NULL THEN
    RAISE EXCEPTION 'Informe o nome do responsável.' USING ERRCODE = '22023';
  END IF;
  IF v_tel IS NULL OR v_tel !~ '^\d{10,13}$' THEN
    RAISE EXCEPTION 'Informe um telefone com DDD.' USING ERRCODE = '22023';
  END IF;
  IF v_cpf IS NOT NULL AND NOT public.cpf_valido(v_cpf) THEN
    RAISE EXCEPTION 'CPF do paciente inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_resp_cpf IS NOT NULL AND NOT public.cpf_valido(v_resp_cpf) THEN
    RAISE EXCEPTION 'CPF do responsável inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_cep IS NOT NULL AND v_cep !~ '^\d{8}$' THEN
    RAISE EXCEPTION 'CEP inválido.' USING ERRCODE = '22023';
  END IF;
  IF v_sus IS NOT NULL AND v_sus !~ '^\d{15}$' THEN
    RAISE EXCEPTION 'O Cartão do SUS deve ter 15 dígitos.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.especialidades WHERE slug = v_esp AND ativo) THEN
    RAISE EXCEPTION 'Selecione a especialidade desejada.' USING ERRCODE = '22023';
  END IF;
  IF char_length(coalesce(v_endereco, '')) > 300
     OR char_length(coalesce(v_origem_conh, '')) > 200
     OR char_length(coalesce(v_motivo, '')) > 500
     OR char_length(coalesce(v_sintomas, '')) > 4000
     OR char_length(coalesce(v_resp_nome, '')) > 160 THEN
    RAISE EXCEPTION 'Algum campo ultrapassou o tamanho permitido.' USING ERRCODE = '22023';
  END IF;

  IF v_cpf IS NOT NULL THEN
    SELECT id INTO v_paciente FROM public.pacientes WHERE cpf = v_cpf;
  END IF;
  IF v_paciente IS NULL THEN
    SELECT id INTO v_paciente FROM public.pacientes
    WHERE lower(nome) = lower(v_nome) AND data_nascimento = v_nasc
    LIMIT 1;
  END IF;

  IF v_paciente IS NULL THEN
    INSERT INTO public.pacientes (
      nome, data_nascimento, cpf, cartao_sus, responsavel_nome, responsavel_cpf,
      telefone, cep, endereco, possui_laudo, origem_conhecimento, created_by
    ) VALUES (
      v_nome, v_nasc, v_cpf, v_sus, v_resp_nome, v_resp_cpf,
      v_tel, v_cep, v_endereco, v_laudo, v_origem_conh, auth.uid()
    )
    RETURNING id INTO v_paciente;
  ELSE
    -- Só completa campos vazios: um envio anônimo não pode trocar dados de quem já está cadastrado.
    UPDATE public.pacientes SET
      cpf = coalesce(cpf, v_cpf),
      cartao_sus = coalesce(cartao_sus, v_sus),
      responsavel_nome = coalesce(responsavel_nome, v_resp_nome),
      responsavel_cpf = coalesce(responsavel_cpf, v_resp_cpf),
      telefone = coalesce(telefone, v_tel),
      cep = coalesce(cep, v_cep),
      endereco = coalesce(endereco, v_endereco),
      possui_laudo = coalesce(possui_laudo, v_laudo),
      origem_conhecimento = coalesce(origem_conhecimento, v_origem_conh)
    WHERE id = v_paciente;
  END IF;

  INSERT INTO public.lista_espera (
    paciente_id, especialidade_slug, motivo, descricao_sintomas, origem, dados_inscricao, created_by
  ) VALUES (
    v_paciente, v_esp, v_motivo, v_sintomas,
    CASE WHEN v_interno THEN 'manual' ELSE 'formulario' END,
    p - 'website' - 'consentimento',
    auth.uid()
  )
  ON CONFLICT (paciente_id, especialidade_slug)
    WHERE status IN ('aguardando', 'agendado', 'em_atendimento')
    DO NOTHING
  RETURNING id INTO v_entrada;

  IF v_entrada IS NULL THEN
    SELECT id INTO v_entrada FROM public.lista_espera
    WHERE paciente_id = v_paciente
      AND especialidade_slug = v_esp
      AND status IN ('aguardando', 'agendado', 'em_atendimento');
  END IF;

  RETURN jsonb_build_object('ok', true, 'protocolo', upper(substr(v_entrada::text, 1, 8)));
END;
$$;

REVOKE ALL ON FUNCTION public.inscrever_paciente(jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.inscrever_paciente(jsonb) TO anon, authenticated;
