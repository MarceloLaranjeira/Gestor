import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flag,
  Info,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export const KANBAN_COLUMNS = ["Recebida", "Em Andamento", "Concluida", "Finalizado", "Cancelada"] as const;
export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];

export const KANBAN_COLUMN_LABELS: Record<KanbanColumn, string> = {
  Recebida: "Recebida",
  "Em Andamento": "Em andamento",
  Concluida: "Concluída",
  Finalizado: "Finalizado",
  Cancelada: "Cancelada",
};

export const COLUMN_CONFIG: Record<
  KanbanColumn,
  { icon: LucideIcon; color: string; badge: string; header: string; summary: string }
> = {
  Recebida: {
    icon: Clock,
    color: "border-t-blue-500",
    badge: "bg-blue-500/10 text-blue-600",
    header: "bg-blue-500/5",
    summary: "Demandas recém-recebidas",
  },
  "Em Andamento": {
    icon: AlertTriangle,
    color: "border-t-amber-500",
    badge: "bg-amber-500/10 text-amber-600",
    header: "bg-amber-500/5",
    summary: "Demandas em tratamento",
  },
  Concluida: {
    icon: CheckCircle2,
    color: "border-t-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-600",
    header: "bg-emerald-500/5",
    summary: "Atendimento concluído",
  },
  Finalizado: {
    icon: Flag,
    color: "border-t-violet-500",
    badge: "bg-violet-500/10 text-violet-600",
    header: "bg-violet-500/5",
    summary: "Fluxo encerrado pela equipe",
  },
  Cancelada: {
    icon: XCircle,
    color: "border-t-red-400",
    badge: "bg-red-500/10 text-red-500",
    header: "bg-red-500/5",
    summary: "Demandas encerradas sem continuidade",
  },
};

export const PRIORIDADES = ["baixa", "media", "alta", "urgente"] as const;
export type Prioridade = (typeof PRIORIDADES)[number];

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const PRIORIDADE_COLORS: Record<Prioridade, string> = {
  baixa: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  media: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  alta: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  urgente: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

export const CATEGORIAS = [
  "Saude",
  "TEA",
  "Educacao",
  "Infraestrutura",
  "Habitacao",
  "Meio Ambiente",
  "Seguranca",
  "Assistencia Social",
  "Empreendedorismo",
  "Esporte e Lazer",
  "Outro",
  "Outros",
] as const;

export const ALERT_LEVELS = ["none", "info", "warning", "danger"] as const;
export type AlertLevel = (typeof ALERT_LEVELS)[number];

export const ALERT_CONFIG: Record<
  AlertLevel,
  { label: string; icon: LucideIcon; badge: string; cardAccent: string }
> = {
  none: {
    label: "Sem alerta",
    icon: Info,
    badge: "bg-slate-100 text-slate-500",
    cardAccent: "",
  },
  info: {
    label: "Informação",
    icon: Info,
    badge: "bg-sky-500/10 text-sky-600",
    cardAccent: "ring-1 ring-sky-400/30",
  },
  warning: {
    label: "Atenção",
    icon: AlertTriangle,
    badge: "bg-amber-500/10 text-amber-600",
    cardAccent: "ring-1 ring-amber-400/40",
  },
  danger: {
    label: "Urgente",
    icon: AlertTriangle,
    badge: "bg-rose-500/10 text-rose-600",
    cardAccent: "ring-1 ring-rose-400/40",
  },
};

export const mapColumnToStatus = (column: KanbanColumn) => {
  if (column === "Em Andamento") return "andamento";
  if (column === "Concluida") return "concluida";
  if (column === "Finalizado") return "finalizado";
  if (column === "Cancelada") return "cancelada";
  return "pendente";
};

export const mapStatusToColumn = (status?: string | null): KanbanColumn => {
  if (status === "andamento") return "Em Andamento";
  if (status === "concluida") return "Concluida";
  if (status === "finalizado") return "Finalizado";
  if (status === "cancelada") return "Cancelada";
  if (status === "atrasada") return "Em Andamento";
  return "Recebida";
};

export const maskCPF = (value: string) =>
  value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const getDueAlertLevel = (
  dueDate?: string | null,
  column?: KanbanColumn | null,
): AlertLevel => {
  if (!dueDate || column === "Concluida" || column === "Finalizado" || column === "Cancelada") return "none";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(`${dueDate}T00:00:00`);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "danger";
  if (diffDays <= 2) return "warning";
  return "none";
};

export const combineAlertLevel = (
  manualLevel?: string | null,
  dueLevel?: AlertLevel,
): AlertLevel => {
  const levels: AlertLevel[] = ["none", "info", "warning", "danger"];
  const normalizedManual = levels.includes((manualLevel as AlertLevel) || "none")
    ? ((manualLevel as AlertLevel) || "none")
    : "none";
  const normalizedDue = dueLevel || "none";
  return levels[Math.max(levels.indexOf(normalizedManual), levels.indexOf(normalizedDue))];
};

export const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
