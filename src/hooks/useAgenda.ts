import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Paciente } from "@/hooks/useAtendimento";
import { JANELA_FALTAS_DIAS } from "@/lib/agenda";

export type Agendamento = Tables<"agendamentos"> & { paciente: Paciente | null };
export type Anamnese = Tables<"anamneses">;

const SELECT_AGENDAMENTO = "*, paciente:pacientes(*)";

const KEYS = {
  agenda: ["atendimento", "agenda"] as const,
  anamnese: ["atendimento", "anamnese"] as const,
};

/** Agendamentos no intervalo, opcionalmente de uma especialidade. */
export function useAgendamentos(inicio: Date, fim: Date, especialidade?: string) {
  return useQuery({
    queryKey: [...KEYS.agenda, "intervalo", inicio.toISOString(), fim.toISOString(), especialidade ?? "todas"],
    queryFn: async (): Promise<Agendamento[]> => {
      let query = supabase
        .from("agendamentos")
        .select(SELECT_AGENDAMENTO)
        .gte("data_hora", inicio.toISOString())
        .lte("data_hora", fim.toISOString())
        .order("data_hora");
      if (especialidade) query = query.eq("especialidade_slug", especialidade);
      const { data, error } = await query.limit(5000);
      if (error) throw error;
      return (data ?? []) as Agendamento[];
    },
  });
}

/** Faltas dos últimos 30 dias mais os próximos horários (para saber quem já foi reagendado). */
export function useControleFaltas() {
  return useQuery({
    queryKey: [...KEYS.agenda, "faltas"],
    queryFn: async (): Promise<Agendamento[]> => {
      const desde = subDays(new Date(), JANELA_FALTAS_DIAS + 1).toISOString();
      const { data, error } = await supabase
        .from("agendamentos")
        .select(SELECT_AGENDAMENTO)
        .gte("data_hora", desde)
        .in("status", ["falta", "agendado", "confirmado"])
        .order("data_hora")
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Agendamento[];
    },
  });
}

export function useHistoricoPaciente(pacienteId: string | null) {
  return useQuery({
    queryKey: [...KEYS.agenda, "paciente", pacienteId],
    enabled: !!pacienteId,
    queryFn: async (): Promise<Agendamento[]> => {
      const { data, error } = await supabase
        .from("agendamentos")
        .select(SELECT_AGENDAMENTO)
        .eq("paciente_id", pacienteId!)
        .order("data_hora", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Agendamento[];
    },
  });
}

function useInvalidarAtendimento() {
  const qc = useQueryClient();
  // Mudanças na agenda também alteram a lista de espera (gatilhos no banco).
  return () => qc.invalidateQueries({ queryKey: ["atendimento"] });
}

export function useCriarAgendamento() {
  const invalidar = useInvalidarAtendimento();
  return useMutation({
    mutationFn: async (novo: TablesInsert<"agendamentos">) => {
      const { error } = await supabase.from("agendamentos").insert(novo);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
  });
}

export function useAtualizarAgendamento() {
  const invalidar = useInvalidarAtendimento();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"agendamentos"> }) => {
      const { error } = await supabase.from("agendamentos").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidar,
  });
}

export function useAnamnese(pacienteId: string | null, especialidade: string | null) {
  return useQuery({
    queryKey: [...KEYS.anamnese, pacienteId, especialidade],
    enabled: !!pacienteId && !!especialidade,
    queryFn: async (): Promise<Anamnese | null> => {
      const { data, error } = await supabase
        .from("anamneses")
        .select("*")
        .eq("paciente_id", pacienteId!)
        .eq("especialidade_slug", especialidade!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSalvarAnamnese() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: TablesInsert<"anamneses">) => {
      const { error } = await supabase
        .from("anamneses")
        .upsert({ ...dados, updated_by: (await supabase.auth.getUser()).data.user?.id ?? null }, { onConflict: "paciente_id,especialidade_slug" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.anamnese }),
  });
}
