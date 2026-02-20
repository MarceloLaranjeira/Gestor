import type { SecaoTarefas } from "@/components/TaskBoard";

export interface Coordenacao {
  id: string;
  nome: string;
  descricao: string;
  secoes: SecaoTarefas[];
}

export const coordenacoesIniciais: Coordenacao[] = [
  {
    id: "eclesiastica",
    nome: "Coordenação Eclesiástica",
    descricao: "Gestão de contatos com pastores e lideranças eclesiásticas",
    secoes: [
      {
        titulo: "CONTATO COM PASTORES",
        tarefas: [
          { id: 1, titulo: "Realizar Contato com pastores", motivo: "Divulgar Mandato", responsavel: "", canal: "Telefone", dataInicio: "2026-02-18", dataFim: "2026-02-28", status: false },
        ],
      },
      {
        titulo: "CONTATO DA 21ª CAFÉ",
        tarefas: [
          { id: 1, titulo: "Realizar contato com Pastores sobre voluntários", motivo: "Garantir Voluntários para 21ª CAFÉ", responsavel: "", canal: "Telefone", dataInicio: "2026-02-17", dataFim: "2026-02-18", status: true },
          { id: 2, titulo: "Realizar contato com Pastores sobre Reunião com Voluntários", motivo: "Confirmar presença de voluntários", responsavel: "", canal: "Telefone", dataInicio: "2026-02-17", dataFim: "2026-02-18", status: true },
          { id: 3, titulo: "Produção de Placas das ações para Reunião", motivo: "Organização da Café", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-18", status: true },
        ],
      },
      {
        titulo: "SESSÃO ESPECIAL 25/02/26",
        tarefas: [
          { id: 1, titulo: "Relação dos Pastores Homenageados", motivo: "Participar do evento", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 2, titulo: "Contato com Liderança IEADAM", motivo: "Enviar lista de Homenageados", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 3, titulo: "Contato com Direção da Faculdade Boas Novas", motivo: "Enviar lista de Homenageados", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 4, titulo: "Contato com Direção da Rede Boas Novas", motivo: "Enviar lista de Homenageados", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: true },
          { id: 5, titulo: "Contato com Direção CEADAM", motivo: "Enviar lista de Homenageados", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 6, titulo: "Contato com Direção IBADAM", motivo: "Enviar lista de Homenageados", responsavel: "", canal: "Telefone / Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
        ],
      },
    ],
  },
  {
    id: "comunicacao",
    nome: "Comunicação & Marketing",
    descricao: "Estratégias de comunicação e marketing digital",
    secoes: [
      {
        titulo: "ESTRATÉGIA DO DIA",
        tarefas: [
          { id: 6, titulo: "Caminhada Matinal - Aniv. IPIXUNA, 70 ANOS / Dia TEA", motivo: "Conscientização", responsavel: "Stéfany", canal: "Pessoal", dataInicio: "2026-02-18", dataFim: "2026-02-18", status: false },
          { id: 7, titulo: "POST DIGITAL: Fé, Família - Formato: Carrossel", motivo: "Engajamento", responsavel: "Stéfany", canal: "Whatsapp", dataInicio: "", dataFim: "", status: false },
          { id: 8, titulo: "Transmissão Peq/Gr Exp ALEAM - SEGURANÇA / IGREJA / PESCA", motivo: "Cobertura", responsavel: "Renan", canal: "Pessoal", dataInicio: "", dataFim: "", status: false },
          { id: 9, titulo: "Matéria Jornalística", motivo: "Divulgação", responsavel: "Orlando", canal: "Pessoal", dataInicio: "", dataFim: "", status: false },
          { id: 10, titulo: "Corte do pronunciamento ALEAM", motivo: "Conteúdo digital", responsavel: "Stéfany/Renan", canal: "Pessoal", dataInicio: "", dataFim: "", status: false },
          { id: 11, titulo: "Corte do pronunciamento ALEAM (2)", motivo: "Conteúdo digital", responsavel: "Stéfany", canal: "Pessoal", dataInicio: "", dataFim: "", status: false },
          { id: 12, titulo: "Criação do grupo geral de Whatsapp de Comunicação", motivo: "Organização interna", responsavel: "Renê", canal: "Whatsapp", dataInicio: "", dataFim: "", status: false },
          { id: 13, titulo: "Soluções Mulher", motivo: "Conteúdo", responsavel: "Renan", canal: "Pessoal", dataInicio: "", dataFim: "", status: false },
        ],
      },
    ],
  },
  {
    id: "inteligencia",
    nome: "Força Tarefa Inteligência de Dados",
    descricao: "Estratégia de campanha e análise de dados",
    secoes: [
      {
        titulo: "ESTRATÉGIA DE CAMPANHA",
        tarefas: [
          { id: 1, titulo: "Produção de CheckList dos municípios", motivo: "Estratégia de Campanha", responsavel: "Luciana, Marcia, Amanda", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
          { id: 2, titulo: "Levantamento dos votos por região", motivo: "Estratégia de Campanha", responsavel: "Luciana, Marcia, Amanda", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
          { id: 3, titulo: "Levantamento dos votos por MUNICÍPIO", motivo: "Estratégia de Campanha", responsavel: "Luciana, Marcia, Amanda", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
          { id: 4, titulo: "Customização Sistema App Cmt Dan", motivo: "Estratégia de Campanha", responsavel: "Cel Oliveira, Pr Darlisson", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
          { id: 5, titulo: "Reunião para estratégia de utilização Sistema App Cmt Dan", motivo: "Estratégia de Campanha", responsavel: "Cel Oliveira, Pr Darlisson", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 6, titulo: "Realizar reunião Estratégica com base em pesquisa realizada", motivo: "Propor definição", responsavel: "Eliel, Luciana, Alex", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 7, titulo: "Atualização do Site Cmt Dan (Site já operante e atualizado)", motivo: "Otimização", responsavel: "Darlisson", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
        ],
      },
    ],
  },
  {
    id: "cspjd",
    nome: "CSPJD",
    descricao: "Comissão de Segurança Pública, Justiça e Direitos",
    secoes: [
      {
        titulo: "AUDIÊNCIA PÚBLICA",
        tarefas: [
          { id: 1, titulo: "Atualização dos dados dos municípios", motivo: "", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-18", status: false },
          { id: 2, titulo: "Atualização do calendário de Audiências", motivo: "", responsavel: "", canal: "Pessoal", dataInicio: "", dataFim: "", status: false },
        ],
      },
      {
        titulo: "REUNIÃO ORDINÁRIA",
        tarefas: [
          { id: 1, titulo: "Preparar Pauta da Reunião", motivo: "Organização da Reunião", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
          { id: 2, titulo: "Tramitar documentação para os membros da Comissão", motivo: "Organização da Reunião", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
          { id: 3, titulo: "Produzir Ata da Reunião ordinária", motivo: "Organização da Reunião", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-28", status: false },
        ],
      },
      {
        titulo: "EVENTOS",
        tarefas: [
          { id: 1, titulo: "Realizar contato com órgãos de Segurança - PMAM", motivo: "Garantir segurança da 21ª Café", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-21", status: false },
          { id: 2, titulo: "Realizar contato com órgãos de Segurança - CBMAM", motivo: "Garantir segurança da 21ª Café", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-21", status: false },
          { id: 3, titulo: "Realizar contato com órgãos de Segurança - IMMU", motivo: "Garantir segurança da 21ª Café", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-21", status: false },
          { id: 4, titulo: "Realizar contato com órgãos de Segurança - GP SUÇUARANA", motivo: "Garantir segurança da 21ª Café", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-21", status: false },
        ],
      },
      {
        titulo: "OBSERVATÓRIO",
        tarefas: [],
      },
    ],
  },
  {
    id: "gabinete",
    nome: "Gabinete",
    descricao: "Atividades diárias e operacionais do gabinete",
    secoes: [
      {
        titulo: "RITMO DIÁRIO MODO CAMPANHA",
        tarefas: [
          { id: 1, titulo: "Convocar Coordenadores TVF para reunião no dia 19/02/26, 9h", motivo: "Reunião Estratégica", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-18", dataFim: "2026-02-19", status: true },
          { id: 2, titulo: "Providenciar logística de Reunião (água e Café)", motivo: "Organização da Reunião", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: false },
          { id: 3, titulo: "Providenciar pauta da Reunião", motivo: "Organização da Reunião", responsavel: "", canal: "Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
          { id: 4, titulo: "Providenciar Registro de Reunião, Notebook, caixa de som", motivo: "Organização da Reunião", responsavel: "", canal: "Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
          { id: 5, titulo: "Realizar reunião Estratégica com base em pesquisa realizada", motivo: "Definição Estratégica", responsavel: "", canal: "Whatsapp", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
        ],
      },
      {
        titulo: "21ª CAFÉ",
        tarefas: [
          { id: 1, titulo: "Providenciar 1000 Boletins Informativos", motivo: "Divulgar Mandato", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-18", dataFim: "2026-02-18", status: true },
          { id: 2, titulo: "Contato com Pastores para indicação de Líderes de cada ação", motivo: "Organização Café", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
          { id: 3, titulo: "Providenciar Programação da Reunião", motivo: "Participação do Dep Cmt Dan", responsavel: "", canal: "Whatsapp", dataInicio: "2026-02-18", dataFim: "2026-02-18", status: true },
          { id: 4, titulo: "Realizar visita técnica na escola CBMAM", motivo: "Visita técnica", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
          { id: 5, titulo: "Realizar contato com SEDUC para homologar autorização Escola", motivo: "Visita técnica", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
          { id: 6, titulo: "Tramitar documentação referente à segurança das ações (PM, CBMAM, IMMU)", motivo: "Organização da Café", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-19", status: true },
        ],
      },
      {
        titulo: "SESSÃO ESPECIAL 25/02/26",
        tarefas: [
          { id: 1, titulo: "Tramitar documentação referente ao evento", motivo: "Organização", responsavel: "", canal: "SAPL", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 2, titulo: "Tramitar documentação solicitando 6 placas", motivo: "Organização", responsavel: "", canal: "SAPL", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 3, titulo: "Tramitar documentação referente aos homenageados", motivo: "Organização", responsavel: "", canal: "SAPL", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 4, titulo: "Reunir com Cerimonial sobre o evento", motivo: "Organização", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
          { id: 5, titulo: "Reunir com DG sobre situação de Coquetel", motivo: "Organização", responsavel: "", canal: "Pessoal", dataInicio: "2026-02-17", dataFim: "2026-02-23", status: false },
        ],
      },
    ],
  },
  {
    id: "equipe",
    nome: "Equipe CMT Dan",
    descricao: "Escalados do dia e coordenação da equipe",
    secoes: [
      {
        titulo: "ESCALADOS DO DIA - 19/02/26",
        tarefas: [
          { id: 1, titulo: "Renê - Comunicação", motivo: "Escalação diária", responsavel: "Renê", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 2, titulo: "Thiago - Apoio/Segurança", motivo: "Escalação diária", responsavel: "Thiago", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 3, titulo: "Gerson - Eclesiástica Ação", motivo: "Escalação diária", responsavel: "Gerson", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 4, titulo: "Djalma - Com / Foto", motivo: "Escalação diária", responsavel: "Djalma", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 5, titulo: "Henrique - Gabinete Apoio", motivo: "Escalação diária", responsavel: "Henrique", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 6, titulo: "Neder - Com Eclesia", motivo: "Escalação diária", responsavel: "Neder", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
          { id: 7, titulo: "Samuel - Coord. Eclesiástica", motivo: "Escalação diária", responsavel: "Samuel", canal: "Pessoal", dataInicio: "2026-02-19", dataFim: "2026-02-19", status: false },
        ],
      },
    ],
  },
  {
    id: "plenaria",
    nome: "Coordenação de Plenária",
    descricao: "Assessoria no acompanhamento da tramitação de proposituras, elaboração de projetos de lei, requerimentos, ofícios e documentos legislativos",
    secoes: [
      {
        titulo: "APROVAÇÃO DE PROJETOS DE LEI",
        tarefas: [
          { id: 1, titulo: "Aprovação de PLs/PRLs em Ordem do Dia — Meta Fev/26", motivo: "Meta mensal: 2 aprovações", responsavel: "Coord. Plenária", canal: "SAPL", dataInicio: "2026-02-01", dataFim: "2026-02-28", status: false },
        ],
      },
      {
        titulo: "REQUERIMENTOS LEGISLATIVOS",
        tarefas: [
          { id: 1, titulo: "Produção de Requerimentos — Meta Fev/26 (16 reservas SE)", motivo: "SE, ExpSC, MA, MP, MR, CT, AP", responsavel: "Coord. Plenária", canal: "SAPL", dataInicio: "2026-02-01", dataFim: "2026-02-28", status: false },
        ],
      },
      {
        titulo: "PAUTAS DE SESSÕES ORDINÁRIAS",
        tarefas: [
          { id: 1, titulo: "Elaboração de Pautas Sugestivas Pequeno/Grande Expediente — Fev/26", motivo: "Conforme calendário plenário ALEAM", responsavel: "Coord. Plenária", canal: "SAPL", dataInicio: "2026-02-01", dataFim: "2026-02-28", status: false },
        ],
      },
      {
        titulo: "LEIS PUBLICADAS EM DIÁRIO OFICIAL",
        tarefas: [
          { id: 1, titulo: "Lei 8.020 — Sanções violação liberdade religiosa", motivo: "Alteração Lei 6.820/2024", responsavel: "Coord. Plenária", canal: "SAPL", dataInicio: "2026-01-05", dataFim: "2026-01-05", status: true },
          { id: 2, titulo: "Lei 8.051 — Combate roubo/furto cabos e fios metálicos", motivo: "Alteração Lei 6.653/2023", responsavel: "Coord. Plenária", canal: "SAPL", dataInicio: "2026-01-06", dataFim: "2026-01-06", status: true },
          { id: 3, titulo: "Lei 8.078 — Legislação TEA consolidada", motivo: "Alteração Lei 6.458/2023", responsavel: "Coord. Plenária", canal: "SAPL", dataInicio: "2026-01-07", dataFim: "2026-01-07", status: true },
        ],
      },
    ],
  },
];
