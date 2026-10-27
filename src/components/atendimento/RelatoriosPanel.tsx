import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgendamentos } from "@/hooks/useAgenda";
import type { EntradaLista } from "@/hooks/useAtendimento";
import { cn } from "@/lib/utils";
import type { Especialidade } from "@/lib/atendimento";
import {
  PERIODO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_LABEL,
  intervaloPeriodo,
  moverPeriodo,
  resumoAtendimentos,
  rotuloPeriodo,
  toCsv,
  type Periodo,
  type StatusAgendamento,
  type TipoAgendamento,
} from "@/lib/agenda";

interface RelatoriosPanelProps {
  especialidade: Especialidade;
  entradas: EntradaLista[];
}

const Indicador = ({ label, valor, tom }: { label: string; valor: number; tom: string }) => (
  <div className="rounded-xl border border-border/60 bg-card px-5 py-4">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={cn("mt-1 text-3xl font-semibold tabular-nums", tom)}>{valor}</p>
  </div>
);

export function RelatoriosPanel({ especialidade, entradas }: RelatoriosPanelProps) {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [ref, setRef] = useState(() => new Date());
  const { inicio, fim } = intervaloPeriodo(periodo, ref);
  const { data: agendamentos = [], isLoading } = useAgendamentos(inicio, fim, especialidade.slug);

  const resumo = resumoAtendimentos(agendamentos);
  const aguardando = entradas.filter((e) => e.especialidade_slug === especialidade.slug && e.status === "aguardando").length;

  const exportar = () => {
    const csv = toCsv([
      ["Relatório", `${especialidade.nome} — ${PERIODO_LABEL[periodo]} — ${rotuloPeriodo(periodo, ref)}`],
      ["Agendados", resumo.agendados],
      ["Atendidos", resumo.atendidos],
      ["Faltosos", resumo.faltosos],
      ["Cancelados", resumo.cancelados],
      ["Aguardando na lista de espera", aguardando],
      [],
      ["Data", "Hora", "Paciente", "Tipo", "Profissional", "Situação"],
      ...agendamentos.map((a) => [
        format(new Date(a.data_hora), "dd/MM/yyyy"),
        format(new Date(a.data_hora), "HH:mm"),
        a.paciente?.nome ?? "",
        TIPO_LABEL[a.tipo as TipoAgendamento],
        a.profissional ?? "",
        STATUS_AGENDAMENTO_LABEL[a.status as StatusAgendamento],
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-${especialidade.slug}-${periodo}-${format(inicio, "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
          <TabsList>
            {(Object.keys(PERIODO_LABEL) as Periodo[]).map((p) => (
              <TabsTrigger key={p} value={p}>{PERIODO_LABEL[p]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setRef((r) => moverPeriodo(periodo, r, -1))} aria-label="Período anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-medium capitalize">{rotuloPeriodo(periodo, ref)}</span>
          <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setRef((r) => moverPeriodo(periodo, r, 1))} aria-label="Próximo período">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="ml-2 h-9" onClick={exportar} disabled={isLoading}>
            <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador label="Agendados" valor={resumo.agendados} tom="text-sky-600 dark:text-sky-400" />
        <Indicador label="Atendidos" valor={resumo.atendidos} tom="text-emerald-600 dark:text-emerald-400" />
        <Indicador label="Faltosos" valor={resumo.faltosos} tom="text-rose-600 dark:text-rose-400" />
        <Indicador label="Aguardando (lista)" valor={aguardando} tom="text-amber-600 dark:text-amber-400" />
      </div>
      {resumo.cancelados > 0 && (
        <p className="text-xs text-muted-foreground">{resumo.cancelados} cancelamento(s) no período, fora do total de agendados.</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-36">Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Profissional</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" /></TableCell>
              </TableRow>
            )}
            {!isLoading && agendamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">Sem atendimentos no período.</TableCell>
              </TableRow>
            )}
            {agendamentos.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="tabular-nums">{format(new Date(a.data_hora), "dd/MM/yyyy HH:mm")}</TableCell>
                <TableCell className="font-medium">{a.paciente?.nome ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell">{TIPO_LABEL[a.tipo as TipoAgendamento]}</TableCell>
                <TableCell className="hidden md:table-cell">{a.profissional || "—"}</TableCell>
                <TableCell>{STATUS_AGENDAMENTO_LABEL[a.status as StatusAgendamento]}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
