import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link2, Loader2, Plus, Search, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinksInscricao } from "@/components/atendimento/LinksInscricao";
import { ListaEsperaPanel } from "@/components/atendimento/ListaEsperaPanel";
import { NovaInscricaoDialog } from "@/components/atendimento/NovaInscricaoDialog";
import { PacienteDialog } from "@/components/atendimento/PacienteDialog";
import { useEspecialidades, useListaEspera, usePacientes, type EntradaLista, type Paciente } from "@/hooks/useAtendimento";
import { STATUS_ATIVOS, STATUS_LABEL, formatIdade, maskCpf, maskPhone, type Especialidade, type StatusLista } from "@/lib/atendimento";

const TAB_PACIENTES = "pacientes";
const TAB_LINKS = "links";

function PacientesTab({
  pacientes,
  entradas,
  especialidades,
  onOpen,
}: {
  pacientes: Paciente[];
  entradas: EntradaLista[];
  especialidades: Especialidade[];
  onOpen: (id: string) => void;
}) {
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? pacientes.filter((p) => [p.nome, p.responsavel_nome, p.cpf, p.telefone, p.cartao_sus].some((v) => v?.toLowerCase().includes(termo)))
    : pacientes;
  const nomeEsp = (slug: string) => especialidades.find((e) => e.slug === slug)?.nome ?? slug;

  return (
    <div className="space-y-4">
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, responsável, CPF, telefone ou cartão do SUS" className="pl-9" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead className="hidden md:table-cell">CPF</TableHead>
              <TableHead className="hidden md:table-cell">Responsável</TableHead>
              <TableHead>Situação na lista</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visiveis.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            )}
            {visiveis.map((p) => {
              const ativas = entradas.filter((e) => e.paciente_id === p.id && STATUS_ATIVOS.includes(e.status as StatusLista));
              return (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => onOpen(p.id)}>
                  <TableCell>
                    <span className="block font-medium">{p.nome}</span>
                    <span className="text-xs text-muted-foreground">{formatIdade(p.data_nascimento)}</span>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{p.cpf ? maskCpf(p.cpf) : "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="block text-sm">{p.responsavel_nome || "—"}</span>
                    <span className="text-xs text-muted-foreground">{p.telefone ? maskPhone(p.telefone) : ""}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {ativas.length === 0 && <span className="text-xs text-muted-foreground">Fora da fila</span>}
                      {ativas.map((e) => (
                        <Badge key={e.id} variant="secondary" className="text-[10px] font-normal">
                          {nomeEsp(e.especialidade_slug)} · {STATUS_LABEL[e.status as StatusLista]}
                        </Badge>
                      ))}
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

const Atendimento = () => {
  const [params, setParams] = useSearchParams();
  const { data: especialidades = [], isLoading: loadingEsp } = useEspecialidades();
  const { data: entradas = [], isLoading: loadingLista, isError } = useListaEspera();
  const { data: pacientes = [] } = usePacientes();
  const [novaAberta, setNovaAberta] = useState(false);
  const [pacienteId, setPacienteId] = useState<string | null>(null);

  const tab = params.get("aba") ?? especialidades[0]?.slug ?? TAB_LINKS;
  const setTab = (value: string) => setParams({ aba: value }, { replace: true });
  const especialidadeAtual = especialidades.some((e) => e.slug === tab) ? tab : undefined;
  const pacienteAberto = pacientes.find((p) => p.id === pacienteId) ?? entradas.find((e) => e.paciente?.id === pacienteId)?.paciente ?? null;

  const aguardando = (slug: string) => entradas.filter((e) => e.especialidade_slug === slug && e.status === "aguardando").length;

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
              Lista de espera por especialidade, cadastro dos pacientes e links de inscrição para as famílias.
            </p>
          </div>
          <Button onClick={() => setNovaAberta(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova inscrição
          </Button>
        </div>

        {isError && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Não foi possível carregar a lista de espera. Verifique sua permissão de acesso ao módulo Atendimento.
          </p>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap justify-start">
            {especialidades.map((esp) => (
              <TabsTrigger key={esp.slug} value={esp.slug} className="gap-2">
                {esp.nome}
                <span className="rounded-full bg-amber-500/15 px-1.5 text-[10px] font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                  {aguardando(esp.slug)}
                </span>
              </TabsTrigger>
            ))}
            <TabsTrigger value={TAB_PACIENTES} className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Pacientes
            </TabsTrigger>
            <TabsTrigger value={TAB_LINKS} className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Links de inscrição
            </TabsTrigger>
          </TabsList>

          {especialidades.map((esp) => (
            <TabsContent key={esp.slug} value={esp.slug} className="mt-5">
              <ListaEsperaPanel
                entradas={entradas.filter((e) => e.especialidade_slug === esp.slug)}
                nomeEspecialidade={esp.nome}
                onOpenPaciente={setPacienteId}
              />
            </TabsContent>
          ))}
          <TabsContent value={TAB_PACIENTES} className="mt-5">
            <PacientesTab pacientes={pacientes} entradas={entradas} especialidades={especialidades} onOpen={setPacienteId} />
          </TabsContent>
          <TabsContent value={TAB_LINKS} className="mt-5">
            <LinksInscricao especialidades={especialidades} />
          </TabsContent>
        </Tabs>
      </div>

      <NovaInscricaoDialog open={novaAberta} onOpenChange={setNovaAberta} especialidades={especialidades} especialidadeAtual={especialidadeAtual} />
      <PacienteDialog paciente={pacienteAberto} entradas={entradas} especialidades={especialidades} onClose={() => setPacienteId(null)} />
    </AppLayout>
  );
};

export default Atendimento;
