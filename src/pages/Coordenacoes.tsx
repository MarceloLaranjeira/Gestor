import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Megaphone, Database, Building2, UsersRound, Gavel, Search,
  AlertTriangle, CheckCircle2, Clock, ListTodo, Loader2, Plus,
  Edit2, Trash2, ChevronRight, User, Phone, Mail, LayoutGrid,
  LayoutList, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Ícones disponíveis para escolha
const ICON_OPTIONS = [
  { key: "building2", icon: Building2, label: "Gabinete" },
  { key: "megaphone", icon: Megaphone, label: "Comunicação" },
  { key: "database", icon: Database, label: "Inteligência" },
  { key: "users", icon: UsersRound, label: "Equipe" },
  { key: "gavel", icon: Gavel, label: "Legislativo" },
] as const;

const ICON_MAP: Record<string, any> = {
  building2: Building2, megaphone: Megaphone, database: Database,
  users: UsersRound, gavel: Gavel,
};

// Paleta de cores para os cards
const COR_OPTIONS = [
  { key: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",     label: "Azul" },
  { key: "from-violet-500/20 to-purple-500/10 border-violet-500/30", label: "Violeta" },
  { key: "from-emerald-500/20 to-green-500/10 border-emerald-500/30", label: "Verde" },
  { key: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",  label: "Âmbar" },
  { key: "from-rose-500/20 to-pink-500/10 border-rose-500/30",      label: "Rosa" },
  { key: "from-orange-500/20 to-red-500/10 border-orange-500/30",   label: "Laranja" },
  { key: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30",  label: "Índigo" },
  { key: "from-teal-500/20 to-cyan-500/10 border-teal-500/30",      label: "Teal" },
];

const COR_DOT: Record<string, string> = {
  "from-blue-500/20 to-cyan-500/10 border-blue-500/30":      "bg-blue-500",
  "from-violet-500/20 to-purple-500/10 border-violet-500/30":"bg-violet-500",
  "from-emerald-500/20 to-green-500/10 border-emerald-500/30":"bg-emerald-500",
  "from-amber-500/20 to-yellow-500/10 border-amber-500/30":   "bg-amber-500",
  "from-rose-500/20 to-pink-500/10 border-rose-500/30":       "bg-rose-500",
  "from-orange-500/20 to-red-500/10 border-orange-500/30":    "bg-orange-500",
  "from-indigo-500/20 to-blue-500/10 border-indigo-500/30":   "bg-indigo-500",
  "from-teal-500/20 to-cyan-500/10 border-teal-500/30":       "bg-teal-500",
};

interface CoordData {
  id: string;
  nome: string;
  descricao: string;
  slug: string;
  coordenador: string;
  coordenador_email: string;
  coordenador_telefone: string;
  cor: string;
  icone: string;
  ativo: boolean;
  meta_tarefas: number;
  totalTarefas: number;
  tarefasConcluidas: number;
  totalSecoes: number;
  tarefasAtrasadas: number;
}

type FormState = {
  nome: string; descricao: string; slug: string;
  coordenador: string; coordenador_email: string; coordenador_telefone: string;
  cor: string; icone: string; ativo: boolean; meta_tarefas: number;
};

const emptyForm = (): FormState => ({
  nome: "", descricao: "", slug: "",
  coordenador: "", coordenador_email: "", coordenador_telefone: "",
  cor: COR_OPTIONS[0].key, icone: "building2", ativo: true, meta_tarefas: 0,
});

const toSlug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const Coordenacoes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [coordenacoes, setCoordenacoes] = useState<CoordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CoordData | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CoordData | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: coords } = await supabase
      .from("coordenacoes")
      .select("id, nome, descricao, slug, coordenador, coordenador_email, coordenador_telefone, cor, icone, ativo, meta_tarefas")
      .order("nome");

    if (!coords) { setLoading(false); return; }

    const { data: secoes } = await supabase.from("secoes").select("id, coordenacao_id");
    const secaoIds = (secoes || []).map(s => s.id);
    const { data: tarefas } = await supabase
      .from("tarefas")
      .select("id, secao_id, status, data_fim")
      .in("secao_id", secaoIds.length > 0 ? secaoIds : ["none"]);

    const hoje = new Date().toISOString().split("T")[0];

    const coordData: CoordData[] = coords.map(c => {
      const coordSecoes = (secoes || []).filter(s => s.coordenacao_id === c.id);
      const coordSecaoIds = coordSecoes.map(s => s.id);
      const coordTarefas = (tarefas || []).filter(t => coordSecaoIds.includes(t.secao_id));
      return {
        id: c.id,
        nome: c.nome || "",
        descricao: c.descricao || "",
        slug: c.slug || "",
        coordenador: c.coordenador || "",
        coordenador_email: c.coordenador_email || "",
        coordenador_telefone: c.coordenador_telefone || "",
        cor: c.cor || COR_OPTIONS[0].key,
        icone: c.icone || "building2",
        ativo: c.ativo !== false,
        meta_tarefas: c.meta_tarefas || 0,
        totalTarefas: coordTarefas.length,
        tarefasConcluidas: coordTarefas.filter(t => t.status === true).length,
        totalSecoes: coordSecoes.length,
        tarefasAtrasadas: coordTarefas.filter(t => !t.status && t.data_fim && t.data_fim < hoje).length,
      };
    });

    setCoordenacoes(coordData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    const q = busca.toLowerCase();
    return coordenacoes.filter(c =>
      !q || c.nome.toLowerCase().includes(q) ||
      c.descricao.toLowerCase().includes(q) ||
      c.coordenador.toLowerCase().includes(q)
    );
  }, [coordenacoes, busca]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (c: CoordData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditTarget(c);
    setForm({
      nome: c.nome, descricao: c.descricao, slug: c.slug,
      coordenador: c.coordenador, coordenador_email: c.coordenador_email,
      coordenador_telefone: c.coordenador_telefone,
      cor: c.cor || COR_OPTIONS[0].key, icone: c.icone || "building2",
      ativo: c.ativo, meta_tarefas: c.meta_tarefas,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const slug = form.slug.trim() || toSlug(form.nome);
    const payload = { ...form, slug };

    if (editTarget) {
      const { error } = await supabase.from("coordenacoes").update(payload).eq("id", editTarget.id);
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else { toast({ title: "Coordenação atualizada" }); setFormOpen(false); loadData(); }
    } else {
      const { error } = await supabase.from("coordenacoes").insert(payload);
      if (error) toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      else { toast({ title: "Coordenação criada" }); setFormOpen(false); loadData(); }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from("coordenacoes").delete().eq("id", deleteTarget.id);
    if (error) toast({ title: "Erro ao excluir", variant: "destructive" });
    else { toast({ title: "Coordenação excluída" }); loadData(); }
    setDeleteTarget(null);
  };

  const totalTarefas   = coordenacoes.reduce((s, c) => s + c.totalTarefas, 0);
  const totalConcluidas = coordenacoes.reduce((s, c) => s + c.tarefasConcluidas, 0);
  const totalAtrasadas  = coordenacoes.reduce((s, c) => s + c.tarefasAtrasadas, 0);
  const progressGeral  = totalTarefas > 0 ? (totalConcluidas / totalTarefas) * 100 : 0;

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="space-y-5 p-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Coordenações do Gabinete</h1>
            <p className="text-xs text-muted-foreground">{coordenacoes.length} coordenações · {totalTarefas} tarefas no total</p>
          </div>
          <Button onClick={openCreate} size="sm" className="gap-1.5 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Nova Coordenação
          </Button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Coordenações", value: coordenacoes.length, icon: LayoutGrid, color: "text-primary bg-primary/10" },
            { label: "Total Tarefas", value: totalTarefas, icon: ListTodo, color: "text-primary bg-primary/10" },
            { label: "Concluídas", value: totalConcluidas, icon: CheckCircle2, color: "text-success bg-success/10" },
            { label: "Atrasadas", value: totalAtrasadas, icon: AlertTriangle, color: totalAtrasadas > 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted" },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", k.color)}>
                  <k.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress geral */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1.5 text-xs">
              <span className="font-medium text-foreground">Progresso Geral</span>
              <span className="font-bold text-primary">{progressGeral.toFixed(0)}%</span>
            </div>
            <Progress value={progressGeral} className="h-2" />
          </CardContent>
        </Card>

        {/* Search + layout toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar coordenação ou coordenador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setLayout("grid")}
              className={cn("px-2.5 py-2 transition-colors", layout === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayout("list")}
              className={cn("px-2.5 py-2 transition-colors", layout === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{busca ? `Nenhuma coordenação encontrada para "${busca}"` : "Nenhuma coordenação cadastrada"}</p>
            {!busca && <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>Criar primeira coordenação</Button>}
          </div>
        ) : layout === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((coord, i) => <CoordCard key={coord.id} coord={coord} index={i} onNavigate={() => navigate(`/coordenacao/${coord.slug}`)} onEdit={openEdit} onDelete={() => setDeleteTarget(coord)} />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((coord, i) => <CoordRow key={coord.id} coord={coord} index={i} onNavigate={() => navigate(`/coordenacao/${coord.slug}`)} onEdit={openEdit} onDelete={() => setDeleteTarget(coord)} />)}
          </div>
        )}
      </div>

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              {editTarget ? "Editar Coordenação" : "Nova Coordenação"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            {/* Nome + Slug */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value, slug: toSlug(e.target.value) }))}
                  placeholder="Ex: Coordenação de Comunicação"
                  className="text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Slug (URL)</Label>
                <Input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
                  placeholder="comunicacao"
                  className="text-sm font-mono"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Objetivo e responsabilidades desta coordenação..."
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            {/* Separador — Coordenador */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Coordenador Responsável</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs flex items-center gap-1"><User className="w-3 h-3" /> Nome</Label>
                  <Input value={form.coordenador} onChange={e => setForm(f => ({ ...f, coordenador: e.target.value }))} placeholder="Nome completo do coordenador" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> E-mail</Label>
                  <Input type="email" value={form.coordenador_email} onChange={e => setForm(f => ({ ...f, coordenador_email: e.target.value }))} placeholder="email@gabinete.com" className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telefone</Label>
                  <Input value={form.coordenador_telefone} onChange={e => setForm(f => ({ ...f, coordenador_telefone: e.target.value }))} placeholder="(92) 9 9999-9999" className="text-sm" />
                </div>
              </div>
            </div>

            {/* Separador — Visual */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Aparência</p>

              {/* Ícone */}
              <div className="space-y-2 mb-3">
                <Label className="text-xs">Ícone</Label>
                <div className="flex gap-2 flex-wrap">
                  {ICON_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, icone: opt.key }))}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all",
                          form.icone === opt.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px]">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cor */}
              <div className="space-y-2">
                <Label className="text-xs">Cor do Card</Label>
                <div className="flex gap-2 flex-wrap">
                  {COR_OPTIONS.map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, cor: opt.key }))}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all",
                        form.cor === opt.key ? "border-foreground bg-muted font-semibold" : "border-border hover:bg-muted text-muted-foreground"
                      )}
                    >
                      <span className={cn("w-3 h-3 rounded-full", COR_DOT[opt.key] || "bg-gray-400")} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Meta + ativo */}
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="space-y-1">
                <Label className="text-xs">Meta de Tarefas</Label>
                <Input type="number" min={0} value={form.meta_tarefas} onChange={e => setForm(f => ({ ...f, meta_tarefas: Number(e.target.value) }))} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <div className="flex gap-2 pt-1">
                  {[{ v: true, label: "Ativa" }, { v: false, label: "Inativa" }].map(opt => (
                    <button
                      key={String(opt.v)}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, ativo: opt.v }))}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs border font-medium transition-all",
                        form.ativo === opt.v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.nome.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editTarget ? "Salvar alterações" : "Criar coordenação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as seções e tarefas desta coordenação serão excluídas permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

