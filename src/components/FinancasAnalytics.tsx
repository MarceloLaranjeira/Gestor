import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface Movimento {
  id: string;
  tipo: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--info))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
];

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" }).format(v);

const chartStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

interface Props {
  movimentos: Movimento[];
}

export default function FinancasAnalytics({ movimentos }: Props) {
  const analytics = useMemo(() => {
    const now = new Date();
    const receitas = movimentos.filter(m => m.tipo === "receita");
    const despesas = movimentos.filter(m => m.tipo === "despesa");
    const totalReceitas = receitas.reduce((s, m) => s + Number(m.valor), 0);
    const totalDespesas = despesas.reduce((s, m) => s + Number(m.valor), 0);
    const saldo = totalReceitas - totalDespesas;

    // Monthly data for last 6 months
    const monthly = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mes = MONTH_NAMES[d.getMonth()];
      const mReceitas = movimentos
        .filter(m => m.tipo === "receita" && new Date(m.data + "T00:00:00").getMonth() === d.getMonth() && new Date(m.data + "T00:00:00").getFullYear() === d.getFullYear())
        .reduce((s, m) => s + Number(m.valor), 0);
      const mDespesas = movimentos
        .filter(m => m.tipo === "despesa" && new Date(m.data + "T00:00:00").getMonth() === d.getMonth() && new Date(m.data + "T00:00:00").getFullYear() === d.getFullYear())
        .reduce((s, m) => s + Number(m.valor), 0);
      return { mes, receitas: mReceitas, despesas: mDespesas, saldo: mReceitas - mDespesas };
    });

    // Burn rate (avg monthly expenses from months with data)
    const monthsWithExpenses = monthly.filter(m => m.despesas > 0);
    const burnRate = monthsWithExpenses.length > 0
      ? monthsWithExpenses.reduce((s, m) => s + m.despesas, 0) / monthsWithExpenses.length
      : 0;

    // Avg monthly revenue
    const monthsWithRevenue = monthly.filter(m => m.receitas > 0);
    const avgReceita = monthsWithRevenue.length > 0
      ? monthsWithRevenue.reduce((s, m) => s + m.receitas, 0) / monthsWithRevenue.length
      : 0;

    // Runway (months of saldo left at current burn rate)
    const runway = burnRate > 0 && saldo > 0 ? saldo / burnRate : saldo > 0 ? Infinity : 0;

    // Expense growth trend (last 3 months vs previous 3)
    const recent3 = monthly.slice(3).reduce((s, m) => s + m.despesas, 0);
    const prev3 = monthly.slice(0, 3).reduce((s, m) => s + m.despesas, 0);
    const expenseGrowth = prev3 > 0 ? ((recent3 - prev3) / prev3) * 100 : 0;

    // Revenue growth
    const recentRev3 = monthly.slice(3).reduce((s, m) => s + m.receitas, 0);
    const prevRev3 = monthly.slice(0, 3).reduce((s, m) => s + m.receitas, 0);
    const revenueGrowth = prevRev3 > 0 ? ((recentRev3 - prevRev3) / prevRev3) * 100 : 0;

    // Efficiency ratio
    const efficiency = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;

    // Category breakdown (despesas)
    const catMap: Record<string, number> = {};
    despesas.forEach(m => {
      const cat = m.categoria || "Sem categoria";
      catMap[cat] = (catMap[cat] || 0) + Number(m.valor);
    });
    const categoryBreakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Predictive: projected next 3 months
    const predicted = Array.from({ length: 3 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + 1 + i, 1);
      const mes = MONTH_NAMES[d.getMonth()];
      const projReceita = avgReceita * (1 + (revenueGrowth / 100) * ((i + 1) / 3));
      const projDespesa = burnRate * (1 + (expenseGrowth / 100) * ((i + 1) / 3));
      return { mes, receitas: Math.max(0, projReceita), despesas: Math.max(0, projDespesa) };
    });

    // Health score (0-100)
    let healthScore = 50;
    if (efficiency > 20) healthScore += 15;
    else if (efficiency > 0) healthScore += 5;
    else healthScore -= 15;
    if (runway > 6) healthScore += 15;
    else if (runway > 3) healthScore += 5;
    else healthScore -= 10;
    if (expenseGrowth < 0) healthScore += 10;
    else if (expenseGrowth < 10) healthScore += 0;
    else healthScore -= 10;
    if (revenueGrowth > 0) healthScore += 10;
    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      burnRate, avgReceita, runway, expenseGrowth, revenueGrowth,
      efficiency, categoryBreakdown, predicted, monthly, healthScore,
      totalReceitas, totalDespesas, saldo,
    };
  }, [movimentos]);

  const healthColor = analytics.healthScore >= 70 ? "text-success" : analytics.healthScore >= 40 ? "text-warning" : "text-destructive";
  const healthBg = analytics.healthScore >= 70 ? "bg-success/10" : analytics.healthScore >= 40 ? "bg-warning/10" : "bg-destructive/10";
  const healthLabel = analytics.healthScore >= 70 ? "Saudável" : analytics.healthScore >= 40 ? "Atenção" : "Crítico";
  const HealthIcon = analytics.healthScore >= 70 ? CheckCircle : AlertTriangle;

  return (
    <div className="space-y-6">
      {/* Health Score + KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`glass-card rounded-xl p-4 ${healthBg}`}>
          <div className="flex items-center gap-2 mb-2">
            <HealthIcon className={`w-5 h-5 ${healthColor}`} />
            <span className="text-[10px] font-medium text-muted-foreground">Saúde Financeira</span>
          </div>
          <p className={`text-2xl font-bold font-display ${healthColor}`}>{analytics.healthScore}/100</p>
          <p className={`text-xs font-medium ${healthColor}`}>{healthLabel}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-[10px] font-medium text-muted-foreground">Burn Rate Mensal</span>
          </div>
          <p className="text-lg font-bold font-display text-foreground">{fmt(analytics.burnRate)}</p>
          <p className="text-[10px] text-muted-foreground">Média de gastos/mês</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-info" />
            <span className="text-[10px] font-medium text-muted-foreground">Runway</span>
          </div>
          <p className="text-lg font-bold font-display text-foreground">
            {analytics.runway === Infinity ? "∞" : `${analytics.runway.toFixed(1)} meses`}
          </p>
          <p className="text-[10px] text-muted-foreground">Saldo / burn rate</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-medium text-muted-foreground">Eficiência</span>
          </div>
          <p className={`text-lg font-bold font-display ${analytics.efficiency >= 0 ? "text-success" : "text-destructive"}`}>
            {analytics.efficiency.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">(Receitas - Despesas) / Receitas</p>
        </motion.div>
      </div>

      {/* Growth indicators */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            {analytics.revenueGrowth >= 0
              ? <TrendingUp className="w-4 h-4 text-success" />
              : <TrendingDown className="w-4 h-4 text-destructive" />}
            <span className="text-xs font-medium text-foreground">Tendência Receitas</span>
          </div>
          <p className={`text-lg font-bold font-display ${analytics.revenueGrowth >= 0 ? "text-success" : "text-destructive"}`}>
            {analytics.revenueGrowth >= 0 ? "+" : ""}{analytics.revenueGrowth.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Últimos 3 meses vs anteriores</p>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            {analytics.expenseGrowth <= 0
              ? <TrendingDown className="w-4 h-4 text-success" />
              : <TrendingUp className="w-4 h-4 text-destructive" />}
            <span className="text-xs font-medium text-foreground">Tendência Despesas</span>
          </div>
          <p className={`text-lg font-bold font-display ${analytics.expenseGrowth <= 0 ? "text-success" : "text-destructive"}`}>
            {analytics.expenseGrowth >= 0 ? "+" : ""}{analytics.expenseGrowth.toFixed(1)}%
          </p>
          <p className="text-[10px] text-muted-foreground">Últimos 3 meses vs anteriores</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Despesas por Categoria</h3>
          {analytics.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={analytics.categoryBreakdown}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartStyle} formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">Sem dados</div>
          )}
        </div>

        {/* Predictive chart */}
        <div className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1 font-display">Projeção — Próximos 3 Meses</h3>
          <p className="text-[10px] text-muted-foreground mb-4">Baseado na tendência dos últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.predicted}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={fmtCompact} />
              <Tooltip contentStyle={chartStyle} formatter={(v: number) => fmt(v)} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Receitas (proj.)" />
              <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Despesas (proj.)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
