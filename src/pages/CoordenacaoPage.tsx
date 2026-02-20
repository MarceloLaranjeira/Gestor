import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import TaskBoard, { SecaoTarefas } from "@/components/TaskBoard";
import { coordenacoesIniciais } from "@/data/coordenacoes";
import { Church, Megaphone, Database, Shield, Building2, UsersRound } from "lucide-react";

const icons: Record<string, any> = {
  eclesiastica: Church,
  comunicacao: Megaphone,
  inteligencia: Database,
  cspjd: Shield,
  gabinete: Building2,
  equipe: UsersRound,
};

const CoordenacaoPage = () => {
  const { id } = useParams<{ id: string }>();

  // Load from localStorage or use initial data
  const [coordenacoes, setCoordenacoes] = useState(() => {
    const saved = localStorage.getItem("coordenacoes");
    return saved ? JSON.parse(saved) : coordenacoesIniciais;
  });

  useEffect(() => {
    localStorage.setItem("coordenacoes", JSON.stringify(coordenacoes));
  }, [coordenacoes]);

  const coord = coordenacoes.find((c: any) => c.id === id);
  if (!coord) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Coordenação não encontrada.</p>
        </div>
      </AppLayout>
    );
  }

  const Icon = icons[id || ""] || Building2;

  const handleUpdate = (secoes: SecaoTarefas[]) => {
    const updated = coordenacoes.map((c: any) =>
      c.id === id ? { ...c, secoes } : c
    );
    setCoordenacoes(updated);
  };

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
          secoes={coord.secoes}
          onUpdate={handleUpdate}
          coordenacao={coord.nome}
        />
      </motion.div>
    </AppLayout>
  );
};

export default CoordenacaoPage;
