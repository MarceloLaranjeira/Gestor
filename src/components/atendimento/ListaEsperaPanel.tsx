import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowUp, CalendarPlus, MessageCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { useAtualizarEntrada, type EntradaLista } from "@/hooks/useAtendimento";
import { cn } from "@/lib/utils";
import {
  STATUS_ATIVOS,
  STATUS_CLASS,
  STATUS_LABEL,
  STATUS_LISTA,
  buildWhatsAppShareUrl,
  diasDeEspera,
  formatIdade,
  maskPhone,
  ordenarFila,
  type StatusLista,
} from "@/lib/atendimento";

type Filtro = "fila" | StatusLista | "todos";

interface ListaEsperaPanelProps {
  entradas: EntradaLista[];
  nomeEspecialidade: string;
  onOpenPaciente: (pacienteId: string) => void;
  onAgendar: (pacienteId: string) => void;
}

const Kpi = ({ label, value, tone }: { label: string; value: string | number; tone: string }) => (
  <div className="rounded-xl border border-border/60 bg-card px-4 py-3">
    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</p>
  </div>
);

export function ListaEsperaPanel({ entradas, nomeEspecialidade, onOpenPaciente, onAgendar }: ListaEsperaPanelProps) {
  const [filtro, setFiltro] = useState<Filtro>("fila");
  const [busca, setBusca] = useState("");
  const atualizar = useAtualizarEntrada();

  const fila = ordenarFila(entradas.filter((e) => STATUS_ATIVOS.includes(e.status as StatusLista)));
  const aguardando = fila.filter((e) => e.status === "aguardando");
  const posicao = new Map(aguardando.map((e, i) => [e.id, i + 1]));
  const esperaMedia = aguardando.length
    ? Math.round(aguardando.reduce((acc, e) => acc + diasDeEspera(e.created_at), 0) / aguardando.length)
    : 0;

  const termo = busca.trim().toLowerCase();
  const base = filtro === "fila" ? fila : filtro === "todos" ? ordenarFila(entradas) : ordenarFila(entradas.filter((e) => e.status === filtro));
  const visiveis = termo
    ? base.filter((e) =>
        [e.paciente?.nome, e.paciente?.responsavel_nome, e.paciente?.cpf, e.paciente?.telefone]
          .some((v) => v?.toLowerCase().includes(termo)),
      )
    : base;

  const salvar = (id: string, patch: Parameters<typeof atualizar.mutate>[0]["patch"]) =>
    atualizar.mutate(
      { id, patch },
      { onError: (e) => toast({ title: "Não foi possível atualizar", description: e.message, variant: "destructive" }) },
    );

  const mensagemContato = (nome: string) =>
    `Olá! Aqui é da equipe de atendimento. Entramos em contato sobre a inscrição de *${nome}* para ${nomeEspecialidade}.`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Aguardando" value={aguardando.length} tone="text-amber-600 dark:text-amber-400" />
        <Kpi label="Agendados" value={fila.filter((e) => e.status === "agendado").length} tone="text-sky-600 dark:text-sky-400" />
        <Kpi label="Em atendimento" value={fila.filter((e) => e.status === "em_atendimento").length} tone="text-violet-600 dark:text-violet-400" />
        <Kpi label="Espera média" value={`${esperaMedia} dias`} tone="text-foreground" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar paciente, responsável, CPF ou telefone" className="pl-9" />
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fila">Fila ativa</SelectItem>
            {STATUS_LISTA.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
            <SelectItem value="todos">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14 text-center">Nº</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden md:table-cell">Responsável</TableHead>
              <TableHead className="hidden lg:table-cell">Inscrição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum paciente nesta visão.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((e) => {
              const p = e.paciente;
              const dias = diasDeEspera(e.created_at);
              return (
                <TableRow key={e.id} className="group">
                  <TableCell className="text-center font-mono text-sm tabular-nums text-muted-foreground">
                    {posicao.get(e.id) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <button type="button" onClick={() => p && onOpenPaciente(p.id)} className="text-left">
                      <span className="flex items-center gap-2 font-medium text-foreground hover:text-primary hover:underline">
                        {p?.nome ?? "Paciente removido"}
                        {e.prioridade === "alta" && (
                          <Badge variant="outline" className="border-rose-200 bg-rose-50 px-1.5 py-0 text-[10px] text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                            Prioridade
                          </Badge>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {formatIdade(p?.data_nascimento)} · {e.motivo || "Motivo não informado"}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="block text-sm">{p?.responsavel_nome || "—"}</span>
                    <span className="text-xs text-muted-foreground">{p?.telefone ? maskPhone(p.telefone) : "Sem telefone"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="block text-sm tabular-nums">{format(new Date(e.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    <span className={cn("text-xs", dias > 60 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                      {dias === 0 ? "hoje" : `há ${dias} dias`} · {e.origem === "formulario" ? "link" : "balcão"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Select value={e.status} onValueChange={(v) => salvar(e.id, { status: v as StatusLista })}>
                      <SelectTrigger className={cn("h-8 w-[150px] border text-xs font-medium", STATUS_CLASS[e.status as StatusLista])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_LISTA.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onAgendar(p.id)} aria-label="Agendar">
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Agendar atendimento</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn("h-8 w-8", e.prioridade === "alta" && "text-rose-600")}
                            onClick={() => salvar(e.id, { prioridade: e.prioridade === "alta" ? "normal" : "alta" })}
                            aria-label="Alternar prioridade"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{e.prioridade === "alta" ? "Remover prioridade" : "Marcar como prioridade"}</TooltipContent>
                      </Tooltip>
                      {p?.telefone && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" asChild>
                              <a href={buildWhatsAppShareUrl(mensagemContato(p.nome), p.telefone)} target="_blank" rel="noopener noreferrer" aria-label="Chamar no WhatsApp">
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Chamar a família no WhatsApp</TooltipContent>
                        </Tooltip>
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
