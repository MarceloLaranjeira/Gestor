import { useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, Plus, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAgendamentos, type Agendamento } from "@/hooks/useAgenda";
import { cn } from "@/lib/utils";
import type { Especialidade } from "@/lib/atendimento";
import {
  ETAPA_LABEL,
  STATUS_AGENDAMENTO_CLASS,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_LABEL,
  agruparPorDia,
  intervaloPeriodo,
  moverPeriodo,
  rotuloPeriodo,
  type EtapaInvestigacao,
  type StatusAgendamento,
  type TipoAgendamento,
} from "@/lib/agenda";

interface AgendaPanelProps {
  especialidade: Especialidade;
  onAgendar: () => void;
  onAbrir: (a: Agendamento) => void;
}

export function AgendaPanel({ especialidade, onAgendar, onAbrir }: AgendaPanelProps) {
  const [ref, setRef] = useState(() => new Date());
  const { inicio, fim } = intervaloPeriodo("semana", ref);
  const { data: agendamentos = [], isLoading } = useAgendamentos(inicio, fim, especialidade.slug);
  const dias = agruparPorDia(agendamentos);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setRef((r) => moverPeriodo("semana", r, -1))} aria-label="Semana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-9" onClick={() => setRef(new Date())}>Hoje</Button>
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setRef((r) => moverPeriodo("semana", r, 1))} aria-label="Próxima semana">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-sm font-medium tabular-nums">{rotuloPeriodo("semana", ref)}</span>
        </div>
        <div className="flex items-center gap-3">
          {especialidade.retorno_dias && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Repeat className="h-3.5 w-3.5" /> Retorno automático a cada {especialidade.retorno_dias} dias
            </span>
          )}
          <Button size="sm" onClick={onAgendar}>
            <Plus className="mr-1.5 h-4 w-4" /> Agendar
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && dias.length === 0 && (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          Nenhum atendimento nesta semana.
        </div>
      )}

      <div className="space-y-5">
        {dias.map(({ dia, itens }) => {
          const data = new Date(`${dia}T00:00:00`);
          return (
            <section key={dia}>
              <h3 className={cn("mb-2 flex items-baseline gap-2 text-sm font-semibold capitalize", isToday(data) && "text-primary")}>
                {format(data, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                <span className="text-xs font-normal text-muted-foreground">{itens.length} atendimento(s)</span>
              </h3>
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
                {itens.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => onAbrir(a)} className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40">
                      <span className="w-12 shrink-0 font-mono text-sm tabular-nums">{format(new Date(a.data_hora), "HH:mm")}</span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block truncate font-medium", a.status === "cancelado" && "text-muted-foreground line-through")}>
                          {a.paciente?.nome ?? "Paciente"}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {TIPO_LABEL[a.tipo as TipoAgendamento]}
                          {a.etapa ? ` · ${ETAPA_LABEL[a.etapa as EtapaInvestigacao]}` : ""}
                          {a.profissional ? ` · ${a.profissional}` : ""}
                        </span>
                      </span>
                      <Badge variant="outline" className={cn("shrink-0 text-[11px]", STATUS_AGENDAMENTO_CLASS[a.status as StatusAgendamento])}>
                        {STATUS_AGENDAMENTO_LABEL[a.status as StatusAgendamento]}
                      </Badge>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
