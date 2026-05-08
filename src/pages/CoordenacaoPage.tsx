import { useState, useEffect, useCallback } from "react";
import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone, Database, Building2, UsersRound, Loader2, Gavel,
  User, Phone, Mail, ArrowLeft, Edit2, Plus, Trash2, FileText,
  BookOpen, Save, Eye, Download, ChevronLeft, ChevronRight,
  CalendarDays, AlertTriangle, Clock, CheckCircle2, Flag, XCircle,
  Search, Filter, Users, IdCard, LayoutList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Headphones, GitMerge } from "lucide-react";
import {
  ALERT_CONFIG,
  KANBAN_COLUMN_LABELS,
  PRIORIDADE_LABEL,
  mapColumnToStatus,
  mapStatusToColumn,
  type AlertLevel,
  type KanbanColumn,
} from "@/data/demandasKanban";
import {
  fetchActiveDemandaAlerts,
  getAlertPresentation,
  getTopActiveAlert,
  groupActiveAlertsByDemand,
  matchesAlertFilter,
  resolveDemandaAlert,
  syncDemandaAlertRecords,
  type DemandaAlertFilter,
  type DemandaAlertRecord,
} from "@/lib/demandaAlertas";
import { getCoordenadoriaCategorias } from "@/data/coordenadoriaDemandas";

