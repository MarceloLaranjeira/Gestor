-- ============================================================
-- Migration: Módulo de Gestão Parlamentar Avançado
-- Vereadora Thaysa Lippi - Gestor Automatikus
-- Created: 2026-03-19
-- ============================================================

-- ── 1. Causas Sociais e Bandeiras Parlamentares ──────────────
CREATE TABLE IF NOT EXISTS causas_sociais (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        text    NOT NULL,
  descricao   text    DEFAULT '',
  categoria   text    NOT NULL CHECK (categoria IN (
                'PROTECAO_MULHER','INCLUSAO_PCD','AUTISMO_TEA',
                'SANEAMENTO_BASICO','DIGNIDADE_SOCIAL')),
  status      text    DEFAULT 'ativa' CHECK (status IN ('ativa','concluida','em_progresso')),
  impacto_estimado integer DEFAULT 0,
  cor         text    DEFAULT 'bg-primary/10 text-primary',
  icone       text    DEFAULT 'Heart',
  documentos  jsonb   DEFAULT '[]',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ── 2. Proposituras Parlamentares ───────────────────────────
CREATE TABLE IF NOT EXISTS proposituras (
  id                 uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  numero             text    NOT NULL,
  ano                integer NOT NULL DEFAULT extract(year from now())::integer,
  titulo             text    NOT NULL,
  descricao          text    DEFAULT '',
  tipo               text    NOT NULL CHECK (tipo IN (
                       'LEI_SANCIONADA','PROJETO_LEI','INDICACAO','EMENDA','REQUERIMENTO')),
  status             text    DEFAULT 'Apresentada' CHECK (status IN (
                       'Apresentada','Em Discussão','Aprovada','Sancionada','Arquivada')),
  data_apresentacao  date,
  data_votacao       date,
  resultado_votacao  text,
  causa_id           uuid    REFERENCES causas_sociais(id) ON DELETE SET NULL,
  impacto_estimado   text    DEFAULT '',
  beneficiarios      integer DEFAULT 0,
  documentos_anexos  text[]  DEFAULT '{}',
  votos_a_favor      integer DEFAULT 0,
  votos_contra       integer DEFAULT 0,
  abstencoes         integer DEFAULT 0,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- ── 3. CPIs e Fiscalização ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cpis_fiscalizacao (
  id                    uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_cpi              text    NOT NULL,
  data_instauracao      date,
  alvo_investigacao     text    DEFAULT '',
  tipo_irregularidade   text[]  DEFAULT '{}',
  status_investigacao   text    DEFAULT 'Aberta' CHECK (status_investigacao IN (
                          'Aberta','Em Andamento','Relatório Preliminar',
                          'Relatório Final','Encerrada')),
  autores               text[]  DEFAULT '{}',
  documentos_investigacao text[] DEFAULT '{}',
  recomendacoes         text    DEFAULT '',
  resultado_final       text    DEFAULT '',
  impacto_esperado      text    DEFAULT '',
  coluna_kanban         text    DEFAULT 'Denúncia Recebida' CHECK (coluna_kanban IN (
                          'Denúncia Recebida','Investigando',
                          'Notificação Enviada','Resolvido')),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- ── 4. Trajetória Política ───────────────────────────────────
CREATE TABLE IF NOT EXISTS trajetoria_politica (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  data             date    NOT NULL,
  titulo           text    NOT NULL,
  descricao        text    DEFAULT '',
  tipo             text    NOT NULL CHECK (tipo IN (
                     'eleicao','mandato','mudanca_partido',
                     'candidatura','marco_legislativo','pesquisa','outro')),
  documentos       text[]  DEFAULT '{}',
  impacto_politico text    DEFAULT '',
  destaque         boolean DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- ── 5. Enable RLS ────────────────────────────────────────────
ALTER TABLE causas_sociais      ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposituras        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cpis_fiscalizacao   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trajetoria_politica ENABLE ROW LEVEL SECURITY;

-- ── 6. RLS Policies ─────────────────────────────────────────
CREATE POLICY "auth_all_causas"      ON causas_sociais      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_proposituras" ON proposituras        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_cpis"        ON cpis_fiscalizacao   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_trajetoria"  ON trajetoria_politica FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── 7. Module permissions ────────────────────────────────────
INSERT INTO role_permissions (role, module, enabled) VALUES
  ('gestor',      'parlamentar', true),
  ('assessor',    'parlamentar', true),
  ('coordenador', 'parlamentar', true)
ON CONFLICT (role, module) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ── 8. Seed: Causas Sociais ───────────────────────────────────
INSERT INTO causas_sociais (nome, descricao, categoria, status, impacto_estimado, cor, icone) VALUES
  ('Proteção às Mulheres',
   'Enfrentamento à violência doméstica, combate ao feminicídio e proteção integral dos direitos das mulheres manauaras',
   'PROTECAO_MULHER', 'ativa', 120000,
   'bg-rose-500/10 text-rose-500', 'Shield'),
  ('Inclusão de PCDs',
   'Políticas de acessibilidade, inclusão social e dignidade para pessoas com deficiência em Manaus',
   'INCLUSAO_PCD', 'ativa', 80000,
   'bg-blue-500/10 text-blue-500', 'Accessibility'),
  ('Autismo (TEA)',
   'Políticas permanentes para o Transtorno do Espectro Autista, redes de apoio e diagnóstico precoce',
   'AUTISMO_TEA', 'ativa', 45000,
   'bg-purple-500/10 text-purple-500', 'Brain'),
  ('Saneamento Básico',
   'Fiscalização de serviços essenciais, investigação de irregularidades das concessionárias e garantia de acesso à água',
   'SANEAMENTO_BASICO', 'ativa', 300000,
   'bg-cyan-500/10 text-cyan-500', 'Droplets'),
  ('Dignidade Social',
   'Proteção social, acesso à saúde, educação e condições dignas de vida para todos os manauaras',
   'DIGNIDADE_SOCIAL', 'ativa', 500000,
   'bg-emerald-500/10 text-emerald-500', 'Heart')
ON CONFLICT DO NOTHING;

-- ── 9. Seed: Trajetória Política ─────────────────────────────
INSERT INTO trajetoria_politica (data, titulo, descricao, tipo, impacto_politico, destaque) VALUES
  ('2020-11-15',
   'Eleita Vereadora de Manaus',
   'Eleita vereadora pelo Partido Progressistas (PP) com expressiva votação na Câmara Municipal de Manaus, tornando-se referência nas pautas de proteção à mulher e inclusão social',
   'eleicao',
   'Início do mandato legislativo na CMM com foco em pautas sociais e de proteção às mulheres',
   true),
  ('2021-01-01',
   'Início do Mandato na Câmara Municipal',
   'Assumiu o mandato de vereadora na CMM, iniciando intensa atividade legislativa com mais de 200 proposituras no primeiro ano, voltadas às mulheres, PCDs e autismo',
   'mandato',
   'Primeiros projetos de lei apresentados nas áreas de proteção à mulher, inclusão de PCDs e políticas para autismo',
   true),
  ('2022-05-10',
   'Coautora da CPI das Águas de Manaus',
   'Participação ativa como coautora da CPI das Águas de Manaus, investigando irregularidades da concessionária e defendendo o direito ao saneamento básico para mais de 300 mil famílias',
   'marco_legislativo',
   'Visibilidade regional e nacional na pauta de saneamento e fiscalização de serviços públicos essenciais',
   true),
  ('2023-03-08',
   'Marco em Proteção às Mulheres — 10ª Lei Sancionada',
   'Alcança a marca de 10 leis sancionadas, consolidando-se como uma das vereadoras mais produtivas da CMM, com destaque para legislação de combate à violência doméstica',
   'marco_legislativo',
   'Reconhecimento pela atuação em defesa dos direitos das mulheres; presença em eventos nacionais sobre gênero e política',
   false),
  ('2024-04-01',
   'Filiação ao PRD',
   'Migração do Partido Progressistas para o PRD (Partido Renovação Democrática), alinhando-se ao grupo do governador Wilson Lima e fortalecendo laços políticos com o dep. estadual Felipe Souza',
   'mudanca_partido',
   'Fortalecimento da base política estadual e alinhamento com o grupo governista; reposicionamento estratégico para as eleições de 2026',
   true),
  ('2024-11-15',
   '26 Leis Sancionadas — Legado Municipal',
   'Atingiu a marca histórica de 26 leis sancionadas durante o mandato, tornando-se referência legislativa no município de Manaus em pautas sociais, inclusão e fiscalização',
   'marco_legislativo',
   'Reconhecimento nacional como uma das vereadoras mais produtivas do Amazonas no mandato 2021-2024',
   true),
  ('2025-01-01',
   'Pré-candidatura a Deputada Estadual',
   'Anúncio oficial da pré-candidatura para as eleições de 2026, com foco na ampliação da agenda social para o âmbito estadual e consolidação da base evangélica e comunitária',
   'candidatura',
   'Início do processo de construção da candidatura estadual; mobilização de lideranças evangélicas, comunitárias e base de apoiadoras',
   true),
  ('2026-10-01',
   'Eleições Estaduais — Candidata a Deputada',
   'Candidatura a Deputada Estadual pelo Amazonas (PRD), com base eleitoral consolidada nas zonas Norte, Leste e Sul de Manaus, e forte presença no segmento evangélico',
   'eleicao',
   'Potencial de eleição com expressiva votação em Manaus; projeta ampliar pautas de proteção social para a Assembleia Legislativa do Amazonas',
   false)
ON CONFLICT DO NOTHING;

-- ── 10. Seed: Proposituras representativas ────────────────────
DO $$
DECLARE
  causa_mulher uuid;
  causa_pcd    uuid;
  causa_tea    uuid;
  causa_san    uuid;
  causa_social uuid;
BEGIN
  SELECT id INTO causa_mulher FROM causas_sociais WHERE categoria = 'PROTECAO_MULHER' LIMIT 1;
  SELECT id INTO causa_pcd    FROM causas_sociais WHERE categoria = 'INCLUSAO_PCD'    LIMIT 1;
  SELECT id INTO causa_tea    FROM causas_sociais WHERE categoria = 'AUTISMO_TEA'     LIMIT 1;
  SELECT id INTO causa_san    FROM causas_sociais WHERE categoria = 'SANEAMENTO_BASICO' LIMIT 1;
  SELECT id INTO causa_social FROM causas_sociais WHERE categoria = 'DIGNIDADE_SOCIAL' LIMIT 1;

  INSERT INTO proposituras (numero, ano, titulo, descricao, tipo, status, data_apresentacao, causa_id, impacto_estimado, beneficiarios, votos_a_favor) VALUES
    -- Leis Sancionadas
    ('Lei Mun. 2021/001', 2021,
     'Lei de Proteção a Mulheres em Situação de Vulnerabilidade',
     'Cria mecanismos de proteção e atendimento especializado a mulheres em situação de violência doméstica no Município de Manaus',
     'LEI_SANCIONADA', 'Sancionada', '2021-03-08', causa_mulher,
     'Proteção direta de milhares de mulheres manauaras em situação de vulnerabilidade', 50000, 23),

    ('Lei Mun. 2021/002', 2021,
     'Lei de Acessibilidade em Espaços Públicos',
     'Estabelece normas de acessibilidade obrigatória em espaços públicos, equipamentos urbanos e transportes coletivos do município',
     'LEI_SANCIONADA', 'Sancionada', '2021-05-15', causa_pcd,
     'Melhoria da mobilidade e inclusão de pessoas com deficiência em toda a cidade', 80000, 25),

    ('Lei Mun. 2022/001', 2022,
     'Política Municipal de Atenção Integral ao Autismo',
     'Institui a Política Municipal de Atenção Integral à Pessoa com TEA (Transtorno do Espectro Autista) em Manaus',
     'LEI_SANCIONADA', 'Sancionada', '2022-04-02', causa_tea,
     'Garantia de direitos e serviços especializados para pessoas com autismo e seus familiares em Manaus', 45000, 24),

    ('Lei Mun. 2022/002', 2022,
     'Lei de Fiscalização e Controle Social do Saneamento',
     'Cria mecanismos de fiscalização popular e controle social dos serviços de saneamento básico no Município de Manaus',
     'LEI_SANCIONADA', 'Sancionada', '2022-07-22', causa_san,
     'Fortalecimento do controle social sobre os serviços de água e esgoto em Manaus', 200000, 22),

    ('Lei Mun. 2023/001', 2023,
     'Programa de Dignidade Menstrual de Manaus',
     'Institui o Programa de Dignidade Menstrual no âmbito do Município de Manaus, garantindo acesso a produtos de higiene para mulheres em vulnerabilidade',
     'LEI_SANCIONADA', 'Sancionada', '2023-03-08', causa_mulher,
     'Atendimento de necessidades básicas de mulheres em vulnerabilidade social', 30000, 23),

    ('Lei Mun. 2023/002', 2023,
     'Lei de Inclusão Digital para Pessoas com Deficiência',
     'Garante acesso gratuito a cursos de capacitação digital e tecnologia assistiva para pessoas com deficiência nos centros públicos municipais',
     'LEI_SANCIONADA', 'Sancionada', '2023-06-20', causa_pcd,
     'Inclusão digital e empregabilidade de pessoas com deficiência em Manaus', 15000, 24),

    ('Lei Mun. 2024/001', 2024,
     'Lei de Proteção a Idosas em Situação de Violência',
     'Cria programa de atendimento especializado a mulheres idosas vítimas de violência doméstica e familiar no Município de Manaus',
     'LEI_SANCIONADA', 'Sancionada', '2024-03-08', causa_mulher,
     'Proteção integrada de mulheres idosas em situação de risco no município', 20000, 25),

    -- Projetos de Lei em tramitação
    ('PL 2024/045', 2024,
     'Projeto de Lei de Combate ao Feminicídio em Manaus',
     'Institui medidas preventivas e de responsabilização para redução dos índices de feminicídio, criando rede integrada de proteção no município',
     'PROJETO_LEI', 'Em Discussão', '2024-03-08', causa_mulher,
     'Proteção da vida das mulheres manauaras e redução da violência de gênero extrema', 120000, NULL),

    ('PL 2024/089', 2024,
     'Centros de Referência para Famílias com Autismo',
     'Cria centros de referência especializados no atendimento a pessoas com TEA e seus familiares no município de Manaus',
     'PROJETO_LEI', 'Em Discussão', '2024-04-02', causa_tea,
     'Expansão da rede de apoio para famílias que convivem com o autismo em Manaus', 20000, NULL),

    ('PL 2024/120', 2024,
     'Acesso Gratuito a Próteses e Órteses pelo Município',
     'Garante acesso gratuito a próteses, órteses e dispositivos de tecnologia assistiva para pessoas com deficiência cadastradas nos serviços municipais',
     'PROJETO_LEI', 'Apresentada', '2024-06-15', causa_pcd,
     'Dignidade e autonomia para pessoas com deficiência física em Manaus', 12000, NULL),

    ('PL 2025/012', 2025,
     'Programa Municipal de Combate à Violência Obstétrica',
     'Institui o Programa de Prevenção e Combate à Violência Obstétrica nas unidades de saúde do Município de Manaus',
     'PROJETO_LEI', 'Apresentada', '2025-02-15', causa_mulher,
     'Proteção da saúde e dignidade das mulheres durante a gestação e parto', 40000, NULL),

    -- Requerimentos
    ('REQ 2024/001', 2024,
     'Fiscalização da Águas de Manaus — Cobranças Indevidas',
     'Requer informações detalhadas sobre irregularidades nas cobranças e na prestação dos serviços de abastecimento de água pela concessionária Águas de Manaus',
     'REQUERIMENTO', 'Aprovada', '2024-02-01', causa_san,
     'Transparência e accountability da concessionária de saneamento', 300000, NULL),

    ('REQ 2024/015', 2024,
     'Dados sobre Atendimento a Mulheres em Situação de Violência',
     'Requer da Secretaria Municipal de Saúde os dados de atendimento a mulheres vítimas de violência doméstica nas UPAs e hospitais municipais',
     'REQUERIMENTO', 'Aprovada', '2024-03-10', causa_mulher,
     'Mapeamento da demanda para planejamento de políticas públicas de proteção', 80000, NULL),

    ('REQ 2024/089', 2024,
     'Diagnóstico de Acessibilidade em Ônibus de Manaus',
     'Requer da SMTU relatório completo sobre condições de acessibilidade nos ônibus municipais de Manaus para pessoas com deficiência',
     'REQUERIMENTO', 'Apresentada', '2024-05-20', causa_pcd,
     'Base de dados para exigir cumprimento das leis de acessibilidade no transporte público', 80000, NULL),

    -- Indicações
    ('IND 2024/001', 2024,
     'Criação de Delegacia da Mulher na Zona Norte',
     'Indica ao Executivo Municipal a criação de uma Delegacia Especializada no Atendimento à Mulher na Zona Norte de Manaus',
     'INDICACAO', 'Apresentada', '2024-01-15', causa_mulher,
     'Melhoria do atendimento especializado às mulheres vítimas de violência na Zona Norte', 80000, NULL),

    ('IND 2024/022', 2024,
     'Centro de Diagnóstico de Autismo na Zona Leste',
     'Indica a criação de um centro especializado em diagnóstico precoce de TEA na Zona Leste de Manaus, atendendo demanda reprimida da região',
     'INDICACAO', 'Apresentada', '2024-04-05', causa_tea,
     'Ampliação do acesso ao diagnóstico de autismo na maior zona populacional de Manaus', 15000, NULL),

    -- Emendas
    ('EME 2024/001', 2024,
     'Emenda Orçamentária para Inclusão Social e Acessibilidade',
     'Emenda ao orçamento municipal destinando R$ 2 milhões para programas de inclusão de pessoas com deficiência e autismo no município',
     'EMENDA', 'Aprovada', '2024-11-01', causa_pcd,
     'Garantia de recursos para programas de inclusão social no exercício 2025', 50000, NULL),

    ('EME 2024/002', 2024,
     'Emenda Orçamentária para Casa Abrigo da Mulher',
     'Emenda ao orçamento municipal destinando recursos para ampliação e reforma da Casa Abrigo de Manaus para mulheres em situação de violência',
     'EMENDA', 'Aprovada', '2024-11-01', causa_mulher,
     'Ampliação da capacidade de acolhimento de mulheres em situação de risco em Manaus', 5000, NULL)
  ON CONFLICT DO NOTHING;
END $$;

-- ── 11. Seed: CPI das Águas de Manaus ────────────────────────
INSERT INTO cpis_fiscalizacao (
  nome_cpi, data_instauracao, alvo_investigacao, tipo_irregularidade,
  status_investigacao, autores, recomendacoes, impacto_esperado, coluna_kanban
) VALUES (
  'CPI das Águas de Manaus',
  '2022-05-10',
  'Águas de Manaus — Concessionária de Saneamento Básico',
  ARRAY[
    'Cobrança indevida em contas de consumidores',
    'Falta de abastecimento em bairros periféricos',
    'Reajuste abusivo de tarifas sem justificativa técnica',
    'Descumprimento de metas contratuais de universalização',
    'Negligência em obras de saneamento nas zonas periféricas',
    'Atendimento precário a reclamações de consumidores'
  ],
  'Em Andamento',
  ARRAY['Vereadora Thaysa Lippi', 'Vereador Roberto Sabino', 'Vereadora Therezinha Ruiz', 'Vereador Dr. Sheykhudo'],
  'Revisão do contrato de concessão com a concessionária; Criação de ouvidoria independente para reclamações; Instauração de processo administrativo por descumprimento contratual; Aplicação de multas proporcionais aos prejuízos causados à população; Realização de auditorias técnicas periódicas nos serviços prestados',
  'Garantia do direito à água e saneamento para mais de 300 mil famílias de Manaus; Redução de cobranças abusivas; Melhoria do atendimento nas regiões periféricas',
  'Investigando'
) ON CONFLICT DO NOTHING;
