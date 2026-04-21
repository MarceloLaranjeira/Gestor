-- ============================================================
-- Migration: WebChat tables + coordenações demo data
-- Created: 2026-03-11
-- ============================================================

-- ── 1. Chat rooms ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_salas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text DEFAULT '',
  tipo text DEFAULT 'geral' CHECK (tipo IN ('geral', 'coordenacao', 'privado')),
  icone text DEFAULT 'MessageSquare',
  cor text DEFAULT 'bg-primary/10 text-primary',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── 2. Chat messages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_mensagens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sala_id uuid NOT NULL REFERENCES chat_salas(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  conteudo text NOT NULL,
  tipo text DEFAULT 'texto' CHECK (tipo IN ('texto', 'sistema')),
  created_at timestamptz DEFAULT now()
);

-- ── 3. Enable RLS ────────────────────────────────────────────
ALTER TABLE chat_salas ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens ENABLE ROW LEVEL SECURITY;

-- ── 4. RLS Policies ─────────────────────────────────────────
CREATE POLICY "auth_read_salas" ON chat_salas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_salas" ON chat_salas FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "auth_read_mensagens" ON chat_mensagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert_mensagens" ON chat_mensagens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "auth_delete_mensagens" ON chat_mensagens FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── 5. Enable Realtime ───────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE chat_mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_salas;

-- ── 6. Seed demo chat rooms ──────────────────────────────────
INSERT INTO chat_salas (nome, descricao, tipo, icone, cor, created_by) VALUES
('Geral', 'Canal principal do gabinete — todos participam', 'geral', 'MessageSquare', 'bg-primary/10 text-primary', '690a34bd-cfe5-429c-81ee-35f4aa2fceed'),
('Equipe Assessores', 'Comunicação interna da equipe de assessores', 'geral', 'Users', 'bg-blue-500/10 text-blue-500', '690a34bd-cfe5-429c-81ee-35f4aa2fceed'),
('Campanha 2026', 'Estratégia e articulação da campanha', 'geral', 'Flag', 'bg-rose-500/10 text-rose-500', '690a34bd-cfe5-429c-81ee-35f4aa2fceed'),
('Demandas Urgentes', 'Canal para demandas críticas e urgentes', 'geral', 'AlertTriangle', 'bg-orange-500/10 text-orange-500', '690a34bd-cfe5-429c-81ee-35f4aa2fceed'),
('Financeiro', 'Discussões sobre orçamento e financeiro', 'geral', 'Wallet', 'bg-green-500/10 text-green-500', '690a34bd-cfe5-429c-81ee-35f4aa2fceed')
ON CONFLICT DO NOTHING;

-- ── 7. Seed demo messages for "Geral" room ───────────────────
DO $$
DECLARE
  sala_id uuid;
  uid uuid := '690a34bd-cfe5-429c-81ee-35f4aa2fceed';
BEGIN
  SELECT id INTO sala_id FROM chat_salas WHERE nome = 'Geral' AND created_by = uid LIMIT 1;
  IF sala_id IS NOT NULL THEN
    INSERT INTO chat_mensagens (sala_id, user_id, conteudo, tipo, created_at) VALUES
    (sala_id, uid, 'Bom dia a todos! Temos reunião de pauta hoje às 10h na sala de reuniões.', 'texto', now() - interval '2 hours'),
    (sala_id, uid, 'Lembrem que temos o prazo para entrega das emendas parlamentares esta semana. Quem ainda não enviou a documentação, favor urgência!', 'texto', now() - interval '1 hour 45 minutes'),
    (sala_id, uid, 'Pessoal, o gabinete recebeu convite para o evento da Câmara Municipal na sexta-feira. Alguém da equipe pode representar o deputado?', 'texto', now() - interval '1 hour 30 minutes'),
    (sala_id, uid, 'Confirmo presença no evento da Câmara. Podemos usar isso para fortalecer parcerias municipais.', 'texto', now() - interval '1 hour 15 minutes'),
    (sala_id, uid, 'Acabei de atualizar o sistema com as demandas da semana. Já estão categorizadas por área temática. Verifiquem por favor.', 'texto', now() - interval '1 hour'),
    (sala_id, uid, 'A visita ao município de Itacoatiara foi confirmada para o próximo sábado. Quem vai na comitiva?', 'texto', now() - interval '45 minutes'),
    (sala_id, uid, 'Eu e a Dra. Fernanda confirmamos. Vamos precisar de transporte para 6 pessoas.', 'texto', now() - interval '30 minutes'),
    (sala_id, uid, 'Providenciarei o veículo. Saída às 6h da manhã do gabinete central.', 'texto', now() - interval '20 minutes'),
    (sala_id, uid, 'Ótimo! Vou preparar a pauta de reuniões com as lideranças locais de Itacoatiara. Algum tema prioritário para incluir?', 'texto', now() - interval '10 minutes'),
    (sala_id, uid, 'Infraestrutura e saneamento são prioridade. Tem uma demanda antiga do bairro Colônia Antônio Aleixo que precisa de atenção.', 'texto', now() - interval '5 minutes');
  END IF;
