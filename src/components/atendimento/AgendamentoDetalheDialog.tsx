import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, CheckCircle2, Circle, ClipboardList, Loader2, MessageCircle, UserCheck, UserX, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAtualizarAgendamento, useHistoricoPaciente, type Agendamento } from "@/hooks/useAgenda";
import { cn } from "@/lib/utils";
import { buildWhatsAppShareUrl, formatIdade, maskPhone, type Especialidade } from "@/lib/atendimento";
import {
  ESPECIALIDADE_INVESTIGACAO,
  ETAPAS_INVESTIGACAO,
  ETAPA_LABEL,
  STATUS_AGENDAMENTO_CLASS,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_LABEL,
  etapasRealizadas,
  mensagemLembrete,
  type EtapaInvestigacao,
  type StatusAgendamento,
  type TipoAgendamento,
} from "@/lib/agenda";

interface AgendamentoDetalheDialogProps {
  agendamento: Agendamento | null;
  especialidades: Especialidade[];
  onClose: () => void;
  onAnamnese: (a: Agendamento) => void;
}

function Detalhe({ agendamento: a, especialidades, onClose, onAnamnese }: AgendamentoDetalheDialogProps & { agendamento: Agendamento }) {
  const atualizar = useAtualizarAgendamento();
  const { data: historico = [] } = useHistoricoPaciente(a.paciente_id);
  const [evolucao, setEvolucao] = useState(a.evolucao ?? "");
  const [motivo, setMotivo] = useState(a.motivo_cancelamento ?? "");
  const [novaData, setNovaData] = useState(format(new Date(a.data_hora), "yyyy-MM-dd"));
  const [novaHora, setNovaHora] = useState(format(new Date(a.data_hora), "HH:mm"));

  const esp = especialidades.find((e) => e.slug === a.especialidade_slug);
  const nomeEsp = (slug: string) => especialidades.find((e) => e.slug === slug)?.nome ?? slug;
  const p = a.paciente;
  const ehInvestigacao = a.especialidade_slug === ESPECIALIDADE_INVESTIGACAO;
  const feitas = etapasRealizadas(historico.filter((h) => h.especialidade_slug === ESPECIALIDADE_INVESTIGACAO));

  const salvar = (patch: Parameters<typeof atualizar.mutate>[0]["patch"], mensagem: string, fechar = false) =>
    atualizar.mutate(
      { id: a.id, patch },
      {
        onSuccess: () => {
          toast({ title: mensagem });
          if (fechar) onClose();
        },
        onError: (e) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" }),
      },
    );

  const marcar = (status: StatusAgendamento) => {
    if (status === "cancelado" && !motivo.trim()) {
      toast({ title: "Informe o motivo do cancelamento.", variant: "destructive" });
      return;
    }
    const aviso =
      status === "presente" && esp?.retorno_dias
        ? `Presença registrada. Retorno programado automaticamente em ${esp.retorno_dias} dias.`
        : `Marcado como ${STATUS_AGENDAMENTO_LABEL[status].toLowerCase()}.`;
    salvar({ status, evolucao: evolucao.trim() || null, motivo_cancelamento: status === "cancelado" ? motivo.trim() : a.motivo_cancelamento }, aviso, true);
  };

  const remarcar = () => {
    const dataHora = new Date(`${novaData}T${novaHora}:00`);
    if (Number.isNaN(dataHora.getTime())) return toast({ title: "Data inválida.", variant: "destructive" });
    salvar({ data_hora: dataHora.toISOString(), status: "agendado" }, "Atendimento remarcado.", true);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {p?.nome ?? "Paciente"}
          <Badge variant="outline" className={cn("text-[11px]", STATUS_AGENDAMENTO_CLASS[a.status as StatusAgendamento])}>
            {STATUS_AGENDAMENTO_LABEL[a.status as StatusAgendamento]}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          {format(new Date(a.data_hora), "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} · {nomeEsp(a.especialidade_slug)} ·{" "}
          {TIPO_LABEL[a.tipo as TipoAgendamento]}
          {a.etapa ? ` · ${ETAPA_LABEL[a.etapa as EtapaInvestigacao]}` : ""}
          {a.profissional ? ` · ${a.profissional}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => marcar("presente")} disabled={atualizar.isPending}>
              <UserCheck className="mr-1.5 h-4 w-4" /> Presente
            </Button>
            <Button size="sm" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => marcar("falta")} disabled={atualizar.isPending}>
              <UserX className="mr-1.5 h-4 w-4" /> Falta
            </Button>
            <Button size="sm" variant="outline" onClick={() => marcar("confirmado")} disabled={atualizar.isPending}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Família confirmou
            </Button>
            <Button size="sm" variant="ghost" onClick={() => p && onAnamnese(a)}>
              <ClipboardList className="mr-1.5 h-4 w-4" /> Anamnese
            </Button>
            {p?.telefone && (
              <Button size="sm" variant="ghost" className="text-emerald-700" asChild>
                <a
                  href={buildWhatsAppShareUrl(mensagemLembrete(p.nome, esp?.nome ?? "", a.data_hora), p.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Lembrete
                </a>
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ag-evolucao">Registro do atendimento / evolução</Label>
            <Textarea id="ag-evolucao" rows={6} value={evolucao} onChange={(e) => setEvolucao(e.target.value)} placeholder="O que foi trabalhado, observações e encaminhamentos." />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => salvar({ evolucao: evolucao.trim() || null }, "Registro salvo.")} disabled={atualizar.isPending}>
                {atualizar.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Salvar registro
              </Button>
            </div>
          </div>

          <div className="grid gap-4 rounded-xl border border-border/60 p-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium"><CalendarClock className="h-4 w-4" /> Remarcar</p>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={novaData} onChange={(e) => setNovaData(e.target.value)} aria-label="Nova data" />
                <Input type="time" value={novaHora} onChange={(e) => setNovaHora(e.target.value)} aria-label="Novo horário" />
              </div>
              <Button size="sm" variant="outline" onClick={remarcar} disabled={atualizar.isPending}>Salvar novo horário</Button>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm font-medium"><XCircle className="h-4 w-4" /> Cancelar</p>
              <Input placeholder="Motivo do cancelamento" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <Button size="sm" variant="outline" className="text-rose-700" onClick={() => marcar("cancelado")} disabled={atualizar.isPending}>
                Cancelar atendimento
              </Button>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl bg-muted/40 p-4 text-sm">
            <p className="font-medium">{p?.nome}</p>
            <p className="text-xs text-muted-foreground">{formatIdade(p?.data_nascimento)}</p>
            <p className="mt-2 text-xs">Responsável: {p?.responsavel_nome || "—"}</p>
            <p className="text-xs">Telefone: {p?.telefone ? maskPhone(p.telefone) : "—"}</p>
          </div>

          {ehInvestigacao && (
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Etapas da investigação</h4>
              <ol className="space-y-2">
                {ETAPAS_INVESTIGACAO.map((etapa) => (
                  <li key={etapa} className="flex items-center gap-2 text-sm">
                    {feitas.has(etapa) ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground/40" />}
                    <span className={cn(!feitas.has(etapa) && "text-muted-foreground")}>{ETAPA_LABEL[etapa]}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico do paciente</h4>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
              {historico.map((h) => (
                <li key={h.id} className={cn("flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs", h.id === a.id && "bg-primary/5")}>
                  <span className="tabular-nums">{format(new Date(h.data_hora), "dd/MM/yy HH:mm")}</span>
                  <span className="truncate text-muted-foreground">{nomeEsp(h.especialidade_slug)}</span>
                  <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", STATUS_AGENDAMENTO_CLASS[h.status as StatusAgendamento])}>
                    {STATUS_AGENDAMENTO_LABEL[h.status as StatusAgendamento]}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

export function AgendamentoDetalheDialog(props: AgendamentoDetalheDialogProps) {
  return (
    <Dialog open={!!props.agendamento} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {props.agendamento && <Detalhe key={props.agendamento.id} {...props} agendamento={props.agendamento} />}
      </DialogContent>
    </Dialog>
  );
}