// ── Card (Grid) ──────────────────────────────────────────────────────────────
const CoordCard = ({ coord, index, onNavigate, onEdit, onDelete }: {
  coord: CoordData; index: number;
  onNavigate: () => void;
  onEdit: (c: CoordData, e: React.MouseEvent) => void;
  onDelete: () => void;
}) => {
  const Icon = ICON_MAP[coord.icone] || Building2;
  const colors = coord.cor || COR_OPTIONS[0].key;
  const progress = coord.totalTarefas > 0 ? (coord.tarefasConcluidas / coord.totalTarefas) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <div
        className={cn(
          "group relative rounded-xl border bg-gradient-to-br cursor-pointer transition-all duration-200",
          "hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]",
          colors,
          !coord.ativo && "opacity-60"
        )}
        onClick={onNavigate}
      >
        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={e => e.stopPropagation()}>
          <button onClick={e => onEdit(coord, e)} className="p-1.5 rounded-lg bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors shadow-sm">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg bg-background/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shadow-sm">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-4 pb-3">
          {/* Icon + nome */}
          <div className="flex items-start gap-3 mb-3 pr-16">
            <div className="w-10 h-10 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center shadow-sm shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight">{coord.nome}</p>
              {coord.descricao && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{coord.descricao}</p>}
            </div>
          </div>

          {/* Coordenador */}
          {coord.coordenador && (
            <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-lg bg-background/50">
              <User className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-foreground font-medium truncate">{coord.coordenador}</span>
            </div>
          )}

          {/* Badges */}
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            <Badge variant="outline" className="text-[10px] gap-0.5 h-5 bg-background/60">
              <ListTodo className="w-3 h-3" /> {coord.totalSecoes} seções
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-0.5 h-5 bg-background/60">
              <CheckCircle2 className="w-3 h-3" /> {coord.tarefasConcluidas}/{coord.totalTarefas}
            </Badge>
            {coord.tarefasAtrasadas > 0 && (
              <Badge variant="destructive" className="text-[10px] gap-0.5 h-5 animate-pulse">
                <AlertTriangle className="w-3 h-3" /> {coord.tarefasAtrasadas}
              </Badge>
            )}
            {!coord.ativo && <Badge variant="secondary" className="text-[10px] h-5">Inativa</Badge>}
          </div>

          {/* Progress */}
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Progresso</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        <div className="px-4 py-2 border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Abrir coordenação</span>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
};