END $$;

-- ── 8. Webchat permissions ───────────────────────────────────
INSERT INTO role_permissions (role, module, enabled) VALUES
('gestor', 'webchat', true),
('assessor', 'webchat', true),
('coordenador', 'webchat', true)
ON CONFLICT (role, module) DO UPDATE SET enabled = EXCLUDED.enabled;

-- ── 9. Coordenações demo data ────────────────────────────────
-- coordenacoes table: id, slug, nome, descricao, created_at, updated_at
INSERT INTO coordenacoes (nome, slug, descricao)
VALUES
  ('Coordenação Eclesiástica', 'eclesiastica', 'Articulação com lideranças religiosas e comunidades de fé do estado'),
  ('Comunicação Digital', 'comunicacao', 'Gestão da comunicação digital, redes sociais e presença online do gabinete'),
  ('Inteligência e Dados', 'inteligencia', 'Análise de dados, pesquisas e inteligência política para tomada de decisão'),
  ('Segurança e Justiça', 'cspjd', 'Coordenação de demandas na área de segurança pública e justiça')
ON CONFLICT (slug) DO NOTHING;

-- Link coordenações to user via user_coordenacoes
INSERT INTO user_coordenacoes (user_id, coordenacao_id)
SELECT '690a34bd-cfe5-429c-81ee-35f4aa2fceed', id
FROM coordenacoes
WHERE slug IN ('eclesiastica', 'comunicacao', 'inteligencia', 'cspjd')
ON CONFLICT (user_id, coordenacao_id) DO NOTHING;

-- ── 10. Sections and tasks for Coordenação Eclesiástica ──────
DO $$
DECLARE
  coord_id uuid;
  sec1 uuid; sec2 uuid; sec3 uuid;
