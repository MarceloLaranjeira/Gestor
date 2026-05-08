import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Briefcase,
  Building2,
  HandHeart,
  Heart,
  HelpCircle,
  Home,
  Trophy,
} from "lucide-react";

export type SacSetorSlug =
  | "saude"
  | "tea"
  | "assistencia-social"
  | "infraestrutura"
  | "empreendedorismo"
  | "habitacao"
  | "esporte-lazer"
  | "outros";

export interface SacSetor {
  slug: SacSetorSlug;
  nome: string;
  descricao: string;
  categorias: string[];
  icone: string;
  icon: LucideIcon;
  cor: string;
  accentColor: string;
  iconBg: string;
  badgeClass: string;
  quickColorClass: string;
  path: string;
  coordenadoriaSlug: string;
  coordenadoriaNome: string;
}

export const SAC_SETORES: SacSetor[] = [
  {
    slug: "saude",
    nome: "Saúde",
    descricao: "Demandas de saúde pública, atendimento, exames, consultas e apoio assistencial.",
    categorias: [
      "Consulta médica",
      "Consulta neuropediatra",
      "Exames",
      "Cirurgia",
      "Laudo médico",
      "Laudo TEA",
      "SISREG",
      "Tratamento psicológico",
      "Tratamento odontológico",
      "Medicamentos",
      "Benefício INSS / BPC / LOAS",
      "Paciente acamado",
      "Hospital / atendimento emergencial",
      "Outros atendimentos de saúde",
    ],
    icone: "Heart",
    icon: Heart,
    cor: "bg-rose-500/10 text-rose-500",
    accentColor: "hsl(0,72%,51%)",
    iconBg: "hsl(0 72% 51% / 0.10)",
    badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
    quickColorClass: "text-rose-500 bg-rose-500/10",
    path: "/movimentos/saude",
    coordenadoriaSlug: "sac-saude",
    coordenadoriaNome: "Coordenadoria SAC - Saúde",
  },
  {
    slug: "tea",
    nome: "TEA",
    descricao: "Demandas de atendimento, acompanhamento e encaminhamento relacionadas ao TEA.",
    categorias: [
      "Consulta neuropediatra",
      "Consulta neurologista",
      "Laudo TEA",
      "CIPTEA",
      "Mediador escolar",
      "SISREG TEA",
      "Tratamento psicológico",
      "Tratamento odontológico",
      "Abafador de ruídos",
      "Benefício INSS / BPC / LOAS",
      "Acompanhamento jurídico",
      "Documentação escolar",
      "Outros atendimentos TEA",
    ],
    icone: "Activity",
    icon: Activity,
    cor: "bg-blue-500/10 text-blue-500",
    accentColor: "hsl(217,91%,60%)",
    iconBg: "hsl(217 91% 60% / 0.10)",
    badgeClass: "bg-blue-50 text-blue-600 border-blue-200",
    quickColorClass: "text-blue-500 bg-blue-500/10",
    path: "/movimentos/tea",
    coordenadoriaSlug: "sac-tea",
    coordenadoriaNome: "Coordenadoria SAC - TEA",
  },
  {
    slug: "assistencia-social",
    nome: "Assistência Social",
    descricao: "Solicitações de apoio social, benefícios, vulnerabilidade e encaminhamentos do SAC.",
    categorias: [
      "Área de risco",
      "Moradia / programa habitacional",
      "Cadeira de rodas / equipamento de apoio",
      "Benefício social",
      "Documentação civil",
      "Cesta básica",
      "Apoio a família vulnerável",
      "Apoio social geral",
    ],
    icone: "HandHeart",
    icon: HandHeart,
    cor: "bg-purple-500/10 text-purple-500",
    accentColor: "hsl(271,81%,56%)",
    iconBg: "hsl(271 81% 56% / 0.10)",
    badgeClass: "bg-purple-50 text-purple-600 border-purple-200",
    quickColorClass: "text-purple-500 bg-purple-500/10",
    path: "/movimentos/assistencia-social",
    coordenadoriaSlug: "sac-assistencia-social",
    coordenadoriaNome: "Coordenadoria SAC - Assistência Social",
  },
  {
    slug: "infraestrutura",
    nome: "Infraestrutura",
    descricao: "Demandas de obras, saneamento, pavimentação, iluminação e serviços urbanos.",
    categorias: [
      "Recapeamento asfáltico",
      "Drenagem / esgoto / bueiros",
      "Limpeza pública",
      "Meio-fio / calçada",
      "Iluminação pública",
      "Poda de árvores",
      "Ponte / escada / passarela",
      "Praça / quadra / campo",
      "Sinalização de trânsito",
      "Água / Águas de Manaus",
      "Deslizamento / erosão",
      "Poste / rede elétrica",
      "Parada de ônibus / transporte",
      "Obra inacabada / serviço mal feito",
      "Acessibilidade",
      "Outras demandas de infraestrutura",
    ],
    icone: "Building2",
    icon: Building2,
    cor: "bg-slate-500/10 text-slate-500",
    accentColor: "hsl(215,14%,47%)",
    iconBg: "hsl(215 14% 47% / 0.10)",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
    quickColorClass: "text-slate-500 bg-slate-500/10",
    path: "/movimentos/infraestrutura",
    coordenadoriaSlug: "sac-infraestrutura",
    coordenadoriaNome: "Coordenadoria SAC - Infraestrutura",
  },
  {
    slug: "empreendedorismo",
    nome: "Empreendedorismo",
    descricao: "Apoio a pequenos negócios, geração de renda e orientações para empreendedores.",
    categorias: [
      "Emprego",
      "Trabalho autônomo",
      "Capacitação profissional",
      "Geração de renda",
      "Regularização de negócio",
      "Apoio a empreendedor",
      "Outras demandas de empreendedorismo",
    ],
    icone: "Briefcase",
    icon: Briefcase,
    cor: "bg-amber-500/10 text-amber-500",
    accentColor: "hsl(38,92%,50%)",
    iconBg: "hsl(38 92% 50% / 0.10)",
    badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
    quickColorClass: "text-amber-500 bg-amber-500/10",
    path: "/movimentos/empreendedorismo",
    coordenadoriaSlug: "sac-empreendedorismo",
    coordenadoriaNome: "Coordenadoria SAC - Empreendedorismo",
  },
  {
    slug: "habitacao",
    nome: "Habitação",
    descricao: "Demandas de moradia, regularização, programas habitacionais e melhorias residenciais.",
    categorias: [
      "Moradia por programa habitacional",
      "Regularização habitacional",
      "Área de risco / desabamento",
      "Reforma residencial",
      "Incêndio / perda habitacional",
      "Melhoria habitacional",
      "Outras demandas de habitação",
    ],
    icone: "Home",
    icon: Home,
    cor: "bg-emerald-500/10 text-emerald-500",
    accentColor: "hsl(142,70%,40%)",
    iconBg: "hsl(142 70% 40% / 0.10)",
    badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
    quickColorClass: "text-emerald-500 bg-emerald-500/10",
    path: "/movimentos/habitacao",
    coordenadoriaSlug: "sac-habitacao",
    coordenadoriaNome: "Coordenadoria SAC - Habitação",
  },
  {
    slug: "esporte-lazer",
    nome: "Esporte e Lazer",
    descricao: "Solicitações de esporte comunitário, atividades, projetos e lazer para a população.",
    categorias: [
      "Projeto esportivo",
      "Material esportivo",
      "Evento esportivo",
      "Atleta / competição",
      "Quadra / campo / pista",
      "Lazer comunitário",
      "Outras demandas de esporte e lazer",
    ],
    icone: "Trophy",
    icon: Trophy,
    cor: "bg-orange-500/10 text-orange-500",
    accentColor: "hsl(24,95%,53%)",
    iconBg: "hsl(24 95% 53% / 0.10)",
    badgeClass: "bg-orange-50 text-orange-600 border-orange-200",
    quickColorClass: "text-orange-500 bg-orange-500/10",
    path: "/movimentos/esporte-lazer",
    coordenadoriaSlug: "sac-esporte-lazer",
    coordenadoriaNome: "Coordenadoria SAC - Esporte e Lazer",
  },
  {
    slug: "outros",
    nome: "Outros",
    descricao: "Demandas gerais do SAC que ainda não se encaixam em um setor específico.",
    categorias: [
      "Reclamação geral",
      "Perturbação de sossego",
      "Transporte / linha de ônibus",
      "Educação / escola",
      "Segurança / fiscalização",
      "Empresa privada",
      "Construção irregular",
      "Faculdade / instituição de ensino",
      "Contato com vereador",
      "Outras solicitações",
    ],
    icone: "HelpCircle",
    icon: HelpCircle,
    cor: "bg-gray-500/10 text-gray-500",
    accentColor: "hsl(215,16%,47%)",
    iconBg: "hsl(215 16% 47% / 0.10)",
    badgeClass: "bg-gray-50 text-gray-600 border-gray-200",
    quickColorClass: "text-gray-500 bg-gray-500/10",
    path: "/movimentos/outros",
    coordenadoriaSlug: "sac-outros",
    coordenadoriaNome: "Coordenadoria SAC - Outros",
  },
];

export const SAC_SETOR_MAP: Record<SacSetorSlug, SacSetor> = Object.fromEntries(
  SAC_SETORES.map((setor) => [setor.slug, setor]),
) as Record<SacSetorSlug, SacSetor>;

export const SAC_SETOR_SLUGS = SAC_SETORES.map((setor) => setor.slug);

export const findSacSetor = (slug?: string | null) => {
  if (!slug) return null;
  return SAC_SETORES.find((setor) => setor.slug === slug) ?? null;
};

export const getSacSetorCategorias = (slug?: string | null) => findSacSetor(slug)?.categorias ?? [];
