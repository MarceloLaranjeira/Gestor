import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Loader2, X, Gavel, AlertTriangle,
  CheckCircle2, FileSearch, Bell, Trash2, Edit2, ChevronDown, ChevronUp,
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

interface CPI {
  id: string;
  nome_cpi: string;
  data_instauracao: string | null;
  alvo_investigacao: string;
  tipo_irregularidade: string[];
  status_investigacao: string;
  autores: string[];
  documentos_investigacao: string[];
  recomendacoes: string;
  resultado_final: string;
  impacto_esperado: string;
  coluna_kanban: string;
  created_at: string;
}

const COLUNAS = ["Denúncia Recebida", "Investigando", "Notificação Enviada", "Resolvido"] as const;
type Coluna = typeof COLUNAS[number];

const COLUNA_CONFIG: Record<Coluna, { icon: React.ElementType; color: string; badge: string }> = {
  "Denúncia Recebida":   { icon: AlertTriangle, color: "border-t-amber-500",  badge: "bg-amber-500/10 text-amber-600" },
  "Investigando":        { icon: FileSearch,    color: "border-t-blue-500",   badge: "bg-blue-500/10 text-blue-600" },
  "Notificação Enviada": { icon: Bell,          color: "border-t-purple-500", badge: "bg-purple-500/10 text-purple-600" },
  "Resolvido":           { icon: CheckCircle2,  color: "border-t-emerald-500",badge: "bg-emerald-500/10 text-emerald-600" },
};

const STATUS_INV = ["Aberta", "Em Andamento", "Relatório Preliminar", "Relatório Final", "Encerrada"];

const emptyForm = (): Omit<CPI, "id" | "created_at"> => ({
  nome_cpi: "", data_instauracao: null, alvo_investigacao: "",
  tipo_irregularidade: [], status_investigacao: "Aberta",
  autores: ["Vereadora Thaysa Lippi"],
  documentos_investigacao: [], recomendacoes: "",
  resultado_final: "", impacto_esperado: "",
  coluna_kanban: "Denúncia Recebida",
});