// ── Row (List) ────────────────────────────────────────────────────────────────
const CoordRow = ({ coord, index, onNavigate, onEdit, onDelete }: {
  coord: CoordData; index: number;
  onNavigate: () => void;
  onEdit: (c: CoordData, e: React.MouseEvent) => void;
  onDelete: () => void;
}) => {
  const Icon = ICON_MAP[coord.icone] || Building2;
  const progress = coord.totalTarefas > 0 ? (coord.tarefasConcluidas / coord.totalTarefas) * 100 : 0;

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}>
      <div
        className={cn(
          "group flex items-center gap-3 p-3 rounded-xl border bg-card cursor-pointer",
          "hover:shadow-md hover:bg-muted/30 transition-all duration-200",
          !coord.ativo && "opacity-60"
        )}
        onClick={onNavigate}
      >
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{coord.nome}</span>
            {coord.tarefasAtrasadas > 0 && (
              <Badge variant="destructive" className="text-[9px] h-4 gap-0.5 animate-pulse">
                <AlertTriangle className="w-2.5 h-2.5" /> {coord.tarefasAtrasadas}
              </Badge>
            )}
          </div>
          {coord.coordenador && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 shrink-0" /> {coord.coordenador}
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" />{coord.tarefasConcluidas}/{coord.totalTarefas}</span>
          <div className="w-20">
            <Progress value={progress} className="h-1.5" />
          </div>
          <span className="w-8 text-right font-semibold text-foreground">{progress.toFixed(0)}%</span>
        </div>

        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={e => onEdit(coord, e)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 transition-all text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
};

export default Coordenacoes;
