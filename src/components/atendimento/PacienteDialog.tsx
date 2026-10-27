import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAtualizarPaciente, type EntradaLista, type Paciente } from "@/hooks/useAtendimento";
import { useHistoricoPaciente } from "@/hooks/useAgenda";
import { STATUS_AGENDAMENTO_CLASS, STATUS_AGENDAMENTO_LABEL, type StatusAgendamento } from "@/lib/agenda";
import { cn } from "@/lib/utils";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  formatIdade,
  isValidCpf,
  maskCep,
  maskCpf,
  maskPhone,
  maskSus,
  onlyDigits,
  type Especialidade,
  type StatusLista,
} from "@/lib/atendimento";

interface PacienteDialogProps {
  paciente: Paciente | null;
  entradas: EntradaLista[];
  especialidades: Especialidade[];
  onClose: () => void;
}

type Form = Record<
  "nome" | "data_nascimento" | "cpf" | "cartao_sus" | "responsavel_nome" | "responsavel_cpf" | "telefone" | "cep" | "endereco" | "observacoes",
  string
>;

const toForm = (p: Paciente): Form => ({
  nome: p.nome,
  data_nascimento: p.data_nascimento ?? "",
  cpf: maskCpf(p.cpf ?? ""),
  cartao_sus: maskSus(p.cartao_sus ?? ""),
  responsavel_nome: p.responsavel_nome ?? "",
  responsavel_cpf: maskCpf(p.responsavel_cpf ?? ""),
  telefone: maskPhone(p.telefone ?? ""),
  cep: maskCep(p.cep ?? ""),
  endereco: p.endereco ?? "",
  observacoes: p.observacoes ?? "",
});

function validar(f: Form): string | null {
  if (f.nome.trim().length < 3) return "Informe o nome completo do paciente.";
  if (f.cpf && !isValidCpf(f.cpf)) return "CPF do paciente inválido.";
  if (f.responsavel_cpf && !isValidCpf(f.responsavel_cpf)) return "CPF do responsável inválido.";
  const tel = onlyDigits(f.telefone);
  if (tel && (tel.length < 10 || tel.length > 11)) return "Telefone deve ter DDD + número.";
  if (f.cep && onlyDigits(f.cep).length !== 8) return "CEP inválido.";
  if (f.cartao_sus && onlyDigits(f.cartao_sus).length !== 15) return "O Cartão do SUS tem 15 dígitos.";
  return null;
}

const MASKS: Partial<Record<keyof Form, (v: string) => string>> = {
  cpf: maskCpf,
  responsavel_cpf: maskCpf,
  telefone: maskPhone,
  cep: maskCep,
  cartao_sus: maskSus,
};

const CAMPOS: { key: keyof Form; label: string; type?: string; wide?: boolean }[] = [
  { key: "nome", label: "Nome completo", wide: true },
  { key: "data_nascimento", label: "Data de nascimento", type: "date" },
  { key: "cpf", label: "CPF" },
  { key: "cartao_sus", label: "Cartão do SUS" },
  { key: "telefone", label: "Telefone / WhatsApp" },
  { key: "responsavel_nome", label: "Responsável" },
  { key: "responsavel_cpf", label: "CPF do responsável" },
  { key: "cep", label: "CEP" },
  { key: "endereco", label: "Endereço completo" },
];