/* â”€â”€ slug â†’ icon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const SLUG_ICON: Record<string, any> = {
  atendimento: Headphones, comunicacao: Megaphone, inteligencia: Database,
  gabinete: Building2, equipe: UsersRound, articulacao: GitMerge,
  legislativo: Gavel, plenaria: Gavel,
};

/* â”€â”€ Kanban columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const COLUNAS = ["Recebida", "Em Andamento", "Concluida", "Finalizado", "Cancelada"] as const;
type Coluna = typeof COLUNAS[number];

const COLUNA_CONFIG: Record<Coluna, { icon: React.ElementType; color: string; badge: string; header: string }> = {
  "Recebida":     { icon: Clock,         color: "border-t-blue-500",    badge: "bg-blue-500/10 text-blue-600",       header: "bg-blue-500/5" },
  "Em Andamento": { icon: AlertTriangle, color: "border-t-amber-500",   badge: "bg-amber-500/10 text-amber-600",     header: "bg-amber-500/5" },
  "Concluida":    { icon: CheckCircle2,  color: "border-t-emerald-500", badge: "bg-emerald-500/10 text-emerald-600",  header: "bg-emerald-500/5" },
  "Finalizado":   { icon: Flag,          color: "border-t-violet-500",  badge: "bg-violet-500/10 text-violet-600",    header: "bg-violet-500/5" },
  "Cancelada":    { icon: XCircle,       color: "border-t-red-400",     badge: "bg-red-500/10 text-red-500",          header: "bg-red-500/5" },
};

const PRIO_COLORS: Record<string, string> = {
  baixa:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  media:   "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  alta:    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  urgente: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const PRIORIDADES = ["baixa","media","alta","urgente"];

const normalizeCoordColumn = (demanda: Pick<Demanda, "coluna_kanban" | "status">): Coluna => {
  if (COLUNAS.includes(demanda.coluna_kanban as Coluna)) {
    return demanda.coluna_kanban as Coluna;
  }

  return mapStatusToColumn(demanda.status) as Coluna;
};

/* â”€â”€ types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface CoordFull {
  id: string; nome: string; descricao: string;
  coordenador: string; coordenador_email: string; coordenador_telefone: string;
  cor: string; icone: string;
}

interface Demanda {
  id: string; titulo: string; descricao: string; status: string;
  prioridade: string; responsavel: string; solicitante: string;
  solicitante_cpf: string; solicitante_telefone: string;
  atendimento_grupo: string | null;
  atendimento_prazo_dias: number | null;
  atendimento_tipo: string | null;
  categoria: string; data_prazo: string; coluna_kanban: string;
  coordenacao_id: string; created_at: string;
  nivel_alerta: AlertLevel;
  alerta_observacao: string;
  alerta_manual: boolean;
  alerta_vencimento_em: string | null;
  user_id: string;
}

interface Relatorio {
  id: string; titulo: string; periodo: string; conteudo: string;
  status: string; created_at: string;
}

const emptyDemanda = {
  titulo: "", descricao: "", status: "pendente", prioridade: "media",
  responsavel: "", solicitante: "", solicitante_cpf: "", solicitante_telefone: "",
  categoria: "",
  data_prazo: "", coluna_kanban: "Recebida",
  nivel_alerta: "none" as AlertLevel, alerta_observacao: "",
};

/* â”€â”€ CPF mask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function maskCPF(v: string) {
  return v.replace(/\D/g,"").slice(0,11)
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d)/,"$1.$2")
    .replace(/(\d{3})(\d{1,2})$/,"$1-$2");
}

/* â”€â”€ Demanda Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DemandaCard({
  d, colIdx, alerts, resolvingAlertId, onEdit, onDelete, onMove, onResolveAlert,
}: {
  d: Demanda; colIdx: number;
  alerts: DemandaAlertRecord[];
  resolvingAlertId: string | null;
  onEdit: (d: Demanda) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "left" | "right") => void;
  onResolveAlert: (alert: DemandaAlertRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = COLUNA_CONFIG[d.coluna_kanban as Coluna];
  const topAlert = getTopActiveAlert(alerts);
  const alertMeta = getAlertPresentation(alerts);
  const AlertIcon = topAlert ? ALERT_CONFIG[topAlert.tipo as AlertLevel].icon : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
      className={cn("bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all", cfg?.color, "border-t-2", alertMeta.cardAccent)}
    >
      <div className="p-3 space-y-2">
        {/* title row */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug flex-1">{d.titulo}</p>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={() => onEdit(d)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(d.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* badges */}
        <div className="flex flex-wrap gap-1">
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", PRIO_COLORS[d.prioridade])}>
            {PRIORIDADE_LABEL[d.prioridade as keyof typeof PRIORIDADE_LABEL] || d.prioridade}
          </span>
          {d.categoria && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {d.categoria}
            </span>
          )}
          {topAlert && AlertIcon && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", ALERT_CONFIG[topAlert.tipo as AlertLevel].badge)}>
              <AlertIcon className="w-3 h-3 inline mr-1" />
              {ALERT_CONFIG[topAlert.tipo as AlertLevel].label}
            </span>
          )}
        </div>

        {/* solicitante */}
        {d.solicitante && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{d.solicitante}</span>
            {d.solicitante_cpf && <span className="text-[10px] font-mono opacity-70">· {d.solicitante_cpf}</span>}
          </p>
        )}

        {/* prazo */}
        {d.data_prazo && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3 h-3 shrink-0" />
            Prazo: {new Date(d.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}
          </p>
        )}

        {/* expand */}
        <button onClick={() => setExpanded(!expanded)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
          {expanded ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {expanded ? "Recolher" : "Detalhes"}
        </button>

        {expanded && (
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            {d.descricao && <p className="text-[11px] text-muted-foreground italic">{d.descricao}</p>}
            {d.responsavel && <p className="text-[11px] text-muted-foreground"><span className="font-medium">Responsável:</span> {d.responsavel}</p>}
            {d.solicitante_telefone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{d.solicitante_telefone}</p>}
            {alerts.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-foreground">Alertas ativos</p>
                {alerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground truncate">{alert.titulo}</p>
                        <p className="text-[10px] text-muted-foreground">{alert.mensagem}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px]"
                        disabled={resolvingAlertId === alert.id}
                        onClick={() => onResolveAlert(alert)}
                      >
                        Tratar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* move arrows */}
        <div className="flex gap-1 pt-1 border-t border-border/30">
          <button
            onClick={() => onMove(d.id, "left")}
            disabled={colIdx === 0}
            className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3" /> Voltar
          </button>
          <button
            onClick={() => onMove(d.id, "right")}
            disabled={colIdx === COLUNAS.length - 1}
            className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Avançar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Main page
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const CoordenacaoPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { toast }    = useToast();

  const [coord,      setCoord]      = useState<CoordFull | null>(null);
  const [demandas,   setDemandas]   = useState<Demanda[]>([]);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState<"kanban" | "relatorios">("kanban");

  /* kanban UI */
  const [search, setSearch]       = useState("");
  const [filterPrio, setFilterPrio] = useState("all");
  const [filterAlert, setFilterAlert] = useState<DemandaAlertFilter>("all");
  const [alertsByDemand, setAlertsByDemand] = useState<Record<string, DemandaAlertRecord[]>>({});
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  /* demanda dialog */
  const [demandaDialog, setDemandaDialog]   = useState(false);
  const [demandaForm,   setDemandaForm]     = useState({ ...emptyDemanda });
  const [editingId,     setEditingId]       = useState<string | null>(null);
  const [deletingId,    setDeletingId]      = useState<string | null>(null);
  const [saving,        setSaving]          = useState(false);
  const categoriaOptions = useMemo(() => {
    const categorias = getCoordenadoriaCategorias(slug);
    const current = demandaForm.categoria.trim();
    if (current && !categorias.includes(current)) return [...categorias, current];
    return categorias;
  }, [demandaForm.categoria, slug]);

  /* relatorio */
  const [activeRel,    setActiveRel]    = useState<Relatorio | null>(null);
  const [editingRel,   setEditingRel]   = useState(false);
  const [relForm,      setRelForm]      = useState({ titulo: "", periodo: "", conteudo: "" });
  const [savingRel,    setSavingRel]    = useState(false);
  const [deletingRel,  setDeletingRel]  = useState<string | null>(null);

  /* â”€â”€ load coord â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const loadCoord = useCallback(async () => {
    if (!slug) return undefined;
    const { data } = await supabase
      .from("coordenacoes")
      .select("id, nome, descricao, coordenador, coordenador_email, coordenador_telefone, cor, icone")
      .eq("slug", slug)
      .single();
    if (data) setCoord(data);
    return data?.id as string | undefined;
  }, [slug]);

  const loadDemandas = useCallback(async (coordId: string) => {
    const { data } = await supabase
      .from("demandas")
      .select("*")
      .eq("coordenacao_id", coordId)
      .order("created_at", { ascending: false });
    const demandasData = ((data as Demanda[]) || []).map((demanda) => ({
      ...demanda,
      coluna_kanban: normalizeCoordColumn(demanda),
    }));
    setDemandas(demandasData);

    if (demandasData.length === 0) {
      setAlertsByDemand({});
      return;
    }

    await syncDemandaAlertRecords(supabase, demandasData, user?.user_id);
    const alerts = await fetchActiveDemandaAlerts(supabase, demandasData.map((demanda) => demanda.id));
    setAlertsByDemand(groupActiveAlertsByDemand(alerts));
  }, []);

  const loadRelatorios = useCallback(async (coordId: string) => {
    const { data } = await supabase
      .from("relatorios_coordenacao")
      .select("*")
      .eq("coordenacao_id", coordId)
      .order("created_at", { ascending: false });
    setRelatorios((data as Relatorio[]) || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const coordId = await loadCoord();
      if (coordId) await Promise.all([loadDemandas(coordId), loadRelatorios(coordId)]);
      setLoading(false);
    })();
  }, [loadCoord, loadDemandas, loadRelatorios]);

  /* â”€â”€ demanda CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const openNew = (coluna = "Recebida") => {
    setDemandaForm({ ...emptyDemanda, coluna_kanban: coluna });
    setEditingId(null);
    setDemandaDialog(true);
  };

  const openEdit = (d: Demanda) => {
    setDemandaForm({
      titulo: d.titulo, descricao: d.descricao || "", status: d.status,
      prioridade: d.prioridade, responsavel: d.responsavel || "",
      solicitante: d.solicitante || "", solicitante_cpf: d.solicitante_cpf || "",
      solicitante_telefone: d.solicitante_telefone || "",
      categoria: d.categoria || "",
      data_prazo: d.data_prazo || "",
      coluna_kanban: normalizeCoordColumn(d),
      nivel_alerta: d.nivel_alerta || "none",
      alerta_observacao: d.alerta_observacao || "",
    });
    setEditingId(d.id);
    setDemandaDialog(true);
  };

  const saveDemanda = async () => {
    if (!coord || !demandaForm.titulo.trim()) return;
    setSaving(true);
    const payload = {
      ...demandaForm,
      categoria: demandaForm.categoria.trim() || coord.nome,
      status: mapColumnToStatus(demandaForm.coluna_kanban as Coluna),
      alerta_manual: demandaForm.nivel_alerta !== "none",
      alerta_vencimento_em: demandaForm.data_prazo || null,
      coordenacao_id: coord.id,
      user_id: user?.user_id,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("demandas").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("demandas").insert(payload));
    }

    if (error && payload.categoria !== coord.nome) {
      const retryPayload = { ...payload, categoria: coord.nome };
      if (editingId) {
        ({ error } = await supabase.from("demandas").update(retryPayload).eq("id", editingId));
      } else {
        ({ error } = await supabase.from("demandas").insert(retryPayload));
      }
    }
    setSaving(false);
    if (error) { toast({ title: "Erro ao salvar demanda", description: error.message, variant: "destructive" }); return; }
    toast({ title: editingId ? "Demanda atualizada!" : "Demanda registrada!" });
    setDemandaDialog(false);
    loadDemandas(coord.id);
  };

  const deleteDemanda = async () => {
    if (!deletingId || !coord) return;
    await supabase.from("demandas").delete().eq("id", deletingId);
    setDeletingId(null);
    loadDemandas(coord.id);
    toast({ title: "Demanda removida" });
  };

  const moveDemanda = async (id: string, dir: "left" | "right") => {
    if (!coord) return;
    const d = demandas.find((x) => x.id === id);
    if (!d) return;
    const idx = COLUNAS.indexOf(d.coluna_kanban as Coluna);
    const next = COLUNAS[dir === "right" ? idx + 1 : idx - 1];
    if (!next) return;
    const { error, count } = await supabase
      .from("demandas")
      .update({
        coluna_kanban: next,
        status: mapColumnToStatus(next as KanbanColumn),
      })
      .eq("id", id)
      .select("id", { count: "exact", head: true });
    if (error) {
      toast({ title: "Erro ao mover demanda", description: error.message, variant: "destructive" });
      return;
    }
    if (count === 0) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para mover esta demanda.", variant: "destructive" });
      return;
    }
    loadDemandas(coord.id);
  };

  const resolveAlert = async (alert: DemandaAlertRecord) => {
    if (!coord) return;
    setResolvingAlertId(alert.id);
    try {
      await resolveDemandaAlert(supabase, alert);
      toast({ title: "Alerta tratado" });
      await loadDemandas(coord.id);
    } catch {
      toast({ title: "Erro ao tratar alerta", variant: "destructive" });
    } finally {
      setResolvingAlertId(null);
    }
  };

  /* â”€â”€ relatorio CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const newRelatorio = () => {
    setRelForm({ titulo: "", periodo: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }), conteudo: "" });
    setActiveRel(null);
    setEditingRel(true);
  };

  const saveRelatorio = async (publish = false) => {
    if (!coord || !relForm.titulo.trim()) return;
    setSavingRel(true);
    const payload = { ...relForm, status: publish ? "publicado" : "rascunho", coordenacao_id: coord.id, user_id: user?.user_id };
    let error;
    if (activeRel) {
      ({ error } = await supabase.from("relatorios_coordenacao").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", activeRel.id));
    } else {
      ({ error } = await supabase.from("relatorios_coordenacao").insert(payload));
    }
    setSavingRel(false);
    if (error) { toast({ title: "Erro ao salvar relatório", variant: "destructive" }); return; }
    toast({ title: publish ? "Relatório publicado!" : "Rascunho salvo!" });
    setEditingRel(false);
    loadRelatorios(coord.id);
  };

  const deleteRelatorio = async () => {
    if (!deletingRel || !coord) return;
    await supabase.from("relatorios_coordenacao").delete().eq("id", deletingRel);
    if (activeRel?.id === deletingRel) { setActiveRel(null); setEditingRel(false); }
    setDeletingRel(null);
    loadRelatorios(coord.id);
  };

  const downloadRel = (r: Relatorio) => {
    const text = `RELATÓRIO: ${r.titulo}\nCoordenação: ${coord?.nome}\nPeríodo: ${r.periodo}\n\n${r.conteudo}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `relatorio-${coord?.nome?.toLowerCase().replace(/\s+/g, "-")}.txt`;
    a.click();
  };

  /* â”€â”€ derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const filtered = demandas.filter((d) => {
    const matchSearch = !search || d.titulo.toLowerCase().includes(search.toLowerCase()) || d.solicitante?.toLowerCase().includes(search.toLowerCase());
    const matchPrio   = filterPrio === "all" || d.prioridade === filterPrio;
    const matchAlert  = matchesAlertFilter(alertsByDemand[d.id] || [], filterAlert);
    return matchSearch && matchPrio && matchAlert;
  });

  const byColuna = (col: Coluna) => filtered.filter((d) => normalizeCoordColumn(d) === col);

  /* â”€â”€ render guards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
    </AppLayout>
  );
  if (!coord) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Coordenação não encontrada.</p></div>
    </AppLayout>
  );

  const Icon = SLUG_ICON[slug || ""] || Building2;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

        {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate("/coordenacoes")}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground mt-0.5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground leading-tight">{coord.nome}</h1>
              {coord.descricao && <p className="text-xs text-muted-foreground mt-0.5">{coord.descricao}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3 ml-14 sm:ml-0">
            {coord.coordenador && (
              <div className="flex flex-col sm:items-end gap-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-medium text-foreground"><User className="w-3 h-3 shrink-0" />{coord.coordenador}</span>
                {coord.coordenador_telefone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" />{coord.coordenador_telefone}</span>}
                {coord.coordenador_email    && <span className="flex items-center gap-1"><Mail  className="w-3 h-3 shrink-0" />{coord.coordenador_email}</span>}
              </div>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => navigate("/coordenacoes")}>
              <Edit2 className="w-3.5 h-3.5" /> Gerenciar
            </Button>
          </div>
        </div>

        {/* â”€â”€ SUMMARY PILLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {COLUNAS.map((col) => {
            const cfg = COLUNA_CONFIG[col];
            const ColIcon = cfg.icon;
            const count = demandas.filter((d) => normalizeCoordColumn(d) === col).length;
            return (
              <div key={col} className={cn("rounded-xl border border-border/50 p-4 flex items-center justify-between min-w-[140px] flex-1", cfg.header)}>
                <div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{count}</p>
                  <p className="text-xs text-muted-foreground">{KANBAN_COLUMN_LABELS[col]}</p>
                </div>
                <ColIcon className={cn("w-5 h-5", cfg.badge.split(" ")[1])} />
              </div>
            );
          })}
        </div>

        {/* â”€â”€ TABS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex items-center gap-1 border-b border-border/60">
          {([
            { key: "kanban",    label: "Kanban de Demandas", icon: LayoutList, count: demandas.length },
            { key: "relatorios",label: "Relatórios",         icon: BookOpen,   count: relatorios.length },
          ] as const).map(({ key, label, icon: TabIcon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}>
              <TabIcon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-semibold", tab === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* â”€â”€ TAB: KANBAN â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {tab === "kanban" && (
          <div className="space-y-4">
            {/* toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar demanda ou solicitante..." className="pl-8 h-8 text-xs" />
              </div>
              <Select value={filterPrio} onValueChange={setFilterPrio}>
                <SelectTrigger className="h-8 w-36 text-xs"><Filter className="w-3 h-3 mr-1" /><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas prioridades</SelectItem>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p as keyof typeof PRIORIDADE_LABEL] || p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterAlert} onValueChange={(value) => setFilterAlert(value as DemandaAlertFilter)}>
                <SelectTrigger className="h-8 w-40 text-xs"><AlertTriangle className="w-3 h-3 mr-1" /><SelectValue placeholder="Alertas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos alertas</SelectItem>
                  <SelectItem value="with_alert">Com alerta</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="danger">Urgentes</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={() => openNew()} className="gap-1.5 h-8 ml-auto">
                <Plus className="w-3.5 h-3.5" /> Nova Demanda
              </Button>
            </div>

            {/* board */}
            <div className="flex gap-3 overflow-x-auto pb-2 items-start">
              {COLUNAS.map((col, colIdx) => {
                const cfg = COLUNA_CONFIG[col];
                const ColIcon = cfg.icon;
                const cards = byColuna(col);
                return (
                  <div key={col} className="flex flex-col gap-2 min-w-[220px] flex-1">
                    {/* column header */}
                    <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border border-border/50", cfg.header)}>
                      <div className="flex items-center gap-2">
                        <ColIcon className={cn("w-3.5 h-3.5", cfg.badge.split(" ")[1])} />
                        <span className="text-xs font-semibold text-foreground">{KANBAN_COLUMN_LABELS[col]}</span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", cfg.badge)}>{cards.length}</span>
                      </div>
                      <button onClick={() => openNew(col)} title="Nova demanda nesta coluna"
                        className="p-1 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* cards */}
                    <div className="space-y-2 min-h-[120px]">
                      <AnimatePresence>
                        {cards.map((d) => (
                          <DemandaCard key={d.id} d={d} colIdx={colIdx}
                            alerts={alertsByDemand[d.id] || []}
                            resolvingAlertId={resolvingAlertId}
                            onEdit={openEdit} onDelete={setDeletingId} onMove={moveDemanda}
                            onResolveAlert={resolveAlert} />
                        ))}
                      </AnimatePresence>
                      {cards.length === 0 && (
                        <div className="border-2 border-dashed border-border/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 transition-colors"
                          onClick={() => openNew(col)}>
                          <p className="text-[11px] text-muted-foreground/50">Nenhuma demanda</p>
                          <p className="text-[10px] text-primary/60 mt-0.5">+ Adicionar</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Relatórios */}
        {tab === "relatorios" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Histórico</p>
                <Button size="sm" variant="outline" onClick={newRelatorio} className="gap-1 h-7 text-xs">
                  <Plus className="w-3 h-3" /> Novo
                </Button>
              </div>
              {relatorios.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-8">Nenhum relatório ainda</p>
              ) : (
                <div className="space-y-1.5">
                  {relatorios.map((r) => (
                    <button key={r.id} onClick={() => { setActiveRel(r); setRelForm({ titulo: r.titulo, periodo: r.periodo, conteudo: r.conteudo }); setEditingRel(false); }}
                      className={cn("w-full text-left p-3 rounded-lg border transition-all",
                        activeRel?.id === r.id ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-border bg-card")}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{r.titulo}</p>
                        <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0",
                          r.status === "publicado" ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600")}>
                          {r.status === "publicado" ? "PUB" : "RAL"}
                        </span>
                      </div>
                      {r.periodo && <p className="text-[10px] text-muted-foreground mt-0.5">{r.periodo}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-5 space-y-4 min-h-[400px]">
              {!editingRel && !activeRel ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-muted-foreground/30" />
                  <p className="text-sm font-medium">Selecione ou crie um relatório</p>
                  <Button size="sm" onClick={newRelatorio}><Plus className="w-3.5 h-3.5 mr-1.5" /> Novo Relatório</Button>
                </div>
              ) : (
                <>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/50 pb-3">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      {editingRel ? (activeRel ? "Editando" : "Novo Relatório") : activeRel?.titulo}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {!editingRel && activeRel && (
                        <>
                          <button onClick={() => downloadRel(activeRel)} className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground" title="Baixar">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeletingRel(activeRel.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setEditingRel(true)}>
                            <Edit2 className="w-3 h-3" /> Editar
                          </Button>
                        </>
                      )}
                      {editingRel && (
                        <>
                          {activeRel && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRel(false)}>Cancelar</Button>}
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => saveRelatorio(false)} disabled={savingRel}>
                            {savingRel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Rascunho
                          </Button>
                          <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => saveRelatorio(true)} disabled={savingRel}>
                            <Eye className="w-3 h-3" /> Publicar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingRel ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-xs">Título *</Label>
                          <Input value={relForm.titulo} onChange={(e) => setRelForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título do relatório" className="text-sm" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Período</Label>
                          <Input value={relForm.periodo} onChange={(e) => setRelForm((f) => ({ ...f, periodo: e.target.value }))} placeholder="Ex: Abril 2026" className="text-sm" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Conteúdo</Label>
                        <Textarea value={relForm.conteudo} onChange={(e) => setRelForm((f) => ({ ...f, conteudo: e.target.value }))} rows={14} className="text-sm resize-none font-mono"
                          placeholder={`Descreva as atividades da coordenação...\n\n- Demandas atendidas:\n- Reuniões realizadas:\n- Projetos em andamento:\n\nObservações:`} />
                      </div>
                    </div>
                  ) : activeRel && (
                    <div className="space-y-3">
                      {activeRel.periodo && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{activeRel.periodo}</p>}
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-muted/20 p-4 rounded-lg border border-border/50">
                        {activeRel.conteudo || <span className="text-muted-foreground italic">Sem conteúdo</span>}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* â”€â”€ DEMANDA DIALOG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={demandaDialog} onOpenChange={(o) => { if (!o) setDemandaDialog(false); }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {editingId ? "Editar Demanda" : "Nova Demanda â€” " + coord?.nome}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Título */}
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Título da Demanda *</Label>
              <Input value={demandaForm.titulo} onChange={(e) => setDemandaForm((f) => ({ ...f, titulo: e.target.value }))}
                placeholder="Descreva brevemente a demanda" className="text-sm" />
            </div>

            {/* Descrição */}
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Descrição Detalhada</Label>
              <Textarea value={demandaForm.descricao} onChange={(e) => setDemandaForm((f) => ({ ...f, descricao: e.target.value }))}
                rows={3} className="text-sm resize-none" placeholder="Detalhes, contexto, observações..." />
            </div>

            {/* Solicitante */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><User className="w-3 h-3" /> Nome do Solicitante</Label>
              <Input value={demandaForm.solicitante} onChange={(e) => setDemandaForm((f) => ({ ...f, solicitante: e.target.value }))}
                placeholder="Nome completo" className="text-sm" />
            </div>

            {/* CPF */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><IdCard className="w-3 h-3" /> CPF do Solicitante</Label>
              <Input value={demandaForm.solicitante_cpf}
                onChange={(e) => setDemandaForm((f) => ({ ...f, solicitante_cpf: maskCPF(e.target.value) }))}
                placeholder="000.000.000-00" className="text-sm font-mono" maxLength={14} />
            </div>

            {/* Telefone solicitante */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone do Solicitante</Label>
              <Input value={demandaForm.solicitante_telefone} onChange={(e) => setDemandaForm((f) => ({ ...f, solicitante_telefone: e.target.value }))}
                placeholder="(92) 9xxxx-xxxx" className="text-sm" />
            </div>

            {/* Responsável */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Responsável (Coordenador)</Label>
              <Input value={demandaForm.responsavel} onChange={(e) => setDemandaForm((f) => ({ ...f, responsavel: e.target.value }))}
                placeholder={coord?.coordenador || "Nome do responsável"} className="text-sm" />
            </div>

            {/* Prioridade */}
            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <Select value={demandaForm.prioridade} onValueChange={(v) => setDemandaForm((f) => ({ ...f, prioridade: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{PRIORIDADE_LABEL[p as keyof typeof PRIORIDADE_LABEL] || p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Categoria da Demanda</Label>
              <Select
                value={demandaForm.categoria || "__empty"}
                onValueChange={(v) => setDemandaForm((f) => ({ ...f, categoria: v === "__empty" ? "" : v }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__empty">Selecionar...</SelectItem>
                  {categoriaOptions.map((categoria) => (
                    <SelectItem key={categoria} value={categoria}>{categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Coluna Kanban */}
            <div className="space-y-1">
              <Label className="text-xs">Status / Coluna</Label>
              <Select value={demandaForm.coluna_kanban} onValueChange={(v) => setDemandaForm((f) => ({ ...f, coluna_kanban: v }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{COLUNAS.map((c) => <SelectItem key={c} value={c}>{KANBAN_COLUMN_LABELS[c]}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Prazo */}
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Prazo</Label>
              <Input type="date" value={demandaForm.data_prazo} onChange={(e) => setDemandaForm((f) => ({ ...f, data_prazo: e.target.value }))} className="text-sm" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nível de Atenção</Label>
              <Select value={demandaForm.nivel_alerta} onValueChange={(v) => setDemandaForm((f) => ({ ...f, nivel_alerta: v as AlertLevel }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["none", "info", "warning", "danger"] as AlertLevel[]).map((level) => (
                    <SelectItem key={level} value={level}>{ALERT_CONFIG[level].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observação do Alerta</Label>
              <Input value={demandaForm.alerta_observacao} onChange={(e) => setDemandaForm((f) => ({ ...f, alerta_observacao: e.target.value }))}
                placeholder="Explique a atenção necessária" className="text-sm" />
            </div>

            {editingId && (alertsByDemand[editingId] || []).length > 0 && (
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-xs">Alertas ativos</Label>
                {(alertsByDemand[editingId] || []).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{alert.titulo}</p>
                      <p className="text-[10px] text-muted-foreground">{alert.mensagem}</p>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" disabled={resolvingAlertId === alert.id} onClick={() => resolveAlert(alert)}>
                      Tratar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDemandaDialog(false)}>Cancelar</Button>
            <Button onClick={saveDemanda} disabled={saving || !demandaForm.titulo.trim()}>
              {saving && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              {editingId ? "Atualizar" : "Registrar Demanda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ DELETE DEMANDA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover demanda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDemanda} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete relatório */}
      <AlertDialog open={!!deletingRel} onOpenChange={(o) => !o && setDeletingRel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover relatório?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteRelatorio} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default CoordenacaoPage;
