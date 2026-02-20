import { motion } from "framer-motion";
import {
  Users,
  ClipboardList,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import AppLayout from "@/components/AppLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const demandaData = [
  { mes: "Set", total: 42 },
  { mes: "Out", total: 58 },
  { mes: "Nov", total: 35 },
  { mes: "Dez", total: 67 },
  { mes: "Jan", total: 73 },
  { mes: "Fev", total: 51 },
];

const statusData = [
  { name: "Concluídas", value: 124, color: "hsl(142, 70%, 40%)" },
  { name: "Em andamento", value: 45, color: "hsl(205, 70%, 45%)" },
  { name: "Pendentes", value: 18, color: "hsl(38, 92%, 50%)" },
  { name: "Atrasadas", value: 7, color: "hsl(0, 72%, 51%)" },
];

const recentDemandas = [
  { id: 1, titulo: "Pavimentação Rua das Flores - Zona Norte", status: "andamento", prioridade: "alta", responsavel: "João Silva", data: "19/02/2026" },
  { id: 2, titulo: "Reunião com Sec. de Saúde sobre UBS", status: "pendente", prioridade: "urgente", responsavel: "Maria Santos", data: "18/02/2026" },
  { id: 3, titulo: "Ofício para SEDUC - Reforma Escola", status: "concluida", prioridade: "media", responsavel: "Carlos Lima", data: "17/02/2026" },
  { id: 4, titulo: "Articulação Emenda Parlamentar - Segurança", status: "andamento", prioridade: "alta", responsavel: "Ana Costa", data: "16/02/2026" },
  { id: 5, titulo: "Visita Comunidade Ribeirinha", status: "pendente", prioridade: "media", responsavel: "Pedro Souza", data: "15/02/2026" },
];

const proximosEventos = [
  { id: 1, titulo: "Sessão Plenária - Projeto de Lei 234/2026", data: "21/02", hora: "09:00", tipo: "plenario" },
  { id: 2, titulo: "Reunião Comissão de Segurança Pública", data: "21/02", hora: "14:00", tipo: "comissao" },
  { id: 3, titulo: "Audiência Pública - Mobilidade Inclusiva", data: "22/02", hora: "10:00", tipo: "audiencia" },
  { id: 4, titulo: "Visita Institucional - Batalhão PM", data: "23/02", hora: "08:30", tipo: "visita" },
];

const statusStyles: Record<string, string> = {
  concluida: "bg-success/10 text-success",
  andamento: "bg-info/10 text-info",
  pendente: "bg-warning/10 text-warning",
  atrasada: "bg-destructive/10 text-destructive",
};

const prioridadeStyles: Record<string, string> = {
  urgente: "bg-destructive/10 text-destructive",
  alta: "bg-warning/10 text-warning",
  media: "bg-info/10 text-info",
  baixa: "bg-muted text-muted-foreground",
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do gabinete — 20 de Fevereiro, 2026</p>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pessoas Cadastradas"
            value={1247}
            subtitle="32 novos esta semana"
            icon={<Users className="w-5 h-5 text-primary" />}
            trend={{ value: 12, positive: true }}
          />
          <StatCard
            title="Demandas Ativas"
            value={63}
            subtitle="18 pendentes de resposta"
            icon={<ClipboardList className="w-5 h-5 text-secondary" />}
            trend={{ value: 8, positive: true }}
          />
          <StatCard
            title="Eventos do Mês"
            value={14}
            subtitle="3 esta semana"
            icon={<Calendar className="w-5 h-5 text-accent" />}
          />
          <StatCard
            title="Taxa de Resolução"
            value="87%"
            subtitle="124 de 142 resolvidas"
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            trend={{ value: 5, positive: true }}
          />
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Demandas por Mês</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={demandaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Status das Demandas</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tables Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Demandas */}
          <div className="lg:col-span-2 glass-card rounded-xl">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-sm font-semibold text-foreground font-display">Demandas Recentes</h3>
              <button className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-border">
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Demanda</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Prioridade</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Responsável</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDemandas.map((d) => (
                    <tr key={d.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-5 font-medium text-foreground max-w-[250px] truncate">{d.titulo}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${statusStyles[d.status]}`}>
                          {d.status === "concluida" ? "Concluída" : d.status === "andamento" ? "Em andamento" : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${prioridadeStyles[d.prioridade]}`}>
                          {d.prioridade}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-muted-foreground">{d.responsavel}</td>
                      <td className="py-3 px-5 text-muted-foreground">{d.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Events */}
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground font-display">Próximos Eventos</h3>
            </div>
            <div className="space-y-3">
              {proximosEventos.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="text-center shrink-0">
                    <p className="text-lg font-bold font-display text-primary leading-none">{ev.data.split("/")[0]}</p>
                    <p className="text-[10px] text-muted-foreground">/{ev.data.split("/")[1]}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug truncate">{ev.titulo}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {ev.hora}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: ClipboardList, label: "Nova Demanda", color: "bg-primary/10 text-primary" },
            { icon: Users, label: "Cadastrar Pessoa", color: "bg-secondary/10 text-secondary" },
            { icon: Calendar, label: "Agendar Evento", color: "bg-accent/10 text-accent-foreground" },
            { icon: AlertTriangle, label: "Demandas Urgentes", color: "bg-destructive/10 text-destructive" },
          ].map((action) => (
            <button
              key={action.label}
              className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow"
            >
              <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-foreground">{action.label}</span>
            </button>
          ))}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};

export default Dashboard;
