import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const STATUS_AGENDAMENTO = ["agendado", "confirmado", "presente", "falta", "cancelado"] as const;
export type StatusAgendamento = (typeof STATUS_AGENDAMENTO)[number];

export const STATUS_AGENDAMENTO_LABEL: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  presente: "Presente",
  falta: "Falta",
  cancelado: "Cancelado",
};

export const STATUS_AGENDAMENTO_CLASS: Record<StatusAgendamento, string> = {
  agendado: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  confirmado: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  presente: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  falta: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  cancelado: "bg-muted text-muted-foreground border-border line-through",
};

export const TIPOS_AGENDAMENTO = ["primeiro_atendimento", "sessao", "retorno", "avaliacao", "devolutiva"] as const;
export type TipoAgendamento = (typeof TIPOS_AGENDAMENTO)[number];

export const TIPO_LABEL: Record<TipoAgendamento, string> = {
  primeiro_atendimento: "Primeiro atendimento",
  sessao: "Sessão",
  retorno: "Retorno",
  avaliacao: "Avaliação",
  devolutiva: "Devolutiva",
};

/** Etapas da investigação neuropsicológica, na ordem em que acontecem. */
export const ETAPAS_INVESTIGACAO = ["entrevista_inicial", "testagem", "correcao", "devolutiva"] as const;
export type EtapaInvestigacao = (typeof ETAPAS_INVESTIGACAO)[number];

export const ETAPA_LABEL: Record<EtapaInvestigacao, string> = {
  entrevista_inicial: "Entrevista inicial / anamnese",
  testagem: "Aplicação de testes",
  correcao: "Correção e laudo",
  devolutiva: "Devolutiva à família",
};

export const ESPECIALIDADE_INVESTIGACAO = "neuropsicologia";

/** Janela do controle de não comparecimento. */
export const JANELA_FALTAS_DIAS = 30;
/** shortcut: limite fixo de alerta; mover para configuração se o instituto definir outra regra. */
export const LIMITE_FALTAS_ALERTA = 3;

export interface AgendamentoBase {
  id: string;
  paciente_id: string;
  especialidade_slug: string;
  data_hora: string;
  status: string;
  etapa?: string | null;
}

export type Periodo = "dia" | "semana" | "mes";

export const PERIODO_LABEL: Record<Periodo, string> = { dia: "Diário", semana: "Semanal", mes: "Mensal" };

export function intervaloPeriodo(periodo: Periodo, ref: Date): { inicio: Date; fim: Date } {
  if (periodo === "dia") return { inicio: startOfDay(ref), fim: endOfDay(ref) };
  if (periodo === "semana") {
    return { inicio: startOfWeek(ref, { weekStartsOn: 1 }), fim: endOfWeek(ref, { weekStartsOn: 1 }) };
  }
  return { inicio: startOfMonth(ref), fim: endOfMonth(ref) };
}

export function moverPeriodo(periodo: Periodo, ref: Date, passos: number): Date {
  if (periodo === "dia") return addDays(ref, passos);
  if (periodo === "semana") return addWeeks(ref, passos);
  return addMonths(ref, passos);
}

export function rotuloPeriodo(periodo: Periodo, ref: Date): string {
  const { inicio, fim } = intervaloPeriodo(periodo, ref);
  if (periodo === "dia") return format(inicio, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  if (periodo === "semana") return `${format(inicio, "dd/MM")} a ${format(fim, "dd/MM/yyyy")}`;
  return format(inicio, "MMMM 'de' yyyy", { locale: ptBR });
}

export interface ResumoAtendimentos {
  agendados: number;
  atendidos: number;
  faltosos: number;
  cancelados: number;
  pendentes: number;
}

/** Totais do relatório: "agendados" exclui cancelados; "pendentes" ainda não tiveram desfecho. */
export function resumoAtendimentos(agendamentos: AgendamentoBase[]): ResumoAtendimentos {
  const conta = (s: string) => agendamentos.filter((a) => a.status === s).length;
  const cancelados = conta("cancelado");
  return {
    agendados: agendamentos.length - cancelados,
    atendidos: conta("presente"),
    faltosos: conta("falta"),
    cancelados,
    pendentes: conta("agendado") + conta("confirmado"),
  };
}

export interface FaltaPaciente {
  paciente_id: string;
  total: number;
  ultima: string;
  especialidades: string[];
}

/** Pacientes com falta nos últimos `dias`, mais faltosos primeiro. */
export function faltasRecentes(agendamentos: AgendamentoBase[], hoje: Date = new Date(), dias = JANELA_FALTAS_DIAS): FaltaPaciente[] {
  const desde = subDays(startOfDay(hoje), dias).getTime();
  const fimHoje = endOfDay(hoje).getTime();
  const porPaciente = new Map<string, FaltaPaciente>();

  for (const a of agendamentos) {
    const t = new Date(a.data_hora).getTime();
    if (a.status !== "falta" || t < desde || t > fimHoje) continue;
    const atual = porPaciente.get(a.paciente_id) ?? { paciente_id: a.paciente_id, total: 0, ultima: a.data_hora, especialidades: [] };
    porPaciente.set(a.paciente_id, {
      ...atual,
      total: atual.total + 1,
      ultima: a.data_hora > atual.ultima ? a.data_hora : atual.ultima,
      especialidades: atual.especialidades.includes(a.especialidade_slug)
        ? atual.especialidades
        : [...atual.especialidades, a.especialidade_slug],
    });
  }

  return [...porPaciente.values()].sort((a, b) => b.total - a.total || b.ultima.localeCompare(a.ultima));
}

/** Etapas da investigação já realizadas (com presença). */
export function etapasRealizadas(agendamentos: AgendamentoBase[]): Set<EtapaInvestigacao> {
  return new Set(
    agendamentos
      .filter((a) => a.status === "presente" && a.etapa)
      .map((a) => a.etapa as EtapaInvestigacao),
  );
}

/** Mesma regra do banco: sábado e domingo passam para segunda. */
export function proximoDiaUtil(data: Date): Date {
  const dia = data.getDay();
  if (dia === 6) return addDays(data, 2);
  if (dia === 0) return addDays(data, 1);
  return data;
}

export function agruparPorDia<T extends { data_hora: string }>(itens: T[]): { dia: string; itens: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const item of [...itens].sort((a, b) => a.data_hora.localeCompare(b.data_hora))) {
    const dia = format(new Date(item.data_hora), "yyyy-MM-dd");
    grupos.set(dia, [...(grupos.get(dia) ?? []), item]);
  }
  return [...grupos.entries()].map(([dia, lista]) => ({ dia, itens: lista }));
}

export function toCsv(linhas: (string | number | null | undefined)[][]): string {
  const escapar = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // Ponto e vírgula + BOM: abre direto no Excel em português.
  return "﻿" + linhas.map((l) => l.map(escapar).join(";")).join("\n");
}

export function mensagemLembrete(paciente: string, especialidade: string, dataHora: string): string {
  const quando = format(new Date(dataHora), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });
  return [
    "Olá! Tudo bem?",
    "",
    `Lembramos do atendimento de *${paciente}* em *${especialidade}* na ${quando}.`,
    "",
    "Por favor, confirme a presença respondendo esta mensagem. Caso não possa comparecer, avise com antecedência para reagendarmos.",
  ].join("\n");
}
