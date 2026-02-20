import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart3, Download, Loader2, Users, ClipboardList, CalendarDays, TrendingUp, Bot,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
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
interface Evento {
  id: string;
  titulo: string;
  data: string;
  tipo: string;
}
interface Pessoa {
  id: string;
  nome: string;
  tipo: string;
  cidade: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const PIE_COLORS = [
  "hsl(152,55%,30%)",
  "hsl(205,70%,45%)",
  "hsl(45,85%,55%)",
  "hsl(0,72%,51%)",
  "hsl(38,92%,50%)",
  "hsl(270,60%,55%)",
  "hsl(142,70%,40%)",
  "hsl(330,70%,50%)",
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

// ── Stats Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub }: { icon: any; label: string; value: number; sub?: string }) => (
  <div className="glass-card rounded-xl p-5 flex items-center gap-4">
    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-primary-foreground" />
    </div>
    <div>
      <p className="text-2xl font-bold font-display text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Main ───────────────────────────────────────────────────────────────────────
const Relatorios = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [demandas, setDemandas] = useState<Demanda[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const [{ data: d }, { data: e }, { data: p }] = await Promise.all([
        supabase.from("demandas").select("id,titulo,status,prioridade,categoria,responsavel,data_prazo,created_at").order("created_at", { ascending: false }),
        supabase.from("eventos").select("id,titulo,data,tipo"),
        supabase.from("pessoas").select("id,nome,tipo,cidade"),
      ]);
      setDemandas((d as Demanda[]) || []);
      setEventos((e as Evento[]) || []);
      setPessoas((p as Pessoa[]) || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Demandas por status (pie)
  const demandasPorStatus = Object.entries(groupBy(demandas, (d) => d.status)).map(
    ([status, items]) => ({ name: status === "andamento" ? "Em andamento" : status.charAt(0).toUpperCase() + status.slice(1), value: items.length })
  );

  // Demandas por categoria (bar horizontal)
  const demandasPorCategoria = Object.entries(groupBy(demandas.filter(d => d.categoria), (d) => d.categoria))
    .map(([categoria, items]) => ({ categoria, total: items.length }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Eventos por mês (area)
  const currentYear = new Date().getFullYear();
  const eventosPorMes = MONTH_NAMES.map((mes, i) => ({
    mes,
    eventos: eventos.filter((e) => {
      const d = new Date(e.data + "T00:00:00");
      return d.getMonth() === i && d.getFullYear() === currentYear;
    }).length,
  }));

  // Pessoas por tipo (bar)
  const pessoasPorTipo = Object.entries(groupBy(pessoas.filter(p => p.tipo), (p) => p.tipo))
    .map(([tipo, items]) => ({ tipo, total: items.length }))
    .sort((a, b) => b.total - a.total);

  // Demandas abertas vs. concluídas últimos 6 meses
  const hoje = new Date();
  const evolucao = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    const mes = MONTH_NAMES[d.getMonth()];
    const abertas = demandas.filter((dem) => {
      const c = new Date(dem.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    const concluidas = demandas.filter((dem) => {
      const c = new Date(dem.created_at);
      return dem.status === "concluida" && c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    return { mes, abertas, concluidas };
  });

  // ── Analisar com IA ──────────────────────────────────────────────────────────
  const analisarComIA = () => {
    const pendentes = demandas.filter(d => d.status === "pendente").length;
    const concluidas = demandas.filter(d => d.status === "concluida").length;
    const atrasadas = demandas.filter(d => d.status === "atrasada").length;
    const andamento = demandas.filter(d => d.status === "andamento").length;
    const taxaConclusao = demandas.length ? Math.round((concluidas / demandas.length) * 100) : 0;

    const catLines = demandasPorCategoria.map(c => `  - ${c.categoria}: ${c.total}`).join("\n") || "  Sem dados";
    const tipoLines = pessoasPorTipo.map(p => `  - ${p.tipo}: ${p.total}`).join("\n") || "  Sem dados";

    const prompt = `Analise os dados do relatório do mandato do Deputado Comandante Dan e forneça insights estratégicos detalhados:

## 📋 DEMANDAS (Total: ${demandas.length})
- Pendentes: ${pendentes}
- Em andamento: ${andamento}
- Concluídas: ${concluidas} (taxa de conclusão: ${taxaConclusao}%)
- Atrasadas: ${atrasadas}

### Por Categoria:
${catLines}

## 📅 EVENTOS
- Total cadastrado: ${eventos.length}

## 👥 PESSOAS NA BASE
- Total: ${pessoas.length}

### Por Tipo:
${tipoLines}

---

Com base nesses dados reais do mandato, por favor forneça:

1. **Diagnóstico Geral** — pontos críticos e situação atual
2. **Alertas Prioritários** — o que precisa de atenção imediata
3. **Insights Estratégicos** — oportunidades e padrões identificados
4. **Plano de Ação** — 5 ações concretas e priorizadas para o Deputado Comandante Dan nas próximas semanas
5. **Previsão** — tendências e projeções baseadas nos dados`;

    navigate("/agente-ia", { state: { prompt } });
  };

  // ── PDF Export ───────────────────────────────────────────────────────────────
  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const now = new Date().toLocaleDateString("pt-BR");

      // Title
      doc.setFillColor(25, 80, 50);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório do Mandato — Dep. Comandante Dan", 14, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Gerado em ${now}`, 14, 22);

      let y = 36;

      // Summary cards
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo Geral", 14, y);
      y += 6;

      autoTable(doc, {
        startY: y,
        head: [["Métrica", "Total"]],
        body: [
          ["Total de Demandas", demandas.length],
          ["Demandas Pendentes", demandas.filter(d => d.status === "pendente").length],
          ["Demandas Concluídas", demandas.filter(d => d.status === "concluida").length],
          ["Demandas Atrasadas", demandas.filter(d => d.status === "atrasada").length],
          ["Total de Eventos", eventos.length],
          ["Total de Pessoas", pessoas.length],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [25, 80, 50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Demandas por categoria
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Demandas por Categoria", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Categoria", "Quantidade"]],
        body: demandasPorCategoria.map(d => [d.categoria, d.total]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [25, 80, 50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Check page space
      if (y > 230) { doc.addPage(); y = 20; }

      // Demandas por status
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Demandas por Status", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Status", "Quantidade"]],
        body: demandasPorStatus.map(d => [d.name, d.value]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [25, 80, 50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 230) { doc.addPage(); y = 20; }

      // Pessoas por tipo
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Pessoas por Tipo", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Tipo", "Quantidade"]],
        body: pessoasPorTipo.map(p => [p.tipo, p.total]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [25, 80, 50] },
      });

      y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 200) { doc.addPage(); y = 20; }

      // Listagem de demandas
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Listagem Completa de Demandas", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Título", "Status", "Prioridade", "Categoria", "Responsável"]],
        body: demandas.map(d => [
          d.titulo.length > 40 ? d.titulo.slice(0, 40) + "..." : d.titulo,
          d.status,
          d.prioridade,
          d.categoria || "-",
          d.responsavel || "-",
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 80, 50] },
      });

      doc.save(`relatorio-mandato-${now.replace(/\//g, "-")}.pdf`);
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análises e métricas reais do gabinete</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={analisarComIA} className="gradient-primary text-primary-foreground border-0 gap-2">
              <Bot className="w-4 h-4" />
              Analisar com IA
            </Button>
            <Button onClick={exportPDF} disabled={exporting} variant="outline" className="gap-2">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={ClipboardList} label="Total de Demandas" value={demandas.length} sub={`${demandas.filter(d => d.status === "pendente").length} pendentes`} />
          <StatCard icon={TrendingUp} label="Demandas Concluídas" value={demandas.filter(d => d.status === "concluida").length} sub={demandas.length ? `${Math.round(demandas.filter(d => d.status === "concluida").length / demandas.length * 100)}% do total` : "-"} />
          <StatCard icon={CalendarDays} label="Eventos Cadastrados" value={eventos.length} />
          <StatCard icon={Users} label="Pessoas na Base" value={pessoas.length} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Demandas por categoria */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Demandas por Categoria
            </h3>
            {demandasPorCategoria.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
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

          {/* Demandas por status (pie) */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> Status das Demandas
            </h3>
            {demandasPorStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={demandasPorStatus}
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${Math.round(percent * 100)}%)`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {demandasPorStatus.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartStyle} />
                  <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Eventos por mês */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Eventos por Mês ({currentYear})
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={eventosPorMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip contentStyle={chartStyle} />
                <Area
                  type="monotone"
                  dataKey="eventos"
                  stroke="hsl(var(--secondary))"
                  fill="hsl(var(--secondary) / 0.15)"
                  strokeWidth={2}
                  name="Eventos"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pessoas por tipo */}
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Pessoas por Tipo
            </h3>
            {pessoasPorTipo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
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

        {/* Evolução últimos 6 meses */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Evolução de Demandas — Últimos 6 Meses
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip contentStyle={chartStyle} />
              <Area type="monotone" dataKey="abertas" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.12)" strokeWidth={2} name="Abertas" />
              <Area type="monotone" dataKey="concluidas" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.12)" strokeWidth={2} name="Concluídas" />
              <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--foreground))" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Relatorios;
