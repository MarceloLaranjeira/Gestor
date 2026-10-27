import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BarChart3, CalendarDays, Link2, ListOrdered, Loader2, Plus, UserX, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgendaPanel } from "@/components/atendimento/AgendaPanel";
import { AgendamentoDetalheDialog } from "@/components/atendimento/AgendamentoDetalheDialog";
import { AgendamentoDialog, type AgendarPreset } from "@/components/atendimento/AgendamentoDialog";
import { AnamneseDialog } from "@/components/atendimento/AnamneseDialog";
import { FaltasPanel } from "@/components/atendimento/FaltasPanel";
import { LinksInscricao } from "@/components/atendimento/LinksInscricao";
import { ListaEsperaPanel } from "@/components/atendimento/ListaEsperaPanel";
import { NovaInscricaoDialog } from "@/components/atendimento/NovaInscricaoDialog";
import { PacienteDialog } from "@/components/atendimento/PacienteDialog";
import { PacientesPanel } from "@/components/atendimento/PacientesPanel";
import { RelatoriosPanel } from "@/components/atendimento/RelatoriosPanel";
import { useEspecialidades, useListaEspera, usePacientes } from "@/hooks/useAtendimento";
import type { Agendamento } from "@/hooks/useAgenda";
import { cn } from "@/lib/utils";

const SECOES = [
  { id: "lista", label: "Lista de espera", icon: ListOrdered, porEspecialidade: true },
  { id: "agenda", label: "Agenda", icon: CalendarDays, porEspecialidade: true },
  { id: "faltas", label: "Faltas", icon: UserX, porEspecialidade: false },
  { id: "relatorios", label: "Relatórios", icon: BarChart3, porEspecialidade: true },
  { id: "pacientes", label: "Pacientes", icon: Users, porEspecialidade: false },
  { id: "links", label: "Links de inscrição", icon: Link2, porEspecialidade: false },
] as const;

type SecaoId = (typeof SECOES)[number]["id"];

const Atendimento = () => {
  const [params, setParams] = useSearchParams();
  const { data: especialidades = [], isLoading: loadingEsp } = useEspecialidades();
  const { data: entradas = [], isLoading: loadingLista, isError } = useListaEspera();
  const { data: pacientes = [] } = usePacientes();
  const [novaAberta, setNovaAberta] = useState(false);
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [agendar, setAgendar] = useState<AgendarPreset | null>(null);
  const [aberto, setAberto] = useState<Agendamento | null>(null);
  const [anamnese, setAnamnese] = useState<Agendamento | null>(null);

  const secaoParam = params.get("aba");
  const secao: SecaoId = SECOES.some((s) => s.id === secaoParam) ? (secaoParam as SecaoId) : "lista";
  const espParam = params.get("esp");
  const especialidade = especialidades.find((e) => e.slug === espParam) ?? especialidades[0];
  const navegar = (aba: SecaoId, esp = especialidade?.slug) => setParams(esp ? { aba, esp } : { aba }, { replace: true });

  const porEspecialidade = SECOES.find((s) => s.id === secao)?.porEspecialidade;
  const pacienteAberto = pacientes.find((p) => p.id === pacienteId) ?? entradas.find((e) => e.paciente?.id === pacienteId)?.paciente ?? null;
  const aguardando = (slug: string) => entradas.filter((e) => e.especialidade_slug === slug && e.status === "aguardando").length;
  const nomeEsp = (slug: string) => especialidades.find((e) => e.slug === slug)?.nome ?? slug;

  if (loadingEsp || loadingLista) {
    return (
      <AppLayout>
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Atendimento TEA</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Lista de espera, agendas, faltas e relatórios por especialidade.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAgendar({ especialidade: especialidade?.slug })}>
              <CalendarDays className="mr-1.5 h-4 w-4" /> Agendar
            </Button>
            <Button onClick={() => setNovaAberta(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Nova inscrição
            </Button>
          </div>
        </div>

        {isError && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Não foi possível carregar os dados. Verifique sua permissão de acesso ao módulo Atendimento.
          </p>
        )}

        <Tabs value={secao} onValueChange={(v) => navegar(v as SecaoId)}>
          <TabsList className="h-auto flex-wrap justify-start">
            {SECOES.map((s) => (
              <TabsTrigger key={s.id} value={s.id} className="gap-1.5">
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {porEspecialidade && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Especialidade">
            {especialidades.map((esp) => {
              const ativa = esp.slug === especialidade?.slug;
              return (
                <button
                  key={esp.slug}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  onClick={() => navegar(secao, esp.slug)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    ativa ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {esp.nome}
                  {secao === "lista" && (
                    <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", ativa ? "bg-white/20" : "bg-amber-500/15 text-amber-700 dark:text-amber-300")}>
                      {aguardando(esp.slug)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {secao === "lista" && especialidade && (
          <ListaEsperaPanel
            key={especialidade.slug}
            entradas={entradas.filter((e) => e.especialidade_slug === especialidade.slug)}
            nomeEspecialidade={especialidade.nome}
            onOpenPaciente={setPacienteId}
            onAgendar={(id) => setAgendar({ pacienteId: id, especialidade: especialidade.slug })}
          />
        )}
        {secao === "agenda" && especialidade && (
          <AgendaPanel
            key={especialidade.slug}
            especialidade={especialidade}
            onAgendar={() => setAgendar({ especialidade: especialidade.slug })}
            onAbrir={setAberto}
          />
        )}
        {secao === "faltas" && (
          <FaltasPanel especialidades={especialidades} onReagendar={(id, esp) => setAgendar({ pacienteId: id, especialidade: esp })} />
        )}
        {secao === "relatorios" && especialidade && (
          <RelatoriosPanel key={especialidade.slug} especialidade={especialidade} entradas={entradas} />
        )}
        {secao === "pacientes" && (
          <PacientesPanel pacientes={pacientes} entradas={entradas} especialidades={especialidades} onOpen={setPacienteId} />
        )}
        {secao === "links" && <LinksInscricao especialidades={especialidades} />}
      </div>

      <NovaInscricaoDialog open={novaAberta} onOpenChange={setNovaAberta} especialidades={especialidades} especialidadeAtual={especialidade?.slug} />
      <PacienteDialog paciente={pacienteAberto} entradas={entradas} especialidades={especialidades} onClose={() => setPacienteId(null)} />
      <AgendamentoDialog preset={agendar} onClose={() => setAgendar(null)} especialidades={especialidades} pacientes={pacientes} entradas={entradas} />
      <AgendamentoDetalheDialog
        agendamento={aberto}
        especialidades={especialidades}
        onClose={() => setAberto(null)}
        onAnamnese={(a) => {
          setAberto(null);
          setAnamnese(a);
        }}
      />
      <AnamneseDialog
        alvo={
          anamnese
            ? {
                pacienteId: anamnese.paciente_id,
                pacienteNome: anamnese.paciente?.nome ?? "",
                especialidade: anamnese.especialidade_slug,
                especialidadeNome: nomeEsp(anamnese.especialidade_slug),
              }
            : null
        }
        onClose={() => setAnamnese(null)}
      />
    </AppLayout>
  );
};

export default Atendimento;
