import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Search, Clock, CheckCircle2, AlertTriangle, ChevronRight,
  Edit2, Trash2, Loader2, Bot, Star, SmilePlus, X,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status = "pendente" | "andamento" | "concluida" | "atrasada";
type Prioridade = "urgente" | "alta" | "media" | "baixa";

interface Demanda {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string;
  status: Status;
  prioridade: Prioridade;
  responsavel: string;
  solicitante: string;
  categoria: string;
  data_prazo: string | null;
  created_at: string;
}

interface NPSRespostas {
  bem_atendido: boolean | null;
  orientacao_ok: boolean | null;
  ficou_duvida: boolean | null;
  nota: number | null;
  melhoria: string;
}

const emptyNPS = (): NPSRespostas => ({
  bem_atendido: null,
  orientacao_ok: null,
  ficou_duvida: null,
  nota: null,
  melhoria: "",
});

const statusConfig: Record<Status, { label: string; icon: any; style: string }> = {
  pendente: { label: "Pendente", icon: Clock, style: "bg-warning/10 text-warning" },
  andamento: { label: "Em andamento", icon: Clock, style: "bg-info/10 text-info" },
  concluida: { label: "Concluída", icon: CheckCircle2, style: "bg-success/10 text-success" },
  atrasada: { label: "Atrasada", icon: AlertTriangle, style: "bg-destructive/10 text-destructive" },
};

const prioridadeStyles: Record<Prioridade, string> = {
  urgente: "bg-destructive/10 text-destructive border-destructive/20",
  alta: "bg-warning/10 text-warning border-warning/20",
  media: "bg-info/10 text-info border-info/20",
  baixa: "bg-muted text-muted-foreground border-border",
};

const CATEGORIAS = ["Infraestrutura", "Saúde", "Segurança", "Educação", "Social", "Legislativo", "Cultura", "Meio Ambiente", "Outro"];

const logEntry = async (userId: string, origemId: string, acao: string, descricao: string) => {
  await supabase.from("logbook_entradas").insert({
    user_id: userId, origem: "demanda", origem_id: origemId, acao, descricao,
  });
};

const emptyForm = (): Omit<Demanda, "id" | "user_id" | "created_at"> => ({
  titulo: "", descricao: "", status: "pendente", prioridade: "media",
  responsavel: "", solicitante: "", categoria: "", data_prazo: null,
});

/* ─── NPS Sim/Não button ─────────────────────────────────────── */
const SimNao = ({
  value, onChange, label,
}: { value: boolean | null; onChange: (v: boolean) => void; label: string }) => (
  <div className="space-y-2">
    <p className="text-sm font-medium text-foreground">{label}</p>
    <div className="flex gap-2">
      {[true, false].map((opt) => (
        <button
          key={String(opt)}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
            value === opt
              ? opt
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "bg-destructive border-destructive text-white"
              : "border-border text-muted-foreground hover:border-muted-foreground"
          )}
        >
          {opt ? "Sim" : "Não"}
        </button>
      ))}
    </div>
  </div>
);

/* ─── NPS Dialog ─────────────────────────────────────────────── */
interface NPSDialogProps {
  open: boolean;
  demandaTitulo: string;
  respostas: NPSRespostas;
  onChange: (r: NPSRespostas) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitting: boolean;
}

