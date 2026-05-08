export type DisponibilidadeStatus = "disponivel" | "indisponivel";

export interface UserAvailabilityLike {
  disponibilidade_status?: string | null;
  disponibilidade_mensagem?: string | null;
  disponibilidade_atualizada_em?: string | null;
}

export const DISPONIBILIDADE_LABEL: Record<DisponibilidadeStatus, string> = {
  disponivel: "Disponível",
  indisponivel: "Indisponível",
};

export const DISPONIBILIDADE_BADGE_CLASS: Record<DisponibilidadeStatus, string> = {
  disponivel: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  indisponivel: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

export const normalizeDisponibilidadeStatus = (status?: string | null): DisponibilidadeStatus =>
  status === "indisponivel" ? "indisponivel" : "disponivel";

export const normalizeDisponibilidadeMensagem = (mensagem?: string | null) =>
  (mensagem || "").trim();
