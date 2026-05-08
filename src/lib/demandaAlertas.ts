import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALERT_CONFIG,
  getDueAlertLevel,
  type AlertLevel,
  type KanbanColumn,
} from "@/data/demandasKanban";

export type DemandaAlertContext = "sac" | "coordenadoria";
export type DemandaAlertFilter = "all" | "with_alert" | "warning" | "danger";

export interface DemandaAlertRecord {
  id: string;
  demanda_id: string;
  user_id: string;
  contexto: DemandaAlertContext;
  tipo: AlertLevel | "success";
  origem: "manual" | "automatico";
  titulo: string;
  mensagem: string;
  causa: string;
  referencia: string;
  ativo: boolean;
  tratado_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface DemandaAlertTarget {
  id: string;
  titulo: string;
  user_id?: string | null;
  setor_sac?: string | null;
  coordenadoria_slug?: string | null;
  coluna_kanban?: string | null;
  status?: string | null;
  data_prazo?: string | null;
  nivel_alerta?: string | null;
  alerta_observacao?: string | null;
}

interface AlertSpec {
  demanda_id: string;
  user_id: string;
  contexto: DemandaAlertContext;
  tipo: AlertLevel;
  origem: "manual" | "automatico";
  titulo: string;
  mensagem: string;
  causa: string;
  referencia: string;
}

const alertOrder: Record<AlertLevel | "success", number> = {
  none: 0,
  info: 1,
  warning: 2,
  danger: 3,
  success: 0,
};

const demandColumn = (demanda: DemandaAlertTarget): KanbanColumn => {
  const column = demanda.coluna_kanban;
  if (
    column === "Recebida" ||
    column === "Em Andamento" ||
    column === "Concluida" ||
    column === "Finalizado" ||
    column === "Cancelada"
  ) {
    return column;
  }
  if (demanda.status === "concluida") return "Concluida";
  if (demanda.status === "finalizado") return "Finalizado";
  if (demanda.status === "cancelada") return "Cancelada";
  if (demanda.status === "andamento") return "Em Andamento";
  return "Recebida";
};

export const buildDemandaPath = (demanda: Pick<DemandaAlertTarget, "setor_sac" | "coordenadoria_slug">) => {
  if (demanda.setor_sac) return `/movimentos/${demanda.setor_sac}`;
  if (demanda.coordenadoria_slug) return `/coordenacao/${demanda.coordenadoria_slug}`;
  return "/demandas";
};

export const buildDemandaContext = (
  demanda: Pick<DemandaAlertTarget, "setor_sac">,
): DemandaAlertContext => (demanda.setor_sac ? "sac" : "coordenadoria");

const buildAlertSpecs = (
  demanda: DemandaAlertTarget,
  fallbackUserId?: string | null,
): AlertSpec[] => {
  const userId = demanda.user_id || fallbackUserId;
  if (!userId) return [];

  const specs: AlertSpec[] = [];
  const contexto = buildDemandaContext(demanda);
  const manualLevel = ((demanda.nivel_alerta as AlertLevel) || "none");
  const manualMessage = demanda.alerta_observacao?.trim() || "";

  if (manualLevel !== "none") {
    specs.push({
      demanda_id: demanda.id,
      user_id: userId,
      contexto,
      tipo: manualLevel,
      origem: "manual",
      titulo: `Alerta manual: ${demanda.titulo}`,
      mensagem: manualMessage || `A demanda ${demanda.titulo} exige atenção manual.`,
      causa: "manual",
      referencia: `${manualLevel}|${manualMessage}`,
    });
  }

  const column = demandColumn(demanda);
  const dueLevel = getDueAlertLevel(demanda.data_prazo, column);

  if (dueLevel === "warning" || dueLevel === "danger") {
    const isOverdue = dueLevel === "danger";
    specs.push({
      demanda_id: demanda.id,
      user_id: userId,
      contexto,
      tipo: dueLevel,
      origem: "automatico",
      titulo: `${isOverdue ? "Prazo vencido" : "Prazo próximo"}: ${demanda.titulo}`,
      mensagem: demanda.data_prazo
        ? `${isOverdue ? "Prazo vencido" : "Prazo se aproxima"} em ${new Date(`${demanda.data_prazo}T00:00:00`).toLocaleDateString("pt-BR")}.`
        : `A demanda ${demanda.titulo} precisa de acompanhamento.`,
      causa: isOverdue ? "prazo_vencido" : "prazo_proximo",
      referencia: `${dueLevel}|${demanda.data_prazo || ""}|${column}`,
    });
  }

  return specs;
};

export const getTopActiveAlert = (alerts: DemandaAlertRecord[]) => {
  return alerts.reduce<DemandaAlertRecord | null>((current, alert) => {
    if (!current) return alert;
    return alertOrder[alert.tipo] > alertOrder[current.tipo] ? alert : current;
  }, null);
};

export const matchesAlertFilter = (
  alerts: DemandaAlertRecord[],
  filter: DemandaAlertFilter,
) => {
  if (filter === "all") return true;
  if (filter === "with_alert") return alerts.length > 0;
  if (filter === "danger") return alerts.some((alert) => alert.tipo === "danger");
  if (filter === "warning") {
    return alerts.some((alert) => alert.tipo === "warning" || alert.tipo === "danger");
  }
  return true;
};

export const syncDemandaAlertRecords = async (
  client: SupabaseClient<any, "public", any>,
  demandas: DemandaAlertTarget[],
  fallbackUserId?: string | null,
) => {
  if (demandas.length === 0) return;

  const demandaIds = demandas.map((demanda) => demanda.id);
  const { data: existingRows, error } = await client
    .from("demanda_alertas")
    .select("*")
    .in("demanda_id", demandaIds);

  if (error) throw error;

  const existing = ((existingRows as DemandaAlertRecord[]) || []).filter(
    (row) => row.origem === "manual" || row.origem === "automatico",
  );

  const desired = demandas.flatMap((demanda) => buildAlertSpecs(demanda, fallbackUserId));
  const desiredKeys = new Set(desired.map((item) => `${item.demanda_id}|${item.user_id}|${item.causa}|${item.referencia}`));
  const now = new Date().toISOString();

  const toInsert = desired.filter((spec) => {
    const match = existing.find(
      (row) =>
        row.demanda_id === spec.demanda_id &&
        row.user_id === spec.user_id &&
        row.causa === spec.causa &&
        row.referencia === spec.referencia,
    );

    return !match;
  });

  const toDeactivate = existing.filter(
    (row) => row.ativo && !desiredKeys.has(`${row.demanda_id}|${row.user_id}|${row.causa}|${row.referencia}`),
  );

  const toRefresh = desired
    .map((spec) => {
      const match = existing.find(
        (row) =>
          row.ativo &&
          row.demanda_id === spec.demanda_id &&
          row.user_id === spec.user_id &&
          row.causa === spec.causa &&
          row.referencia === spec.referencia,
      );

      if (!match) return null;
      return match.titulo !== spec.titulo || match.mensagem !== spec.mensagem || match.tipo !== spec.tipo
        ? { id: match.id, ...spec }
        : null;
    })
    .filter(Boolean) as Array<AlertSpec & { id: string }>;

  if (toInsert.length > 0) {
    const { error: insertError } = await client.from("demanda_alertas").insert(
      toInsert.map((item) => ({
        ...item,
        ativo: true,
        tratado_em: null,
      })),
    );
    if (insertError) throw insertError;
  }

  for (const item of toRefresh) {
    const { error: updateError } = await client
      .from("demanda_alertas")
      .update({
        contexto: item.contexto,
        tipo: item.tipo,
        origem: item.origem,
        titulo: item.titulo,
        mensagem: item.mensagem,
        updated_at: now,
      })
      .eq("id", item.id);
    if (updateError) throw updateError;
  }

  if (toDeactivate.length > 0) {
    const { error: deactivateError } = await client
      .from("demanda_alertas")
      .update({
        ativo: false,
        updated_at: now,
      })
      .in(
        "id",
        toDeactivate.map((item) => item.id),
      );
    if (deactivateError) throw deactivateError;
  }
};

export const fetchActiveDemandaAlerts = async (
  client: SupabaseClient<any, "public", any>,
  demandaIds: string[],
) => {
  if (demandaIds.length === 0) return [];

  const { data, error } = await client
    .from("demanda_alertas")
    .select("*")
    .in("demanda_id", demandaIds)
    .eq("ativo", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as DemandaAlertRecord[]) || [];
};

export const groupActiveAlertsByDemand = (alerts: DemandaAlertRecord[]) =>
  alerts.reduce<Record<string, DemandaAlertRecord[]>>((acc, alert) => {
    if (!acc[alert.demanda_id]) acc[alert.demanda_id] = [];
    acc[alert.demanda_id].push(alert);
    return acc;
  }, {});

export const resolveDemandaAlert = async (
  client: SupabaseClient<any, "public", any>,
  alert: DemandaAlertRecord,
) => {
  const now = new Date().toISOString();
  const { error } = await client
    .from("demanda_alertas")
    .update({
      ativo: false,
      tratado_em: now,
      updated_at: now,
    })
    .eq("id", alert.id);

  if (error) throw error;

  if (alert.causa === "manual") {
    const { error: demandError } = await client
      .from("demandas")
      .update({
        nivel_alerta: "none",
        alerta_manual: false,
        alerta_observacao: "",
        updated_at: now,
      })
      .eq("id", alert.demanda_id);

    if (demandError) throw demandError;
  }
};

export const getAlertPresentation = (alerts: DemandaAlertRecord[]) => {
  const topAlert = getTopActiveAlert(alerts);
  return topAlert ? ALERT_CONFIG[topAlert.tipo as AlertLevel] : ALERT_CONFIG.none;
};

