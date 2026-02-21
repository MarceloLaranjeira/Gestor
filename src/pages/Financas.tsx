import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Search, Loader2, TrendingUp, TrendingDown, DollarSign,
  Edit2, Trash2, ChevronRight,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import FinancasAnalytics from "@/components/FinancasAnalytics";
import FinancasAIButton from "@/components/FinancasAIButton";
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
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tipo = "receita" | "despesa";

interface Movimento {
  id: string;
  user_id: string;
  tipo: Tipo;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  observacao: string;
  created_at: string;
}

const CATEGORIAS_RECEITA = ["Emenda Parlamentar", "Gabinete", "Doação", "Repasse", "Outro"];
const CATEGORIAS_DESPESA = ["Pessoal", "Material", "Serviços", "Comunicação", "Eventos", "Transporte", "Outro"];
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const chartStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const emptyForm = (): Omit<Movimento, "id" | "user_id" | "created_at"> => ({
  tipo: "receita",
  descricao: "",
  categoria: "",
  valor: 0,
  data: new Date().toISOString().slice(0, 10),
  observacao: "",
});

// ── Main ──────────────────────────────────────────────────────────────────────
const Financas = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Movimento | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Movimento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMovimentos = async () => {
    const { data } = await supabase
      .from("movimentos_financeiros")
      .select("*")
      .order("data", { ascending: false });
    setMovimentos((data as Movimento[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchMovimentos(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (m: Movimento) => {
    setEditTarget(m);
    setForm({ tipo: m.tipo, descricao: m.descricao, categoria: m.categoria, valor: m.valor, data: m.data, observacao: m.observacao });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.descricao.trim()) {
      toast({ title: "Descrição é obrigatória", variant: "destructive" });
      return;
    }
    if (!form.valor || form.valor <= 0) {
      toast({ title: "Valor deve ser maior que zero", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase.from("movimentos_financeiros").update({ ...form, valor: Number(form.valor) }).eq("id", editTarget.id);
        if (error) throw error;
        toast({ title: "Movimento atualizado" });
      } else {
        const { error } = await supabase.from("movimentos_financeiros").insert({ ...form, valor: Number(form.valor), user_id: user!.user_id });
        if (error) throw error;
        toast({ title: "Movimento registrado" });
      }
      setShowForm(false);
      fetchMovimentos();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("movimentos_financeiros").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Movimento removido" });
      setDeleteTarget(null);
      fetchMovimentos();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered = movimentos.filter((m) => {
    const matchSearch =
      m.descricao.toLowerCase().includes(search.toLowerCase()) ||
      m.categoria.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === "todos" || m.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  const totalReceitas = movimentos.filter(m => m.tipo === "receita").reduce((s, m) => s + Number(m.valor), 0);
  const totalDespesas = movimentos.filter(m => m.tipo === "despesa").reduce((s, m) => s + Number(m.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  // Gráfico: últimos 6 meses
  const currentDate = new Date();
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - i), 1);
    const mes = MONTH_NAMES[d.getMonth()];
    const receitas = movimentos
      .filter(m => m.tipo === "receita" && new Date(m.data + "T00:00:00").getMonth() === d.getMonth() && new Date(m.data + "T00:00:00").getFullYear() === d.getFullYear())
      .reduce((s, m) => s + Number(m.valor), 0);
    const despesas = movimentos
      .filter(m => m.tipo === "despesa" && new Date(m.data + "T00:00:00").getMonth() === d.getMonth() && new Date(m.data + "T00:00:00").getFullYear() === d.getFullYear())
      .reduce((s, m) => s + Number(m.valor), 0);
    return { mes, receitas, despesas };
  });

  const categoriasForm = form.tipo === "receita" ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Financeiro</h1>
            <p className="text-sm text-muted-foreground">Controle de receitas e despesas do mandato</p>
          </div>
          <div className="flex items-center gap-2">
            <FinancasAIButton />
            <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lançamento
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Receitas</p>
              <p className="text-base font-bold font-display text-success">{fmt(totalReceitas)}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Despesas</p>
              <p className="text-base font-bold font-display text-destructive">{fmt(totalDespesas)}</p>
            </div>
          </div>
          <div className="glass-card rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${saldo >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
              <DollarSign className={`w-5 h-5 ${saldo >= 0 ? "text-primary" : "text-destructive"}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Saldo</p>
              <p className={`text-base font-bold font-display ${saldo >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(saldo)}</p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Receitas × Despesas — Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(v) => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)} />
              <Tooltip contentStyle={chartStyle}
                formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Area type="monotone" dataKey="receitas" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.12)" strokeWidth={2} name="Receitas" />
              <Area type="monotone" dataKey="despesas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.10)" strokeWidth={2} name="Despesas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Analytics & Predictive */}
        <FinancasAnalytics movimentos={movimentos} />

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar lançamentos..."
              className="w-full h-9 pl-10 pr-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex gap-2">
            {(["todos", "receita", "despesa"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterTipo(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  filterTipo === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {t === "todos" ? "Todos" : t === "receita" ? "Receitas" : "Despesas"}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl px-4 py-3.5 flex items-center gap-4 hover:shadow-md transition-shadow group"
              >
                {/* Indicator */}
                <div className={`w-1.5 h-10 rounded-full shrink-0 ${m.tipo === "receita" ? "bg-success" : "bg-destructive"}`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{m.descricao}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    {m.categoria && <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">{m.categoria}</span>}
                    <span>{new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                <p className={`text-base font-bold font-display shrink-0 ${m.tipo === "receita" ? "text-success" : "text-destructive"}`}>
                  {m.tipo === "receita" ? "+" : "-"}{fmt(Number(m.valor))}
                </p>

                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => openEdit(m)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {search || filterTipo !== "todos" ? "Nenhum lançamento encontrado" : "Nenhum lançamento registrado ainda."}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Lançamento" : "Novo Lançamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Tipo */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Tipo *</label>
              <div className="grid grid-cols-2 gap-2">
                {(["receita", "despesa"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, tipo: t, categoria: "" }))}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      form.tipo === t
                        ? t === "receita" ? "bg-success text-white" : "bg-destructive text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {t === "receita" ? "Receita" : "Despesa"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Descrição *</label>
              <Input value={form.descricao} onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do lançamento" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Valor (R$) *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor || ""}
                  onChange={(e) => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Data</label>
                <Input type="date" value={form.data} onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Categoria</label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground"
                >
                  <option value="">Selecionar...</option>
                  {categoriasForm.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Observação</label>
              <textarea
                value={form.observacao}
                onChange={(e) => setForm(f => ({ ...f, observacao: e.target.value }))}
                placeholder="Observações adicionais..."
                rows={2}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
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
            <AlertDialogTitle>Remover lançamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.descricao}</strong>? Esta ação não pode ser desfeita.
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

export default Financas;