function CPICard({
  cpi, onEdit, onDelete, onMove,
}: {
  cpi: CPI;
  onEdit: (c: CPI) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: "left" | "right") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const col = COLUNA_CONFIG[cpi.coluna_kanban as Coluna];
  const colIdx = COLUNAS.indexOf(cpi.coluna_kanban as Coluna);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{cpi.nome_cpi}</p>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(cpi)} className="p-1.5 rounded hover:bg-muted transition-colors">
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button onClick={() => onDelete(cpi.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
              <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/70">Alvo:</span> {cpi.alvo_investigacao || "—"}
        </div>

        {cpi.tipo_irregularidade.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {cpi.tipo_irregularidade.slice(0, expanded ? undefined : 2).map((irr, i) => (
              <span key={i} className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full border border-destructive/20">
                {irr}
              </span>
            ))}
            {!expanded && cpi.tipo_irregularidade.length > 2 && (
              <span className="text-[10px] text-muted-foreground px-1 py-0.5">
                +{cpi.tipo_irregularidade.length - 2}
              </span>
            )}
          </div>
        )}

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 overflow-hidden text-xs"
            >
              {cpi.autores.length > 0 && (
                <div>
                  <p className="font-medium text-foreground/70 mb-1">Autores:</p>
                  <div className="flex flex-wrap gap-1">
                    {cpi.autores.map((a, i) => (
                      <span key={i} className="bg-muted px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                </div>
              )}
              {cpi.recomendacoes && (
                <div>
                  <p className="font-medium text-foreground/70 mb-1">Recomendações:</p>
                  <p className="text-muted-foreground">{cpi.recomendacoes}</p>
                </div>
              )}
              {cpi.impacto_esperado && (
                <div>
                  <p className="font-medium text-foreground/70 mb-1">Impacto Esperado:</p>
                  <p className="text-muted-foreground">{cpi.impacto_esperado}</p>
                </div>
              )}
              {cpi.data_instauracao && (
                <p className="text-muted-foreground">
                  Instaurada em: {new Date(cpi.data_instauracao + "T00:00:00").toLocaleDateString("pt-BR")}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Menos" : "Detalhes"}
          </button>
          <div className="flex items-center gap-1">
            {colIdx > 0 && (
              <button
                onClick={() => onMove(cpi.id, "left")}
                className="text-[10px] px-2 py-0.5 rounded border border-border/60 hover:bg-muted transition-colors text-muted-foreground"
              >
                ← Voltar
              </button>
            )}
            {colIdx < COLUNAS.length - 1 && (
              <button
                onClick={() => onMove(cpi.id, "right")}
                className={`text-[10px] px-2 py-0.5 rounded border transition-colors font-medium ${col.badge} border-current/30`}
              >
                Avançar →
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function GabineteFiscalizacao() {
  const { toast } = useToast();
  const [cpis, setCpis] = useState<CPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm] = useState<Omit<CPI, "id" | "created_at">>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [irregInput, setIrregInput] = useState("");
  const [autorInput, setAutorInput] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cpis_fiscalizacao").select("*")
      .order("created_at", { ascending: false });
    setCpis(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cpisByCol = (col: Coluna) => cpis.filter(c => c.coluna_kanban === col && (
    !search || c.nome_cpi.toLowerCase().includes(search.toLowerCase()) ||
    c.alvo_investigacao.toLowerCase().includes(search.toLowerCase())
  ));

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setIrregInput("");
    setAutorInput("");
    setDialogOpen(true);
  };

  const openEdit = (cpi: CPI) => {
    setEditId(cpi.id);
    setForm({
      nome_cpi: cpi.nome_cpi, data_instauracao: cpi.data_instauracao,
      alvo_investigacao: cpi.alvo_investigacao,
      tipo_irregularidade: cpi.tipo_irregularidade,
      status_investigacao: cpi.status_investigacao,
      autores: cpi.autores,
      documentos_investigacao: cpi.documentos_investigacao,
      recomendacoes: cpi.recomendacoes, resultado_final: cpi.resultado_final,
      impacto_esperado: cpi.impacto_esperado, coluna_kanban: cpi.coluna_kanban,
    });
    setIrregInput(""); setAutorInput("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.nome_cpi.trim()) {
      toast({ title: "Nome da CPI obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = editId
      ? await supabase.from("cpis_fiscalizacao").update(form).eq("id", editId)
      : await supabase.from("cpis_fiscalizacao").insert(form);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editId ? "CPI atualizada" : "CPI registrada" });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("cpis_fiscalizacao").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Registro excluído" });
      load();
    }
    setDeleteId(null);
  };

  const moveCard = async (id: string, dir: "left" | "right") => {
    const cpi = cpis.find(c => c.id === id);
    if (!cpi) return;
    const idx = COLUNAS.indexOf(cpi.coluna_kanban as Coluna);
    const newCol = COLUNAS[idx + (dir === "right" ? 1 : -1)];
    if (!newCol) return;
    await supabase.from("cpis_fiscalizacao").update({ coluna_kanban: newCol }).eq("id", id);
    setCpis(prev => prev.map(c => c.id === id ? { ...c, coluna_kanban: newCol } : c));
  };

  const addIrreg = () => {
    const v = irregInput.trim();
    if (v && !form.tipo_irregularidade.includes(v)) {
      setForm({ ...form, tipo_irregularidade: [...form.tipo_irregularidade, v] });
    }
    setIrregInput("");
  };

  const addAutor = () => {
    const v = autorInput.trim();
    if (v && !form.autores.includes(v)) {
      setForm({ ...form, autores: [...form.autores, v] });
    }
    setAutorInput("");
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Gavel className="w-5 h-5 text-primary" />
              Gabinete de Fiscalização
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">CPIs e atividades de fiscalização parlamentar</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-44 text-sm"
              />
            </div>
            <Button onClick={openNew} size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" /> Nova Investigação
            </Button>
          </div>
        </div>

        {/* Kanban */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUNAS.map((col) => {
              const cfg = COLUNA_CONFIG[col];
              const cards = cpisByCol(col);
              const Icon = cfg.icon;
              return (
                <div key={col} className="space-y-3">
                  {/* Column header */}
                  <div className={`bg-card border border-border/50 rounded-xl p-3 border-t-4 ${cfg.color}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-semibold">{col}</span>
                      </div>
                      <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${cfg.badge}`}>
                        {cards.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3 min-h-[120px]">
                    <AnimatePresence>
                      {cards.map((cpi) => (
                        <CPICard
                          key={cpi.id}
                          cpi={cpi}
                          onEdit={openEdit}
                          onDelete={setDeleteId}
                          onMove={moveCard}
                        />
                      ))}
                    </AnimatePresence>
                    {cards.length === 0 && (
                      <div className="h-20 border-2 border-dashed border-border/30 rounded-xl flex items-center justify-center">
                        <p className="text-xs text-muted-foreground/50">Nenhuma investigação</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Investigação" : "Nova Investigação / CPI"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome da CPI / Investigação *</Label>
              <Input value={form.nome_cpi} onChange={(e) => setForm({ ...form, nome_cpi: e.target.value })} placeholder="Ex: CPI das Águas de Manaus" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Alvo da Investigação</Label>
                <Input value={form.alvo_investigacao} onChange={(e) => setForm({ ...form, alvo_investigacao: e.target.value })} placeholder="Entidade investigada" className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Instauração</Label>
                <Input type="date" value={form.data_instauracao || ""} onChange={(e) => setForm({ ...form, data_instauracao: e.target.value || null })} className="text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={form.status_investigacao} onValueChange={(v) => setForm({ ...form, status_investigacao: v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_INV.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Coluna Kanban</Label>
                <Select value={form.coluna_kanban} onValueChange={(v) => setForm({ ...form, coluna_kanban: v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{COLUNAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Irregularidades */}
            <div className="space-y-1.5">
              <Label className="text-xs">Tipos de Irregularidade</Label>
              <div className="flex gap-2">
                <Input
                  value={irregInput}
                  onChange={(e) => setIrregInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addIrreg())}
                  placeholder="Adicionar irregularidade..."
                  className="text-sm flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addIrreg}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.tipo_irregularidade.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tipo_irregularidade.map((irr, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20">
                      {irr}
                      <button onClick={() => setForm({ ...form, tipo_irregularidade: form.tipo_irregularidade.filter((_, j) => j !== i) })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Autores */}
            <div className="space-y-1.5">
              <Label className="text-xs">Autores</Label>
              <div className="flex gap-2">
                <Input
                  value={autorInput}
                  onChange={(e) => setAutorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAutor())}
                  placeholder="Nome do autor/a..."
                  className="text-sm flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addAutor}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {form.autores.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.autores.map((a, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                      {a}
                      <button onClick={() => setForm({ ...form, autores: form.autores.filter((_, j) => j !== i) })}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Impacto Esperado</Label>
              <Textarea value={form.impacto_esperado} onChange={(e) => setForm({ ...form, impacto_esperado: e.target.value })} placeholder="Descreva o impacto esperado desta investigação..." rows={2} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Recomendações</Label>
              <Textarea value={form.recomendacoes} onChange={(e) => setForm({ ...form, recomendacoes: e.target.value })} placeholder="Recomendações da CPI..." rows={2} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Resultado Final</Label>
              <Textarea value={form.resultado_final} onChange={(e) => setForm({ ...form, resultado_final: e.target.value })} placeholder="Conclusões e resultado final..." rows={2} className="text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editId ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir investigação?</AlertDialogTitle>
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
