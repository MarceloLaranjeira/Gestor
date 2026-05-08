import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle2, XCircle, Loader2, Plus } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TipoAlerta = "info" | "warning" | "danger" | "success";

interface Alerta {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: TipoAlerta;
  origem: string;
  lido: boolean;
  created_at: string;
}

const TIPO_CONFIG: Record<TipoAlerta, { label: string; icon: any; style: string; pulse: string }> = {
  danger:  { label: "Urgente",    icon: XCircle,      style: "border-destructive/40 bg-destructive/5",  pulse: "bg-destructive" },
  warning: { label: "Atenção",    icon: AlertTriangle, style: "border-warning/40 bg-warning/5",         pulse: "bg-warning" },
  info:    { label: "Informação", icon: Info,          style: "border-info/40 bg-info/5",               pulse: "bg-info" },
  success: { label: "Concluído",  icon: CheckCircle2,  style: "border-success/40 bg-success/5",         pulse: "bg-success" },
};

const Alertas = () => {
  const { user } = useAuth();
  const { toast: showToast } = toast;
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ titulo: "", mensagem: "", tipo: "warning" as TipoAlerta });
  const [saving, setSaving] = useState(false);
  const [filterTipo, setFilterTipo] = useState<TipoAlerta | "todos">("todos");
  const [filterLido, setFilterLido] = useState<"todos" | "nao_lido" | "lido">("todos");

  const load = async () => {
    const { data } = await supabase
      .from("alertas_sistema")
      .select("*")
      .order("created_at", { ascending: false });
    setAlertas((data as Alerta[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const marcarLido = async (id: string) => {
    await supabase.from("alertas_sistema").update({ lido: true }).eq("id", id);
    setAlertas(prev => prev.map(a => a.id === id ? { ...a, lido: true } : a));
  };

  const marcarTodosLidos = async () => {
    await supabase.from("alertas_sistema").update({ lido: true }).eq("user_id", user?.user_id).eq("lido", false);
    setAlertas(prev => prev.map(a => ({ ...a, lido: true })));
    showToast({ title: "Todos os alertas marcados como lidos" });
  };

  const handleCreate = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    await supabase.from("alertas_sistema").insert({ ...form, user_id: user?.user_id, origem: "manual" });
    setDialogOpen(false);
    setForm({ titulo: "", mensagem: "", tipo: "warning" });
    load();
    setSaving(false);
  };

  const filtered = alertas.filter(a => {
    const matchTipo = filterTipo === "todos" || a.tipo === filterTipo;
    const matchLido = filterLido === "todos" || (filterLido === "lido" ? a.lido : !a.lido);
    return matchTipo && matchLido;
  });

  const naoLidos = alertas.filter(a => !a.lido).length;
  const urgentes = alertas.filter(a => a.tipo === "danger" && !a.lido).length;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-foreground" />
              {naoLidos > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {naoLidos > 9 ? "9+" : naoLidos}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Alertas do Sistema</h1>
              <p className="text-xs text-muted-foreground">{naoLidos} não lidos · {urgentes > 0 && <span className="text-destructive font-semibold">{urgentes} urgentes</span>}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {naoLidos > 0 && (
              <Button variant="outline" size="sm" onClick={marcarTodosLidos} className="gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todos como lidos
              </Button>
            )}
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Novo Alerta
            </Button>
          </div>
        </div>

        {/* KPI urgentes */}
        {urgentes > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 flex items-center gap-3"
          >
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-40" />
            </div>
            <div>
              <p className="text-sm font-bold text-destructive">{urgentes} alerta{urgentes > 1 ? "s" : ""} urgente{urgentes > 1 ? "s" : ""} não lido{urgentes > 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Ação imediata necessária</p>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filterTipo} onValueChange={v => setFilterTipo(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos tipos</SelectItem>
              {Object.entries(TIPO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterLido} onValueChange={v => setFilterLido(v as any)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Leitura" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="nao_lido">Não lidos</SelectItem>
              <SelectItem value="lido">Lidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum alerta encontrado</p>
          </div>
        ) : (
          <AnimatePresence>
            <div className="space-y-2">
              {filtered.map(alerta => {
                const cfg = TIPO_CONFIG[alerta.tipo] ?? TIPO_CONFIG.info;
                const Icon = cfg.icon;
                return (
                  <motion.div key={alerta.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                    <Card className={cn("border transition-all", cfg.style, !alerta.lido && "shadow-sm")}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0 mt-0.5">
                            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", `${cfg.pulse}/15`)}>
                              <Icon className={cn("w-4 h-4", `text-${alerta.tipo === "danger" ? "destructive" : alerta.tipo}`)} />
                            </div>
                            {!alerta.lido && alerta.tipo === "danger" && (
                              <span className={cn("absolute inset-0 rounded-full border-2 animate-ping opacity-50", `border-destructive`)} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className={cn("text-sm font-semibold", !alerta.lido ? "text-foreground" : "text-muted-foreground")}>{alerta.titulo}</span>
                              <Badge variant="outline" className={cn("text-[9px] shrink-0", cfg.style)}>{cfg.label}</Badge>
                              {!alerta.lido && <span className={cn("w-2 h-2 rounded-full shrink-0 animate-pulse", cfg.pulse)} />}
                            </div>
                            {alerta.mensagem && <p className="text-xs text-muted-foreground">{alerta.mensagem}</p>}
                            <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(alerta.created_at).toLocaleString("pt-BR")}{alerta.origem && alerta.origem !== "manual" ? ` · via ${alerta.origem}` : ""}</p>
                          </div>
                          {!alerta.lido && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => marcarLido(alerta.id)} title="Marcar como lido">
                              <CheckCheck className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Alerta Manual</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Título *</Label>
              <Input placeholder="Resumo do alerta" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as TipoAlerta }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="danger">🔴 Urgente</SelectItem>
                  <SelectItem value="warning">🟡 Atenção</SelectItem>
                  <SelectItem value="info">🔵 Informação</SelectItem>
                  <SelectItem value="success">🟢 Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Mensagem</Label>
              <Textarea placeholder="Detalhe o alerta..." rows={3} value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Criar Alerta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Alertas;
