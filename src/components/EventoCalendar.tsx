import { useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  local: string;
  tipo: string;
  participantes: number;
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
}

export default function EventoCalendar({ eventos, onEventClick }: Props) {
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
        <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
          Hoje
        </Button>
      </div>

      {/* Grid */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
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
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  "min-h-[80px] border-b border-r border-border/50 p-1 cursor-pointer transition-colors hover:bg-accent/30",
                  isSelected && "bg-accent/20 ring-1 ring-primary/30",
                )}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 text-xs rounded-full",
                    isToday ? "bg-primary text-primary-foreground font-bold" : "text-foreground",
                  )}
                >
                  {day}
                </span>
                <div className="space-y-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(ev);
                      }}
                      className={cn(
                        "text-[10px] leading-tight px-1 py-0.5 rounded truncate border-l-2 cursor-pointer hover:opacity-80",
                        tipoColors[ev.tipo] || "bg-muted text-muted-foreground border-border",
                      )}
                      title={`${ev.hora} - ${ev.titulo}`}
                    >
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

      {/* Selected day details */}
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
    </div>
  );
}
