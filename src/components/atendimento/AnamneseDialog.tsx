import { useState } from "react";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useAnamnese, useSalvarAnamnese, type Anamnese } from "@/hooks/useAgenda";

const CAMPOS = [
  { key: "queixa_principal", label: "Queixa principal", hint: "O que motivou a procura, desde quando e quem percebeu." },
  { key: "gestacao_parto", label: "Gestação e parto", hint: "Intercorrências, prematuridade, tipo de parto." },
  { key: "desenvolvimento", label: "Desenvolvimento", hint: "Marcos motores, fala, controle esfincteriano, sono e alimentação." },
  { key: "saude_medicamentos", label: "Saúde e medicamentos", hint: "Diagnósticos, internações, medicações em uso, alergias." },
  { key: "historico_familiar", label: "Histórico familiar", hint: "Composição familiar e casos semelhantes na família." },
  { key: "escola_social", label: "Escola e convívio social", hint: "Série, adaptação, mediação, relação com colegas." },
  { key: "comportamento", label: "Comportamento", hint: "Interesses restritos, estereotipias, sensibilidade sensorial, crises." },
  { key: "observacoes", label: "Observações da profissional", hint: "" },
] as const;

type CampoKey = (typeof CAMPOS)[number]["key"];
type Valores = Record<CampoKey, string>;

const vazio = (a: Anamnese | null | undefined): Valores =>
  Object.fromEntries(CAMPOS.map((c) => [c.key, a?.[c.key] ?? ""])) as Valores;

interface AnamneseDialogProps {
  alvo: { pacienteId: string; pacienteNome: string; especialidade: string; especialidadeNome: string } | null;
  onClose: () => void;
}

function Formulario({ alvo, onClose, anamnese }: { alvo: NonNullable<AnamneseDialogProps["alvo"]>; onClose: () => void; anamnese: Anamnese | null }) {
  const [valores, setValores] = useState<Valores>(() => vazio(anamnese));
  const salvar = useSalvarAnamnese();

  const handleSalvar = () =>
    salvar.mutate(
      {
        paciente_id: alvo.pacienteId,
        especialidade_slug: alvo.especialidade,
        ...Object.fromEntries(CAMPOS.map((c) => [c.key, valores[c.key].trim() || null])),
      },
      {
        onSuccess: () => {
          toast({ title: "Anamnese salva" });
          onClose();
        },
        onError: (e) => toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" }),
      },
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Anamnese · {alvo.pacienteNome}</DialogTitle>
        <DialogDescription>
          {alvo.especialidadeNome}
          {anamnese ? ` · última atualização em ${format(new Date(anamnese.updated_at), "dd/MM/yyyy 'às' HH:mm")}` : " · primeiro registro"}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {CAMPOS.map((c) => (
          <div key={c.key} className="space-y-1.5">
            <Label htmlFor={`an-${c.key}`}>{c.label}</Label>
            <Textarea
              id={`an-${c.key}`}
              rows={4}
              placeholder={c.hint}
              value={valores[c.key]}
              onChange={(e) => setValores((v) => ({ ...v, [c.key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button onClick={handleSalvar} disabled={salvar.isPending}>
          {salvar.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar anamnese
        </Button>
      </DialogFooter>
    </>
  );
}

export function AnamneseDialog({ alvo, onClose }: AnamneseDialogProps) {
  const { data, isLoading } = useAnamnese(alvo?.pacienteId ?? null, alvo?.especialidade ?? null);
  return (
    <Dialog open={!!alvo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        {alvo && isLoading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {alvo && !isLoading && <Formulario key={data?.id ?? "novo"} alvo={alvo} onClose={onClose} anamnese={data ?? null} />}
      </DialogContent>
    </Dialog>
  );
}
