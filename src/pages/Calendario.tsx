import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock, MapPin, Calendar, RefreshCw, Unplug, Loader2,
  Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Video, ExternalLink,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useGoogleCalendar, type GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/* ─── helpers ─── */
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();

  const cells: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  // prev month padding
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevLast - i;
    const dt = new Date(year, month - 1, d);
    cells.push({ day: d, isCurrentMonth: false, dateStr: dt.toISOString().split("T")[0] });
  }

  // current month
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(year, month, d);
    cells.push({ day: d, isCurrentMonth: true, dateStr: dt.toISOString().split("T")[0] });
  }

  // next month padding
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const dt = new Date(year, month + 1, d);
    cells.push({ day: d, isCurrentMonth: false, dateStr: dt.toISOString().split("T")[0] });
  }

  return cells;
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

interface EventForm {
  summary: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  addMeet: boolean;
}

const emptyForm = (dateStr?: string): EventForm => ({
  summary: "",
  description: "",
  date: dateStr || new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  addMeet: false,
});

const Calendario = () => {
  const gcal = useGoogleCalendar();
  const { toast } = useToast();
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<GoogleCalendarEvent | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<GoogleCalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [detailEvent, setDetailEvent] = useState<GoogleCalendarEvent | null>(null);

  /* ─── fetch ─── */
  const fetchRange = () => {
    if (!gcal.connected) return;
    const from = new Date(year, month - 1, 1);
    const to = new Date(year, month + 2, 0);
    gcal.fetchEvents(from.toISOString(), to.toISOString()).then(setGoogleEvents);
  };

  useEffect(() => {
    if (gcal.connected) fetchRange();
  }, [gcal.connected, year, month]);

  /* ─── events grouped by date ─── */
  const eventsByDate = useMemo(() => {
    const map: Record<string, GoogleCalendarEvent[]> = {};
    for (const ev of googleEvents) {
      const d = ev.start.dateTime || ev.start.date || "";
      const key = d.split("T")[0];
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    }
    return map;
  }, [googleEvents]);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const todayStr = today.toISOString().split("T")[0];

  /* ─── navigation ─── */
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  /* ─── CRUD ─── */
  const openCreate = (dateStr?: string) => {
    setEditTarget(null);
    setForm(emptyForm(dateStr));
    setShowForm(true);
  };

  const openEdit = (ev: GoogleCalendarEvent) => {
    setEditTarget(ev);
    const startDt = ev.start.dateTime || ev.start.date || "";
    const endDt = ev.end.dateTime || ev.end.date || "";
    const date = startDt.split("T")[0];
    const startTime = ev.start.dateTime ? new Date(startDt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "09:00";
    const endTime = ev.end.dateTime ? new Date(endDt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }) : "10:00";

    setForm({
      summary: ev.summary || "",
      description: ev.description || "",
      date,
      startTime,
      endTime,
      location: ev.location || "",
      addMeet: !!ev.hangoutLink,
    });
    setDetailEvent(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.summary.trim()) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        summary: form.summary,
        description: form.description || undefined,
        location: form.location || undefined,
        start: { dateTime: `${form.date}T${form.startTime}:00`, timeZone: "America/Manaus" },
        end: { dateTime: `${form.date}T${form.endTime}:00`, timeZone: "America/Manaus" },
      };

      if (form.addMeet && !editTarget?.hangoutLink) {
        payload.conferenceData = {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        };
      }

      if (editTarget) {
        await gcal.updateEvent(editTarget.id, payload);
        toast({ title: "Evento atualizado no Google Calendar" });
      } else {
        await gcal.createEvent(payload);
        toast({ title: "Evento criado no Google Calendar" });
      }

      setShowForm(false);
      fetchRange();
    } catch {
      toast({ title: "Erro ao salvar evento", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await gcal.deleteEvent(deleteTarget.id);
      toast({ title: "Evento removido do Google Calendar" });
      setDeleteTarget(null);
      setDetailEvent(null);
      fetchRange();
    } catch {
      toast({ title: "Erro ao remover evento", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  /* ─── render ─── */
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Calendário</h1>
            <p className="text-sm text-muted-foreground">Google Calendar</p>
          </div>
          {gcal.connected && (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => openCreate()} className="gradient-primary text-primary-foreground border-0">
                <Plus className="w-4 h-4 mr-1" /> Novo Evento
              </Button>
              <Button variant="outline" size="sm" onClick={fetchRange} disabled={gcal.syncing}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${gcal.syncing ? "animate-spin" : ""}`} />
                Sincronizar
              </Button>
              <Button variant="outline" size="sm" onClick={gcal.disconnect} className="text-destructive hover:text-destructive">
                <Unplug className="w-3.5 h-3.5 mr-1.5" /> Desconectar
              </Button>
            </div>
          )}
        </div>

        {gcal.loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !gcal.connected ? (
          <div className="glass-card rounded-xl p-12 text-center space-y-4">
            <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <h3 className="text-foreground font-semibold">Conecte seu Google Calendar</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Sincronize seus eventos do Google Calendar com o sistema para visualizar tudo em um só lugar.
            </p>
            <Button onClick={gcal.connect} className="gradient-primary text-primary-foreground border-0">
              Conectar Google Calendar
            </Button>
          </div>
        ) : (
          <>
            {/* Month Navigation */}
            <div className="flex items-center justify-between glass-card rounded-xl px-4 py-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground capitalize">
                  {formatMonthYear(year, month)}
                </h2>
                <Button variant="outline" size="sm" onClick={goToday} className="text-xs h-7">
                  Hoje
                </Button>
              </div>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="glass-card rounded-xl overflow-hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 border-b border-border">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {grid.map((cell, i) => {
                  const dayEvents = eventsByDate[cell.dateStr] || [];
                  const isToday = cell.dateStr === todayStr;

                  return (
                    <div
                      key={i}
                      onClick={() => cell.isCurrentMonth && openCreate(cell.dateStr)}
                      className={cn(
                        "min-h-[90px] border-b border-r border-border/50 p-1 cursor-pointer hover:bg-muted/30 transition-colors",
                        !cell.isCurrentMonth && "opacity-40",
                      )}
                    >
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                          )}
                        >
                          {cell.day}
                        </span>
                      </div>
                      <div className="space-y-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((ev) => {
                          const time = ev.start.dateTime
                            ? new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                            : null;
                          return (
                            <button
                              key={ev.id}
                              onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                              className="w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate bg-primary/10 text-primary hover:bg-primary/20 transition-colors block"
                            >
                              {time && <span className="font-semibold mr-1">{time}</span>}
                              {ev.summary || "(Sem título)"}
                            </button>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground px-1.5">+{dayEvents.length - 3} mais</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ─── Event Detail Dialog ─── */}
        <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg">{detailEvent?.summary || "(Sem título)"}</DialogTitle>
            </DialogHeader>
            {detailEvent && (() => {
              const startStr = detailEvent.start.dateTime || detailEvent.start.date || "";
              const endStr = detailEvent.end.dateTime || detailEvent.end.date || "";
              const date = new Date(startStr);
              const dateFormatted = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
              const startTime = detailEvent.start.dateTime ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
              const endTime = detailEvent.end.dateTime ? new Date(endStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null;
              const meetLink = detailEvent.hangoutLink || detailEvent.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri;

              return (
                <div className="space-y-3 py-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="capitalize">{dateFormatted}</span>
                    {startTime && <span>· {startTime}{endTime ? ` – ${endTime}` : ""}</span>}
                  </div>

                  {detailEvent.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span>{detailEvent.location}</span>
                    </div>
                  )}

                  {meetLink && (
                    <a
                      href={meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Video className="w-4 h-4 shrink-0" />
                      <span>Entrar no Google Meet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {detailEvent.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-3">
                      {detailEvent.description}
                    </p>
                  )}
                </div>
              );
            })()}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => { if (detailEvent) { setDeleteTarget(detailEvent); } }}>
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-destructive" /> Excluir
              </Button>
              <Button size="sm" onClick={() => { if (detailEvent) openEdit(detailEvent); }}>
                <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Editar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Create/Edit Form Dialog ─── */}
        <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editTarget ? "Editar Evento" : "Novo Evento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Título *</label>
                <Input
                  value={form.summary}
                  onChange={(e) => setForm(f => ({ ...f, summary: e.target.value }))}
                  placeholder="Adicionar título"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Data *</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Início</label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Fim</label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Local / Endereço</label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Endereço presencial ou link"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="add-meet"
                  checked={form.addMeet}
                  onCheckedChange={(checked) => setForm(f => ({ ...f, addMeet: checked === true }))}
                />
                <label htmlFor="add-meet" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" />
                  Adicionar link do Google Meet
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Adicionar descrição..."
                  rows={3}
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

        {/* ─── Delete Confirm ─── */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover evento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover <strong>{deleteTarget?.summary}</strong> do Google Calendar? Esta ação não pode ser desfeita.
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
      </motion.div>
    </AppLayout>
  );
};

export default Calendario;
