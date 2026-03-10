import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Clock, MapPin, Calendar, RefreshCw, Unplug, Loader2, List,
  Plus, ChevronLeft, ChevronRight, Edit2, Trash2, Video, ExternalLink, Grid3X3,
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

/* ─── Color system based on Google Calendar colorId ─── */
const EVENT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "1":  { bg: "bg-blue-500/15",    text: "text-blue-700 dark:text-blue-300",    dot: "bg-blue-500" },
  "2":  { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  "3":  { bg: "bg-purple-500/15",  text: "text-purple-700 dark:text-purple-300",  dot: "bg-purple-500" },
  "4":  { bg: "bg-rose-500/15",    text: "text-rose-700 dark:text-rose-300",    dot: "bg-rose-500" },
  "5":  { bg: "bg-amber-500/15",   text: "text-amber-700 dark:text-amber-300",   dot: "bg-amber-500" },
  "6":  { bg: "bg-orange-500/15",  text: "text-orange-700 dark:text-orange-300",  dot: "bg-orange-500" },
  "7":  { bg: "bg-cyan-500/15",    text: "text-cyan-700 dark:text-cyan-300",    dot: "bg-cyan-500" },
  "8":  { bg: "bg-slate-500/15",   text: "text-slate-700 dark:text-slate-300",   dot: "bg-slate-500" },
  "9":  { bg: "bg-indigo-500/15",  text: "text-indigo-700 dark:text-indigo-300",  dot: "bg-indigo-500" },
  "10": { bg: "bg-teal-500/15",    text: "text-teal-700 dark:text-teal-300",    dot: "bg-teal-500" },
  "11": { bg: "bg-red-500/15",     text: "text-red-700 dark:text-red-300",     dot: "bg-red-500" },
};

const DEFAULT_COLOR = { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" };

function getEventColor(ev: GoogleCalendarEvent) {
  if (ev.colorId && EVENT_COLORS[ev.colorId]) return EVENT_COLORS[ev.colorId];
  // Hash summary to assign consistent color when no colorId
  if (ev.summary) {
    const hash = ev.summary.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const keys = Object.keys(EVENT_COLORS);
    return EVENT_COLORS[keys[hash % keys.length]];
  }
  return DEFAULT_COLOR;
}

/* ─── helpers ─── */
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();

  const cells: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevLast - i;
    const dt = new Date(year, month - 1, d);
    cells.push({ day: d, isCurrentMonth: false, dateStr: dt.toISOString().split("T")[0] });
  }
  for (let d = 1; d <= totalDays; d++) {
    const dt = new Date(year, month, d);
    cells.push({ day: d, isCurrentMonth: true, dateStr: dt.toISOString().split("T")[0] });
  }
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
  colorId: string;
}

const COLOR_OPTIONS = [
  { id: "",   label: "Padrão" },
  { id: "1",  label: "Lavanda" },
  { id: "2",  label: "Sálvia" },
  { id: "3",  label: "Uva" },
  { id: "4",  label: "Flamingo" },
  { id: "5",  label: "Banana" },
  { id: "6",  label: "Tangerina" },
  { id: "7",  label: "Pavão" },
  { id: "8",  label: "Grafite" },
  { id: "9",  label: "Mirtilo" },
  { id: "10", label: "Manjericão" },
  { id: "11", label: "Tomate" },
];

const emptyForm = (dateStr?: string): EventForm => ({
  summary: "",
  description: "",
  date: dateStr || new Date().toISOString().split("T")[0],
  startTime: "09:00",
  endTime: "10:00",
  location: "",
  addMeet: false,
  colorId: "",
});

