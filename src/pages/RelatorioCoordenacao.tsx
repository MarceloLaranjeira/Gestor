import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, CheckCircle2, Clock, ListTodo, Loader2, Download, FileSpreadsheet } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
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

  const handleExportPDF = () => {
    if (!selectedCoordNome) return;

    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("pt-BR");

    // Title
    doc.setFontSize(18);
    doc.text(`Relatório — ${selectedCoordNome}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em ${now}`, 14, 28);

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Resumo Geral", 14, 40);
    doc.setFontSize(10);
    doc.text(`Total de tarefas: ${totalTarefas}`, 14, 48);
    doc.text(`Concluídas: ${totalConcluidas}`, 14, 54);
    doc.text(`Pendentes: ${totalTarefas - totalConcluidas}`, 14, 60);
    doc.text(`Progresso: ${percentualGeral}%`, 14, 66);

    // Section table
    doc.setFontSize(12);
    doc.text("Detalhamento por Seção", 14, 80);

    autoTable(doc, {
      startY: 85,
      head: [["Seção", "Total", "Concluídas", "Pendentes", "Progresso"]],
      body: secaoStats.map((s) => [
        s.titulo,
        s.total.toString(),
        s.concluidas.toString(),
        s.pendentes.toString(),
        `${s.percentual}%`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [13, 71, 161] },
    });

    // Responsavel table
    const finalY = (doc as any).lastAutoTable?.finalY || 150;
    doc.setFontSize(12);
    doc.text("Tarefas por Responsável", 14, finalY + 12);

    autoTable(doc, {
      startY: finalY + 17,
      head: [["Responsável", "Tarefas"]],
      body: responsavelStats.map((r) => [r.nome, r.total.toString()]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [13, 71, 161] },
    });

    // Tarefas table
    const finalY2 = (doc as any).lastAutoTable?.finalY || 200;
    doc.setFontSize(12);
    doc.text("Lista Completa de Tarefas", 14, finalY2 + 12);

    autoTable(doc, {
      startY: finalY2 + 17,
      head: [["Título", "Status", "Responsável", "Canal", "Início", "Fim"]],
      body: tarefas.map((t) => [
        t.titulo,
        t.status ? "Concluída" : "Pendente",
        t.responsavel || "—",
        t.canal || "—",
        t.data_inicio || "—",
        t.data_fim || "—",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [13, 71, 161] },
    });

    doc.save(`relatorio-${selectedCoordNome.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const handleExportExcel = () => {
    if (!selectedCoordNome) return;

    const wb = XLSX.utils.book_new();

    // Resumo sheet
    const resumo = [
      ["Relatório — " + selectedCoordNome],
      ["Gerado em", new Date().toLocaleDateString("pt-BR")],
      [],
      ["Total de tarefas", totalTarefas],
      ["Concluídas", totalConcluidas],
      ["Pendentes", totalTarefas - totalConcluidas],
      ["Progresso", `${percentualGeral}%`],
    ];
    const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    // Seções sheet
    const secoesData = [
      ["Seção", "Total", "Concluídas", "Pendentes", "Progresso"],
      ...secaoStats.map((s) => [s.titulo, s.total, s.concluidas, s.pendentes, `${s.percentual}%`]),
    ];
    const wsSecoes = XLSX.utils.aoa_to_sheet(secoesData);
    XLSX.utils.book_append_sheet(wb, wsSecoes, "Seções");

    // Responsáveis sheet
    const respData = [
      ["Responsável", "Tarefas"],
      ...responsavelStats.map((r) => [r.nome, r.total]),
    ];
    const wsResp = XLSX.utils.aoa_to_sheet(respData);
    XLSX.utils.book_append_sheet(wb, wsResp, "Responsáveis");

    // Tarefas sheet
    const tarefasExport = [
      ["Título", "Status", "Responsável", "Canal", "Data Início", "Data Fim"],
      ...tarefas.map((t) => [
        t.titulo,
        t.status ? "Concluída" : "Pendente",
        t.responsavel || "—",
        t.canal || "—",
        t.data_inicio || "—",
        t.data_fim || "—",
      ]),
    ];
    const wsTarefas = XLSX.utils.aoa_to_sheet(tarefasExport);
    XLSX.utils.book_append_sheet(wb, wsTarefas, "Tarefas");

    XLSX.writeFile(wb, `relatorio-${selectedCoordNome.toLowerCase().replace(/\s+/g, "-")}.xlsx`);
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

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Relatório por Coordenação</h1>
            <p className="text-sm text-muted-foreground">Análise detalhada de tarefas, seções e desempenho por coordenação</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedCoord} onValueChange={setSelectedCoord}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Selecionar coordenação..." />
              </SelectTrigger>
              <SelectContent>
                {coordenacoes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCoord && !loadingReport && totalTarefas > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleExportPDF}
                  className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors shrink-0"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleExportExcel}
                  className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors shrink-0"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel
                </button>
              </div>
            )}
          </div>
        </div>

        {!selectedCoord && (
          <div className="glass-card rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Nenhuma coordenação selecionada</p>
            <p className="text-xs text-muted-foreground">Selecione uma coordenação no menu acima para gerar o relatório detalhado.</p>
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
                <p className="text-sm text-muted-foreground text-center">Nenhuma tarefa cadastrada nesta coordenação ainda.</p>
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
