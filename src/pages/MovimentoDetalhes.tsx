import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  Clock,
  Download,
  Edit2,
  FileText,
  IdCard,
  LayoutList,
  Loader2,
  Paperclip,
  Phone,
  Plus,
  Search,
  SmilePlus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ALERT_CONFIG,
  COLUMN_CONFIG,
  KANBAN_COLUMN_LABELS,
  PRIORIDADE_COLORS,
  PRIORIDADE_LABEL,
  PRIORIDADES,
  KANBAN_COLUMNS,
  formatBytes,
  mapColumnToStatus,
  mapStatusToColumn,
  maskCPF,
  type AlertLevel,
  type KanbanColumn,
  type Prioridade,
} from "@/data/demandasKanban";
import {
  calculateSaudeResponseDate,
  findSaudeAtendimento,
  SAUDE_ATENDIMENTOS_POR_GRUPO,
  SAUDE_ATENDIMENTO_GRUPO_LABEL,
  type SaudeAtendimentoGrupo,
} from "@/data/saudeAtendimentos";
import { findSacSetor, type SacSetor } from "@/data/sacSetores";
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

interface MovimentoRow {
  slug: string;
  nome: string;
  descricao: string;
}

interface DemandaAnexo {
  id: string;
  demanda_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  storage_bucket: string;
  storage_path: string;
  tamanho_bytes: number | null;
  created_at: string;
  user_id: string;
}

interface HistoricoEntry {
  id: string;
  demanda_id: string;
  acao: string;
  descricao: string;
  created_at: string;
}

interface DemandaSac {
  id: string;
  atendimento_grupo: SaudeAtendimentoGrupo | null;
  atendimento_prazo_dias: number | null;
  atendimento_tipo: string | null;
  titulo: string;
  descricao: string;
  status: string;
  prioridade: Prioridade;
  responsavel: string;
  solicitante: string;
  solicitante_cpf: string;
  solicitante_telefone: string;
  categoria: string;
  data_prazo: string | null;
  coluna_kanban: string;
  coordenacao_id: string | null;
  coordenadoria_slug: string | null;
  coordenadoria_nome: string | null;
  setor_sac: string | null;
  notas_internas: string;
  nivel_alerta: AlertLevel;
  alerta_observacao: string;
  alerta_manual: boolean;
  alerta_vencimento_em: string | null;
  user_id: string;
  created_at: string;
}

interface NPSRespostas {
  atendimento_satisfatorio: boolean | null;
  problema_resolvido: boolean | null;
  recomendaria: boolean | null;
  nota: number | null;
  comentario: string;
}

interface NPSPending {
  demandaId: string;
  targetColumn: KanbanColumn | null;
}

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const emptyNPS = (): NPSRespostas => ({
  atendimento_satisfatorio: null,
  problema_resolvido: null,
  recomendaria: null,
  nota: null,
  comentario: "",
});

function SimNao({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
          value === true
            ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-400"
            : "border-border hover:bg-muted text-muted-foreground",
        )}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors",
          value === false
            ? "bg-red-500/20 border-red-500 text-red-700 dark:text-red-400"
            : "border-border hover:bg-muted text-muted-foreground",
        )}
      >
        Não
      </button>
    </div>
  );
}

interface FormState {
  atendimento_grupo: SaudeAtendimentoGrupo | "";
  atendimento_prazo_dias: string;
  atendimento_tipo: string;
  categoria: string;
  titulo: string;
  descricao: string;
  solicitante: string;
  solicitante_cpf: string;
  solicitante_telefone: string;
  responsavel: string;
  prioridade: Prioridade;
  coluna_kanban: KanbanColumn;
  data_prazo: string;
  notas_internas: string;
  nivel_alerta: AlertLevel;
  alerta_observacao: string;
}

const ACCEPTED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".xml",
  ".slx",
  ".html",
  ".htm",
];

const ACCEPTED_MIME_LABEL = ACCEPTED_EXTENSIONS.join(",");

const emptyForm = (): FormState => ({
  atendimento_grupo: "",
  atendimento_prazo_dias: "",
  atendimento_tipo: "",
  categoria: "",
  titulo: "",
  descricao: "",
  solicitante: "",
  solicitante_cpf: "",
  solicitante_telefone: "",
  responsavel: "",
  prioridade: "media",
  coluna_kanban: "Recebida",
  data_prazo: "",
  notas_internas: "",
  nivel_alerta: "none",
  alerta_observacao: "",
});

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");

