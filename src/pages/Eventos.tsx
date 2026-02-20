import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Calendar as CalIcon, Clock, MapPin, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";

interface Evento {
  id: number;
  titulo: string;
  data: string;
  hora: string;
  local: string;
  tipo: string;
  participantes: number;
  descricao: string;
}

const mockEventos: Evento[] = [
  { id: 1, titulo: "Sessão Plenária - PL 234/2026", data: "21/02/2026", hora: "09:00", local: "Plenário ALEAM", tipo: "Plenário", participantes: 24, descricao: "Votação do Projeto de Lei sobre segurança pública" },
  { id: 2, titulo: "Reunião Comissão de Segurança", data: "21/02/2026", hora: "14:00", local: "Sala de Comissões", tipo: "Comissão", participantes: 8, descricao: "Análise de propostas de segurança pública" },
  { id: 3, titulo: "Audiência Pública - Mobilidade Inclusiva", data: "22/02/2026", hora: "10:00", local: "Auditório Principal", tipo: "Audiência", participantes: 120, descricao: "Debate sobre mobilidade inclusiva no AM" },
  { id: 4, titulo: "Visita Batalhão PM", data: "23/02/2026", hora: "08:30", local: "5º BPM", tipo: "Visita", participantes: 6, descricao: "Visita institucional para acompanhar demandas" },
  { id: 5, titulo: "Culto Ecumênico - Paz nas Comunidades", data: "24/02/2026", hora: "19:00", local: "Igreja Central", tipo: "Religioso", participantes: 200, descricao: "Evento do Movimento Cultura de Paz" },
  { id: 6, titulo: "Reunião Equipe Estratégica", data: "25/02/2026", hora: "08:00", local: "Gabinete", tipo: "Interno", participantes: 12, descricao: "Planejamento semanal da equipe" },
];

const tipoColors: Record<string, string> = {
  "Plenário": "bg-primary/10 text-primary",
  "Comissão": "bg-secondary/10 text-secondary",
  "Audiência": "bg-info/10 text-info",
  "Visita": "bg-success/10 text-success",
  "Religioso": "bg-accent/10 text-accent-foreground",
  "Interno": "bg-muted text-muted-foreground",
};

const Eventos = () => {
  const [view, setView] = useState<"lista" | "calendario">("lista");

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
                Lista
              </button>
              <button
                onClick={() => setView("calendario")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === "calendario" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                Calendário
              </button>
            </div>
            <button className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              Novo Evento
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {mockEventos.map((evento) => (
            <motion.div
              key={evento.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="text-center px-3 py-2 rounded-lg bg-muted/50 shrink-0">
                  <p className="text-2xl font-bold font-display text-primary leading-none">
                    {evento.data.split("/")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    {evento.data.split("/")[1]}/{evento.data.split("/")[2]}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${tipoColors[evento.tipo] || "bg-muted text-muted-foreground"}`}>
                      {evento.tipo}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{evento.titulo}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{evento.descricao}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {evento.hora}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {evento.local}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {evento.participantes} participantes</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Eventos;