function PacienteEditor({ paciente, entradas, especialidades, onClose }: PacienteDialogProps & { paciente: Paciente }) {
  const [form, setForm] = useState<Form>(() => toForm(paciente));
  const atualizar = useAtualizarPaciente();
  const { data: atendimentos = [] } = useHistoricoPaciente(paciente.id);
  const nomeEsp = (slug: string) => especialidades.find((e) => e.slug === slug)?.nome ?? slug;
  const historico = entradas.filter((e) => e.paciente_id === paciente.id).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const set = (key: keyof Form, value: string) => setForm((f) => ({ ...f, [key]: MASKS[key] ? MASKS[key]!(value) : value }));

  const salvar = () => {
    const erro = validar(form);
    if (erro) {
      toast({ title: erro, variant: "destructive" });
      return;
    }
    const nullable = (v: string) => (v.trim() ? v.trim() : null);
    const digits = (v: string) => onlyDigits(v) || null;
    atualizar.mutate(
      {
        id: paciente.id,
        patch: {
          nome: form.nome.trim(),
          data_nascimento: nullable(form.data_nascimento),
          cpf: digits(form.cpf),
          cartao_sus: digits(form.cartao_sus),
          responsavel_nome: nullable(form.responsavel_nome),
          responsavel_cpf: digits(form.responsavel_cpf),
          telefone: digits(form.telefone),
          cep: digits(form.cep),
          endereco: nullable(form.endereco),
          observacoes: nullable(form.observacoes),
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Cadastro atualizado" });
          onClose();
        },
        onError: (e) =>
          toast({
            title: "Não foi possível salvar",
            description: e.message.includes("pacientes_cpf_key") ? "Já existe outro paciente com este CPF." : e.message,
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{paciente.nome}</DialogTitle>
        <DialogDescription>
          {formatIdade(paciente.data_nascimento)} · {paciente.possui_laudo ? "Possui laudo" : paciente.possui_laudo === false ? "Sem laudo" : "Laudo não informado"}
          {paciente.origem_conhecimento ? ` · Conheceu por: ${paciente.origem_conhecimento}` : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPOS.map((c) => (
            <div key={c.key} className={cn("space-y-1", c.wide && "sm:col-span-2")}>
              <Label htmlFor={`pac-${c.key}`} className="text-xs text-muted-foreground">{c.label}</Label>
              <Input id={`pac-${c.key}`} type={c.type ?? "text"} value={form[c.key]} onChange={(e) => set(c.key, e.target.value)} />
            </div>
          ))}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pac-observacoes" className="text-xs text-muted-foreground">Observações internas</Label>
            <Textarea id="pac-observacoes" rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
          </div>
        </div>

        <aside className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico de atendimentos</h4>
          {atendimentos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum atendimento agendado.</p>}
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {atendimentos.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs">
                <span className="tabular-nums">{format(new Date(h.data_hora), "dd/MM/yy HH:mm")}</span>
                <span className="truncate text-muted-foreground">{nomeEsp(h.especialidade_slug)}</span>
                <Badge variant="outline" className={cn("shrink-0 px-1.5 py-0 text-[10px]", STATUS_AGENDAMENTO_CLASS[h.status as StatusAgendamento])}>
                  {STATUS_AGENDAMENTO_LABEL[h.status as StatusAgendamento]}
                </Badge>
              </li>
            ))}
          </ul>
          <h4 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Histórico na lista de espera</h4>
          {historico.length === 0 && <p className="text-sm text-muted-foreground">Sem inscrições.</p>}
          {historico.map((e) => (
            <div key={e.id} className="rounded-lg border border-border/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium">{nomeEsp(e.especialidade_slug)}</span>
                <Badge variant="outline" className={cn("shrink-0 text-[10px]", STATUS_CLASS[e.status as StatusLista])}>
                  {STATUS_LABEL[e.status as StatusLista] ?? e.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Inscrito em {format(new Date(e.created_at), "dd/MM/yyyy", { locale: ptBR })} · protocolo {e.id.slice(0, 8).toUpperCase()}
              </p>
              {e.motivo && <p className="mt-2 text-xs"><strong>Motivo:</strong> {e.motivo}</p>}
              {e.descricao_sintomas && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{e.descricao_sintomas}</p>}
            </div>
          ))}
        </aside>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} disabled={atualizar.isPending}>
          {atualizar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar cadastro
        </Button>
      </DialogFooter>
    </>
  );
}

export function PacienteDialog(props: PacienteDialogProps) {
  const { paciente, onClose } = props;
  return (
    <Dialog open={!!paciente} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {paciente && <PacienteEditor key={paciente.id} {...props} paciente={paciente} />}
      </DialogContent>
    </Dialog>
  );
}
