import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus, Edit2, Trash2, Loader2, CheckCircle2, Clock, AlertTriangle,
  Calendar, MapPin, Users, Tag, FileText, ChevronDown,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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

type Status = "pendente" | "confirmado" | "realizado" | "cancelado";
type Prioridade = "urgente" | "alta" | "media" | "baixa";
type Tipo = "reuniao" | "audiencia" | "evento" | "visita" | "sessao" | "entrevista" | "outro";

interface Compromisso {
  id: string;
  titulo: string;
  descricao: string;
  tipo: Tipo;
  status: Status;
  prioridade: Prioridade;
  data_inicio: string;
  data_fim: string | null;
  local: string;
  municipio: string;
  participantes: string;
  orgao_parceiro: string;
  pauta: string;
  resultado: string;
  observacoes: string;
  responsavel: string;
  created_at: string;
  user_id: string;
}

const STATUS_CONFIG: Record<Status, { label: string; style: string; icon: any }> = {
  pendente:   { label: "Pendente",   style: "bg-warning/10 text-warning border-warning/20",       icon: Clock },
  confirmado: { label: "Confirmado", style: "bg-info/10 text-info border-info/20",                icon: CheckCircle2 },
  realizado:  { label: "Realizado",  style: "bg-success/10 text-success border-success/20",       icon: CheckCircle2 },
  cancelado:  { label: "Cancelado",  style: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

const PRIORIDADE_STYLE: Record<Prioridade, string> = {
  urgente: "bg-destructive/10 text-destructive border-destructive/20",
  alta:    "bg-warning/10 text-warning border-warning/20",
  media:   "bg-info/10 text-info border-info/20",
  baixa:   "bg-muted text-muted-foreground border-border",
};

const TIPOS: { value: Tipo; label: string }[] = [
  { value: "reuniao",    label: "Reunião" },
  { value: "audiencia",  label: "Audiência Pública" },
  { value: "evento",     label: "Evento Político" },
  { value: "visita",     label: "Visita Técnica" },
  { value: "sessao",     label: "Sessão Plenária" },
  { value: "entrevista", label: "Entrevista / Imprensa" },
  { value: "outro",      label: "Outro" },
];

const emptyForm = (): Omit<Compromisso, "id" | "created_at" | "user_id"> => ({
  titulo: "", descricao: "", tipo: "reuniao", status: "pendente", prioridade: "media",
  data_inicio: "", data_fim: null, local: "", municipio: "", participantes: "",
  orgao_parceiro: "", pauta: "", resultado: "", observacoes: "", responsavel: "",
});

const Compromissos = () => {
  const { user } = useAuth();
  const { toast: showToast } = toast;
  const [items, setItems] = useState<Compromisso[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<Compromisso | null>(null);
  const [editing, setEditing] = useState<Compromisso | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "todos">("todos");

  const load = async () => {
    const { data } = await supabase
      .from("compromissos_politicos")
      .select("*")
      .order("data_inicio", { ascending: true });
    setItems((data as Compromisso[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (c: Compromisso) => { setEditing(c); setForm({ ...c }); setDialogOpen(true); };

  const logEntry = async (origemId: string, acao: string, descricao: string) => {
    if (!user?.user_id) return;
    await supabase.from("logbook_entradas").insert({
      user_id: user.user_id, origem: "compromisso", origem_id: origemId, acao, descricao,
    });
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) { showToast({ title: "Título obrigatório", variant: "destructive" }); return; }
    if (!form.data_inicio) { showToast({ title: "Data obrigatória", variant: "destructive" }); return; }
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("compromissos_politicos").update({ ...form }).eq("id", editing.id);
      if (error) { showToast({ title: "Erro ao salvar", variant: "destructive" }); }
      else {
        showToast({ title: "Compromisso atualizado" });
        await logEntry(editing.id, "atualizado", `Compromisso "${form.titulo}" atualizado — status: ${form.status}`);
        setDialogOpen(false); load();
      }
    } else {
      const { data: inserted, error } = await supabase.from("compromissos_politicos").insert({ ...form, user_id: user?.user_id }).select("id").single();
      if (error) { showToast({ title: "Erro ao criar", variant: "destructive" }); }
      else {
        showToast({ title: "Compromisso criado" });
        if (inserted?.id) await logEntry(inserted.id, "criado", `Novo compromisso: "${form.titulo}" em ${form.data_inicio?.slice(0, 10)}`);
        setDialogOpen(false); load();
      }
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const target = items.find(c => c.id === deleteId);
    await supabase.from("compromissos_politicos").update({ status: "cancelado" }).eq("id", deleteId);
    if (target) await logEntry(deleteId, "cancelado", `Compromisso "${target.titulo}" cancelado`);
    setDeleteId(null);
    load();
  };

  const filtered = items.filter(c => {
    const matchSearch = c.titulo.toLowerCase().includes(search.toLowerCase()) ||
      c.local.toLowerCase().includes(search.toLowerCase()) ||
      c.municipio.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: items.length,
    pendentes: items.filter(c => c.status === "pendente").length,
    confirmados: items.filter(c => c.status === "confirmado").length,
    realizados: items.filter(c => c.status === "realizado").length,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Compromissos Políticos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Agenda de reuniões, audiências, eventos e visitas</p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Compromisso
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total", value: counts.total, style: "text-foreground" },
            { label: "Pendentes", value: counts.pendentes, style: "text-warning" },
            { label: "Confirmados", value: counts.confirmados, style: "text-info" },
            { label: "Realizados", value: counts.realizados, style: "text-success" },
          ].map(k => (
            <Card key={k.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${k.style}`}>{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Input placeholder="Buscar compromisso, local, município..." value={search} onChange={e => setSearch(e.target.value)} className="pl-3" />
          </div>
          <Select value={filterStatus} onValueChange={v => setFilterStatus(v as any)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum compromisso encontrado</p>
            <Button variant="outline" className="mt-4 gap-2" onClick={openCreate}><Plus className="w-4 h-4" /> Criar primeiro compromisso</Button>
          </div>
        ) : (
          <motion.div className="space-y-3" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
            {filtered.map(c => {
              const s = STATUS_CONFIG[c.status];
              const Icon = s.icon;
              return (
                <motion.div key={c.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailItem(c)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm text-foreground truncate">{c.titulo}</span>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${s.style}`}>
                              <Icon className="w-2.5 h-2.5 mr-1" />{s.label}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${PRIORIDADE_STYLE[c.prioridade]}`}>{c.prioridade}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            {c.data_inicio && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.data_inicio).toLocaleDateString("pt-BR")}</span>}
                            {c.local && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.local}</span>}
                            {c.municipio && <span>{c.municipio}</span>}
                            {c.responsavel && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.responsavel}</span>}
                          </div>
                          {c.descricao && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{c.descricao}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => setDeleteId(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Compromisso" : "Novo Compromisso Político"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2 space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Ex: Reunião com Secretaria de Saúde" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as Tipo }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as Status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v as Prioridade }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Input placeholder="Nome do responsável" value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data e Hora Início *</Label>
              <Input type="datetime-local" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data e Hora Fim</Label>
              <Input type="datetime-local" value={form.data_fim || ""} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value || null }))} />
            </div>
            <div className="space-y-1">
              <Label>Local</Label>
              <Input placeholder="Ex: Câmara Municipal, Secretaria..." value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Município</Label>
              <Input placeholder="Município do compromisso" value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Descrição</Label>
              <Textarea placeholder="Descrição detalhada do compromisso..." rows={3} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Pauta / Objetivos</Label>
              <Textarea placeholder="Quais os pontos da pauta? O que será discutido?" rows={3} value={form.pauta} onChange={e => setForm(f => ({ ...f, pauta: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Participantes</Label>
              <Textarea placeholder="Nomes e cargos dos participantes" rows={2} value={form.participantes} onChange={e => setForm(f => ({ ...f, participantes: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Órgão / Parceiro Envolvido</Label>
              <Input placeholder="Secretaria, Organização, Entidade..." value={form.orgao_parceiro} onChange={e => setForm(f => ({ ...f, orgao_parceiro: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Resultado / Encaminhamentos</Label>
              <Input placeholder="O que foi decidido?" value={form.resultado} onChange={e => setForm(f => ({ ...f, resultado: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-1">
              <Label>Observações Internas</Label>
              <Textarea placeholder="Notas internas, contexto político, sensibilidades..." rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{editing ? "Salvar Alterações" : "Criar Compromisso"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        {detailItem && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {detailItem.titulo}
                <Badge variant="outline" className={`text-[10px] ${STATUS_CONFIG[detailItem.status].style}`}>{STATUS_CONFIG[detailItem.status].label}</Badge>
                <Badge variant="outline" className={`text-[10px] ${PRIORIDADE_STYLE[detailItem.prioridade]}`}>{detailItem.prioridade}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground block mb-0.5">Tipo</span><span>{TIPOS.find(t => t.value === detailItem.tipo)?.label}</span></div>
                <div><span className="text-xs text-muted-foreground block mb-0.5">Responsável</span><span>{detailItem.responsavel || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block mb-0.5">Início</span><span>{detailItem.data_inicio ? new Date(detailItem.data_inicio).toLocaleString("pt-BR") : "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block mb-0.5">Fim</span><span>{detailItem.data_fim ? new Date(detailItem.data_fim).toLocaleString("pt-BR") : "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block mb-0.5">Local</span><span>{detailItem.local || "—"}</span></div>
                <div><span className="text-xs text-muted-foreground block mb-0.5">Município</span><span>{detailItem.municipio || "—"}</span></div>
              </div>
              {detailItem.descricao && <div><p className="text-xs text-muted-foreground mb-1">Descrição</p><p className="text-sm leading-relaxed">{detailItem.descricao}</p></div>}
              {detailItem.pauta && <div><p className="text-xs text-muted-foreground mb-1">Pauta / Objetivos</p><p className="text-sm leading-relaxed whitespace-pre-line">{detailItem.pauta}</p></div>}
              {detailItem.participantes && <div><p className="text-xs text-muted-foreground mb-1">Participantes</p><p className="text-sm leading-relaxed">{detailItem.participantes}</p></div>}
              {detailItem.orgao_parceiro && <div><p className="text-xs text-muted-foreground mb-1">Órgão / Parceiro</p><p className="text-sm">{detailItem.orgao_parceiro}</p></div>}
              {detailItem.resultado && <div><p className="text-xs text-muted-foreground mb-1">Resultado</p><p className="text-sm leading-relaxed">{detailItem.resultado}</p></div>}
              {detailItem.observacoes && <div><p className="text-xs text-muted-foreground mb-1">Observações Internas</p><p className="text-sm leading-relaxed text-muted-foreground italic">{detailItem.observacoes}</p></div>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailItem(null)}>Fechar</Button>
              <Button onClick={() => { setDetailItem(null); openEdit(detailItem); }}>Editar</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar compromisso?</AlertDialogTitle>
            <AlertDialogDescription>O compromisso será marcado como cancelado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Cancelar Compromisso</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Compromissos;
