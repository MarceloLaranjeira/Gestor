import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Calendar, RefreshCw, Unplug, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useGoogleCalendar, type GoogleCalendarEvent } from "@/hooks/useGoogleCalendar";
import { Button } from "@/components/ui/button";

const Calendario = () => {
  const gcal = useGoogleCalendar();
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  useEffect(() => {
    if (gcal.connected) {
      const now = new Date();
      const past = new Date(now);
      past.setMonth(now.getMonth() - 3);
      const future = new Date(now);
      future.setMonth(now.getMonth() + 6);
      gcal.fetchEvents(past.toISOString(), future.toISOString()).then(setGoogleEvents);
    }
  }, [gcal.connected]);

  const handleSync = () => {
    const now = new Date();
    const past = new Date(now);
    past.setMonth(now.getMonth() - 3);
    const future = new Date(now);
    future.setMonth(now.getMonth() + 6);
    gcal.fetchEvents(past.toISOString(), future.toISOString()).then(setGoogleEvents);
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Calendário</h1>
            <p className="text-sm text-muted-foreground">Eventos sincronizados do Google Calendar</p>
          </div>
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
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {googleEvents.length} evento(s) sincronizados do Google Calendar
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSync} disabled={gcal.syncing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${gcal.syncing ? "animate-spin" : ""}`} />
                  Sincronizar
                </Button>
                <Button variant="outline" size="sm" onClick={gcal.disconnect} className="text-destructive hover:text-destructive">
                  <Unplug className="w-3.5 h-3.5 mr-1.5" />
                  Desconectar
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {googleEvents.map((gev) => {
                const startStr = gev.start.dateTime || gev.start.date || "";
                const date = new Date(startStr);
                const dateFormatted = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                const timeFormatted = gev.start.dateTime ? date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Dia inteiro";

                return (
                  <motion.div
                    key={gev.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow"
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
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Google
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">{gev.summary || "(Sem título)"}</h3>
                        {gev.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{gev.description}</p>}
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {timeFormatted}</span>
                          {gev.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {gev.location}</span>}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {googleEvents.length === 0 && (
                <div className="glass-card rounded-xl p-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Nenhum evento encontrado no Google Calendar.</p>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Calendario;
