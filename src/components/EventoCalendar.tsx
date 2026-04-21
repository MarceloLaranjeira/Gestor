import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  local: string;
  tipo: string;
  participantes: number;
  google_synced?: boolean;
}

const tipoColors: Record<string, string> = {
  "Plenário": "bg-primary/20 text-primary border-primary/30",
  "Comissão": "bg-secondary/20 text-secondary border-secondary/30",
  "Audiência": "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
  "Visita": "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
  "Religioso": "bg-accent/20 text-accent-foreground border-accent/30",
  "Interno": "bg-muted text-muted-foreground border-border",
  "Cultural": "bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30",
  "Outro": "bg-muted text-muted-foreground border-border",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  eventos: Evento[];
  onEventClick?: (evento: Evento) => void;
  onDayClick?: (dateStr: string) => void;
}

export default function EventoCalendar({ eventos, onEventClick, onDayClick }: Props) {
  const [viewMode, setViewMode] = useState<"grade" | "lista">("grade");
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const firstDay = new Date(current.year, current.month, 1);
  const lastDay = new Date(current.year, current.month + 1, 0);
  const startOffset = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const eventsByDate: Record<string, Evento[]> = {};
  eventos.forEach((e) => {
    if (!eventsByDate[e.data]) eventsByDate[e.data] = [];
    eventsByDate[e.data].push(e);
  });

  const prev = () =>
    setCurrent((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { year: c.year, month: c.month - 1 }));
  const next = () =>
    setCurrent((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { year: c.year, month: c.month + 1 }));
  const goToday = () => {
    const now = new Date();
    setCurrent({ year: now.getFullYear(), month: now.getMonth() });
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  // Sorted dates for agenda view
  const sortedDates = useMemo(() => {
    const monthStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}`;
    return Object.keys(eventsByDate)
      .filter(d => d.startsWith(monthStr))
      .sort();
  }, [eventsByDate, current.year, current.month]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prev} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={next} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold text-foreground ml-2">
            {MONTHS[current.month]} {current.year}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("grade")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1",
                viewMode === "grade" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> Grade
            </button>
            <button
              onClick={() => setViewMode("lista")}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1",
                viewMode === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="w-3.5 h-3.5" /> Agenda
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
            Hoje
          </Button>
        </div>
      </div>

      {viewMode === "grade" ? (
        <>
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-border/50 bg-muted/20" />;
                }
                const dateStr = `${current.year}-${String(current.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDate[dateStr] || [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(isSelected ? null : dateStr);
                      if (dayEvents.length === 0) onDayClick?.(dateStr);
                    }}
                    className={cn(
                      "min-h-[80px] border-b border-r border-border/50 p-1 cursor-pointer transition-colors hover:bg-accent/30",
                      isSelected && "bg-accent/20 ring-1 ring-primary/30",
                    )}
                  >
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                      isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground",
                    )}>
                      {day}
                    </span>
                    <div className="space-y-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          onClick={(e) => { e.stopPropagation(); onEventClick?.(ev); }}
                          className={cn(
                            "text-[10px] leading-tight px-1 py-0.5 rounded truncate border-l-2 cursor-pointer hover:opacity-80",
                            tipoColors[ev.tipo] || "bg-muted text-muted-foreground border-border",
                          )}
                          title={`${ev.hora} - ${ev.titulo}`}
                        >
                          {ev.google_synced && <CheckCircle2 className="w-2.5 h-2.5 inline mr-0.5 text-emerald-500" />}
                          {ev.titulo}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum evento neste dia.</p>
              ) : (
                selectedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick?.(ev)}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", tipoColors[ev.tipo] || "bg-muted text-muted-foreground")}>
                          {ev.tipo}
                        </span>
                        {ev.google_synced && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Google
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{ev.titulo}</p>
                      {ev.descricao && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.descricao}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.hora}</span>
                        {ev.local && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.local}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      ) : (
        /* Agenda / List View */
        <div className="space-y-4">
          {sortedDates.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-muted-foreground text-sm">Nenhum evento neste mês.</p>
            </div>
          ) : (
            sortedDates.map((date) => {
              const dt = new Date(date + "T12:00:00");
              const isToday = date === todayStr;
              const dayEvts = eventsByDate[date] || [];

              return (
                <div key={date}>
                  <div className={cn("flex items-center gap-3 mb-2 px-1", isToday && "text-primary")}>
                    <div className="text-center shrink-0 w-12">
                      <p className={cn("text-2xl font-bold font-display leading-none", isToday ? "text-primary" : "text-foreground")}>
                        {String(dt.getDate()).padStart(2, "0")}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">
                        {dt.toLocaleDateString("pt-BR", { weekday: "short" })}
                      </p>
                    </div>
                    {isToday && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">Hoje</span>
                    )}
                  </div>
                  <div className="space-y-2 ml-14">
                    {dayEvts.map((ev) => (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => onEventClick?.(ev)}
                        className="glass-card rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", tipoColors[ev.tipo] || "bg-muted text-muted-foreground")}>
                                {ev.tipo}
                              </span>
                              {ev.google_synced && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" /> Google
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">{ev.titulo}</h3>
                            {ev.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ev.descricao}</p>}
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.hora}</span>
                              {ev.local && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.local}</span>}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
