import { motion } from "framer-motion";
import { BarChart3, Download, Calendar } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

const demandaPorCategoria = [
  { categoria: "Infraestrutura", total: 34 },
  { categoria: "Saúde", total: 28 },
  { categoria: "Segurança", total: 22 },
  { categoria: "Educação", total: 19 },
  { categoria: "Social", total: 15 },
  { categoria: "Legislativo", total: 12 },
];

const evolucaoMensal = [
  { mes: "Jul", demandas: 30, resolvidas: 25 },
  { mes: "Ago", demandas: 38, resolvidas: 32 },
  { mes: "Set", demandas: 42, resolvidas: 36 },
  { mes: "Out", demandas: 58, resolvidas: 49 },
  { mes: "Nov", demandas: 35, resolvidas: 30 },
  { mes: "Dez", demandas: 67, resolvidas: 58 },
  { mes: "Jan", demandas: 73, resolvidas: 64 },
  { mes: "Fev", demandas: 51, resolvidas: 42 },
];

const pessoasPorRegiao = [
  { regiao: "Zona Norte", total: 340 },
  { regiao: "Zona Sul", total: 280 },
  { regiao: "Zona Leste", total: 220 },
  { regiao: "Zona Oeste", total: 190 },
  { regiao: "Centro", total: 120 },
  { regiao: "Interior", total: 97 },
];

const chartStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

const Relatorios = () => {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Análises e métricas do gabinete</p>
          </div>
          <button className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted flex items-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Evolução Mensal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="demandas" stroke="hsl(var(--secondary))" fill="hsl(var(--secondary) / 0.15)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolvidas" stroke="hsl(var(--success))" fill="hsl(var(--success) / 0.15)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Demandas por Categoria</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={demandaPorCategoria} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="categoria" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={90} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-xl p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Pessoas por Região</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={pessoasPorRegiao}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="regiao" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={chartStyle} />
                <Bar dataKey="total" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Relatorios;