const isAllowedFile = (file: File) => {
  const lower = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

const demandasColumnValue = (demanda: Pick<DemandaSac, "coluna_kanban" | "status">) => {
  if (KANBAN_COLUMNS.includes(demanda.coluna_kanban as KanbanColumn)) {
    return demanda.coluna_kanban as KanbanColumn;
  }
  return mapStatusToColumn(demanda.status);
};

function SacCard({
  demanda,
  colIdx,
  attachments,
  alerts,
  historico,
  resolvingAlertId,
  onEdit,
  onDelete,
  onMove,
  onNps,
  onDownloadAttachment,
  onResolveAlert,
}: {
  demanda: DemandaSac;
  colIdx: number;
  attachments: DemandaAnexo[];
  alerts: DemandaAlertRecord[];
  historico: HistoricoEntry[];
  resolvingAlertId: string | null;
  onEdit: (demanda: DemandaSac) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "left" | "right") => void;
  onNps: (id: string) => void;
  onDownloadAttachment: (attachment: DemandaAnexo) => void;
  onResolveAlert: (alert: DemandaAlertRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const column = (demandasColumnValue(demanda) || "Recebida") as KanbanColumn;
  const cfg = COLUMN_CONFIG[column];
  const topAlert = getTopActiveAlert(alerts);
  const alertMeta = getAlertPresentation(alerts);
  const AlertIcon = topAlert ? ALERT_CONFIG[topAlert.tipo as AlertLevel].icon : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all border-t-2",
        cfg.color,
        alertMeta.cardAccent,
      )}
    >
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">{demanda.titulo}</p>
            <p className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5 mt-0.5">
              <Clock className="w-2.5 h-2.5 shrink-0" />
              {formatDateTime(demanda.created_at)}
            </p>
            {demanda.descricao && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                {demanda.descricao}
              </p>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {column === "Concluida" && (
              <button onClick={() => onNps(demanda.id)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-primary" title="Pesquisa de satisfação (NPS)">
                <SmilePlus className="w-3 h-3" />
              </button>
            )}
            <button onClick={() => onEdit(demanda)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(demanda.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", PRIORIDADE_COLORS[demanda.prioridade])}>
            {PRIORIDADE_LABEL[demanda.prioridade]}
          </span>
          {demanda.categoria && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              {demanda.categoria}
            </span>
          )}
          {topAlert && AlertIcon && (
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", alertMeta.badge)}>
              <AlertIcon className="w-3 h-3 inline mr-1" />
              {alertMeta.label}
            </span>
          )}
          {attachments.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Paperclip className="w-3 h-3 inline mr-1" />
              {attachments.length}
            </span>
          )}
        </div>

        {demanda.solicitante && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{demanda.solicitante}</span>
            {demanda.solicitante_cpf && <span className="text-[10px] font-mono opacity-70">· {demanda.solicitante_cpf}</span>}
          </p>
        )}

        {demanda.data_prazo && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3 h-3 shrink-0" />
            {demanda.atendimento_tipo ? "Resposta prevista:" : "Prazo:"} {new Date(`${demanda.data_prazo}T00:00:00`).toLocaleDateString("pt-BR")}
          </p>
        )}

        <button onClick={() => setExpanded((current) => !current)} className="text-[10px] text-primary hover:underline">
          {expanded ? "Recolher detalhes" : "Ver detalhes"}
        </button>

        {expanded && (
          <div className="space-y-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
            {historico.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" />
                  Histórico
                </p>
                <div className="space-y-1">
                  {historico.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] text-foreground">{entry.descricao}</p>
                        <p className="text-[10px] text-muted-foreground/60">{formatDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {demanda.responsavel && <p><span className="font-medium text-foreground">Responsável:</span> {demanda.responsavel}</p>}
            {demanda.solicitante_telefone && (
              <p className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {demanda.solicitante_telefone}
              </p>
            )}
            {demanda.atendimento_tipo && (
              <div className="space-y-1">
                <p><span className="font-medium text-foreground">Atendimento:</span> {demanda.atendimento_tipo}</p>
                {demanda.atendimento_prazo_dias ? (
                  <p><span className="font-medium text-foreground">Prazo de atendimento:</span> {demanda.atendimento_prazo_dias} dias</p>
                ) : null}
              </div>
            )}
            {alerts.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">Alertas ativos</p>
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
            {demanda.notas_internas && (
              <p className="whitespace-pre-wrap">
                <span className="font-medium text-foreground">Notas internas:</span> {demanda.notas_internas}
              </p>
            )}
            {attachments.length > 0 && (
              <div className="space-y-1">
                <p className="font-medium text-foreground">Anexos</p>
                {attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    onClick={() => onDownloadAttachment(attachment)}
                    className="w-full text-left px-2 py-1 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <span className="text-foreground">{attachment.nome_arquivo}</span>
                    {attachment.tamanho_bytes ? ` Â· ${formatBytes(attachment.tamanho_bytes)}` : ""}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-1 pt-1 border-t border-border/30">
          <button
            onClick={() => onMove(demanda.id, "left")}
            disabled={colIdx === 0}
            className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Voltar
          </button>
          <button
            onClick={() => onMove(demanda.id, "right")}
            disabled={colIdx === KANBAN_COLUMNS.length - 1}
            className="flex-1 text-[10px] flex items-center justify-center gap-1 py-1 rounded hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Avançar
          </button>
        </div>
      </div>
    </motion.div>
  );
}

const MovimentoDetalhes = () => {
  const { id: routeSlug } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const setor = useMemo(() => findSacSetor(routeSlug), [routeSlug]);

  const [movimentoMeta, setMovimentoMeta] = useState<MovimentoRow | null>(null);
  const [coordenacaoId, setCoordenacaoId] = useState<string | null>(null);
  const [demandas, setDemandas] = useState<DemandaSac[]>([]);
  const [attachmentsByDemand, setAttachmentsByDemand] = useState<Record<string, DemandaAnexo[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPrio, setFilterPrio] = useState("all");
  const [filterAlert, setFilterAlert] = useState<DemandaAlertFilter>("all");
  const [alertsByDemand, setAlertsByDemand] = useState<Record<string, DemandaAlertRecord[]>>({});
  const [historyByDemand, setHistoryByDemand] = useState<Record<string, HistoricoEntry[]>>({});
  const [demandaDialog, setDemandaDialog] = useState(false);
  const [demandaForm, setDemandaForm] = useState<FormState>(emptyForm());
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DemandaSac | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);
  const [npsOpen, setNpsOpen] = useState(false);
  const [npsRespostas, setNpsRespostas] = useState<NPSRespostas>(emptyNPS());
  const [npsPending, setNpsPending] = useState<NPSPending | null>(null);
  const [npsSaving, setNpsSaving] = useState(false);
  const isSaudeSetor = setor?.slug === "saude";
  const categoriaOptions = useMemo(() => {
    const categorias = setor?.categorias ?? [];
    const current = demandaForm.categoria.trim();
    if (current && !categorias.includes(current)) return [...categorias, current];
    return categorias;
  }, [demandaForm.categoria, setor]);

  const fetchData = useCallback(async (currentSetor: SacSetor, options?: { cancelled?: boolean }) => {
    try {
      const [movimentoRes, coordRes, demandasRes] = await Promise.all([
        supabase.from("movimentos").select("slug, nome, descricao").eq("slug", currentSetor.slug).maybeSingle(),
        supabase.from("coordenacoes").select("id").eq("slug", currentSetor.coordenadoriaSlug).maybeSingle(),
        supabase.from("demandas").select("*").eq("setor_sac", currentSetor.slug).order("created_at", { ascending: false }),
      ]);

      if (options?.cancelled) return;
      if (movimentoRes.error) throw movimentoRes.error;
      if (coordRes.error) throw coordRes.error;
      if (demandasRes.error) throw demandasRes.error;

      const demandasData = (demandasRes.data as DemandaSac[]) || [];
      setMovimentoMeta((movimentoRes.data as MovimentoRow | null) ?? null);
      setCoordenacaoId((coordRes.data as { id: string } | null)?.id ?? null);
      setDemandas(demandasData);

      if (demandasData.length > 0) {
        try {
          await syncDemandaAlertRecords(supabase, demandasData, user?.user_id);
          const ids = demandasData.map((demanda) => demanda.id);
          const [{ data: attachmentRows, error: attachmentError }, activeAlerts, { data: historyRows }] = await Promise.all([
            supabase
              .from("demanda_anexos")
              .select("*")
              .in("demanda_id", ids)
              .order("created_at", { ascending: true }),
            fetchActiveDemandaAlerts(supabase, ids),
            supabase
              .from("logbook_entradas")
              .select("id, demanda_id, acao, descricao, created_at")
              .in("demanda_id", ids)
              .in("acao", ["criado", "mover_coluna"])
              .order("created_at", { ascending: true }),
          ]);

          if (options?.cancelled) return;
          if (attachmentError) throw attachmentError;

          const grouped = ((attachmentRows as DemandaAnexo[]) || []).reduce<Record<string, DemandaAnexo[]>>((acc, attachment) => {
            if (!acc[attachment.demanda_id]) acc[attachment.demanda_id] = [];
            acc[attachment.demanda_id].push(attachment);
            return acc;
          }, {});

          const historyGrouped = ((historyRows as HistoricoEntry[]) || []).reduce<Record<string, HistoricoEntry[]>>((acc, entry) => {
            if (!acc[entry.demanda_id]) acc[entry.demanda_id] = [];
            acc[entry.demanda_id].push(entry);
            return acc;
          }, {});

          setAttachmentsByDemand(grouped);
          setAlertsByDemand(groupActiveAlertsByDemand(activeAlerts));
          setHistoryByDemand(historyGrouped);
        } catch (error) {
          console.error("Erro ao carregar anexos ou alertas do setor SAC", error);
          if (!options?.cancelled) {
            setAttachmentsByDemand({});
            setAlertsByDemand({});
            setHistoryByDemand({});
          }
        }
      } else {
        setAttachmentsByDemand({});
        setAlertsByDemand({});
        setHistoryByDemand({});
      }
    } catch (error) {
      console.error("Erro ao carregar setor SAC", error);
      if (!options?.cancelled) {
        setMovimentoMeta(null);
        setCoordenacaoId(null);
        setDemandas([]);
        setAttachmentsByDemand({});
        setAlertsByDemand({});
        toast({
          title: "Erro ao carregar setor",
          description: error instanceof Error ? error.message : "Tente novamente em instantes.",
          variant: "destructive",
        });
      }
    } finally {
      if (!options?.cancelled) {
        setLoading(false);
      }
    }
  }, [toast, user?.user_id]);

  useEffect(() => {
    const requestState = { cancelled: false };
    setLoading(true);
    if (!setor) {
      setLoading(false);
      return;
    }
    void fetchData(setor, requestState);
    return () => {
      requestState.cancelled = true;
    };
  }, [fetchData, setor]);

  const filteredDemandas = useMemo(
    () =>
      demandas.filter((demanda) => {
        const searchTerm = search.toLowerCase();
        const matchSearch =
          !searchTerm ||
          demanda.titulo.toLowerCase().includes(searchTerm) ||
          demanda.solicitante.toLowerCase().includes(searchTerm);
        const matchPrio = filterPrio === "all" || demanda.prioridade === filterPrio;
        const matchAlert = matchesAlertFilter(alertsByDemand[demanda.id] || [], filterAlert);
        return matchSearch && matchPrio && matchAlert;
      }),
    [alertsByDemand, demandas, filterAlert, filterPrio, search],
  );

  const byColumn = useCallback(
    (column: KanbanColumn) => filteredDemandas.filter((demanda) => demandasColumnValue(demanda) === column),
    [filteredDemandas],
  );

  const counts = useMemo(
    () =>
      KANBAN_COLUMNS.reduce<Record<KanbanColumn, number>>((acc, column) => {
        acc[column] = demandas.filter((demanda) => demandasColumnValue(demanda) === column).length;
        return acc;
      }, { Recebida: 0, "Em Andamento": 0, Concluida: 0, Finalizado: 0, Cancelada: 0 }),
    [demandas],
  );

  const openNew = (column: KanbanColumn = "Recebida") => {
    setDemandaForm({ ...emptyForm(), coluna_kanban: column });
    setPendingFiles([]);
    setRemovedAttachmentIds([]);
    setEditingId(null);
    setDemandaDialog(true);
  };

  const openEdit = (demanda: DemandaSac) => {
    setDemandaForm({
      atendimento_grupo: demanda.atendimento_grupo || "",
      atendimento_prazo_dias: demanda.atendimento_prazo_dias ? String(demanda.atendimento_prazo_dias) : "",
      atendimento_tipo: demanda.atendimento_tipo || "",
      categoria: demanda.categoria || "",
      titulo: demanda.titulo,
      descricao: demanda.descricao || "",
      solicitante: demanda.solicitante || "",
      solicitante_cpf: demanda.solicitante_cpf || "",
      solicitante_telefone: demanda.solicitante_telefone || "",
      responsavel: demanda.responsavel || "",
      prioridade: demanda.prioridade || "media",
      coluna_kanban: demandasColumnValue(demanda),
      data_prazo: demanda.data_prazo || "",
      notas_internas: demanda.notas_internas || "",
      nivel_alerta: demanda.nivel_alerta || "none",
      alerta_observacao: demanda.alerta_observacao || "",
    });
    setPendingFiles([]);
    setRemovedAttachmentIds([]);
    setEditingId(demanda.id);
    setDemandaDialog(true);
  };

  const currentAttachments = editingId ? attachmentsByDemand[editingId] || [] : [];
  const visibleAttachments = currentAttachments.filter((attachment) => !removedAttachmentIds.includes(attachment.id));

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find((file) => !isAllowedFile(file));
    if (invalidFile) {
      toast({
        title: "Arquivo não permitido",
        description: `Use apenas: ${ACCEPTED_EXTENSIONS.join(", ")}`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }
    setPendingFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const removePendingFile = (fileName: string) => {
    setPendingFiles((current) => current.filter((file) => file.name !== fileName));
  };

  const markAttachmentForRemoval = (attachmentId: string) => {
    setRemovedAttachmentIds((current) => [...current, attachmentId]);
  };

  const uploadPendingFiles = useCallback(async (demandaId: string) => {
    if (!user) return;

    for (const file of pendingFiles) {
      const safeName = sanitizeFileName(file.name);
      const storagePath = `sac/${demandaId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("demanda-anexos")
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("demanda_anexos").insert({
        demanda_id: demandaId,
        user_id: user.user_id,
        nome_arquivo: file.name,
        tipo_arquivo: file.type || "application/octet-stream",
        storage_bucket: "demanda-anexos",
        storage_path: storagePath,
        tamanho_bytes: file.size,
      });
      if (insertError) throw insertError;
    }
  }, [pendingFiles, user]);

  const removeMarkedAttachments = useCallback(async () => {
    if (removedAttachmentIds.length === 0) return;
    const toRemove = currentAttachments.filter((attachment) => removedAttachmentIds.includes(attachment.id));

    for (const attachment of toRemove) {
      const { error: storageError } = await supabase.storage.from(attachment.storage_bucket || "demanda-anexos").remove([attachment.storage_path]);
      if (storageError) throw storageError;

      const { error: deleteError } = await supabase.from("demanda_anexos").delete().eq("id", attachment.id);
      if (deleteError) throw deleteError;
    }
  }, [currentAttachments, removedAttachmentIds]);

  const handleDownloadAttachment = async (attachment: DemandaAnexo) => {
    const { data, error } = await supabase.storage.from(attachment.storage_bucket || "demanda-anexos").download(attachment.storage_path);
    if (error || !data) {
      toast({ title: "Erro ao baixar anexo", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.nome_arquivo;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaudeAtendimentoChange = (tipo: string) => {
    const atendimento = findSaudeAtendimento(tipo);
    setDemandaForm((current) => ({
      ...current,
      atendimento_tipo: tipo,
      atendimento_grupo: atendimento?.grupo || "",
      atendimento_prazo_dias: atendimento ? String(atendimento.prazoDias) : "",
      data_prazo: atendimento ? calculateSaudeResponseDate(atendimento.prazoDias) : current.data_prazo,
    }));
  };

  const handleSaudePrazoDiasChange = (value: string) => {
    const onlyDigits = value.replace(/\D/g, "").slice(0, 3);
    setDemandaForm((current) => ({
      ...current,
      atendimento_prazo_dias: onlyDigits,
      data_prazo: onlyDigits ? calculateSaudeResponseDate(Number(onlyDigits)) : current.data_prazo,
    }));
  };

  const handleSave = async () => {
    if (!setor || !user?.user_id) return;
    if (!demandaForm.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }

    const normalizedAtendimento = isSaudeSetor
      ? findSaudeAtendimento(demandaForm.atendimento_tipo)
      : null;
    const fallbackCategoria = isSaudeSetor ? "Saúde" : setor.nome;
    const categoriaInformada = demandaForm.categoria.trim();

    const payload = {
      titulo: demandaForm.titulo.trim(),
      descricao: demandaForm.descricao.trim(),
      status: mapColumnToStatus(demandaForm.coluna_kanban),
      prioridade: demandaForm.prioridade,
      responsavel: demandaForm.responsavel.trim(),
      solicitante: demandaForm.solicitante.trim(),
      solicitante_cpf: demandaForm.solicitante_cpf.trim(),
      solicitante_telefone: demandaForm.solicitante_telefone.trim(),
      atendimento_grupo: isSaudeSetor ? normalizedAtendimento?.grupo || null : null,
      atendimento_prazo_dias: isSaudeSetor && demandaForm.atendimento_prazo_dias ? Number(demandaForm.atendimento_prazo_dias) : null,
      atendimento_tipo: isSaudeSetor ? demandaForm.atendimento_tipo.trim() || null : null,
      categoria: categoriaInformada || fallbackCategoria,
      data_prazo: demandaForm.data_prazo || null,
      coluna_kanban: demandaForm.coluna_kanban,
      setor_sac: setor.slug,
      coordenacao_id: coordenacaoId,
      coordenadoria_slug: setor.coordenadoriaSlug,
      coordenadoria_nome: setor.coordenadoriaNome,
      notas_internas: demandaForm.notas_internas.trim(),
      nivel_alerta: demandaForm.nivel_alerta,
      alerta_observacao: demandaForm.alerta_observacao.trim(),
      alerta_manual: demandaForm.nivel_alerta !== "none",
      alerta_vencimento_em: demandaForm.data_prazo || null,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      let demandaId = editingId;
      let saveError: Error | null = null;

      const persistDemanda = async (categoria: string) => {
        const payloadToPersist = { ...payload, categoria };
        if (editingId) {
          const { error } = await supabase.from("demandas").update(payloadToPersist).eq("id", editingId);
          if (error) throw error;
          return editingId;
        }

        const { data, error } = await supabase
          .from("demandas")
          .insert({ ...payloadToPersist, user_id: user.user_id })
          .select("id")
          .single();
        if (error) throw error;
        return (data as { id: string }).id;
      };

      try {
        demandaId = await persistDemanda(payload.categoria);
      } catch (firstError) {
        saveError = firstError as Error;
        if (payload.categoria !== fallbackCategoria) {
          demandaId = await persistDemanda(fallbackCategoria);
          saveError = null;
        }
      }

      if (saveError) throw saveError;

      if (!demandaId) throw new Error("Demanda inválida");

      if (!editingId) {
        await supabase.from("logbook_entradas").insert({
          user_id: user.user_id,
          demanda_id: demandaId,
          acao: "criado",
          descricao: `Demanda registrada em ${KANBAN_COLUMN_LABELS[demandaForm.coluna_kanban]}`,
        });
      }

      await removeMarkedAttachments();
      await uploadPendingFiles(demandaId);

      setDemandaDialog(false);
      setEditingId(null);
      setPendingFiles([]);
      setRemovedAttachmentIds([]);
      setDemandaForm(emptyForm());
      toast({ title: editingId ? "Demanda atualizada!" : "Demanda registrada!" });
      await fetchData(setor);
    } catch (error) {
      toast({
        title: "Erro ao salvar demanda",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !setor) return;
    setDeleting(true);
    try {
      const targetAttachments = attachmentsByDemand[deleteTarget.id] || [];
      if (targetAttachments.length > 0) {
        await supabase.storage.from("demanda-anexos").remove(targetAttachments.map((attachment) => attachment.storage_path));
      }

      await supabase.from("demanda_anexos").delete().eq("demanda_id", deleteTarget.id);
      const { error } = await supabase.from("demandas").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      setDeleteTarget(null);
      toast({ title: "Demanda removida" });
      await fetchData(setor);
    } catch {
      toast({ title: "Erro ao remover demanda", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const executeMoveColumn = async (id: string, nextColumn: KanbanColumn) => {
    if (!setor) return;
    const fromDemanda = demandas.find((d) => d.id === id);
    const fromColumn = fromDemanda ? demandasColumnValue(fromDemanda) : null;

    const { error } = await supabase
      .from("demandas")
      .update({
        coluna_kanban: nextColumn,
        status: mapColumnToStatus(nextColumn),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Não foi possível mover a demanda", variant: "destructive" });
      return;
    }

    if (user?.user_id && fromColumn) {
      await supabase.from("logbook_entradas").insert({
        user_id: user.user_id,
        demanda_id: id,
        acao: "mover_coluna",
        descricao: `${KANBAN_COLUMN_LABELS[fromColumn]} → ${KANBAN_COLUMN_LABELS[nextColumn]}`,
      });
    }

    toast({ title: "Status atualizado" });
    await fetchData(setor);
  };

  const moveDemanda = async (id: string, dir: "left" | "right") => {
    if (!setor) return;
    const demanda = demandas.find((item) => item.id === id);
    if (!demanda) return;

    const currentColumn = demandasColumnValue(demanda);
    const idx = KANBAN_COLUMNS.indexOf(currentColumn);
    const nextColumn = KANBAN_COLUMNS[dir === "right" ? idx + 1 : idx - 1];
    if (!nextColumn) return;

    if (dir === "right" && currentColumn === "Concluida" && nextColumn === "Finalizado") {
      setNpsRespostas(emptyNPS());
      setNpsPending({ demandaId: id, targetColumn: nextColumn });
      setNpsOpen(true);
      return;
    }

    await executeMoveColumn(id, nextColumn);
  };

  const openNpsForCard = (demandaId: string) => {
    setNpsRespostas(emptyNPS());
    setNpsPending({ demandaId, targetColumn: null });
    setNpsOpen(true);
  };

  const handleNpsSubmit = async () => {
    if (!npsPending || !setor || !user?.user_id) return;
    setNpsSaving(true);
    try {
      await supabase.from("logbook_entradas").insert({
        user_id: user.user_id,
        demanda_id: npsPending.demandaId,
        acao: "nps",
        descricao: JSON.stringify(npsRespostas),
      });

      if (npsPending.targetColumn) {
        await executeMoveColumn(npsPending.demandaId, npsPending.targetColumn);
      }

      setNpsOpen(false);
      setNpsPending(null);
      setNpsRespostas(emptyNPS());
      toast({ title: npsPending.targetColumn ? "NPS registrado e card movido!" : "NPS registrado!" });
      if (!npsPending.targetColumn) await fetchData(setor);
    } catch {
      toast({ title: "Erro ao registrar NPS", variant: "destructive" });
    } finally {
      setNpsSaving(false);
    }
  };

  const resolveAlert = async (alert: DemandaAlertRecord) => {
    if (!setor) return;
    setResolvingAlertId(alert.id);
    try {
      await resolveDemandaAlert(supabase, alert);
      toast({ title: "Alerta tratado" });
      await fetchData(setor);
    } catch {
      toast({ title: "Erro ao tratar alerta", variant: "destructive" });
    } finally {
      setResolvingAlertId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!setor) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Setor não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  const titulo = movimentoMeta?.nome || setor.nome;
  const descricao = movimentoMeta?.descricao || setor.descricao;
  const Icon = setor.icon;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 justify-between">
          <div className="flex items-start gap-3">
            <button onClick={() => navigate("/movimentos")} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground mt-0.5 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground leading-tight">{titulo}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-14 sm:ml-0">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60">Coordenadoria fixa</p>
              <p className="text-xs font-semibold text-foreground">{setor.coordenadoriaNome}</p>
            </div>
            <Button size="sm" onClick={() => openNew()} className="gap-1.5 h-9">
              <Plus className="w-3.5 h-3.5" />
              Nova Demanda
            </Button>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-1">
          {KANBAN_COLUMNS.map((column) => {
            const cfg = COLUMN_CONFIG[column];
            const SummaryIcon = cfg.icon;
            return (
              <div key={column} className={cn("rounded-xl border border-border/50 p-4 min-w-[140px] flex-1", cfg.header)}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{counts[column]}</p>
                    <p className="text-xs text-muted-foreground mt-1">{KANBAN_COLUMN_LABELS[column]}</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", cfg.badge)}>
                    <SummaryIcon className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-1 border-b border-border/60">
            <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px border-primary text-primary">
              <LayoutList className="w-3.5 h-3.5" />
              Kanban de Demandas
              {demandas.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                  {demandas.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar demanda ou solicitante..." className="pl-8 h-8 text-xs" />
            </div>
            <Select value={filterPrio} onValueChange={setFilterPrio}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Prioridade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                {PRIORIDADES.map((priority) => <SelectItem key={priority} value={priority}>{PRIORIDADE_LABEL[priority]}</SelectItem>)}
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
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 items-start">
            {KANBAN_COLUMNS.map((column, colIdx) => {
              const cfg = COLUMN_CONFIG[column];
              const cards = byColumn(column);
              const ColumnIcon = cfg.icon;
              return (
                <div key={column} className="flex flex-col gap-2 min-w-[220px] flex-1">
                  <div className={cn("flex items-center justify-between px-3 py-2 rounded-xl border border-border/50", cfg.header)}>
                    <div className="flex items-center gap-2">
                      <ColumnIcon className={cn("w-3.5 h-3.5", cfg.badge.split(" ")[1])} />
                      <span className="text-xs font-semibold text-foreground">{KANBAN_COLUMN_LABELS[column]}</span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", cfg.badge)}>{cards.length}</span>
                    </div>
                    <button onClick={() => openNew(column)} className="p-1 rounded hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground" title={`Nova demanda em ${KANBAN_COLUMN_LABELS[column]}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 min-h-[120px]">
                    <AnimatePresence>
                      {cards.map((demanda) => (
                        <SacCard
                          key={demanda.id}
                          demanda={demanda}
                          colIdx={colIdx}
                          attachments={attachmentsByDemand[demanda.id] || []}
                          alerts={alertsByDemand[demanda.id] || []}
                          historico={historyByDemand[demanda.id] || []}
                          resolvingAlertId={resolvingAlertId}
                          onEdit={openEdit}
                          onDelete={(id) => setDeleteTarget(demandas.find((item) => item.id === id) || null)}
                          onMove={moveDemanda}
                          onNps={openNpsForCard}
                          onDownloadAttachment={handleDownloadAttachment}
                          onResolveAlert={resolveAlert}
                        />
                      ))}
                    </AnimatePresence>
                    {cards.length === 0 && (
                      <div className="border-2 border-dashed border-border/40 rounded-xl p-6 text-center cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openNew(column)}>
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
      </motion.div>

      <Dialog open={demandaDialog} onOpenChange={(open) => !open && setDemandaDialog(false)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              {editingId ? `Editar Demanda — ${titulo}` : `Nova Demanda — ${titulo}`}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Setor SAC</Label>
              <Input value={titulo} disabled className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Coordenadoria fixa</Label>
              <Input value={setor.coordenadoriaNome} disabled className="text-sm" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Título da Demanda *</Label>
              <Input value={demandaForm.titulo} onChange={(event) => setDemandaForm((current) => ({ ...current, titulo: event.target.value }))} placeholder="Descreva brevemente a demanda" className="text-sm" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Descrição Detalhada</Label>
              <Textarea value={demandaForm.descricao} onChange={(event) => setDemandaForm((current) => ({ ...current, descricao: event.target.value }))} rows={3} className="text-sm resize-none" placeholder="Detalhes, contexto, observações..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><User className="w-3 h-3" /> Nome do Solicitante</Label>
              <Input value={demandaForm.solicitante} onChange={(event) => setDemandaForm((current) => ({ ...current, solicitante: event.target.value }))} placeholder="Nome completo" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><IdCard className="w-3 h-3" /> CPF do Solicitante</Label>
              <Input value={demandaForm.solicitante_cpf} onChange={(event) => setDemandaForm((current) => ({ ...current, solicitante_cpf: maskCPF(event.target.value) }))} placeholder="000.000.000-00" className="text-sm font-mono" maxLength={14} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone do Solicitante</Label>
              <Input value={demandaForm.solicitante_telefone} onChange={(event) => setDemandaForm((current) => ({ ...current, solicitante_telefone: event.target.value }))} placeholder="(92) 9xxxx-xxxx" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs flex items-center gap-1"><Users className="w-3 h-3" /> Responsável</Label>
              <Input value={demandaForm.responsavel} onChange={(event) => setDemandaForm((current) => ({ ...current, responsavel: event.target.value }))} placeholder="Nome do responsável" className="text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prioridade</Label>
              <Select value={demandaForm.prioridade} onValueChange={(value) => setDemandaForm((current) => ({ ...current, prioridade: value as Prioridade }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORIDADES.map((priority) => <SelectItem key={priority} value={priority}>{PRIORIDADE_LABEL[priority]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria da Demanda</Label>
              <Select
                value={demandaForm.categoria || "__empty"}
                onValueChange={(value) => setDemandaForm((current) => ({ ...current, categoria: value === "__empty" ? "" : value }))}
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
            {isSaudeSetor && (
              <>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                  <div className="space-y-1 sm:col-span-3">
                    <Label className="text-xs">Tipo de Atendimento</Label>
                    <Select value={demandaForm.atendimento_tipo} onValueChange={handleSaudeAtendimentoChange}>
                      <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione o atendimento de saúde" /></SelectTrigger>
                      <SelectContent>
                        {(Object.keys(SAUDE_ATENDIMENTOS_POR_GRUPO) as SaudeAtendimentoGrupo[]).map((grupo) => (
                          <div key={grupo}>
                            <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                              {SAUDE_ATENDIMENTO_GRUPO_LABEL[grupo]}
                            </div>
                            {SAUDE_ATENDIMENTOS_POR_GRUPO[grupo].map((atendimento) => (
                              <SelectItem key={atendimento.tipo} value={atendimento.tipo}>
                                {atendimento.tipo} · {atendimento.prazoDias} dias
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Prazo de Atendimento</Label>
                    <Input value={demandaForm.atendimento_prazo_dias} onChange={(event) => handleSaudePrazoDiasChange(event.target.value)} placeholder="Dias" className="text-sm" inputMode="numeric" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Previsão de Resposta</Label>
                    <Input type="date" value={demandaForm.data_prazo} onChange={(event) => setDemandaForm((current) => ({ ...current, data_prazo: event.target.value }))} className="text-sm" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Status / Coluna</Label>
              <Select value={demandaForm.coluna_kanban} onValueChange={(value) => setDemandaForm((current) => ({ ...current, coluna_kanban: value as KanbanColumn }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{KANBAN_COLUMNS.map((column) => <SelectItem key={column} value={column}>{KANBAN_COLUMN_LABELS[column]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!isSaudeSetor && (
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Prazo</Label>
                <Input type="date" value={demandaForm.data_prazo} onChange={(event) => setDemandaForm((current) => ({ ...current, data_prazo: event.target.value }))} className="text-sm" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Nível de Atenção</Label>
              <Select value={demandaForm.nivel_alerta} onValueChange={(value) => setDemandaForm((current) => ({ ...current, nivel_alerta: value as AlertLevel }))}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{(["none", "info", "warning", "danger"] as AlertLevel[]).map((level) => <SelectItem key={level} value={level}>{ALERT_CONFIG[level].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observação do Alerta</Label>
              <Input value={demandaForm.alerta_observacao} onChange={(event) => setDemandaForm((current) => ({ ...current, alerta_observacao: event.target.value }))} placeholder="Explique a atenção necessária" className="text-sm" />
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
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs">Notas internas</Label>
              <Textarea value={demandaForm.notas_internas} onChange={(event) => setDemandaForm((current) => ({ ...current, notas_internas: event.target.value }))} rows={3} className="text-sm resize-none" placeholder="Observações internas, histórico e contexto do atendimento..." />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label className="text-xs">Anexos</Label>
              <Input type="file" multiple accept={ACCEPTED_MIME_LABEL} onChange={handleFilesSelected} className="text-sm" />
              <p className="text-[10px] text-muted-foreground">Formatos aceitos: {ACCEPTED_EXTENSIONS.join(", ")}</p>
              {visibleAttachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-foreground">Arquivos já enviados</p>
                  {visibleAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{attachment.nome_arquivo}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.tamanho_bytes)}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => handleDownloadAttachment(attachment)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => markAttachmentForRemoval(attachment.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-foreground">Arquivos para upload</p>
                  {pendingFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-[10px] text-muted-foreground">{formatBytes(file.size)}</p>
                      </div>
                      <button type="button" onClick={() => removePendingFile(file.name)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDemandaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !demandaForm.titulo.trim()}>
              {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {editingId ? "Atualizar Demanda" : "Registrar Demanda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={npsOpen} onOpenChange={(open) => { if (!open) { setNpsOpen(false); setNpsPending(null); setNpsRespostas(emptyNPS()); } }}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SmilePlus className="w-4 h-4 text-primary" />
              Pesquisa de Satisfação (NPS)
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">1. O atendimento foi satisfatório?</p>
              <SimNao
                value={npsRespostas.atendimento_satisfatorio}
                onChange={(v) => setNpsRespostas((r) => ({ ...r, atendimento_satisfatorio: v }))}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">2. O problema foi resolvido?</p>
              <SimNao
                value={npsRespostas.problema_resolvido}
                onChange={(v) => setNpsRespostas((r) => ({ ...r, problema_resolvido: v }))}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">3. Você recomendaria nosso serviço?</p>
              <SimNao
                value={npsRespostas.recomendaria}
                onChange={(v) => setNpsRespostas((r) => ({ ...r, recomendaria: v }))}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">4. De 0 a 10, como avalia o atendimento?</p>
              <div className="flex gap-1 flex-wrap">
                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNpsRespostas((r) => ({ ...r, nota: n }))}
                    className={cn(
                      "w-9 h-9 text-xs font-semibold rounded-lg border transition-colors",
                      npsRespostas.nota === n
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">5. Comentários ou sugestões</p>
              <Textarea
                value={npsRespostas.comentario}
                onChange={(e) => setNpsRespostas((r) => ({ ...r, comentario: e.target.value }))}
                rows={3}
                placeholder="Opcional — relate sua experiência..."
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setNpsOpen(false); setNpsPending(null); setNpsRespostas(emptyNPS()); }}>
              Cancelar
            </Button>
            <Button onClick={handleNpsSubmit} disabled={npsSaving}>
              {npsSaving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
              {npsPending?.targetColumn ? "Registrar e Avançar" : "Registrar NPS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover demanda?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove a demanda e todos os anexos vinculados.</AlertDialogDescription>
        </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MovimentoDetalhes;
