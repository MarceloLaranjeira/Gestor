import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, Edit2, Trash2, Star, Calendar,
  Vote, Landmark, Users, Flag, Scale, FileText, GitBranch, BarChart3,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";

interface Marco {
  id: string;
  data: string;
  titulo: string;
  descricao: string;
  tipo: string;
  documentos: string[];
  impacto_politico: string;
  destaque: boolean;
  created_at: string;
}

const TIPOS = [
  { value: "eleicao",           label: "Eleição",                icon: Vote },
  { value: "mandato",           label: "Mandato",                icon: Landmark },
  { value: "mudanca_partido",   label: "Mudança de Partido",     icon: Users },
  { value: "candidatura",       label: "Candidatura",            icon: Flag },
  { value: "marco_legislativo", label: "Marco Legislativo",      icon: Scale },
  { value: "pesquisa",          label: "Pesquisa Eleitoral",     icon: BarChart3 },
  { value: "outro",             label: "Outro",                  icon: FileText },
];

const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.value, t]));

const TIPO_COLORS: Record<string, string> = {
  eleicao:           "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  mandato:           "bg-blue-500/15 text-blue-600 border-blue-500/30",
  mudanca_partido:   "bg-amber-500/15 text-amber-600 border-amber-500/30",
  candidatura:       "bg-purple-500/15 text-purple-600 border-purple-500/30",
  marco_legislativo: "bg-rose-500/15 text-rose-600 border-rose-500/30",
  pesquisa:          "bg-cyan-500/15 text-cyan-600 border-cyan-500/30",
  outro:             "bg-muted text-muted-foreground border-border",
};

const CONNECTOR_COLORS: Record<string, string> = {
  eleicao:           "bg-emerald-500",
  mandato:           "bg-blue-500",
  mudanca_partido:   "bg-amber-500",
  candidatura:       "bg-purple-500",
  marco_legislativo: "bg-rose-500",
  pesquisa:          "bg-cyan-500",
  outro:             "bg-muted-foreground",
};

const emptyForm = (): Omit<Marco, "id" | "created_at"> => ({
  data: "", titulo: "", descricao: "", tipo: "marco_legislativo",
  documentos: [], impacto_politico: "", destaque: false,
});

export default function TrajetoriaPolitica() {
  const { toast } = useToast();
  const [marcos, setMarcos] = useState<Marco[]>([]);
  const [loading, setLoading]    = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId]     = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Marco, "id" | "created_at">>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trajetoria_politica").select("*")
      .order("data", { ascending: true });
    setMarcos(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (m: Marco) => {
    setEditId(m.id);
    setForm({
      data: m.data, titulo: m.titulo, descricao: m.descricao,
      tipo: m.tipo, documentos: m.documentos,
      impacto_politico: m.impacto_politico, destaque: m.destaque,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.data) {
      toast({ title: "Título e data são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = editId
      ? await supabase.from("trajetoria_politica").update(form).eq("id", editId)
      : await supabase.from("trajetoria_politica").insert(form);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editId ? "Marco atualizado" : "Marco adicionado à trajetória" });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("trajetoria_politica").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Marco removido" });
      load();
    }
    setDeleteId(null);
  };

  const fmtDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("pt-BR", { year: "numeric", month: "long" });
  };

  return (
    <AppLayout>
      <div className="space-y-5 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-primary" />
              Trajetória Política
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Linha do tempo — Vereadora Thaysa Lippi
            </p>
          </div>
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Novo Marco
          </Button>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : marcos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
            <GitBranch className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nenhum marco registrado</p>
            <Button onClick={openNew} variant="outline" size="sm">Adicionar primeiro marco</Button>
          </div>
        ) : (
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[22px] top-6 bottom-6 w-0.5 bg-border/60 z-0" />

            {marcos.map((marco, i) => {
              const tipoInfo = TIPO_MAP[marco.tipo] || TIPO_MAP.outro;
              const Icon = tipoInfo.icon;
              const isExpanded = expandedId === marco.id;
              const connColor = CONNECTOR_COLORS[marco.tipo] || "bg-muted-foreground";

              return (
                <motion.div
                  key={marco.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex gap-4 pb-8"
                >
                  {/* Node */}
                  <div className={`relative z-10 w-11 h-11 rounded-full border-2 border-background flex items-center justify-center shrink-0 ${marco.destaque ? connColor : "bg-muted"} shadow-sm`}>
                    <Icon className={`w-4 h-4 ${marco.destaque ? "text-white" : "text-muted-foreground"}`} />
                    {marco.destaque && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-background flex items-center justify-center">
                        <Star className="w-2.5 h-2.5 text-white fill-white" />
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div
                      className="bg-card border border-border/50 rounded-xl p-4 cursor-pointer hover:border-border transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : marco.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {fmtDate(marco.data)}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-4 px-1.5 border ${TIPO_COLORS[marco.tipo]}`}
                            >
                              {tipoInfo.label}
                            </Badge>
                          </div>
                          <h3 className={`text-sm font-semibold ${marco.destaque ? "text-foreground" : "text-foreground/80"}`}>
                            {marco.titulo}
                          </h3>
                          {marco.descricao && !isExpanded && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{marco.descricao}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(marco); }}
                            className="p-1.5 rounded hover:bg-muted transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteId(marco.id); }}
                            className="p-1.5 rounded hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-destructive/70" />
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                              {marco.descricao && (
                                <p className="text-sm text-muted-foreground">{marco.descricao}</p>
                              )}
                              {marco.impacto_politico && (
                                <div className="bg-muted/40 rounded-lg p-3">
                                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Impacto Político
                                  </p>
                                  <p className="text-xs text-foreground/80">{marco.impacto_politico}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Future node */}
            <div className="relative flex gap-4">
              <div className="relative z-10 w-11 h-11 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center shrink-0 bg-primary/5">
                <Flag className="w-4 h-4 text-primary/60" />
              </div>
              <div className="flex-1 flex items-center">
                <p className="text-sm text-muted-foreground/50 italic">Próximos marcos serão adicionados à trajetória...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Marco" : "Novo Marco na Trajetória"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Eleita Vereadora de Manaus" className="text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descreva este marco na trajetória política..." rows={3} className="text-sm resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Impacto Político</Label>
              <Textarea value={form.impacto_politico} onChange={(e) => setForm({ ...form, impacto_politico: e.target.value })} placeholder="Qual o impacto político deste marco?" rows={2} className="text-sm resize-none" />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <p className="text-sm font-medium">Marco em destaque</p>
                <p className="text-xs text-muted-foreground">Exibir com marcação especial na timeline</p>
              </div>
              <Switch checked={form.destaque} onCheckedChange={(v) => setForm({ ...form, destaque: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover marco?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
