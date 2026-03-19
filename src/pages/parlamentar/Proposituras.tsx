import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Filter, FileText, CheckCircle2, Clock, AlertCircle,
  Trash2, Edit2, Loader2, X, ChevronDown, Download,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Causa { id: string; nome: string; categoria: string; cor: string }

interface Propositura {
  id: string;
  numero: string;
  ano: number;
  titulo: string;
  descricao: string;
  tipo: string;
  status: string;
  data_apresentacao: string | null;
  data_votacao: string | null;
  resultado_votacao: string | null;
  causa_id: string | null;
  impacto_estimado: string;
  beneficiarios: number;
  votos_a_favor: number;
  votos_contra: number;
  abstencoes: number;
  created_at: string;
}

const TIPOS = ["LEI_SANCIONADA", "PROJETO_LEI", "INDICACAO", "EMENDA", "REQUERIMENTO"];
const STATUSES = ["Apresentada", "Em Discussão", "Aprovada", "Sancionada", "Arquivada"];
const ANOS = [2025, 2024, 2023, 2022, 2021, 2020];

const TIPO_LABELS: Record<string, string> = {
  LEI_SANCIONADA: "Lei Sancionada",
  PROJETO_LEI:    "Projeto de Lei",
  INDICACAO:      "Indicação",
  EMENDA:         "Emenda",
  REQUERIMENTO:   "Requerimento",
};

const TIPO_COLORS: Record<string, string> = {
  LEI_SANCIONADA: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  PROJETO_LEI:    "bg-blue-500/15 text-blue-600 border-blue-500/30",
  INDICACAO:      "bg-amber-500/15 text-amber-600 border-amber-500/30",
  EMENDA:         "bg-purple-500/15 text-purple-600 border-purple-500/30",
  REQUERIMENTO:   "bg-slate-500/15 text-slate-500 border-slate-400/30",
};

const STATUS_COLORS: Record<string, string> = {
  Sancionada:    "bg-emerald-500/15 text-emerald-600",
  Aprovada:      "bg-blue-500/15 text-blue-600",
  "Em Discussão": "bg-amber-500/15 text-amber-600",
  Apresentada:   "bg-muted text-muted-foreground",
  Arquivada:     "bg-destructive/15 text-destructive",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  Sancionada:    CheckCircle2,
  Aprovada:      CheckCircle2,
  "Em Discussão": Clock,
  Apresentada:   FileText,
  Arquivada:     AlertCircle,
};

const emptyForm = (): Omit<Propositura, "id" | "created_at"> => ({
  numero: "", ano: new Date().getFullYear(), titulo: "", descricao: "",
  tipo: "PROJETO_LEI", status: "Apresentada",
  data_apresentacao: null, data_votacao: null, resultado_votacao: null,
  causa_id: null, impacto_estimado: "", beneficiarios: 0,
  votos_a_favor: 0, votos_contra: 0, abstencoes: 0,
});

