import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import TaskBoard, { SecaoTarefas, Tarefa } from "@/components/TaskBoard";
import { supabase } from "@/integrations/supabase/client";
import { Church, Megaphone, Database, Shield, Building2, UsersRound, Loader2 } from "lucide-react";

const icons: Record<string, any> = {
  eclesiastica: Church,
  comunicacao: Megaphone,
  inteligencia: Database,
  cspjd: Shield,
  gabinete: Building2,
  equipe: UsersRound,
};

const CoordenacaoPage = () => {
  const { id: slug } = useParams<{ id: string }>();
  const [coord, setCoord] = useState<{ id: string; nome: string; descricao: string } | null>(null);
  const [secoes, setSecoes] = useState<SecaoTarefas[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!slug) return;

    const { data: coordData } = await supabase
      .from("coordenacoes")
      .select("id, nome, descricao")
      .eq("slug", slug)
      .single();

    if (!coordData) {
      setLoading(false);
      return;
    }

    setCoord(coordData);

    const { data: secoesData } = await supabase
      .from("secoes")
      .select("id, titulo, ordem")
      .eq("coordenacao_id", coordData.id)
      .order("ordem");

    if (!secoesData) {
      setSecoes([]);
      setLoading(false);
      return;
    }

    const secaoIds = secoesData.map((s) => s.id);
    const { data: tarefasData } = await supabase
      .from("tarefas")
      .select("*")
      .in("secao_id", secaoIds.length > 0 ? secaoIds : ["none"]);

    const mapped: SecaoTarefas[] = secoesData.map((s) => ({
      dbId: s.id,
      titulo: s.titulo,
      tarefas: (tarefasData || [])
        .filter((t) => t.secao_id === s.id)
        .map((t) => ({
          id: t.id,
          titulo: t.titulo,
          motivo: t.motivo || "",
          responsavel: t.responsavel || "",
          canal: t.canal || "Pessoal",
          dataInicio: t.data_inicio || "",
          dataFim: t.data_fim || "",
          status: t.status,
        })),
    }));

    setSecoes(mapped);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = async (newSecoes: SecaoTarefas[]) => {
    if (!coord) return;

    // Find added sections
    for (const secao of newSecoes) {
      if (!(secao as any).dbId) {
        const { data } = await supabase
          .from("secoes")
          .insert({ coordenacao_id: coord.id, titulo: secao.titulo, ordem: newSecoes.indexOf(secao) })
          .select("id")
          .single();
        if (data) (secao as any).dbId = data.id;
      }
    }

    // Find removed sections
    const newDbIds = newSecoes.map((s) => (s as any).dbId).filter(Boolean);
    const oldDbIds = secoes.map((s) => (s as any).dbId).filter(Boolean);
    for (const oldId of oldDbIds) {
      if (!newDbIds.includes(oldId)) {
        await supabase.from("secoes").delete().eq("id", oldId);
      }
    }

    // Sync tasks for each section
    for (const secao of newSecoes) {
      const dbId = (secao as any).dbId;
      if (!dbId) continue;

      const oldSecao = secoes.find((s) => (s as any).dbId === dbId);
      const oldTaskIds = oldSecao?.tarefas.map((t) => t.id) || [];
      const newTaskIds = secao.tarefas.map((t) => t.id).filter((id) => typeof id === "string");

      // Delete removed tasks
      for (const oldId of oldTaskIds) {
        if (typeof oldId === "string" && !newTaskIds.includes(oldId)) {
          await supabase.from("tarefas").delete().eq("id", oldId);
        }
      }

      // Add/update tasks
      for (const tarefa of secao.tarefas) {
        const tarefaData = {
          secao_id: dbId,
          titulo: tarefa.titulo,
          motivo: tarefa.motivo,
          responsavel: tarefa.responsavel,
          canal: tarefa.canal,
          data_inicio: tarefa.dataInicio || null,
          data_fim: tarefa.dataFim || null,
          status: tarefa.status,
        };

        if (typeof tarefa.id === "string") {
          // Existing task - update
          await supabase.from("tarefas").update(tarefaData).eq("id", tarefa.id);
        } else {
          // New task - insert
          await supabase.from("tarefas").insert(tarefaData);
        }
      }
    }

    await loadData();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!coord) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Coordenação não encontrada.</p>
        </div>
      </AppLayout>
    );
  }

  const Icon = icons[slug || ""] || Building2;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">{coord.nome}</h1>
            <p className="text-sm text-muted-foreground">{coord.descricao}</p>
          </div>
        </div>

        <TaskBoard
          secoes={secoes}
          onUpdate={handleUpdate}
          coordenacao={coord.nome}
        />
      </motion.div>
    </AppLayout>
  );
};

export default CoordenacaoPage;
