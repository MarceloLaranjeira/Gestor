import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Download, Loader2, Users, ClipboardList, CalendarDays,
  TrendingUp, Bot, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  Award, Target, Zap, Activity,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, RadialBarChart, RadialBar,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Demanda {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  categoria: string;
  responsavel: string;
  data_prazo: string | null;
  created_at: string;
}
interface Evento { id: string; titulo: string; data: string; tipo: string; }
interface Pessoa { id: string; nome: string; tipo: string; cidade: string; }
interface MovFinanceiro { id: string; tipo: string; valor: number; categoria: string; data: string; }
interface Tarefa { id: string; status: boolean; secao_id: string; titulo: string; responsavel: string | null; }
interface Secao { id: string; coordenacao_id: string; titulo: string; }
interface Coordenacao { id: string; nome: string; }

// ── Helpers ────────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const PIE_COLORS = [
  "hsl(152,55%,30%)", "hsl(205,70%,45%)", "hsl(45,85%,55%)", "hsl(0,72%,51%)",
  "hsl(38,92%,50%)", "hsl(270,60%,55%)", "hsl(142,70%,40%)", "hsl(330,70%,50%)",
];
const chartStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    acc[k] = acc[k] ? [...acc[k], item] : [item];
    return acc;
  }, {});
}
const pct = (a: number, b: number) => b === 0 ? 0 : Math.round((a / b) * 100);
const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatCard = ({
  icon: Icon, label, value, sub, color = "primary",
}: { icon: any; label: string; value: string | number; sub?: string; color?: string }) => {
  const colorMap: Record<string, string> = {
    primary: "gradient-primary", success: "bg-success", destructive: "bg-destructive",
    warning: "bg-warning", info: "bg-info",
  };
  return (
    <div className="glass-card rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg ${colorMap[color] ?? "gradient-primary"} flex items-center justify-center shrink-0`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold font-display text-foreground truncate">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  );
};

const ProgressBar = ({ label, value, max, color = "hsl(var(--primary))" }: { label: string; value: number; max: number; color?: string }) => {
  const pctVal = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground font-medium truncate pr-2">{label}</span>
        <span className="text-muted-foreground shrink-0">{value} ({pctVal}%)</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pctVal}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

// ── Tabs ───────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "visao", label: "Visão Geral" },
  { id: "desempenho", label: "Desempenho" },
  { id: "equipe", label: "Equipe" },
  { id: "financeiro", label: "Financeiro" },
];

