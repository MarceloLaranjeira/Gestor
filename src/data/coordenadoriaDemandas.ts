import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Database,
  Gavel,
  GitMerge,
  Heart,
  HardHat,
  Megaphone,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";

export interface CoordenadoriaDemanda {
  slug: string;
  nome: string;
  descricao: string;
  categorias: string[];
  icon: LucideIcon;
  path: string;
  quickColorClass: string;
}

export const COORDENADORIA_DEMANDAS: CoordenadoriaDemanda[] = [
  {
    slug: "comunicacao",
    nome: "Comunicação",
    descricao: "Demandas de mídia, redes, conteúdo e posicionamento institucional.",
    categorias: [
      "Redes sociais",
      "Arte / design",
      "Vídeo / fotografia",
      "Release / imprensa",
      "Cobertura de agenda",
      "Campanha institucional",
      "Crise / resposta pública",
      "Outras demandas de comunicação",
    ],
    icon: Megaphone,
    path: "/coordenacao/comunicacao",
    quickColorClass: "text-sky-500 bg-sky-500/10",
  },
  {
    slug: "inteligencia",
    nome: "Inteligência",
    descricao: "Demandas de dados, leitura estratégica e apoio analítico da operação.",
    categorias: [
      "Relatório analítico",
      "Levantamento de dados",
      "Mapa / georreferenciamento",
      "Pesquisa de demanda",
      "Indicadores / dashboard",
      "Base de dados",
      "Análise territorial",
      "Outras demandas de inteligência",
    ],
    icon: Database,
    path: "/coordenacao/inteligencia",
    quickColorClass: "text-indigo-500 bg-indigo-500/10",
  },
  {
    slug: "gabinete",
    nome: "Gabinete",
    descricao: "Demandas internas de apoio executivo, rotina e acompanhamento político.",
    categorias: [
      "Agenda institucional",
      "Atendimento ao cidadão",
      "Ofício / requerimento",
      "Encaminhamento externo",
      "Acompanhamento de demanda",
      "Rotina administrativa",
      "Documento / protocolo",
      "Outras demandas de gabinete",
    ],
    icon: Building2,
    path: "/coordenacao/gabinete",
    quickColorClass: "text-slate-500 bg-slate-500/10",
  },
  {
    slug: "equipe",
    nome: "Equipe Interna",
    descricao: "Demandas operacionais da equipe, processos internos e apoio administrativo.",
    categorias: [
      "Tarefa operacional",
      "Apoio administrativo",
      "Escala / equipe",
      "Material / logística",
      "Cadastro / atualização",
      "Processo interno",
      "Treinamento",
      "Outras demandas da equipe interna",
    ],
    icon: UsersRound,
    path: "/coordenacao/equipe",
    quickColorClass: "text-emerald-500 bg-emerald-500/10",
  },
  {
    slug: "articulacao",
    nome: "Articulação Política",
    descricao: "Demandas de relacionamento, agendas políticas e articulação institucional.",
    categorias: [
      "Agenda política",
      "Relacionamento institucional",
      "Liderança comunitária",
      "Reunião externa",
      "Parceria",
      "Mobilização territorial",
      "Encaminhamento político",
      "Outras demandas de articulação",
    ],
    icon: GitMerge,
    path: "/coordenacao/articulacao",
    quickColorClass: "text-amber-500 bg-amber-500/10",
  },
  {
    slug: "legislativo",
    nome: "Legislativo",
    descricao: "Demandas legislativas, plenário, proposições e apoio técnico parlamentar.",
    categorias: [
      "Requerimento",
      "Indicação",
      "Projeto de lei",
      "Moção",
      "Fiscalização",
      "Parecer / estudo técnico",
      "Plenário / sessão",
      "Outras demandas legislativas",
    ],
    icon: Gavel,
    path: "/coordenacao/legislativo",
    quickColorClass: "text-rose-500 bg-rose-500/10",
  },
  {
    slug: "assistencia-social",
    nome: "Assistência Social",
    descricao: "Demandas de assistência social, habitação, equipamentos e apoio à população vulnerável.",
    categorias: [
      "Cadeira de rodas / equipamento",
      "Moradia / habitação",
      "Área de risco",
      "Benefício social",
      "Encaminhamento CRAS / CREAS",
      "Documentação / regularização",
      "Apoio a família",
      "Outras demandas de assistência social",
    ],
    icon: Heart,
    path: "/coordenacao/assistencia-social",
    quickColorClass: "text-emerald-500 bg-emerald-500/10",
  },
  {
    slug: "infraestrutura",
    nome: "Infraestrutura",
    descricao: "Demandas de obras, pavimentação, drenagem, iluminação e infraestrutura urbana.",
    categorias: [
      "Recapeamento asfáltico",
      "Drenagem / bueiros / igarapés",
      "Meio-fio",
      "Limpeza pública",
      "Iluminação pública",
      "Abastecimento de água / esgoto",
      "Pontes / passarelas",
      "Outras demandas de infraestrutura",
    ],
    icon: HardHat,
    path: "/coordenacao/infraestrutura",
    quickColorClass: "text-amber-500 bg-amber-500/10",
  },
  {
    slug: "saude",
    nome: "Saúde",
    descricao: "Demandas da área de saúde pública, atendimentos e encaminhamentos médicos.",
    categorias: [
      "Consulta / atendimento médico",
      "Medicamento",
      "Exame / cirurgia",
      "UBS / UPA / hospital",
      "Saúde mental",
      "Pessoas com deficiência",
      "Encaminhamento SUS",
      "Outras demandas de saúde",
    ],
    icon: Heart,
    path: "/coordenacao/saude",
    quickColorClass: "text-blue-500 bg-blue-500/10",
  },
  {
    slug: "outros",
    nome: "Outros",
    descricao: "Demandas diversas: doações financeiras, emprego e solicitações não classificadas.",
    categorias: [
      "Doação - Dinheiro",
      "Emprego",
      "Doação - Material",
      "Projeto social",
      "Esporte e lazer",
      "Outros",
    ],
    icon: MoreHorizontal,
    path: "/coordenacao/outros",
    quickColorClass: "text-violet-500 bg-violet-500/10",
  },
];

export const findCoordenadoriaDemanda = (slug?: string | null) => {
  if (!slug) return null;
  return COORDENADORIA_DEMANDAS.find((coordenadoria) => coordenadoria.slug === slug) ?? null;
};

export const getCoordenadoriaCategorias = (slug?: string | null) => findCoordenadoriaDemanda(slug)?.categorias ?? [];