const Calendario = () => {
  const gcal = useGoogleCalendar();
  const { toast } = useToast();
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<"grade" | "lista">("grade");

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
    // Sort events within each day by time
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aT = a.start.dateTime || a.start.date || "";
        const bT = b.start.dateTime || b.start.date || "";
        return aT.localeCompare(bT);
      });
    }
    return map;
  }, [googleEvents]);

  /* ─── sorted dates for list view ─── */
  const sortedMonthEvents = useMemo(() => {
    const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;
    
    const dates = Object.keys(eventsByDate)
      .filter(d => d >= monthStart && d < nextMonth)
      .sort();
    
    return dates.map(date => ({
      date,
      events: eventsByDate[date],
    }));
  }, [eventsByDate, year, month]);

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
      colorId: ev.colorId || "",
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
      if (form.colorId) payload.colorId = form.colorId;

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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Calendário</h1>
            <p className="text-sm text-muted-foreground">Google Calendar</p>
          </div>
          {gcal.connected && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* View toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode("grade")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                    viewMode === "grade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Grid3X3 className="w-3.5 h-3.5" /> Grade
                </button>
                <button
                  onClick={() => setViewMode("lista")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5",
                    viewMode === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <List className="w-3.5 h-3.5" /> Agenda
                </button>
              </div>
              <Button size="sm" onClick={() => openCreate()} className="gradient-primary text-primary-foreground border-0">
                <Plus className="w-4 h-4 mr-1" /> Novo Evento
              </Button>
              <Button variant="outline" size="sm" onClick={fetchRange} disabled={gcal.syncing}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", gcal.syncing && "animate-spin")} />
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
            <Button
              onClick={async () => {
                const result = await gcal.connect();
                if (result?.error) {
                  toast({ title: result.error, variant: "destructive" });
                }
              }}
              className="gradient-primary text-primary-foreground border-0"
            >
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

            {viewMode === "grade" ? (
              /* ─── Calendar Grid ─── */
              <div className="glass-card rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAYS.map((d) => (
                    <div key={d} className="text-center py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {d}
                    </div>
                  ))}
                </div>
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
                          <span className={cn(
                            "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                            isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                          )}>
                            {cell.day}
                          </span>
                        </div>
                        <div className="space-y-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const color = getEventColor(ev);
                            const time = ev.start.dateTime
                              ? new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                              : null;
                            return (
                              <button
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); setDetailEvent(ev); }}
                                className={cn(
                                  "w-full text-left px-1.5 py-0.5 rounded text-[10px] leading-tight truncate transition-colors block",
                                  color.bg, color.text, "hover:opacity-80"
                                )}
                              >
                                <span className={cn("inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle", color.dot)} />
                                {time && <span className="font-semibold mr-0.5">{time}</span>}
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
            ) : (
              /* ─── Agenda / List View ─── */
              <div className="space-y-4">
                {sortedMonthEvents.length === 0 ? (
                  <div className="glass-card rounded-xl p-12 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Nenhum evento neste mês.</p>
                  </div>
                ) : (
                  sortedMonthEvents.map(({ date, events }) => {
                    const dt = new Date(date + "T12:00:00");
                    const isToday = date === todayStr;
                    const dayLabel = dt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });

                    return (
                      <div key={date}>
                        <div className={cn(
                          "flex items-center gap-3 mb-2 px-1",
                          isToday && "text-primary"
                        )}>
                          <div className={cn(
                            "text-center shrink-0 w-12",
                          )}>
                            <p className={cn(
                              "text-2xl font-bold font-display leading-none",
                              isToday ? "text-primary" : "text-foreground"
                            )}>
                              {String(dt.getDate()).padStart(2, "0")}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase">
                              {dt.toLocaleDateString("pt-BR", { weekday: "short" })}
                            </p>
                          </div>
                          {isToday && (
                            <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Hoje
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 ml-14">
                          {events.map((ev) => {
                            const color = getEventColor(ev);
                            const startTime = ev.start.dateTime
                              ? new Date(ev.start.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                              : "Dia inteiro";
                            const endTime = ev.end.dateTime
                              ? new Date(ev.end.dateTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                              : null;
                            const meetLink = ev.hangoutLink || ev.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri;

                            return (
                              <motion.div
                                key={ev.id}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => setDetailEvent(ev)}
                                className={cn(
                                  "glass-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-all border-l-4 group",
                                )}
                                style={{ borderLeftColor: `var(--event-color-${ev.colorId || "default"})` }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={cn("w-2.5 h-2.5 rounded-full mt-1 shrink-0", color.dot)} />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-foreground">{ev.summary || "(Sem título)"}</h3>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {startTime}{endTime ? ` – ${endTime}` : ""}
                                      </span>
                                      {ev.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="w-3.5 h-3.5" /> {ev.location}
                                        </span>
                                      )}
                                      {meetLink && (
                                        <a
                                          href={meetLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="flex items-center gap-1 text-primary hover:underline"
                                        >
                                          <Video className="w-3.5 h-3.5" /> Meet
                                        </a>
                                      )}
                                    </div>
                                    {ev.description && (
                                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{ev.description}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); openEdit(ev); }}
                                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(ev); }}
                                      className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* ─── Event Detail Dialog ─── */}
        <Dialog open={!!detailEvent} onOpenChange={(open) => !open && setDetailEvent(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              {detailEvent && (
                <div className="flex items-center gap-2">
                  <span className={cn("w-3 h-3 rounded-full shrink-0", getEventColor(detailEvent).dot)} />
                  <DialogTitle className="text-lg">{detailEvent.summary || "(Sem título)"}</DialogTitle>
                </div>
              )}
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

                  {detailEvent.organizer && !detailEvent.organizer.self && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Organizador: {detailEvent.organizer.displayName || detailEvent.organizer.email}</span>
                    </div>
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

              {/* Color picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Cor do evento</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const color = c.id ? EVENT_COLORS[c.id] : DEFAULT_COLOR;
                    const isSelected = form.colorId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, colorId: c.id }))}
                        className={cn(
                          "w-7 h-7 rounded-full transition-all flex items-center justify-center",
                          color.dot,
                          isSelected ? "ring-2 ring-offset-2 ring-foreground/50 ring-offset-background scale-110" : "hover:scale-110 opacity-70 hover:opacity-100"
                        )}
                        title={c.label}
                      >
                        {isSelected && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
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
