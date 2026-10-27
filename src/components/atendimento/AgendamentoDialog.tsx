import { useState } from "react";
import { format } from "date-fns";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCriarAgendamento } from "@/hooks/useAgenda";
import type { EntradaLista, Paciente } from "@/hooks/useAtendimento";
import { cn } from "@/lib/utils";
import { STATUS_ATIVOS, formatIdade, type Especialidade, type StatusLista } from "@/lib/atendimento";
import {
  ESPECIALIDADE_INVESTIGACAO,
  ETAPAS_INVESTIGACAO,
  ETAPA_LABEL,
  TIPOS_AGENDAMENTO,
  TIPO_LABEL,
  type EtapaInvestigacao,
  type TipoAgendamento,
} from "@/lib/agenda";

export interface AgendarPreset {
  pacienteId?: string;
  especialidade?: string;
}

interface AgendamentoDialogProps {
  preset: AgendarPreset | null;
  onClose: () => void;
  especialidades: Especialidade[];
  pacientes: Paciente[];
  entradas: EntradaLista[];
}

function Formulario({ preset, onClose, especialidades, pacientes, entradas }: AgendamentoDialogProps & { preset: AgendarPreset }) {
  const criar = useCriarAgendamento();
  const [pacienteId, setPacienteId] = useState(preset.pacienteId ?? "");
  const [especialidade, setEspecialidade] = useState(preset.especialidade ?? especialidades[0]?.slug ?? "");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [hora, setHora] = useState("08:00");
  const [duracao, setDuracao] = useState("50");
  const [tipo, setTipo] = useState<TipoAgendamento>("primeiro_atendimento");
  const [etapa, setEtapa] = useState<EtapaInvestigacao>("entrevista_inicial");
  const [profissional, setProfissional] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);

  const paciente = pacientes.find((p) => p.id === pacienteId);
  const ehInvestigacao = especialidade === ESPECIALIDADE_INVESTIGACAO;
  const entradaAtiva = entradas.find(
    (e) => e.paciente_id === pacienteId && e.especialidade_slug === especialidade && STATUS_ATIVOS.includes(e.status as StatusLista),
  );

  const salvar = () => {
    if (!pacienteId) return toast({ title: "Selecione o paciente.", variant: "destructive" });
    const dataHora = new Date(`${data}T${hora}:00`);
    if (Number.isNaN(dataHora.getTime())) return toast({ title: "Informe data e horário válidos.", variant: "destructive" });

    criar.mutate(
      {
        paciente_id: pacienteId,
        especialidade_slug: especialidade,
        lista_espera_id: entradaAtiva?.id ?? null,
        data_hora: dataHora.toISOString(),
        duracao_min: Number(duracao) || 50,
        tipo,
        etapa: ehInvestigacao ? etapa : null,
        profissional: profissional.trim() || null,
        observacoes: observacoes.trim() || null,
      },
      {
        onSuccess: () => {
          toast({ title: "Atendimento agendado" });
          onClose();
        },
        onError: (e) => toast({ title: "Não foi possível agendar", description: e.message, variant: "destructive" }),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Agendar atendimento</DialogTitle>
        <DialogDescription>
          {entradaAtiva
            ? "O paciente está na lista de espera desta especialidade; ela passa para Agendado automaticamente."
            : "Selecione o paciente, a especialidade e o horário."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Paciente</Label>
          <Popover open={buscaAberta} onOpenChange={setBuscaAberta}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                {paciente ? `${paciente.nome} · ${formatIdade(paciente.data_nascimento)}` : "Buscar paciente…"}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
              <Command>
                <CommandInput placeholder="Nome, responsável ou CPF" />
                <CommandList>
                  <CommandEmpty>Nenhum paciente. Cadastre por "Nova inscrição".</CommandEmpty>
                  <CommandGroup>
                    {pacientes.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.nome} ${p.responsavel_nome ?? ""} ${p.cpf ?? ""} ${p.id}`}
                        onSelect={() => {
                          setPacienteId(p.id);
                          setBuscaAberta(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", p.id === pacienteId ? "opacity-100" : "opacity-0")} />
                        <span className="truncate">{p.nome}</span>
                        <span className="ml-auto pl-2 text-xs text-muted-foreground">{formatIdade(p.data_nascimento)}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label>Especialidade</Label>
          <Select value={especialidade} onValueChange={setEspecialidade}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {especialidades.map((e) => (
                <SelectItem key={e.slug} value={e.slug}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAgendamento)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS_AGENDAMENTO.map((t) => (
                <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {ehInvestigacao && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Etapa da investigação</Label>
            <Select value={etapa} onValueChange={(v) => setEtapa(v as EtapaInvestigacao)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ETAPAS_INVESTIGACAO.map((e, i) => (
                  <SelectItem key={e} value={e}>{`${i + 1}. ${ETAPA_LABEL[e]}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="ag-data">Data</Label>
          <Input id="ag-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ag-hora">Horário</Label>
            <Input id="ag-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ag-duracao">Duração (min)</Label>
            <Input id="ag-duracao" type="number" min={10} max={480} step={5} value={duracao} onChange={(e) => setDuracao(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ag-prof">Profissional</Label>
          <Input id="ag-prof" placeholder="Nome da profissional" value={profissional} onChange={(e) => setProfissional(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="ag-obs">Observações</Label>
          <Textarea id="ag-obs" rows={2} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={criar.isPending}>
          {criar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Agendar
        </Button>
      </DialogFooter>
    </>
  );
}

export function AgendamentoDialog(props: AgendamentoDialogProps) {
  return (
    <Dialog open={!!props.preset} onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        {props.preset && <Formulario {...props} preset={props.preset} />}
      </DialogContent>
    </Dialog>
  );
}