BEGIN
  SELECT id INTO coord_id FROM coordenacoes WHERE slug = 'eclesiastica' LIMIT 1;
  IF coord_id IS NOT NULL THEN
    -- Insert sections
    INSERT INTO secoes (coordenacao_id, titulo, ordem)
    VALUES
      (coord_id, 'Lideranças Evangélicas', 1),
      (coord_id, 'Lideranças Católicas', 2),
      (coord_id, 'Eventos e Cultos', 3)
    ON CONFLICT DO NOTHING;

    SELECT id INTO sec1 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Lideranças Evangélicas' LIMIT 1;
    SELECT id INTO sec2 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Lideranças Católicas' LIMIT 1;
    SELECT id INTO sec3 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Eventos e Cultos' LIMIT 1;

    IF sec1 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec1, 'Mapear igrejas evangélicas por município', 'Levantar lista de igrejas e pastores referência em cada município do estado', 'Coordenador Eclesiástico', 'Reunião', false),
        (sec1, 'Reunião com pastores da Grande Manaus', 'Organizar encontro com representantes das principais denominações', 'Assessor Legislativo', 'Presencial', false),
        (sec1, 'Agenda de visitas às igrejas parceiras', 'Programar visitas mensais do deputado às igrejas apoiadoras', 'Secretário', 'Telefone', false),
        (sec1, 'Carta de apoio aos projetos legislativos', 'Solicitar cartas de apoio de lideranças para projetos da bancada evangélica', 'Assessor Jurídico', 'Email', false),
        (sec1, 'Banco de dados de lideranças religiosas', 'Criar e manter atualizado banco de dados com contatos de pastores e bispos', 'Assessor de TI', 'Sistema', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec2 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec2, 'Contato com dioceses do Amazonas', 'Estabelecer canal de comunicação com as dioceses do estado', 'Coordenador Eclesiástico', 'Email', false),
        (sec2, 'Participação na Campanha da Fraternidade', 'Apoio institucional à campanha anual da CNBB', 'Assessor de Comunicação', 'Pessoal', false),
        (sec2, 'Reunião com Cáritas Regional', 'Parceria para projetos sociais em comunidades carentes', 'Assessor Social', 'Presencial', false),
        (sec2, 'Visita ao Seminário Maior de Manaus', 'Fortalecimento da relação institucional com a Igreja Católica', 'Deputado', 'Presencial', false),
        (sec2, 'Apoio a projetos pastorais nas periferias', 'Identificar e apoiar projetos comunitários das paróquias', 'Assessor Social', 'Reunião', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec3 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec3, 'Calendário de eventos religiosos 2026', 'Mapear grandes eventos religiosos para participação do deputado', 'Secretário', 'Sistema', true),
        (sec3, 'Culto ecumênico pelo aniversário de Manaus', 'Organizar culto interdenominacional no aniversário da cidade', 'Coordenador Eclesiástico', 'Presencial', false),
        (sec3, 'Participação no Encontro de Jovens', 'Representar o gabinete no encontro estadual de jovens cristãos', 'Assessor Legislativo', 'Presencial', false),
        (sec3, 'Transmissão ao vivo de cultos parceiros', 'Apoio técnico para transmissão online de cultos de igrejas parceiras', 'Assessor de TI', 'Sistema', false),
        (sec3, 'Relatório de participação em eventos religiosos', 'Consolidar relatório mensal de eventos e impacto político-religioso', 'Assessor Legislativo', 'Sistema', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ── 11. Sections and tasks for Comunicação Digital ───────────
DO $$
DECLARE
  coord_id uuid;
  sec1 uuid; sec2 uuid; sec3 uuid;
BEGIN
  SELECT id INTO coord_id FROM coordenacoes WHERE slug = 'comunicacao' LIMIT 1;
  IF coord_id IS NOT NULL THEN
    INSERT INTO secoes (coordenacao_id, titulo, ordem)
    VALUES
      (coord_id, 'Redes Sociais', 1),
      (coord_id, 'Conteúdo e Mídia', 2),
      (coord_id, 'Imprensa e Assessoria', 3)
    ON CONFLICT DO NOTHING;

    SELECT id INTO sec1 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Redes Sociais' LIMIT 1;
    SELECT id INTO sec2 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Conteúdo e Mídia' LIMIT 1;
    SELECT id INTO sec3 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Imprensa e Assessoria' LIMIT 1;

    IF sec1 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec1, 'Calendário editorial março 2026', 'Planejar publicações das redes sociais para o mês de março', 'Gestor de Redes', 'Sistema', true),
        (sec1, 'Aumentar engajamento no Instagram', 'Meta: 15% de aumento no engajamento orgânico no trimestre', 'Social Media', 'Sistema', false),
        (sec1, 'Criação de perfil no TikTok', 'Lançar canal oficial no TikTok com conteúdo legislativo', 'Social Media', 'Sistema', false),
        (sec1, 'Monitoramento de menções online', 'Configurar ferramentas de monitoramento de menções ao deputado', 'Assessor de TI', 'Sistema', false),
        (sec1, 'Protocolo de resposta a comentários', 'Definir protocolo de resposta a comentários e DMs nas redes', 'Gestor de Redes', 'Reunião', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec2 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec2, 'Vídeo sobre emendas parlamentares', 'Vídeo explicativo sobre o trabalho de emendas do deputado', 'Produtor de Conteúdo', 'Pessoal', false),
        (sec2, 'Cobertura fotográfica de eventos', 'Contratar fotógrafo para eventos parlamentares e inaugurações', 'Secretário', 'Telefone', false),
        (sec2, 'Newsletter mensal do gabinete', 'Criar e disparar newsletter com atividades e conquistas do mês', 'Redator', 'Email', false),
        (sec2, 'Podcast Voz do Legislativo', 'Lançar podcast com entrevistas e debates sobre políticas públicas', 'Produtor de Conteúdo', 'Pessoal', false),
        (sec2, 'Identidade visual da campanha 2026', 'Desenvolver manual de identidade visual para a campanha', 'Designer', 'Sistema', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec3 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec3, 'Lista de contatos da imprensa do AM', 'Atualizar banco de dados de jornalistas e veículos do Amazonas', 'Assessor de Imprensa', 'Sistema', true),
        (sec3, 'Press release das emendas aprovadas', 'Redigir e distribuir release sobre emendas aprovadas na sessão', 'Assessor de Imprensa', 'Email', false),
        (sec3, 'Entrevista no programa matinal da TV', 'Agendar entrevista do deputado em programa de TV local', 'Secretário', 'Telefone', false),
        (sec3, 'Protocolo de resposta à imprensa', 'Definir protocolo para resposta rápida a jornalistas em 24h', 'Assessor de Imprensa', 'Reunião', false),
        (sec3, 'Clipping de notícias semanal', 'Compilar e distribuir clipping de notícias relevantes toda segunda-feira', 'Assessor de Imprensa', 'Email', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ── 12. Sections and tasks for Inteligência e Dados ──────────
DO $$
DECLARE
  coord_id uuid;
  sec1 uuid; sec2 uuid; sec3 uuid;
BEGIN
  SELECT id INTO coord_id FROM coordenacoes WHERE slug = 'inteligencia' LIMIT 1;
  IF coord_id IS NOT NULL THEN
    INSERT INTO secoes (coordenacao_id, titulo, ordem)
    VALUES
      (coord_id, 'Pesquisas e Surveys', 1),
      (coord_id, 'Análise de Dados Eleitorais', 2),
      (coord_id, 'Monitoramento Político', 3)
    ON CONFLICT DO NOTHING;

    SELECT id INTO sec1 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Pesquisas e Surveys' LIMIT 1;
    SELECT id INTO sec2 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Análise de Dados Eleitorais' LIMIT 1;
    SELECT id INTO sec3 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Monitoramento Político' LIMIT 1;

    IF sec1 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec1, 'Pesquisa de aprovação — Q1 2026', 'Contratar instituto para pesquisa de aprovação do mandato', 'Coordenador de Dados', 'Reunião', false),
        (sec1, 'Survey sobre prioridades dos eleitores', 'Questionário online sobre temas prioritários para eleitores', 'Analista de Dados', 'Sistema', false),
        (sec1, 'Pesquisa qualitativa nos municípios', 'Grupos focais em 5 municípios do interior do estado', 'Pesquisador', 'Presencial', false),
        (sec1, 'Análise de resultados da pesquisa anterior', 'Relatório de insights da pesquisa realizada em janeiro', 'Analista de Dados', 'Sistema', true),
        (sec1, 'Dashboard de acompanhamento de surveys', 'Criar painel de visualização de resultados de pesquisas', 'Assessor de TI', 'Sistema', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec2 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec2, 'Mapeamento de votos por seção eleitoral 2022', 'Análise granular dos votos por seção nos municípios do estado', 'Analista de Dados', 'Sistema', true),
        (sec2, 'Identificação de redutos de votação', 'Mapear municípios e bairros com maior concentração de votos', 'Analista de Dados', 'Sistema', true),
        (sec2, 'Análise de transferência de votos', 'Estudar padrões de transferência de votos de aliados', 'Analista de Dados', 'Sistema', false),
        (sec2, 'Projeção eleitoral 2026', 'Modelo de projeção de votos baseado em dados históricos', 'Coordenador de Dados', 'Sistema', false),
        (sec2, 'Relatório de concorrentes — análise eleitoral', 'Mapeamento dos perfis eleitorais dos principais concorrentes', 'Analista de Dados', 'Sistema', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec3 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec3, 'Monitoramento de votações na ALEAM', 'Acompanhar e analisar as votações na Assembleia Legislativa', 'Assessor Legislativo', 'Sistema', false),
        (sec3, 'Radar de movimentações políticas', 'Monitorar alianças, rompimentos e movimentações partidárias', 'Coordenador de Dados', 'Sistema', false),
        (sec3, 'Análise de discursos dos concorrentes', 'Monitorar pautas e posicionamentos dos adversários políticos', 'Analista de Dados', 'Sistema', false),
        (sec3, 'Relatório semanal de cenário político', 'Compilar relatório semanal com análise do cenário político estadual', 'Coordenador de Dados', 'Sistema', false),
        (sec3, 'Mapeamento de novas lideranças emergentes', 'Identificar novas lideranças políticas em ascensão no estado', 'Pesquisador', 'Reunião', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ── 13. Sections and tasks for Segurança e Justiça ───────────
DO $$
DECLARE
  coord_id uuid;
  sec1 uuid; sec2 uuid; sec3 uuid;
BEGIN
  SELECT id INTO coord_id FROM coordenacoes WHERE slug = 'cspjd' LIMIT 1;
  IF coord_id IS NOT NULL THEN
    INSERT INTO secoes (coordenacao_id, titulo, ordem)
    VALUES
      (coord_id, 'Segurança Pública', 1),
      (coord_id, 'Sistema Judiciário', 2),
      (coord_id, 'Direitos Humanos', 3)
    ON CONFLICT DO NOTHING;

    SELECT id INTO sec1 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Segurança Pública' LIMIT 1;
    SELECT id INTO sec2 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Sistema Judiciário' LIMIT 1;
    SELECT id INTO sec3 FROM secoes WHERE coordenacao_id = coord_id AND titulo = 'Direitos Humanos' LIMIT 1;

    IF sec1 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec1, 'Reunião com Secretaria de Segurança Pública', 'Agenda com SSP-AM para discutir índices de criminalidade e demandas', 'Assessor Legislativo', 'Presencial', false),
        (sec1, 'Audiência pública sobre violência urbana', 'Organizar audiência pública sobre violência nos bairros de Manaus', 'Assessor Legislativo', 'Presencial', false),
        (sec1, 'Visita às unidades da PM do Amazonas', 'Visitar batalhões e entender necessidades de infraestrutura', 'Deputado', 'Presencial', false),
        (sec1, 'PL de valorização dos policiais militares', 'Acompanhar tramitação de PL de benefícios aos PMs', 'Assessor Jurídico', 'Sistema', false),
        (sec1, 'Relatório de violência por bairro em Manaus', 'Análise dos dados de criminalidade por região da capital', 'Analista de Dados', 'Sistema', true)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec2 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec2, 'Parceria com Defensoria Pública do AM', 'Articular parceria para mutirões de atendimento jurídico', 'Assessor Jurídico', 'Reunião', false),
        (sec2, 'Acompanhamento de demandas judiciais coletivas', 'Monitorar processos judiciais de impacto coletivo no estado', 'Assessor Jurídico', 'Sistema', false),
        (sec2, 'Visita ao Complexo Penitenciário', 'Visita de inspeção às unidades prisionais do Amazonas', 'Deputado', 'Presencial', false),
        (sec2, 'Encontro com magistrados do TJAM', 'Reunião com desembargadores sobre backlog judicial no estado', 'Assessor Jurídico', 'Presencial', false),
        (sec2, 'PL de acesso à justiça para populações ribeirinhas', 'Elaborar projeto de lei de acesso à justiça nas comunidades ribeirinhas', 'Assessor Jurídico', 'Sistema', false)
      ON CONFLICT DO NOTHING;
    END IF;

    IF sec3 IS NOT NULL THEN
      INSERT INTO tarefas (secao_id, titulo, motivo, responsavel, canal, status) VALUES
        (sec3, 'Frente de defesa dos povos indígenas', 'Articular frente parlamentar de proteção aos direitos indígenas', 'Assessor Legislativo', 'Reunião', false),
        (sec3, 'Audiência sobre violência contra a mulher', 'Organizar audiência temática com dados do AM sobre violência doméstica', 'Assessor Social', 'Presencial', false),
        (sec3, 'Parceria com CEJUSC para mediação de conflitos', 'Ampliar centros de mediação de conflitos no interior do estado', 'Assessor Jurídico', 'Reunião', false),
        (sec3, 'Relatório sobre trabalho infantil no Amazonas', 'Levantamento de dados e ações de combate ao trabalho infantil', 'Pesquisador', 'Sistema', true),
        (sec3, 'Campanha de combate ao tráfico de pessoas', 'Articular campanha estadual de conscientização e combate ao tráfico', 'Assessor Social', 'Pessoal', false)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
