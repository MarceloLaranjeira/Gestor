import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Clock, MapPin, Users, Edit2, Trash2, Loader2, Calendar } from "lucide-react";
import EventoCalendar from "@/components/EventoCalendar";
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

interface Evento {
  id: string;
  user_id: string;
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  local: string;
  tipo: string;
  participantes: number;
  created_at: string;
}

const TIPOS = ["Plenário", "Comissão", "Audiência", "Visita", "Religioso", "Interno", "Cultural", "Outro"];

const tipoColors: Record<string, string> = {
  "Plenário": "bg-primary/10 text-primary",
  "Comissão": "bg-secondary/10 text-secondary",
  "Audiência": "bg-info/10 text-info",
  "Visita": "bg-success/10 text-success",
  "Religioso": "bg-accent/10 text-accent-foreground",
  "Interno": "bg-muted text-muted-foreground",
  "Cultural": "bg-warning/10 text-warning",
  "Outro": "bg-muted text-muted-foreground",
};

const emptyForm = (): Omit<Evento, "id" | "user_id" | "created_at"> => ({
  titulo: "", descricao: "", data: new Date().toISOString().split("T")[0],
  hora: "08:00", local: "", tipo: "Interno", participantes: 0,
});

const Eventos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"lista" | "passados" | "calendario">("lista");

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Evento | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Evento | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEventos = async () => {
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .order("data", { ascending: true })
      .order("hora", { ascending: true });
    setEventos((data as Evento[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchEventos(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (e: Evento) => {
    setEditTarget(e);
    setForm({
      titulo: e.titulo, descricao: e.descricao, data: e.data,
      hora: e.hora, local: e.local, tipo: e.tipo, participantes: e.participantes,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    if (!form.data) {
      toast({ title: "Data é obrigatória", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase.from("eventos").update({ ...form }).eq("id", editTarget.id);
        if (error) throw error;
        toast({ title: "Evento atualizado" });
      } else {
        const { error } = await supabase.from("eventos").insert({ ...form, user_id: user!.user_id });
        if (error) throw error;
        toast({ title: "Evento criado com sucesso" });
      }
      setShowForm(false);
      fetchEventos();
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
      const { error } = await supabase.from("eventos").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Evento removido" });
      setDeleteTarget(null);
      fetchEventos();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const proximos = eventos.filter((e) => e.data >= today);
  const passados = eventos.filter((e) => e.data < today);
  const displayed = view === "lista" ? proximos : passados;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Eventos</h1>
            <p className="text-sm text-muted-foreground">Agenda parlamentar e eventos institucionais</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setView("lista")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                Próximos ({proximos.length})
              </button>
              <button
                onClick={() => setView("passados")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "passados" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                Passados ({passados.length})
              </button>
              <button
                onClick={() => setView("calendario")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "calendario" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                📅 Google Calendar
              </button>
            </div>
            <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0">
              <Plus className="w-4 h-4 mr-2" />
              Novo Evento
            </Button>
          </div>
        </div>

        {view === "calendario" ? (
          <EventoCalendar eventos={eventos} onEventClick={(ev) => openEdit(ev as any)} />
        ) : loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((evento) => {
              const date = new Date(evento.data + "T00:00:00");
              return (
                <motion.div
                  key={evento.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-center px-3 py-2 rounded-lg bg-muted/50 shrink-0">
                      <p className="text-2xl font-bold font-display text-primary leading-none">
                        {String(date.getDate()).padStart(2, "0")}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                        {String(date.getMonth() + 1).padStart(2, "0")}/{date.getFullYear()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tipoColors[evento.tipo] || "bg-muted text-muted-foreground"}`}>
                          {evento.tipo}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">{evento.titulo}</h3>
                      {evento.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{evento.descricao}</p>}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {evento.hora}</span>
                        {evento.local && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {evento.local}</span>}
                        {evento.participantes > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {evento.participantes} participantes</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => openEdit(evento)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(evento)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {displayed.length === 0 && (
              <div className="glass-card rounded-xl p-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {view === "lista" ? "Nenhum evento próximo. Clique em Novo Evento para agendar." : "Nenhum evento passado registrado."}
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Título *</label>
              <Input value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Título do evento" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Descreva o evento..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Data *</label>
                <Input type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Hora</label>
                <Input type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tipo</label>
                <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground">
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Participantes</label>
                <Input type="number" min={0} value={form.participantes} onChange={(e) => setForm((f) => ({ ...f, participantes: Number(e.target.value) }))} placeholder="0" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">Local</label>
                <Input value={form.local} onChange={(e) => setForm((f) => ({ ...f, local: e.target.value }))} placeholder="Local do evento" />
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
            <AlertDialogTitle>Remover evento</AlertDialogTitle>
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

export default Eventos;
