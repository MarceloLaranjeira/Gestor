import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, CalendarPlus, Loader2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useControleFaltas } from "@/hooks/useAgenda";
import { cn } from "@/lib/utils";
import { buildWhatsAppShareUrl, maskPhone, type Especialidade } from "@/lib/atendimento";
import { JANELA_FALTAS_DIAS, LIMITE_FALTAS_ALERTA, faltasRecentes } from "@/lib/agenda";

interface FaltasPanelProps {
  especialidades: Especialidade[];
  onReagendar: (pacienteId: string, especialidade: string) => void;
}

export function FaltasPanel({ especialidades, onReagendar }: FaltasPanelProps) {
  const [filtro, setFiltro] = useState("todas");
  const { data: agendamentos = [], isLoading } = useControleFaltas();

  const doFiltro = filtro === "todas" ? agendamentos : agendamentos.filter((a) => a.especialidade_slug === filtro);
  const faltas = faltasRecentes(doFiltro);
  const agora = new Date().toISOString();
  const pacientePorId = new Map(agendamentos.map((a) => [a.paciente_id, a.paciente]));
  const proximo = (pacienteId: string) =>
    doFiltro.find((a) => a.paciente_id === pacienteId && a.data_hora > agora && ["agendado", "confirmado"].includes(a.status));
  const nomeEsp = (slug: string) => especialidades.find((e) => e.slug === slug)?.nome ?? slug;

  const mensagem = (nome: string) =>
    `Olá! Sentimos falta de *${nome}* no atendimento. Podemos reagendar? Responda esta mensagem com o melhor dia e horário para a família.`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Pacientes com falta nos últimos {JANELA_FALTAS_DIAS} dias. A partir de {LIMITE_FALTAS_ALERTA} faltas o paciente aparece em destaque.
        </p>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as especialidades</SelectItem>
            {especialidades.map((e) => (
              <SelectItem key={e.slug} value={e.slug}>{e.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="w-24 text-center">Faltas</TableHead>
              <TableHead className="hidden md:table-cell">Última falta</TableHead>
              <TableHead>Reagendamento</TableHead>
              <TableHead className="w-28 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></TableCell>
              </TableRow>
            )}
            {!isLoading && faltas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Nenhuma falta no período.</TableCell>
              </TableRow>
            )}
            {faltas.map((f) => {
              const p = pacientePorId.get(f.paciente_id);
              const prox = proximo(f.paciente_id);
              const alerta = f.total >= LIMITE_FALTAS_ALERTA;
              return (
                <TableRow key={f.paciente_id} className={cn(alerta && "bg-rose-50/60 dark:bg-rose-500/5")}>
                  <TableCell>
                    <span className="flex items-center gap-1.5 font-medium">
                      {alerta && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                      {p?.nome ?? "Paciente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {f.especialidades.map(nomeEsp).join(", ")} · {p?.telefone ? maskPhone(p.telefone) : "sem telefone"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={cn("text-lg font-semibold tabular-nums", alerta ? "text-rose-600" : "text-foreground")}>{f.total}</span>
                  </TableCell>
                  <TableCell className="hidden tabular-nums md:table-cell">{format(new Date(f.ultima), "dd/MM/yyyy")}</TableCell>
                  <TableCell>
                    {prox ? (
                      <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        Reagendado {format(new Date(prox.data_hora), "dd/MM HH:mm")}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Reagendar" onClick={() => onReagendar(f.paciente_id, f.especialidades[0])}>
                        <CalendarPlus className="h-4 w-4" />
                      </Button>
                      {p?.telefone && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" asChild>
                          <a href={buildWhatsAppShareUrl(mensagem(p.nome), p.telefone)} target="_blank" rel="noopener noreferrer" aria-label="Contatar no WhatsApp">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
