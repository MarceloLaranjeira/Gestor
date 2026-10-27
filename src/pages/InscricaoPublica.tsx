import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ClipboardList, Loader2, ShieldCheck } from "lucide-react";
import { InscricaoForm } from "@/components/atendimento/InscricaoForm";
import { inscreverPaciente, useEspecialidades } from "@/hooks/useAtendimento";
import { toast } from "@/hooks/use-toast";

const InscricaoPublica = () => {
  const [params] = useSearchParams();
  const { data: especialidades = [], isLoading, isError } = useEspecialidades();
  const [protocolo, setProtocolo] = useState<string | null>(null);

  const solicitada = params.get("especialidade") ?? undefined;
  const especialidadeInicial = especialidades.some((e) => e.slug === solicitada) ? solicitada : undefined;
  const nomeInicial = especialidades.find((e) => e.slug === especialidadeInicial)?.nome;

  const handleSubmit = async (...args: Parameters<typeof inscreverPaciente>) => {
    try {
      setProtocolo(await inscreverPaciente(...args));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast({
        title: "Não foi possível enviar a inscrição",
        description: error instanceof Error ? error.message : "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    }
  };

  let content;
  if (isLoading) {
    content = (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  } else if (isError) {
    content = <p className="py-16 text-center text-sm text-muted-foreground">Não foi possível carregar o formulário. Atualize a página em instantes.</p>;
  } else if (protocolo) {
    content = (
      <div className="py-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" strokeWidth={1.5} />
        <h2 className="mt-5 text-xl font-semibold text-foreground">Inscrição recebida</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          Os dados foram registrados na lista de espera. Nossa equipe entrará em contato pelo telefone informado para agendar o atendimento.
        </p>
        <div className="mx-auto mt-7 inline-flex flex-col items-center rounded-xl border border-border bg-muted/40 px-8 py-4">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Protocolo</span>
          <span className="mt-1 font-mono text-2xl font-semibold tracking-wider text-foreground">{protocolo}</span>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Guarde este número para acompanhar a inscrição.</p>
      </div>
    );
  } else {
    content = <InscricaoForm isPublic especialidades={especialidades} defaultEspecialidade={especialidadeInicial} onSubmit={handleSubmit} />;
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border/60 bg-background">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Ficha de inscrição</p>
            <p className="text-xs text-muted-foreground">Atendimento especializado TEA</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {!protocolo && (
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {nomeInicial ? `Inscrição: ${nomeInicial}` : "Inscrição para o primeiro atendimento"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Preencha com atenção os dados do paciente e do responsável. As informações vão direto para a equipe de atendimento,
              sem necessidade de repetir o cadastro presencialmente.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm sm:p-8">{content}</div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Dados protegidos e usados somente para o atendimento (LGPD).
        </p>
      </main>
    </div>
  );
};

export default InscricaoPublica;
