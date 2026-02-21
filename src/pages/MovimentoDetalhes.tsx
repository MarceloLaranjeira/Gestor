import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Plus, Edit2, Trash2, Loader2, Save, X,
  Leaf, Heart, Shield, Fish, Accessibility, Scale, Cross, Radio,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, Leaf, Shield, Fish, Accessibility, Scale, Cross, Radio,
};

interface Movimento {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
}

interface Acao {
  id: string;
  movimento_id: string;
  titulo: string;
  descricao: string;
  status: string;
  responsavel: string;
  data_prazo: string | null;
  user_id: string;
}

const STATUS_OPTIONS = ["pendente", "em_andamento", "concluida"];
const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};
const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-warning/10 text-warning",
  em_andamento: "bg-info/10 text-info",
  concluida: "bg-success/10 text-success",
};

const emptyAcao = () => ({
  titulo: "",
  descricao: "",
  status: "pendente",
  responsavel: "",
  data_prazo: "",
});

const MovimentoDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [movimento, setMovimento] = useState<Movimento | null>(null);
  const [acoes, setAcoes] = useState<Acao[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit movimento
  const [editingMov, setEditingMov] = useState(false);
  const [movForm, setMovForm] = useState({ nome: "", descricao: "" });
  const [savingMov, setSavingMov] = useState(false);

  // Ação CRUD
  const [showAcaoForm, setShowAcaoForm] = useState(false);
  const [editAcao, setEditAcao] = useState<Acao | null>(null);
  const [acaoForm, setAcaoForm] = useState(emptyAcao());
  const [savingAcao, setSavingAcao] = useState(false);
  const [deleteAcao, setDeleteAcao] = useState<Acao | null>(null);
  const [deletingAcao, setDeletingAcao] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const [movRes, acoesRes] = await Promise.all([
      supabase.from("movimentos").select("*").eq("id", id).single(),
      supabase.from("acoes_movimento").select("*").eq("movimento_id", id).order("created_at"),
    ]);
    if (movRes.data) {
      setMovimento(movRes.data as Movimento);
      setMovForm({ nome: movRes.data.nome, descricao: movRes.data.descricao });
    }
    setAcoes((acoesRes.data as Acao[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSaveMov = async () => {
    if (!movForm.nome.trim()) return;
    setSavingMov(true);
    const { error } = await supabase.from("movimentos").update(movForm).eq("id", id!);
    if (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } else {
      toast({ title: "Movimento atualizado" });
      setEditingMov(false);
      fetchData();
    }
    setSavingMov(false);
  };

  const openCreateAcao = () => {
    setEditAcao(null);
    setAcaoForm(emptyAcao());
    setShowAcaoForm(true);
  };

  const openEditAcao = (a: Acao) => {
    setEditAcao(a);
    setAcaoForm({
      titulo: a.titulo,
      descricao: a.descricao,
      status: a.status,
      responsavel: a.responsavel,
      data_prazo: a.data_prazo || "",
    });
    setShowAcaoForm(true);
  };

  const handleSaveAcao = async () => {
    if (!acaoForm.titulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    setSavingAcao(true);
    try {
      if (editAcao) {
        const { error } = await supabase.from("acoes_movimento").update({
          titulo: acaoForm.titulo,
          descricao: acaoForm.descricao,
          status: acaoForm.status,
          responsavel: acaoForm.responsavel,
          data_prazo: acaoForm.data_prazo || null,
        }).eq("id", editAcao.id);
        if (error) throw error;
        toast({ title: "Ação atualizada" });
      } else {
        const { error } = await supabase.from("acoes_movimento").insert({
          movimento_id: id!,
          titulo: acaoForm.titulo,
          descricao: acaoForm.descricao,
          status: acaoForm.status,
          responsavel: acaoForm.responsavel,
          data_prazo: acaoForm.data_prazo || null,
          user_id: user!.user_id,
        });
        if (error) throw error;
        toast({ title: "Ação criada" });
      }
      setShowAcaoForm(false);
      fetchData();
    } catch {
      toast({ title: "Erro ao salvar ação", variant: "destructive" });
    } finally {
      setSavingAcao(false);
    }
  };

  const handleDeleteAcao = async () => {
    if (!deleteAcao) return;
    setDeletingAcao(true);
    const { error } = await supabase.from("acoes_movimento").delete().eq("id", deleteAcao.id);
    if (error) {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } else {
      toast({ title: "Ação removida" });
      setDeleteAcao(null);
      fetchData();
    }
    setDeletingAcao(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!movimento) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Movimento não encontrado.</div>
      </AppLayout>
    );
  }

  const Icon = ICON_MAP[movimento.icone] || Heart;
  const totalAcoes = acoes.length;
  const emAndamento = acoes.filter(a => a.status === "em_andamento").length;
  const concluidas = acoes.filter(a => a.status === "concluida").length;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Back + Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/movimentos")} className="mt-1 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            {editingMov ? (
              <div className="space-y-3">
                <Input value={movForm.nome} onChange={e => setMovForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do movimento" className="text-lg font-bold" />
                <textarea
                  value={movForm.descricao}
                  onChange={e => setMovForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Descrição..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveMov} disabled={savingMov}>
                    {savingMov ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingMov(false)}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl ${movimento.cor} flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold font-display text-foreground">Movimento {movimento.nome}</h1>
                  <p className="text-sm text-muted-foreground">{movimento.descricao}</p>
                </div>
                <button onClick={() => setEditingMov(true)} className="ml-auto p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-display text-foreground">{totalAcoes}</p>
            <p className="text-xs text-muted-foreground">Total de ações</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-display text-info">{emAndamento}</p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold font-display text-success">{concluidas}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </div>
        </div>

        {/* Ações list */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-display text-foreground">Ações</h2>
          <Button onClick={openCreateAcao} size="sm" className="gradient-primary text-primary-foreground border-0">
            <Plus className="w-4 h-4 mr-1" /> Nova Ação
          </Button>
        </div>

        <div className="space-y-2">
          {acoes.map(a => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl px-4 py-3.5 flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{a.titulo}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[a.status] || ""}`}>
                    {STATUS_LABELS[a.status] || a.status}
                  </span>
                  {a.responsavel && <span>{a.responsavel}</span>}
                  {a.data_prazo && <span>{new Date(a.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button onClick={() => openEditAcao(a)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteAcao(a)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
          {acoes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhuma ação registrada ainda. Clique em "Nova Ação" para começar.
            </div>
          )}
        </div>
      </motion.div>

      {/* Ação Form Dialog */}
      <Dialog open={showAcaoForm} onOpenChange={open => !open && setShowAcaoForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editAcao ? "Editar Ação" : "Nova Ação"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Título *</label>
              <Input value={acaoForm.titulo} onChange={e => setAcaoForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Título da ação" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Descrição</label>
              <textarea
                value={acaoForm.descricao}
                onChange={e => setAcaoForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Detalhes da ação..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Status</label>
                <select
                  value={acaoForm.status}
                  onChange={e => setAcaoForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground"
                >
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Responsável</label>
                <Input value={acaoForm.responsavel} onChange={e => setAcaoForm(f => ({ ...f, responsavel: e.target.value }))} placeholder="Nome" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Prazo</label>
              <Input type="date" value={acaoForm.data_prazo} onChange={e => setAcaoForm(f => ({ ...f, data_prazo: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcaoForm(false)}>Cancelar</Button>
            <Button onClick={handleSaveAcao} disabled={savingAcao}>
              {savingAcao ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteAcao} onOpenChange={open => !open && setDeleteAcao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover ação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteAcao?.titulo}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAcao} disabled={deletingAcao} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletingAcao ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default MovimentoDetalhes;