const NPSDialog = ({ open, demandaTitulo, respostas, onChange, onSubmit, onCancel, submitting }: NPSDialogProps) => {
  const isValid =
    respostas.bem_atendido !== null &&
    respostas.orientacao_ok !== null &&
    respostas.ficou_duvida !== null &&
    respostas.nota !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <SmilePlus className="w-4 h-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Pesquisa de Satisfação</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-normal truncate max-w-[340px]">{demandaTitulo}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            Preencha junto com o cidadão antes de concluir o atendimento. Todos os campos marcados são obrigatórios.
          </div>

          {/* Q1 */}
          <SimNao
            value={respostas.bem_atendido}
            onChange={(v) => onChange({ ...respostas, bem_atendido: v })}
            label="1. Você sentiu que foi bem atendido(a)?"
          />

          {/* Q2 */}
          <SimNao
            value={respostas.orientacao_ok}
            onChange={(v) => onChange({ ...respostas, orientacao_ok: v })}
            label="2. A equipe conseguiu te orientar direitinho?"
          />

          {/* Q3 */}
          <SimNao
            value={respostas.ficou_duvida}
            onChange={(v) => onChange({ ...respostas, ficou_duvida: v })}
            label="3. Ficou alguma dúvida depois do atendimento?"
          />

          {/* Q4 — Nota 0-10 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">4. De 0 a 10, que nota você daria para esse atendimento?</p>
            <div className="flex gap-1.5 flex-wrap">
              {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ ...respostas, nota: n })}
                  className={cn(
                    "w-9 h-9 rounded-lg border text-sm font-bold transition-all",
                    respostas.nota === n
                      ? n >= 9
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : n >= 7
                          ? "bg-yellow-400 border-yellow-400 text-white"
                          : "bg-destructive border-destructive text-white"
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {respostas.nota !== null && (
              <p className="text-xs text-muted-foreground">
                {respostas.nota >= 9 ? "😊 Excelente!" : respostas.nota >= 7 ? "🙂 Bom" : "😟 Precisa melhorar"}
              </p>
            )}
          </div>

          {/* Q5 — Campo livre */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              5. E, falando bem sinceramente, tem alguma coisa que você acha que poderia ser melhor?
            </p>
            <textarea
              value={respostas.melhoria}
              onChange={(e) => onChange({ ...respostas, melhoria: e.target.value })}
              placeholder="Descreva aqui sugestões ou críticas (opcional)..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!isValid || submitting}
            className="gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SmilePlus className="w-4 h-4" />}
            {submitting ? "Enviando..." : "Enviar NPS e Concluir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const Demandas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Demanda | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Demanda | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailTarget, setDetailTarget] = useState<Demanda | null>(null);

  /* NPS state */
  const [npsOpen, setNpsOpen] = useState(false);
  const [npsRespostas, setNpsRespostas] = useState<NPSRespostas>(emptyNPS());
  const [npsSubmitting, setNpsSubmitting] = useState(false);
  const [npsDemandaId, setNpsDemandaId] = useState<string | null>(null);
  const [npsPendingForm, setNpsPendingForm] = useState<typeof form | null>(null);
  const [demandasComNPS, setDemandasComNPS] = useState<Set<string>>(new Set());

  const fetchDemandas = async () => {
    const { data } = await supabase
      .from("demandas")
      .select("*")
      .order("created_at", { ascending: false });
    setDemandas((data as Demanda[]) || []);
    setLoading(false);
  };

  const fetchNPSFeitos = async () => {
    const { data } = await supabase
      .from("logbook_entradas")
      .select("origem_id")
      .eq("origem", "demanda")
      .eq("acao", "nps");
    if (data) setDemandasComNPS(new Set(data.map((d) => d.origem_id)));
  };

  useEffect(() => {
    fetchDemandas();
    fetchNPSFeitos();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (d: Demanda) => {
    setEditTarget(d);
    setForm({
      titulo: d.titulo, descricao: d.descricao, status: d.status, prioridade: d.prioridade,
      responsavel: d.responsavel, solicitante: d.solicitante, categoria: d.categoria, data_prazo: d.data_prazo,
    });
    setShowForm(true);
    setDetailTarget(null);
  };

  /* Salvar a demanda de verdade */
  const persistSave = async (targetId: string | null, formData: typeof form) => {
    setSaving(true);
    try {
      if (targetId) {
        const { error } = await supabase.from("demandas").update({ ...formData }).eq("id", targetId);
        if (error) throw error;
        toast({ title: "Demanda atualizada" });
        await logEntry(user!.user_id, targetId, "atualizado", `Demanda "${formData.titulo}" atualizada — status: ${formData.status}`);
      } else {
        const { data: inserted, error } = await supabase.from("demandas").insert({ ...formData, user_id: user!.user_id }).select("id").single();
        if (error) throw error;
        toast({ title: "Demanda criada com sucesso" });
        if (inserted?.id) await logEntry(user!.user_id, inserted.id, "criado", `Nova demanda: "${formData.titulo}" — prioridade: ${formData.prioridade}`);
      }
      setShowForm(false);
      fetchDemandas();
      fetchNPSFeitos();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    /* Bloquear concluída sem NPS */
    if (form.status === "concluida") {
      const demandaId = editTarget?.id ?? null;
      const jaTemNPS = demandaId ? demandasComNPS.has(demandaId) : false;

      if (!jaTemNPS) {
        /* Abre popup NPS antes de salvar */
        setNpsRespostas(emptyNPS());
        setNpsDemandaId(demandaId);
        setNpsPendingForm({ ...form });
        setNpsOpen(true);
        return;
      }
    }

    await persistSave(editTarget?.id ?? null, form);
  };

  /* Abrir NPS de um card já concluído (re-fill) */
  const openNPSForCard = (demanda: Demanda) => {
    setNpsRespostas(emptyNPS());
    setNpsDemandaId(demanda.id);
    setNpsPendingForm(null); // não vai salvar demanda de novo
    setNpsOpen(true);
  };

  const handleNPSSubmit = async () => {
    if (!npsRespostas.bem_atendido === null || npsRespostas.nota === null) return;
    setNpsSubmitting(true);
    try {
      const descricao = JSON.stringify({
        bem_atendido: npsRespostas.bem_atendido,
        orientacao_ok: npsRespostas.orientacao_ok,
        ficou_duvida: npsRespostas.ficou_duvida,
        nota: npsRespostas.nota,
        melhoria: npsRespostas.melhoria,
      });

      const origemId = npsDemandaId || "novo";
      await supabase.from("logbook_entradas").insert({
        user_id: user!.user_id,
        origem: "demanda",
        origem_id: origemId,
        acao: "nps",
        descricao,
      });

      toast({ title: `NPS registrado! Nota: ${npsRespostas.nota}/10 ⭐` });
      setDemandasComNPS((prev) => new Set([...prev, origemId]));

      /* Se havia um save pendente, executa agora */
      if (npsPendingForm) {
        setNpsOpen(false);
        await persistSave(npsDemandaId, npsPendingForm);
      } else {
        setNpsOpen(false);
      }
    } catch {
      toast({ title: "Erro ao registrar NPS", variant: "destructive" });
    } finally {
      setNpsSubmitting(false);
      setNpsPendingForm(null);
      setNpsDemandaId(null);
    }
  };

  const handleNPSCancel = () => {
    setNpsOpen(false);
    setNpsPendingForm(null);
    setNpsDemandaId(null);
    if (npsPendingForm) {
      toast({
        title: "NPS obrigatório",
        description: "Preencha a pesquisa de satisfação para concluir a demanda.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await logEntry(user!.user_id, deleteTarget.id, "cancelado", `Demanda "${deleteTarget.titulo}" excluída`);
      const { error } = await supabase.from("demandas").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Demanda removida" });
      setDeleteTarget(null);
      fetchDemandas();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleAnalisarIA = (d: Demanda) => {
    const prompt = `Analise detalhadamente a seguinte demanda do gabinete parlamentar e forneça insights, sugestões de encaminhamento e próximos passos estratégicos:

**Título:** ${d.titulo}
**Status:** ${statusConfig[d.status].label}
**Prioridade:** ${d.prioridade}
**Categoria:** ${d.categoria || "Não informada"}
**Responsável:** ${d.responsavel || "Não definido"}
**Solicitante:** ${d.solicitante || "Não informado"}
**Prazo:** ${d.data_prazo ? new Date(d.data_prazo + "T00:00:00").toLocaleDateString("pt-BR") : "Não definido"}
**Descrição:** ${d.descricao || "Sem descrição"}

Por favor, forneça: 1) Análise da situação atual, 2) Riscos e oportunidades, 3) Sugestões de encaminhamento, 4) Próximos passos concretos.`;
    navigate("/agente-ia", { state: { prompt } });
  };

  const filtered = demandas.filter((d) => {
    const matchSearch = d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.responsavel.toLowerCase().includes(search.toLowerCase()) ||
      d.categoria.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    todos: demandas.length,
    pendente: demandas.filter((d) => d.status === "pendente").length,
    andamento: demandas.filter((d) => d.status === "andamento").length,
    concluida: demandas.filter((d) => d.status === "concluida").length,
  };

  /* Título da demanda para o popup NPS */
  const npsDemandaTitulo =
    npsPendingForm?.titulo ||
    demandas.find((d) => d.id === npsDemandaId)?.titulo ||
    "Demanda";

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Demandas</h1>
            <p className="text-sm text-muted-foreground">Gestão de demandas do gabinete</p>
          </div>
          <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0">
            <Plus className="w-4 h-4 mr-2" />
            Nova Demanda
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["todos", "pendente", "andamento", "concluida"] as const).map((status) => {
            const labels = { todos: "Total", pendente: "Pendentes", andamento: "Em Andamento", concluida: "Concluídas" };
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`glass-card rounded-lg p-3 text-center transition-all ${filterStatus === status ? "ring-2 ring-primary" : ""}`}
              >
                <p className="text-2xl font-bold font-display text-foreground">{counts[status]}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{labels[status]}</p>
              </button>
            );
          })}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar demandas..."
            className="w-full h-9 pl-10 pr-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((demanda) => {
              const sc = statusConfig[demanda.status];
              const isConcluida = demanda.status === "concluida";
              const temNPS = demandasComNPS.has(demanda.id);

              return (
                <motion.div
                  key={demanda.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => setDetailTarget(demanda)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.style}`}>
                          <sc.icon className="w-3 h-3" />
                          {sc.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${prioridadeStyles[demanda.prioridade]}`}>
                          {demanda.prioridade}
                        </span>
                        {demanda.categoria && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                            {demanda.categoria}
                          </span>
                        )}
                        {/* NPS badge */}
                        {isConcluida && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border",
                              temNPS
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            <Star className="w-2.5 h-2.5" />
                            {temNPS ? "NPS feito" : "NPS pendente"}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{demanda.titulo}</h3>
                      {demanda.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{demanda.descricao}</p>}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {demanda.responsavel && <span>Responsável: <span className="font-medium text-foreground">{demanda.responsavel}</span></span>}
                        {demanda.data_prazo && <span>Prazo: <span className="font-medium text-foreground">{new Date(demanda.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}</span></span>}
                        {demanda.solicitante && <span>Solicitante: {demanda.solicitante}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {/* Botão NPS — só em concluídas */}
                        {isConcluida && (
                          <button
                            onClick={() => openNPSForCard(demanda)}
                            title="Pesquisa de Satisfação (NPS)"
                            className={cn(
                              "p-1.5 rounded-md transition-colors",
                              temNPS
                                ? "text-emerald-600 hover:bg-emerald-50"
                                : "text-amber-600 hover:bg-amber-50"
                            )}
                          >
                            <SmilePlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAnalisarIA(demanda)}
                          title="Analisar com IA"
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Bot className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => openEdit(demanda)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(demanda)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {search || filterStatus !== "todos" ? "Nenhuma demanda encontrada" : "Nenhuma demanda cadastrada ainda."}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* NPS Dialog */}
      <NPSDialog
        open={npsOpen}
        demandaTitulo={npsDemandaTitulo}
        respostas={npsRespostas}
        onChange={setNpsRespostas}
        onSubmit={handleNPSSubmit}
        onCancel={handleNPSCancel}
        submitting={npsSubmitting}
      />

      {/* Detail Dialog */}
      {detailTarget && (
        <Dialog open={!!detailTarget} onOpenChange={(open) => !open && setDetailTarget(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="pr-8">{detailTarget.titulo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[detailTarget.status].style}`}>
                  {statusConfig[detailTarget.status].label}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize border ${prioridadeStyles[detailTarget.prioridade]}`}>
                  {detailTarget.prioridade}
                </span>
                {detailTarget.categoria && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">{detailTarget.categoria}</span>
                )}
              </div>
              {detailTarget.descricao && <p className="text-sm text-muted-foreground">{detailTarget.descricao}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {detailTarget.responsavel && (
                  <div><p className="text-xs text-muted-foreground">Responsável</p><p className="font-medium">{detailTarget.responsavel}</p></div>
                )}
                {detailTarget.solicitante && (
                  <div><p className="text-xs text-muted-foreground">Solicitante</p><p className="font-medium">{detailTarget.solicitante}</p></div>
                )}
                {detailTarget.data_prazo && (
                  <div><p className="text-xs text-muted-foreground">Prazo</p><p className="font-medium">{new Date(detailTarget.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}</p></div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailTarget(null)}>Fechar</Button>
              {detailTarget.status === "concluida" && (
                <Button
                  variant="outline"
                  onClick={() => { setDetailTarget(null); openNPSForCard(detailTarget); }}
                  className="gap-2"
                >
                  <SmilePlus className="w-4 h-4" />
                  NPS
                </Button>
              )}
              <Button variant="outline" onClick={() => handleAnalisarIA(detailTarget)} className="gap-2">
                <Bot className="w-4 h-4" />
                Analisar com IA
              </Button>
              <Button onClick={() => openEdit(detailTarget)}>Editar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Demanda" : "Nova Demanda"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {form.status === "concluida" && !(editTarget && demandasComNPS.has(editTarget.id)) && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex items-center gap-2">
                <SmilePlus className="w-3.5 h-3.5 shrink-0" />
                Ao salvar como Concluída, a pesquisa de satisfação (NPS) será solicitada.
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Título *</label>
              <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título da demanda" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva a demanda..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Status</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Status }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground">
                  <option value="pendente">Pendente</option>
                  <option value="andamento">Em andamento</option>
                  <option value="concluida">Concluída</option>
                  <option value="atrasada">Atrasada</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Prioridade</label>
                <select value={form.prioridade} onChange={(e) => setForm((f) => ({ ...f, prioridade: e.target.value as Prioridade }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground">
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Responsável</label>
                <Input value={form.responsavel} onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Solicitante</label>
                <Input value={form.solicitante} onChange={(e) => setForm((f) => ({ ...f, solicitante: e.target.value }))} placeholder="Quem solicitou" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Categoria</label>
                <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground">
                  <option value="">Selecionar...</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Prazo</label>
                <Input type="date" value={form.data_prazo || ""} onChange={(e) => setForm((f) => ({ ...f, data_prazo: e.target.value || null }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover demanda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.titulo}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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

export default Demandas;
