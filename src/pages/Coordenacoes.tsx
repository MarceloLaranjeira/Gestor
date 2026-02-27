import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Church, Megaphone, Database, Shield, Building2, UsersRound, ClipboardList,
  ChevronRight, CheckCircle2, Clock, ListTodo, Loader2, Gavel,
} from "lucide-react";

const iconMap: Record<string, any> = {
  eclesiastica: Church,
  comunicacao: Megaphone,
  inteligencia: Database,
  cspjd: Shield,
  gabinete: Building2,
  equipe: UsersRound,
  plenaria: Gavel,
};

const colorMap: Record<string, string> = {
  eclesiastica: "from-violet-500/20 to-purple-500/10 border-violet-500/30",
  comunicacao: "from-blue-500/20 to-cyan-500/10 border-blue-500/30",
  inteligencia: "from-emerald-500/20 to-green-500/10 border-emerald-500/30",
  cspjd: "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
  gabinete: "from-rose-500/20 to-pink-500/10 border-rose-500/30",
  equipe: "from-indigo-500/20 to-blue-500/10 border-indigo-500/30",
  plenaria: "from-orange-500/20 to-red-500/10 border-orange-500/30",
};

interface CoordData {
  id: string;
  nome: string;
  descricao: string | null;
  slug: string;
  totalTarefas: number;
  tarefasConcluidas: number;
  totalSecoes: number;
}

const Coordenacoes = () => {
  const [coordenacoes, setCoordenacoes] = useState<CoordData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    const { data: coords } = await supabase
      .from("coordenacoes")
      .select("id, nome, descricao, slug")
      .order("nome");

    if (!coords) { setLoading(false); return; }

    const { data: secoes } = await supabase
      .from("secoes")
      .select("id, coordenacao_id");

    const secaoIds = (secoes || []).map(s => s.id);
    const { data: tarefas } = await supabase
      .from("tarefas")
      .select("id, secao_id, status")
      .in("secao_id", secaoIds.length > 0 ? secaoIds : ["none"]);

    const coordData: CoordData[] = coords.map(c => {
      const coordSecoes = (secoes || []).filter(s => s.coordenacao_id === c.id);
      const coordSecaoIds = coordSecoes.map(s => s.id);
      const coordTarefas = (tarefas || []).filter(t => coordSecaoIds.includes(t.secao_id));
      return {
        ...c,
        totalTarefas: coordTarefas.length,
        tarefasConcluidas: coordTarefas.filter(t => t.status === true).length,
        totalSecoes: coordSecoes.length,
      };
    });

    setCoordenacoes(coordData);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const totalTarefas = coordenacoes.reduce((s, c) => s + c.totalTarefas, 0);
  const totalConcluidas = coordenacoes.reduce((s, c) => s + c.tarefasConcluidas, 0);
  const totalPendentes = totalTarefas - totalConcluidas;
  const progressGeral = totalTarefas > 0 ? (totalConcluidas / totalTarefas) * 100 : 0;

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Coordenações do Gabinete</h1>
          <p className="text-sm text-muted-foreground">Gerencie seções e tarefas de cada coordenação</p>
        </div>

        {/* Stats resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{coordenacoes.length}</p>
                <p className="text-xs text-muted-foreground">Coordenações</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ListTodo className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTarefas}</p>
                <p className="text-xs text-muted-foreground">Total de Tarefas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConcluidas}</p>
                <p className="text-xs text-muted-foreground">Concluídas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalPendentes}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progresso geral */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Progresso Geral</p>
              <p className="text-sm font-bold text-primary">{progressGeral.toFixed(0)}%</p>
            </div>
            <Progress value={progressGeral} className="h-2.5" />
          </CardContent>
        </Card>

        {/* Cards das coordenações */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coordenacoes.map((coord, i) => {
            const Icon = iconMap[coord.slug] || Building2;
            const colors = colorMap[coord.slug] || "from-muted/50 to-muted/20 border-border";
            const progress = coord.totalTarefas > 0 ? (coord.tarefasConcluidas / coord.totalTarefas) * 100 : 0;

            return (
              <motion.div
                key={coord.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className={`cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border bg-gradient-to-br ${colors}`}
                  onClick={() => navigate(`/coordenacao/${coord.slug}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center shadow-sm">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm leading-tight">{coord.nome}</CardTitle>
                          <CardDescription className="text-[11px] mt-0.5 line-clamp-1">{coord.descricao || ""}</CardDescription>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <ListTodo className="w-3 h-3" /> {coord.totalSecoes} seções
                      </Badge>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {coord.tarefasConcluidas}/{coord.totalTarefas}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Progresso</span>
                        <span className="font-medium">{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Coordenacoes;