// ── Main ───────────────────────────────────────────────────────────────────────
const Relatorios = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("visao");
  const [loading, setLoading] = useState(true);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [financeiros, setFinanceiros] = useState<MovFinanceiro[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [secoes, setSecoes] = useState<Secao[]>([]);
  const [coordenacoes, setCoordenacoes] = useState<Coordenacao[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: d }, { data: e }, { data: p }, { data: f }, { data: t }, { data: s }, { data: c }] = await Promise.all([
        supabase.from("demandas").select("id,titulo,status,prioridade,categoria,responsavel,data_prazo,created_at").order("created_at", { ascending: false }),
        supabase.from("eventos").select("id,titulo,data,tipo"),
        supabase.from("pessoas").select("id,nome,tipo,cidade"),
        supabase.from("movimentos_financeiros").select("id,tipo,valor,categoria,data"),
        supabase.from("tarefas").select("id,status,secao_id,titulo,responsavel"),
        supabase.from("secoes").select("id,coordenacao_id,titulo"),
        supabase.from("coordenacoes").select("id,nome"),
      ]);
      setDemandas((d as Demanda[]) || []);
      setEventos((e as Evento[]) || []);
      setPessoas((p as Pessoa[]) || []);
      setFinanceiros((f as MovFinanceiro[]) || []);
      setTarefas((t as Tarefa[]) || []);
      setSecoes((s as Secao[]) || []);
      setCoordenacoes((c as Coordenacao[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── Derived: Geral ─────────────────────────────────────────────────────────
  const demandasPorStatus = Object.entries(groupBy(demandas, d => d.status)).map(
    ([status, items]) => ({ name: status === "andamento" ? "Em andamento" : status.charAt(0).toUpperCase() + status.slice(1), value: items.length })
  );
  const demandasPorCategoria = Object.entries(groupBy(demandas.filter(d => d.categoria), d => d.categoria))
    .map(([categoria, items]) => ({ categoria, total: items.length }))
    .sort((a, b) => b.total - a.total).slice(0, 8);
  const pessoasPorTipo = Object.entries(groupBy(pessoas.filter(p => p.tipo), p => p.tipo))
    .map(([tipo, items]) => ({ tipo, total: items.length })).sort((a, b) => b.total - a.total);
  const currentYear = new Date().getFullYear();
  const eventosPorMes = MONTH_NAMES.map((mes, i) => ({
    mes,
    eventos: eventos.filter(e => { const d = new Date(e.data + "T00:00:00"); return d.getMonth() === i && d.getFullYear() === currentYear; }).length,
  }));
  const hoje = new Date();
  const evolucao = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    const mes = MONTH_NAMES[d.getMonth()];
    const abertas = demandas.filter(dem => { const c = new Date(dem.created_at); return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth(); }).length;
    const concluidas = demandas.filter(dem => { const c = new Date(dem.created_at); return dem.status === "concluida" && c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth(); }).length;
    return { mes, abertas, concluidas };
  });

  // ── Derived: Desempenho ────────────────────────────────────────────────────
  const taxaConclusaoDemandas = pct(demandas.filter(d => d.status === "concluida").length, demandas.length);
  const taxaAtrasadas = pct(demandas.filter(d => d.status === "atrasada").length, demandas.length);
  const totalTarefas = tarefas.length;
  const tarefasConcluidas = tarefas.filter(t => t.status).length;
  const taxaConclusaoTarefas = pct(tarefasConcluidas, totalTarefas);

  // Demandas urgentes não concluídas
  const urgentesAbertas = demandas.filter(d => d.prioridade === "urgente" && d.status !== "concluida").length;

  // Desempenho por prioridade
  const prioridades = ["urgente", "alta", "media", "baixa"];
  const desempenhoPorPrioridade = prioridades.map(pri => {
    const total = demandas.filter(d => d.prioridade === pri).length;
    const concluidas = demandas.filter(d => d.prioridade === pri && d.status === "concluida").length;
    return { prioridade: pri.charAt(0).toUpperCase() + pri.slice(1), total, concluidas, taxa: pct(concluidas, total) };
  }).filter(d => d.total > 0);

  // Desempenho coordenações: tarefas por coordenação
  const desempenhoCoordenacoes = coordenacoes.map(coord => {
    const secoesCoord = secoes.filter(s => s.coordenacao_id === coord.id);
    const tarefasCoord = tarefas.filter(t => secoesCoord.some(s => s.id === t.secao_id));
    const concluidas = tarefasCoord.filter(t => t.status).length;
    const total = tarefasCoord.length;
    return { nome: coord.nome, total, concluidas, pendentes: total - concluidas, taxa: pct(concluidas, total) };
  }).filter(c => c.total > 0).sort((a, b) => b.taxa - a.taxa);

  // Gauge de desempenho geral (score composto)
  const scoreGeral = demandas.length === 0 && totalTarefas === 0 ? 0
    : Math.round((taxaConclusaoDemandas * 0.5) + (taxaConclusaoTarefas * 0.5));
  const gaugeData = [{ name: "Score", value: scoreGeral, fill: scoreGeral >= 70 ? "hsl(142,70%,40%)" : scoreGeral >= 40 ? "hsl(38,92%,50%)" : "hsl(0,72%,51%)" }];

  // ── Derived: Equipe ────────────────────────────────────────────────────────
  const responsaveis = Object.entries(groupBy(demandas.filter(d => d.responsavel), d => d.responsavel))
    .map(([nome, items]) => ({
      nome,
      total: items.length,
      concluidas: items.filter(d => d.status === "concluida").length,
      atrasadas: items.filter(d => d.status === "atrasada").length,
      pendentes: items.filter(d => d.status === "pendente").length,
      taxa: pct(items.filter(d => d.status === "concluida").length, items.length),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ── Derived: Financeiro ────────────────────────────────────────────────────
  const totalReceitas = financeiros.filter(f => f.tipo === "receita").reduce((s, f) => s + Number(f.valor), 0);
  const totalDespesas = financeiros.filter(f => f.tipo === "despesa").reduce((s, f) => s + Number(f.valor), 0);
  const saldo = totalReceitas - totalDespesas;
  const finPorMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    const mes = MONTH_NAMES[d.getMonth()];
    const rec = financeiros.filter(f => f.tipo === "receita" && new Date(f.data + "T00:00:00").getMonth() === d.getMonth() && new Date(f.data + "T00:00:00").getFullYear() === d.getFullYear()).reduce((s, f) => s + Number(f.valor), 0);
    const desp = financeiros.filter(f => f.tipo === "despesa" && new Date(f.data + "T00:00:00").getMonth() === d.getMonth() && new Date(f.data + "T00:00:00").getFullYear() === d.getFullYear()).reduce((s, f) => s + Number(f.valor), 0);
    return { mes, receitas: rec, despesas: desp };
  });
  const despesasPorCategoria = Object.entries(groupBy(financeiros.filter(f => f.tipo === "despesa" && f.categoria), f => f.categoria))
    .map(([cat, items]) => ({ categoria: cat, total: items.reduce((s, f) => s + Number(f.valor), 0) }))
    .sort((a, b) => b.total - a.total);

  // ── Analisar com IA ────────────────────────────────────────────────────────
  const analisarComIA = () => {
    const pendentes = demandas.filter(d => d.status === "pendente").length;
    const concluidas = demandas.filter(d => d.status === "concluida").length;
    const atrasadas = demandas.filter(d => d.status === "atrasada").length;
    const andamento = demandas.filter(d => d.status === "andamento").length;
    const catLines = demandasPorCategoria.map(c => `  - ${c.categoria}: ${c.total}`).join("\n") || "  Sem dados";
    const tipoLines = pessoasPorTipo.map(p => `  - ${p.tipo}: ${p.total}`).join("\n") || "  Sem dados";
    const coordLines = desempenhoCoordenacoes.map(c => `  - ${c.nome}: ${c.taxa}% (${c.concluidas}/${c.total})`).join("\n") || "  Sem dados";
    const respLines = responsaveis.slice(0, 5).map(r => `  - ${r.nome}: ${r.taxa}% conclusão (${r.total} demandas)`).join("\n") || "  Sem dados";
    const prompt = `Analise os dados completos de desempenho do mandato do Deputado Comandante Dan:

## 📋 DEMANDAS (Total: ${demandas.length})
- Pendentes: ${pendentes} | Em andamento: ${andamento} | Concluídas: ${concluidas} (${taxaConclusaoDemandas}%) | Atrasadas: ${atrasadas} (${taxaAtrasadas}%)
- Urgentes em aberto: ${urgentesAbertas}
### Por Categoria: ${catLines}

## ✅ TAREFAS
- Total: ${totalTarefas} | Concluídas: ${tarefasConcluidas} (${taxaConclusaoTarefas}%)

## 🏢 COORDENAÇÕES (desempenho em tarefas): ${coordLines}

## 👤 TOP RESPONSÁVEIS (demandas): ${respLines}

## 💰 FINANCEIRO
- Receitas: ${fmt(totalReceitas)} | Despesas: ${fmt(totalDespesas)} | Saldo: ${fmt(saldo)}

## 👥 PESSOAS: ${pessoas.length}
## 📅 EVENTOS: ${eventos.length}

### Por Tipo de Pessoa: ${tipoLines}

---
Forneça: 1) Score de desempenho geral (0-100) com justificativa, 2) Principais gargalos, 3) Destaques positivos, 4) Recomendações prioritárias por área (Demandas, Equipe, Coordenações, Financeiro), 5) Plano de ação das próximas 2 semanas.`;
    navigate("/agente-ia", { state: { prompt } });
  };

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const now = new Date().toLocaleDateString("pt-BR");
      doc.setFillColor(25, 80, 50);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório de Desempenho — Dep. Comandante Dan", 14, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em ${now}`, 14, 22);
      let y = 36;
      const section = (title: string) => {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setTextColor(40, 40, 40);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(title, 14, y);
        y += 4;
      };
      section("Resumo Geral");
      autoTable(doc, { startY: y, head: [["Métrica", "Valor"]], body: [
        ["Total de Demandas", demandas.length], ["Taxa de Conclusão (Demandas)", `${taxaConclusaoDemandas}%`],
        ["Demandas Atrasadas", `${demandas.filter(d => d.status === "atrasada").length} (${taxaAtrasadas}%)`],
        ["Total de Tarefas", totalTarefas], ["Taxa de Conclusão (Tarefas)", `${taxaConclusaoTarefas}%`],
        ["Score de Desempenho Geral", `${scoreGeral}/100`],
        ["Total de Eventos", eventos.length], ["Total de Pessoas", pessoas.length],
        ["Receitas", fmt(totalReceitas)], ["Despesas", fmt(totalDespesas)], ["Saldo", fmt(saldo)],
      ], styles: { fontSize: 9 }, headStyles: { fillColor: [25, 80, 50] } });
      y = (doc as any).lastAutoTable.finalY + 8;
      section("Desempenho por Coordenação");
      autoTable(doc, { startY: y, head: [["Coordenação", "Total", "Concluídas", "Pendentes", "Taxa"]], body: desempenhoCoordenacoes.map(c => [c.nome, c.total, c.concluidas, c.pendentes, `${c.taxa}%`]), styles: { fontSize: 9 }, headStyles: { fillColor: [25, 80, 50] } });
      y = (doc as any).lastAutoTable.finalY + 8;
      section("Desempenho da Equipe (por Responsável)");
      autoTable(doc, { startY: y, head: [["Responsável", "Total", "Concluídas", "Atrasadas", "Taxa"]], body: responsaveis.map(r => [r.nome, r.total, r.concluidas, r.atrasadas, `${r.taxa}%`]), styles: { fontSize: 9 }, headStyles: { fillColor: [25, 80, 50] } });
      y = (doc as any).lastAutoTable.finalY + 8;
      section("Demandas por Categoria");
      autoTable(doc, { startY: y, head: [["Categoria", "Quantidade"]], body: demandasPorCategoria.map(d => [d.categoria, d.total]), styles: { fontSize: 9 }, headStyles: { fillColor: [25, 80, 50] } });
      doc.save(`desempenho-mandato-${now.replace(/\//g, "-")}.pdf`);
    } finally {
      setExporting(false);
    }
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análises e métricas reais do gabinete</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={analisarComIA} className="gradient-primary text-primary-foreground border-0 gap-2">
              <Bot className="w-4 h-4" /> Analisar com IA
            </Button>
            <Button onClick={exportPDF} disabled={exporting} variant="outline" className="gap-2">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: VISÃO GERAL ─────────────────────────────────────────────── */}
        {tab === "visao" && (
          <motion.div key="visao" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={ClipboardList} label="Total de Demandas" value={demandas.length} sub={`${demandas.filter(d => d.status === "pendente").length} pendentes`} />
              <StatCard icon={CheckCircle2} label="Demandas Concluídas" value={`${taxaConclusaoDemandas}%`} sub={`${demandas.filter(d => d.status === "concluida").length} de ${demandas.length}`} color="success" />
              <StatCard icon={CalendarDays} label="Eventos" value={eventos.length} />
              <StatCard icon={Users} label="Pessoas" value={pessoas.length} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" /> Demandas por Categoria
                </h3>
                {demandasPorCategoria.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={demandasPorCategoria} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <YAxis dataKey="categoria" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Demandas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" /> Status das Demandas
                </h3>
                {demandasPorStatus.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={demandasPorStatus} cx="50%" cy="45%" outerRadius={85} dataKey="value"
                        label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`} labelLine={false} fontSize={10}>
                        {demandasPorStatus.map((_, index) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={chartStyle} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" /> Eventos por Mês ({currentYear})
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={eventosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={chartStyle} />
                    <Area type="monotone" dataKey="eventos" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.15)" strokeWidth={2} name="Eventos" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" /> Pessoas por Tipo
                </h3>
                {pessoasPorTipo.length === 0 ? <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pessoasPorTipo}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="total" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} name="Pessoas" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Evolução de Demandas — Últimos 6 Meses
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={chartStyle} />
                  <Area type="monotone" dataKey="abertas" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.12)" strokeWidth={2} name="Abertas" />
                  <Area type="monotone" dataKey="concluidas" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.12)" strokeWidth={2} name="Concluídas" />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ── TAB: DESEMPENHO ──────────────────────────────────────────────── */}
        {tab === "desempenho" && (
          <motion.div key="desempenho" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Score + KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Score gauge */}
              <div className="glass-card rounded-xl p-5 flex flex-col items-center justify-center">
                <h3 className="text-sm font-semibold text-foreground mb-2 font-display">Score de Desempenho</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <RadialBarChart cx="50%" cy="70%" innerRadius="60%" outerRadius="90%" data={[{ name: "Score", value: scoreGeral, fill: scoreGeral >= 70 ? "hsl(142,70%,40%)" : scoreGeral >= 40 ? "hsl(38,92%,50%)" : "hsl(0,72%,51%)" }]} startAngle={180} endAngle={0}>
                    <RadialBar dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <p className={`text-4xl font-bold font-display -mt-4 ${scoreGeral >= 70 ? "text-success" : scoreGeral >= 40 ? "text-warning" : "text-destructive"}`}>
                  {scoreGeral}
                </p>
                <p className="text-xs text-muted-foreground mt-1">de 100 pontos</p>
                <p className={`text-xs font-medium mt-1 ${scoreGeral >= 70 ? "text-success" : scoreGeral >= 40 ? "text-warning" : "text-destructive"}`}>
                  {scoreGeral >= 70 ? "🟢 Bom desempenho" : scoreGeral >= 40 ? "🟡 Atenção necessária" : "🔴 Crítico"}
                </p>
              </div>

              {/* KPIs */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                <StatCard icon={CheckCircle2} label="Taxa Conclusão Demandas" value={`${taxaConclusaoDemandas}%`} color="success" />
                <StatCard icon={AlertTriangle} label="Taxa de Atraso" value={`${taxaAtrasadas}%`} color="destructive" />
                <StatCard icon={Target} label="Taxa Conclusão Tarefas" value={`${taxaConclusaoTarefas}%`} color={taxaConclusaoTarefas >= 70 ? "success" : "warning"} />
                <StatCard icon={Zap} label="Urgentes em Aberto" value={urgentesAbertas} color={urgentesAbertas > 0 ? "destructive" : "success"} />
              </div>
            </div>

            {/* Desempenho por prioridade */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Taxa de Conclusão por Prioridade
              </h3>
              {desempenhoPorPrioridade.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de demandas</p>
              ) : (
                <div className="space-y-3">
                  {desempenhoPorPrioridade.map(d => (
                    <ProgressBar
                      key={d.prioridade}
                      label={`${d.prioridade} (${d.total} demandas)`}
                      value={d.concluidas}
                      max={d.total}
                      color={d.prioridade === "Urgente" ? "hsl(0,72%,51%)" : d.prioridade === "Alta" ? "hsl(38,92%,50%)" : d.prioridade === "Media" ? "hsl(205,70%,45%)" : "hsl(152,55%,30%)"}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Desempenho coordenações */}
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Desempenho por Coordenação (Tarefas)
              </h3>
              {desempenhoCoordenacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de coordenações</p>
              ) : (
                <>
                  <div className="space-y-3 mb-5">
                    {desempenhoCoordenacoes.map(c => (
                      <ProgressBar key={c.nome} label={c.nome} value={c.concluidas} max={c.total}
                        color={c.taxa >= 70 ? "hsl(142,70%,40%)" : c.taxa >= 40 ? "hsl(38,92%,50%)" : "hsl(0,72%,51%)"} />
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={desempenhoCoordenacoes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pendentes" name="Pendentes" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB: EQUIPE ─────────────────────────────────────────────────── */}
        {tab === "equipe" && (
          <motion.div key="equipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Users} label="Responsáveis ativos" value={responsaveis.length} />
              <StatCard icon={CheckCircle2} label="Melhor taxa" value={responsaveis[0] ? `${responsaveis[0].taxa}%` : "-"} sub={responsaveis[0]?.nome} color="success" />
              <StatCard icon={AlertTriangle} label="Com demandas atrasadas" value={responsaveis.filter(r => r.atrasadas > 0).length} color="destructive" />
            </div>

            {responsaveis.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
                Nenhum responsável cadastrado nas demandas ainda.
              </div>
            ) : (
              <>
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" /> Ranking de Responsáveis
                  </h3>
                  <div className="space-y-3">
                    {responsaveis.map((r, i) => (
                      <div key={r.nome} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-warning/20 text-warning" : i === 1 ? "bg-muted-foreground/20 text-muted-foreground" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.nome}</p>
                          <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                            <span className="text-success">✓ {r.concluidas} concluídas</span>
                            <span className="text-warning">⏳ {r.pendentes} pendentes</span>
                            {r.atrasadas > 0 && <span className="text-destructive">⚠ {r.atrasadas} atrasadas</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold font-display ${r.taxa >= 70 ? "text-success" : r.taxa >= 40 ? "text-warning" : "text-destructive"}`}>
                            {r.taxa}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">{r.total} total</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" /> Demandas por Responsável
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={responsaveis.slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                      <Tooltip contentStyle={chartStyle} />
                      <Bar dataKey="concluidas" name="Concluídas" fill="hsl(var(--success))" radius={[2, 2, 0, 0]} stackId="a" />
                      <Bar dataKey="pendentes" name="Pendentes" fill="hsl(var(--warning))" radius={[0, 0, 0, 0]} stackId="a" />
                      <Bar dataKey="atrasadas" name="Atrasadas" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} stackId="a" />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── TAB: FINANCEIRO ──────────────────────────────────────────────── */}
        {tab === "financeiro" && (
          <motion.div key="financeiro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={TrendingUp} label="Total Receitas" value={fmt(totalReceitas)} color="success" />
              <StatCard icon={TrendingDown} label="Total Despesas" value={fmt(totalDespesas)} color="destructive" />
              <StatCard icon={Activity} label="Saldo" value={fmt(saldo)} color={saldo >= 0 ? "success" : "destructive"} />
            </div>

            {financeiros.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center text-muted-foreground">
                Nenhum lançamento financeiro registrado ainda. Acesse a página <strong>Financeiro</strong> para registrar.
              </div>
            ) : (
              <>
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" /> Receitas × Despesas — Últimos 6 Meses
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={finPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)} />
                      <Tooltip contentStyle={chartStyle} formatter={(v: number) => fmt(v)} />
                      <Area type="monotone" dataKey="receitas" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.12)" strokeWidth={2} name="Receitas" />
                      <Area type="monotone" dataKey="despesas" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.10)" strokeWidth={2} name="Despesas" />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {despesasPorCategoria.length > 0 && (
                  <div className="glass-card rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-primary" /> Despesas por Categoria
                    </h3>
                    <div className="space-y-3 mb-4">
                      {despesasPorCategoria.map(d => (
                        <ProgressBar key={d.categoria} label={d.categoria} value={d.total} max={totalDespesas}
                          color="hsl(var(--destructive))" />
                      ))}
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={despesasPorCategoria} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => new Intl.NumberFormat("pt-BR", { notation: "compact" }).format(v)} />
                        <YAxis dataKey="categoria" type="category" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                        <Tooltip contentStyle={chartStyle} formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="total" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} name="Despesas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Relatorios;
