import { useState } from "react";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EntradaLista, Paciente } from "@/hooks/useAtendimento";
import { STATUS_ATIVOS, STATUS_LABEL, formatIdade, maskCpf, maskPhone, type Especialidade, type StatusLista } from "@/lib/atendimento";

interface PacientesPanelProps {
  pacientes: Paciente[];
  entradas: EntradaLista[];
  especialidades: Especialidade[];
  onOpen: (id: string) => void;
}

export function PacientesPanel({ pacientes, entradas, especialidades, onOpen }: PacientesPanelProps) {
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
