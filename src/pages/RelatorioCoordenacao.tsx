import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, Clock, ListTodo, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface Coordenacao {
  id: string;
  nome: string;
  descricao: string | null;
}

interface Secao {
  id: string;
  titulo: string;
  ordem: number | null;
}

interface Tarefa {
  id: string;
  titulo: string;
  status: boolean;
  responsavel: string | null;
  canal: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  secao_id: string;
}

interface SecaoStats {
  titulo: string;
  total: number;
  concluidas: number;
  pendentes: number;
  percentual: number;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(262 83% 58%)",
];

const chartStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const RelatorioCoordenacao = () => {
  const [coordenacoes, setCoordenacoes] = useState<Coordenacao[]>([]);
  const [selectedCoord, setSelectedCoord] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // Report data
  const [secaoStats, setSecaoStats] = useState<SecaoStats[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [totalTarefas, setTotalTarefas] = useState(0);
  const [totalConcluidas, setTotalConcluidas] = useState(0);
  const [responsavelStats, setResponsavelStats] = useState<{ nome: string; total: number }[]>([]);

  useEffect(() => {
    const fetchCoords = async () => {
      const { data } = await supabase
        .from("coordenacoes")
        .select("id, nome, descricao")
        .order("nome");
      setCoordenacoes(data || []);
      setLoading(false);
    };
    fetchCoords();
  }, []);

  useEffect(() => {
    if (!selectedCoord) {
      setSecaoStats([]);
      setTarefas([]);
      setTotalTarefas(0);
      setTotalConcluidas(0);
      setResponsavelStats([]);
      return;
    }

    const fetchReport = async () => {
      setLoadingReport(true);

      const { data: secoes } = await supabase
        .from("secoes")
        .select("id, titulo, ordem")
        .eq("coordenacao_id", selectedCoord)
        .order("ordem");

      if (!secoes || secoes.length === 0) {
        setSecaoStats([]);
        setTarefas([]);
        setTotalTarefas(0);
        setTotalConcluidas(0);
        setResponsavelStats([]);
        setLoadingReport(false);
        return;
      }

      const secaoIds = secoes.map((s) => s.id);
      const { data: tarefasData } = await supabase
        .from("tarefas")
        .select("*")
        .in("secao_id", secaoIds);

      const allTarefas = tarefasData || [];
      setTarefas(allTarefas);

      const concluidas = allTarefas.filter((t) => t.status).length;
      setTotalTarefas(allTarefas.length);
      setTotalConcluidas(concluidas);

      // Stats per section
      const stats: SecaoStats[] = secoes.map((s) => {
        const secTarefas = allTarefas.filter((t) => t.secao_id === s.id);
        const secConcluidas = secTarefas.filter((t) => t.status).length;
        return {
          titulo: s.titulo,
          total: secTarefas.length,
          concluidas: secConcluidas,
          pendentes: secTarefas.length - secConcluidas,
          percentual: secTarefas.length > 0 ? Math.round((secConcluidas / secTarefas.length) * 100) : 0,
        };
      });
      setSecaoStats(stats);

      // Stats per responsavel
      const respMap: Record<string, number> = {};
      allTarefas.forEach((t) => {
        const resp = t.responsavel?.trim() || "Sem responsável";
        respMap[resp] = (respMap[resp] || 0) + 1;
      });
      const respStats = Object.entries(respMap)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);
      setResponsavelStats(respStats);

      setLoadingReport(false);
    };

    fetchReport();
  }, [selectedCoord]);

  const percentualGeral = totalTarefas > 0 ? Math.round((totalConcluidas / totalTarefas) * 100) : 0;
  const selectedCoordNome = coordenacoes.find((c) => c.id === selectedCoord)?.nome;

  const pieData = [
    { name: "Concluídas", value: totalConcluidas },
    { name: "Pendentes", value: totalTarefas - totalConcluidas },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Relatório por Coordenação</h1>
            <p className="text-sm text-muted-foreground">Selecione uma coordenação para visualizar o relatório</p>
          </div>
          <Select value={selectedCoord} onValueChange={setSelectedCoord}>
            <SelectTrigger className="w-full sm:w-72">
              <SelectValue placeholder="Selecionar coordenação" />
            </SelectTrigger>
            <SelectContent>
              {coordenacoes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedCoord && (
          <div className="glass-card rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Selecione uma coordenação acima para gerar o relatório.</p>
          </div>
        )}

        {loadingReport && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {selectedCoord && !loadingReport && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ListTodo className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalTarefas}</p>
                    <p className="text-xs text-muted-foreground">Total de Tarefas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalConcluidas}</p>
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{totalTarefas - totalConcluidas}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Progresso Geral</p>
                    <span className="text-sm font-bold text-foreground">{percentualGeral}%</span>
                  </div>
                  <Progress value={percentualGeral} className="h-2" />
                </CardContent>
              </Card>
            </div>

            {totalTarefas === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center">
                <p className="text-muted-foreground">Nenhuma tarefa cadastrada nesta coordenação.</p>
              </div>
            ) : (
              <>
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Tarefas por Seção</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={secaoStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis dataKey="titulo" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={120} />
                        <Tooltip contentStyle={chartStyle} />
                        <Bar dataKey="concluidas" stackId="a" fill="hsl(142 71% 45%)" name="Concluídas" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="pendentes" stackId="a" fill="hsl(var(--muted))" name="Pendentes" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="glass-card rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Distribuição Geral</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="hsl(142 71% 45%)" />
                          <Cell fill="hsl(var(--muted))" />
                        </Pie>
                        <Tooltip contentStyle={chartStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Responsavel breakdown */}
                {responsavelStats.length > 0 && (
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Tarefas por Responsável</h3>
                    <ResponsiveContainer width="100%" height={Math.max(200, responsavelStats.length * 40)}>
                      <BarChart data={responsavelStats} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis dataKey="nome" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={140} />
                        <Tooltip contentStyle={chartStyle} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Tarefas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Section detail table */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground font-display">Detalhamento por Seção</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seção</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Concluídas</TableHead>
                        <TableHead className="text-center">Pendentes</TableHead>
                        <TableHead className="text-center">Progresso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {secaoStats.map((s) => (
                        <TableRow key={s.titulo}>
                          <TableCell className="font-medium">{s.titulo}</TableCell>
                          <TableCell className="text-center">{s.total}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="bg-green-500/10 text-green-700">{s.concluidas}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">{s.pendentes}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <Progress value={s.percentual} className="h-2 w-20" />
                              <span className="text-xs text-muted-foreground">{s.percentual}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default RelatorioCoordenacao;
