import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toInscricaoRpc, type Especialidade, type InscricaoPayload, type StatusLista } from "@/lib/atendimento";
import type { Tables, TablesUpdate } from "@/integrations/supabase/types";

export type Paciente = Tables<"pacientes">;
export type EntradaLista = Tables<"lista_espera"> & { paciente: Paciente | null };

const KEYS = {
  especialidades: ["atendimento", "especialidades"] as const,
  lista: ["atendimento", "lista"] as const,
  pacientes: ["atendimento", "pacientes"] as const,
};

export function useEspecialidades() {
  return useQuery({
    queryKey: KEYS.especialidades,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Especialidade[]> => {
      const { data, error } = await supabase
        .from("especialidades")
        .select("slug, nome, descricao, ordem, ativo")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Todas as entradas da lista de espera com o cadastro do paciente. */
export function useListaEspera() {
  return useQuery({
    queryKey: KEYS.lista,
    queryFn: async (): Promise<EntradaLista[]> => {
      const { data, error } = await supabase
        .from("lista_espera")
        .select("*, paciente:pacientes(*)")
        .order("created_at", { ascending: true })
        // shortcut: carrega até 5 mil entradas de uma vez; paginar no servidor se a fila passar disso.
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as EntradaLista[];
    },
  });
}

export function usePacientes() {
  return useQuery({
    queryKey: KEYS.pacientes,
    queryFn: async (): Promise<Paciente[]> => {
      const { data, error } = await supabase.from("pacientes").select("*").order("nome").limit(5000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export async function inscreverPaciente(values: InscricaoPayload, consentimento: boolean): Promise<string> {
  const { data, error } = await supabase.rpc("inscrever_paciente", { p: toInscricaoRpc(values, consentimento) });
  if (error) throw new Error(error.message);
  const result = data as { protocolo?: string } | null;
  return result?.protocolo ?? "";
}

export function useInscrever() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ values }: { values: InscricaoPayload }) => inscreverPaciente(values, true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lista });
      qc.invalidateQueries({ queryKey: KEYS.pacientes });
    },
  });
}

export function useAtualizarEntrada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { status?: StatusLista; prioridade?: string; observacoes?: string | null } }) => {
      const { error } = await supabase.from("lista_espera").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.lista }),
  });
}

export function useAtualizarPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"pacientes"> }) => {
      const { error } = await supabase.from("pacientes").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.lista });
      qc.invalidateQueries({ queryKey: KEYS.pacientes });
    },
  });
}