export default function Proposituras() {
  const { toast } = useToast();
  const [items, setItems]       = useState<Propositura[]>([]);
  const [causas, setCausas]     = useState<Causa[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterTipo, setFilterTipo]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCausa, setFilterCausa]   = useState("all");
  const [filterAno, setFilterAno]       = useState("all");
  const [showFilters, setShowFilters]   = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [saving, setSaving]             = useState(false);
  const [form, setForm] = useState<Omit<Propositura, "id" | "created_at">>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [pRes, cRes] = await Promise.all([
      supabase.from("proposituras").select("*").order("data_apresentacao", { ascending: false }),
      supabase.from("causas_sociais").select("id, nome, categoria, cor").order("categoria"),
    ]);
    setItems(pRes.data || []);
    setCausas(cRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((p) => {
      const q = search.toLowerCase();
      if (q && !p.titulo.toLowerCase().includes(q) && !p.numero.toLowerCase().includes(q)) return false;
      if (filterTipo   !== "all" && p.tipo    !== filterTipo)   return false;
      if (filterStatus !== "all" && p.status  !== filterStatus) return false;
      if (filterCausa  !== "all" && p.causa_id !== filterCausa)  return false;
      if (filterAno    !== "all" && String(p.ano) !== filterAno) return false;
      return true;
    });
  }, [items, search, filterTipo, filterStatus, filterCausa, filterAno]);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (p: Propositura) => {
    setEditId(p.id);
    setForm({
      numero: p.numero, ano: p.ano, titulo: p.titulo, descricao: p.descricao,
      tipo: p.tipo, status: p.status,
      data_apresentacao: p.data_apresentacao, data_votacao: p.data_votacao,
      resultado_votacao: p.resultado_votacao,
      causa_id: p.causa_id, impacto_estimado: p.impacto_estimado,
      beneficiarios: p.beneficiarios,
      votos_a_favor: p.votos_a_favor, votos_contra: p.votos_contra, abstencoes: p.abstencoes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = { ...form, causa_id: form.causa_id || null };
    const { error } = editId
      ? await supabase.from("proposituras").update(payload).eq("id", editId)
      : await supabase.from("proposituras").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editId ? "Propositura atualizada" : "Propositura criada" });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("proposituras").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Propositura excluída" });
      load();
    }
    setDeleteId(null);
  };

  const clearFilters = () => {
    setSearch(""); setFilterTipo("all"); setFilterStatus("all");
    setFilterCausa("all"); setFilterAno("all");
  };

  const hasActiveFilters = search || filterTipo !== "all" || filterStatus !== "all" || filterCausa !== "all" || filterAno !== "all";

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Proposituras Parlamentares
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} de {items.length} registros
            </p>
          </div>
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Nova Propositura
          </Button>
        </div>

        {/* Search & filters */}
        <Card className="border border-border/50">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou número..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
              <Button
                variant="outline" size="sm"
                className={`gap-1.5 ${showFilters ? "bg-muted" : ""}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? "rotate-180" : ""}`} />
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs gap-1">
                  <X className="w-3.5 h-3.5" /> Limpar
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-2 overflow-hidden"
                >
                  <Select value={filterTipo} onValueChange={setFilterTipo}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {TIPOS.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCausa} onValueChange={setFilterCausa}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Causa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as causas</SelectItem>
                      {causas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterAno} onValueChange={setFilterAno}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      {ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border border-border/50">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-sm">Nenhuma propositura encontrada</p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters}>Limpar filtros</Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Número</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Causa</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Data</th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const StatusIcon = STATUS_ICONS[p.status] || FileText;
                    const causa = causas.find(c => c.id === p.causa_id);
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{p.numero}</td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="font-medium text-xs leading-tight line-clamp-2">{p.titulo}</p>
                          {p.impacto_estimado && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{p.impacto_estimado}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge variant="outline" className={`text-[10px] h-5 px-1.5 border whitespace-nowrap ${TIPO_COLORS[p.tipo]}`}>
                            {TIPO_LABELS[p.tipo]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {causa ? (
                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${causa.cor}`}>
                              {causa.nome}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {p.status}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-[10px] text-muted-foreground whitespace-nowrap">
                          {p.data_apresentacao
                            ? new Date(p.data_apresentacao + "T00:00:00").toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded hover:bg-muted transition-colors">
                              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Propositura" : "Nova Propositura"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Título da propositura"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Número</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex: PL 2024/001" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Ano</Label>
              <Select value={String(form.ano)} onValueChange={(v) => setForm({ ...form, ano: Number(v) })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{ANOS.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Causa Relacionada</Label>
              <Select value={form.causa_id || "none"} onValueChange={(v) => setForm({ ...form, causa_id: v === "none" ? null : v })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar causa..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem causa vinculada</SelectItem>
                  {causas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de Apresentação</Label>
              <Input type="date" value={form.data_apresentacao || ""} onChange={(e) => setForm({ ...form, data_apresentacao: e.target.value || null })} className="text-sm" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Descrição detalhada da propositura..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Impacto Estimado</Label>
              <Input value={form.impacto_estimado} onChange={(e) => setForm({ ...form, impacto_estimado: e.target.value })} placeholder="Descrição do impacto esperado" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Beneficiários Estimados</Label>
              <Input type="number" value={form.beneficiarios} onChange={(e) => setForm({ ...form, beneficiarios: Number(e.target.value) })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resultado da Votação</Label>
              <Input value={form.resultado_votacao || ""} onChange={(e) => setForm({ ...form, resultado_votacao: e.target.value || null })} placeholder="Ex: Aprovada por unanimidade" className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Votos a Favor</Label>
              <Input type="number" value={form.votos_a_favor} onChange={(e) => setForm({ ...form, votos_a_favor: Number(e.target.value) })} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Votos Contra</Label>
              <Input type="number" value={form.votos_contra} onChange={(e) => setForm({ ...form, votos_contra: Number(e.target.value) })} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editId ? "Salvar alterações" : "Criar propositura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir propositura?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
