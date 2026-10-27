import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useInscrever } from "@/hooks/useAtendimento";
import type { Especialidade } from "@/lib/atendimento";
import { InscricaoForm } from "./InscricaoForm";

interface NovaInscricaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  especialidades: Especialidade[];
  especialidadeAtual?: string;
}

export function NovaInscricaoDialog({ open, onOpenChange, especialidades, especialidadeAtual }: NovaInscricaoDialogProps) {
  const inscrever = useInscrever();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova inscrição</DialogTitle>
          <DialogDescription>
            Cadastro feito pela equipe (atendimento presencial ou por telefone). Se o paciente já existir, a inscrição é vinculada ao cadastro dele.
          </DialogDescription>
        </DialogHeader>
        <InscricaoForm
          key={String(open)}
          especialidades={especialidades}
          defaultEspecialidade={especialidadeAtual}
          submitLabel="Adicionar à lista de espera"
          onSubmit={async (values) => {
            try {
              const protocolo = await inscrever.mutateAsync({ values });
              toast({ title: "Paciente adicionado à lista de espera", description: `Protocolo ${protocolo}` });
              onOpenChange(false);
            } catch (error) {
              toast({
                title: "Não foi possível inscrever",
                description: error instanceof Error ? error.message : undefined,
                variant: "destructive",
              });
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
