import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  MessageSquare,
  Calendar,
  MapPin,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import AppLayout from "@/components/AppLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

interface CoordProgress {
  slug: string;
  nome: string;
  total: number;
  done: number;
  pending: number;
  percent: number;
}

interface TarefaRow {
  id: string;
  titulo: string;
  status: boolean;
  responsavel: string | null;
  canal: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  created_at: string;
  secao_id: string;
}

interface SecaoRow {
  id: string;
  coordenacao_id: string;
  titulo: string;
}

interface CoordRow {
  id: string;
  slug: string;
  nome: string;
}

interface DemandaStats {
  pendente: number;
  andamento: number;
  concluida: number;
  atrasada: number;
  total: number;
}

interface ProximoEvento {
  id: string;
  titulo: string;
  data: string;
  hora: string;
  local: string;
  tipo: string;
}

const tipoColors: Record<string, string> = {
  "Plenário": "bg-primary/10 text-primary",
  "Comissão": "bg-secondary/10 text-secondary",
  "Audiência": "bg-info/10 text-info",
  "Visita": "bg-success/10 text-success",
  "Interno": "bg-muted text-muted-foreground",
  "Cultural": "bg-warning/10 text-warning",
};

// ======= DADOS FICTÍCIOS PARA DEMONSTRAÇÃO =======
const MOCK_COORD_PROGRESS: CoordProgress[] = [
  { slug: "legislativa", nome: "Coord. Legislativa", total: 28, done: 22, pending: 6, percent: 79 },
  { slug: "comunicacao", nome: "Coord. Comunicação", total: 35, done: 31, pending: 4, percent: 89 },
  { slug: "articulacao", nome: "Coord. Articulação Política", total: 18, done: 12, pending: 6, percent: 67 },
  { slug: "projetos", nome: "Coord. Projetos Sociais", total: 22, done: 19, pending: 3, percent: 86 },
  { slug: "gabinete", nome: "Coord. Gabinete", total: 40, done: 35, pending: 5, percent: 88 },
  { slug: "eventos", nome: "Coord. Eventos", total: 15, done: 10, pending: 5, percent: 67 },
];

const MOCK_DEMANDA_STATS: DemandaStats = {
  total: 127,
  pendente: 18,
  andamento: 34,
  concluida: 68,
  atrasada: 7,
};

const MOCK_EVENTOS: ProximoEvento[] = [
  { id: "e1", titulo: "Sessão Plenária — Votação PL 2341", data: "2026-03-09", hora: "09:00", local: "Plenário Principal", tipo: "Plenário" },
  { id: "e2", titulo: "Reunião Comissão de Educação", data: "2026-03-10", hora: "14:00", local: "Sala 204 — Anexo II", tipo: "Comissão" },
  { id: "e3", titulo: "Audiência Pública — Saúde Mental", data: "2026-03-12", hora: "10:00", local: "Auditório Nereu Ramos", tipo: "Audiência" },
  { id: "e4", titulo: "Visita Técnica — Hospital Regional", data: "2026-03-14", hora: "08:30", local: "Hospital Regional de Manaus", tipo: "Visita" },
];

const MOCK_BAR_DATA = [
  { nome: "Legislativa", concluidas: 22, pendentes: 6 },
  { nome: "Comunicação", concluidas: 31, pendentes: 4 },
  { nome: "Articulação", concluidas: 12, pendentes: 6 },
  { nome: "Projetos", concluidas: 19, pendentes: 3 },
  { nome: "Gabinete", concluidas: 35, pendentes: 5 },
  { nome: "Eventos", concluidas: 10, pendentes: 5 },
];

const MOCK_RECENT_TAREFAS = [
  { id: "t1", titulo: "Elaborar parecer PL 2341/2026 — Reforma Tributária", status: true, coordenacao: "Coord. Legislativa", responsavel: "Dr. Marcos Silva", data_fim: "2026-03-05", isOverdue: false },
  { id: "t2", titulo: "Preparar clipping semanal para redes sociais", status: false, coordenacao: "Coord. Comunicação", responsavel: "Ana Beatriz", data_fim: "2026-03-08", isOverdue: false },
  { id: "t3", titulo: "Agendar reunião com bancada evangélica", status: false, coordenacao: "Coord. Articulação Política", responsavel: "Carlos Mendes", data_fim: "2026-03-07", isOverdue: false },
  { id: "t4", titulo: "Finalizar relatório projeto 'Escola Viva'", status: true, coordenacao: "Coord. Projetos Sociais", responsavel: "Juliana Costa", data_fim: "2026-03-04", isOverdue: false },
  { id: "t5", titulo: "Revisar discurso para sessão solene", status: false, coordenacao: "Coord. Gabinete", responsavel: "Pedro Almeida", data_fim: "2026-03-06", isOverdue: true },
];

const MOCK_UPCOMING = [
  { id: "u1", titulo: "Entrega do relatório Comissão de Educação", data_fim: "2026-03-09", responsavel: "Marcos Silva" },
  { id: "u2", titulo: "Enviar convites audiência pública", data_fim: "2026-03-10", responsavel: "Ana Beatriz" },
  { id: "u3", titulo: "Reunião de alinhamento com lideranças", data_fim: "2026-03-11", responsavel: "Carlos Mendes" },
  { id: "u4", titulo: "Preparar material visita técnica", data_fim: "2026-03-13", responsavel: "Juliana Costa" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const today = new Date();
  const todayFormatted = formatDate(today);
  const [loading, setLoading] = useState(true);
  const [coordProgress, setCoordProgress] = useState<CoordProgress[]>([]);
  const [tarefas, setTarefas] = useState<TarefaRow[]>([]);
  const [secoes, setSecoes] = useState<SecaoRow[]>([]);
  const [coords, setCoords] = useState<CoordRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalPessoas, setTotalPessoas] = useState(0);
  const [demandaStats, setDemandaStats] = useState<DemandaStats>({ pendente: 0, andamento: 0, concluida: 0, atrasada: 0, total: 0 });
  const [proximosEventos, setProximosEventos] = useState<ProximoEvento[]>([]);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const todayStr = new Date().toISOString().split("T")[0];

        const [coordsRes, secoesRes, tarefasRes, profilesRes, pessoasRes, demandasRes, eventosRes] = await Promise.all([
          supabase.from("coordenacoes").select("id, slug, nome"),
          supabase.from("secoes").select("id, coordenacao_id, titulo"),
          supabase.from("tarefas").select("id, titulo, status, responsavel, canal, data_inicio, data_fim, created_at, secao_id"),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("pessoas").select("id", { count: "exact", head: true }),
          supabase.from("demandas").select("status"),
          supabase.from("eventos").select("id, titulo, data, hora, local, tipo").gte("data", todayStr).order("data").order("hora").limit(4),
        ]);

        const coordsData = coordsRes.data || [];
        const secoesData = secoesRes.data || [];
        const tarefasData = tarefasRes.data || [];

        // Check if there's enough real data — if not, use mock
        const hasRealData = tarefasData.length > 3 || (demandasRes.data || []).length > 3;

        if (!hasRealData) {
          setUseMock(true);
          setCoordProgress(MOCK_COORD_PROGRESS);
          setTotalUsers(12);
          setTotalPessoas(847);
          setDemandaStats(MOCK_DEMANDA_STATS);
          setProximosEventos(MOCK_EVENTOS);
          setLoading(false);
          return;
        }

        setCoords(coordsData);
        setSecoes(secoesData);
        setTarefas(tarefasData);
        setTotalUsers(profilesRes.count || 0);
        setTotalPessoas(pessoasRes.count || 0);

        // Demandas stats
        const demandas = demandasRes.data || [];
        setDemandaStats({
          total: demandas.length,
          pendente: demandas.filter((d) => d.status === "pendente").length,
          andamento: demandas.filter((d) => d.status === "andamento").length,
          concluida: demandas.filter((d) => d.status === "concluida").length,
          atrasada: demandas.filter((d) => d.status === "atrasada").length,
        });

        // Próximos eventos
        setProximosEventos((eventosRes.data as ProximoEvento[]) || []);

        // Coord progress
        const secaoToCoord: Record<string, string> = {};
        secoesData.forEach((s) => { secaoToCoord[s.id] = s.coordenacao_id; });

        const progress = coordsData.map((c) => {
          const coordTarefas = tarefasData.filter((t) => secaoToCoord[t.secao_id] === c.id);
          const total = coordTarefas.length;
          const done = coordTarefas.filter((t) => t.status).length;
          return {
            slug: c.slug, nome: c.nome, total, done,
            pending: total - done,
            percent: total > 0 ? Math.round((done / total) * 100) : 0,
          };
        });

        setCoordProgress(progress);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard fetch error:", err);
        // On error, fallback to mock
        setUseMock(true);
        setCoordProgress(MOCK_COORD_PROGRESS);
        setTotalUsers(12);
        setTotalPessoas(847);
        setDemandaStats(MOCK_DEMANDA_STATS);
        setProximosEventos(MOCK_EVENTOS);
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // Derived stats (use mock when needed)
  const totalTarefas = useMock ? 158 : tarefas.length;
  const totalDone = useMock ? 129 : tarefas.filter((t) => t.status).length;
  const totalPending = totalTarefas - totalDone;
  const totalPercent = totalTarefas > 0 ? Math.round((totalDone / totalTarefas) * 100) : 0;

  const todayStr = today.toISOString().split("T")[0];
  const overdue = useMock ? Array(8).fill(null) : tarefas.filter((t) => !t.status && t.data_fim && t.data_fim < todayStr);
  const upcoming = useMock ? Array(6).fill(null) : tarefas.filter((t) => !t.status && t.data_fim && t.data_fim >= todayStr && t.data_fim <= new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0]);

  // Status pie data
  const statusData = useMemo(() => [
    { name: "Concluídas", value: totalDone, color: "hsl(142, 70%, 40%)" },
    { name: "Pendentes", value: Math.max(0, totalPending - overdue.length), color: "hsl(205, 70%, 45%)" },
    { name: "Atrasadas", value: overdue.length, color: "hsl(0, 72%, 51%)" },
  ], [totalDone, totalPending, overdue.length]);

  // Tasks per coordination for bar chart
  const coordBarData = useMemo(() => {
    if (useMock) return MOCK_BAR_DATA;
    const secaoToCoord: Record<string, string> = {};
    secoes.forEach((s) => { secaoToCoord[s.id] = s.coordenacao_id; });

    return coords.map((c) => {
      const ct = tarefas.filter((t) => secaoToCoord[t.secao_id] === c.id);
      const concluidas = ct.filter((t) => t.status).length;
      return {
        nome: c.nome.replace("Coordenação ", "").substring(0, 15),
        concluidas,
        pendentes: ct.length - concluidas,
      };
    }).filter((d) => d.concluidas + d.pendentes > 0);
  }, [coords, secoes, tarefas, useMock]);

  // Recent tasks
  const recentTarefas = useMemo(() => {
    if (useMock) return MOCK_RECENT_TAREFAS;
    const secaoMap: Record<string, string> = {};
    secoes.forEach((s) => { secaoMap[s.id] = s.coordenacao_id; });
    const coordMap: Record<string, string> = {};
    coords.forEach((c) => { coordMap[c.id] = c.nome; });
    return [...tarefas]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map((t) => ({
        ...t,
        coordenacao: coordMap[secaoMap[t.secao_id]] || "—",
        isOverdue: !t.status && !!t.data_fim && t.data_fim < todayStr,
      }));
  }, [tarefas, secoes, coords, todayStr, useMock]);

  // Upcoming deadlines
  const upcomingTarefas = useMemo(() => {
    if (useMock) return MOCK_UPCOMING;
    return [...tarefas]
      .filter((t) => !t.status && t.data_fim && t.data_fim >= todayStr)
      .sort((a, b) => (a.data_fim || "").localeCompare(b.data_fim || ""))
      .slice(0, 4);
  }, [tarefas, todayStr, useMock]);

  const coordColors = [
    "hsl(var(--primary))",
    "hsl(var(--secondary))",
    "hsl(142, 70%, 40%)",
    "hsl(38, 92%, 50%)",
    "hsl(205, 70%, 45%)",
    "hsl(280, 60%, 50%)",
  ];

  if (loading) {
    return (
      <AppLayout>
        <DashboardSkeleton />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Visão geral do gabinete — <span className="font-medium">{todayFormatted}</span></p>
          </div>
        </motion.div>

        {/* Stats Row 1 — Tarefas + Usuários + Pessoas */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total de Tarefas" value={totalTarefas} subtitle={`${coordProgress.length} coordenações`} icon={<ClipboardList className="w-5 h-5" style={{ color: "hsl(213,94%,52%)" }} />} href="/relatorio-coordenacao" accentColor="hsl(213,94%,52%)" />
          <StatCard title="Concluídas" value={totalDone} subtitle={`${totalPercent}% do total`} icon={<CheckCircle2 className="w-5 h-5" style={{ color: "hsl(142,70%,40%)" }} />} href="/relatorio-coordenacao" accentColor="hsl(142,70%,40%)" />
          <StatCard title="Atrasadas" value={overdue.length} subtitle={`${upcoming.length} vencem esta semana`} icon={<AlertTriangle className="w-5 h-5" style={{ color: "hsl(0,72%,51%)" }} />} href="/relatorio-coordenacao" accentColor="hsl(0,72%,51%)" />
          <StatCard title="Usuários" value={totalUsers} subtitle="Cadastrados no sistema" icon={<Users className="w-5 h-5" style={{ color: "hsl(239,84%,67%)" }} />} href="/usuarios" accentColor="hsl(239,84%,67%)" />
        </motion.div>

        {/* Stats Row 2 — Pessoas + Demandas */}
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Pessoas" value={totalPessoas} subtitle="Contatos cadastrados" icon={<Users className="w-5 h-5" style={{ color: "hsl(199,89%,48%)" }} />} href="/pessoas" accentColor="hsl(199,89%,48%)" />
          <StatCard title="Demandas" value={demandaStats.total} subtitle={`${demandaStats.pendente} pendentes`} icon={<MessageSquare className="w-5 h-5" style={{ color: "hsl(38,92%,50%)" }} />} href="/demandas" accentColor="hsl(38,92%,50%)" />
          <StatCard title="Em Andamento" value={demandaStats.andamento} subtitle={`${demandaStats.concluida} concluídas`} icon={<Clock className="w-5 h-5" style={{ color: "hsl(199,89%,48%)" }} />} href="/demandas" accentColor="hsl(199,89%,48%)" />
          <StatCard title="Próximos Eventos" value={proximosEventos.length} subtitle="Agendados a partir de hoje" icon={<Calendar className="w-5 h-5" style={{ color: "hsl(239,84%,67%)" }} />} href="/eventos" accentColor="hsl(239,84%,67%)" />
        </motion.div>

        {/* Charts Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => navigate("/relatorio-coordenacao")}>
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Tarefas por Coordenação</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={coordBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="concluidas" stackId="stack" fill="hsl(142, 70%, 40%)" name="Concluídas" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pendentes" stackId="stack" fill="hsl(var(--primary))" name="Pendentes" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="glass-card rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => navigate("/relatorio-coordenacao")}>
            <h3 className="text-sm font-semibold text-foreground mb-4 font-display">Status das Tarefas</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {statusData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
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

        {/* Demandas + Eventos Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Demandas por Status */}
          <div className="glass-card rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => navigate("/demandas")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground font-display">Demandas por Status</h3>
              <span className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">Ver todas <ArrowRight className="w-3 h-3" /></span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Pendentes", value: demandaStats.pendente, color: "hsl(38, 92%, 50%)", bg: "bg-warning/10" },
                { label: "Em Andamento", value: demandaStats.andamento, color: "hsl(205, 70%, 45%)", bg: "bg-info/10" },
                { label: "Concluídas", value: demandaStats.concluida, color: "hsl(142, 70%, 40%)", bg: "bg-success/10" },
                { label: "Atrasadas", value: demandaStats.atrasada, color: "hsl(0, 72%, 51%)", bg: "bg-destructive/10" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                  </div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: demandaStats.total > 0 ? `${Math.round((s.value / demandaStats.total) * 100)}%` : "0%",
                        backgroundColor: s.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-6 text-right">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos Eventos */}
          <div className="glass-card rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-200" onClick={() => navigate("/eventos")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground font-display">Próximos Eventos</h3>
              <span className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">Ver agenda <ArrowRight className="w-3 h-3" /></span>
            </div>
            <div className="space-y-3">
              {proximosEventos.map((evento) => {
                const date = new Date(evento.data + "T00:00:00");
                return (
                  <div key={evento.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="text-center shrink-0 px-2 py-1.5 rounded-md bg-primary/10">
                      <p className="text-lg font-bold font-display text-primary leading-none">{String(date.getDate()).padStart(2, "0")}</p>
                      <p className="text-[10px] text-muted-foreground">/{String(date.getMonth() + 1).padStart(2, "0")}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground leading-snug truncate">{evento.titulo}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{evento.hora}</span>
                        {evento.local && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 shrink-0" /> {evento.local}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tipoColors[evento.tipo] || "bg-muted text-muted-foreground"}`}>
                      {evento.tipo}
                    </span>
                  </div>
                );
              })}
              {proximosEventos.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento próximo agendado</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tables Row */}
        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card rounded-xl">
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-sm font-semibold text-foreground font-display">Tarefas Recentes</h3>
              <span className="text-xs text-primary font-medium flex items-center gap-1 cursor-pointer hover:underline" onClick={() => navigate("/relatorio-coordenacao")}>Ver todas <ArrowRight className="w-3 h-3" /></span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-border">
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Tarefa</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Coordenação</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Responsável</th>
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTarefas.map((t: any) => (
                    <tr key={t.id} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-5 font-medium text-foreground max-w-[250px] truncate">{t.titulo}</td>
                      <td className="py-3 px-5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          t.status ? "bg-success/10 text-success" : t.isOverdue ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
                        }`}>
                          {t.status ? "Concluída" : t.isOverdue ? "Atrasada" : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-muted-foreground max-w-[150px] truncate">{t.coordenacao}</td>
                      <td className="py-3 px-5 text-muted-foreground">{t.responsavel || "—"}</td>
                      <td className="py-3 px-5 text-muted-foreground">{t.data_fim || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground font-display">Próximos Prazos</h3>
            </div>
            <div className="space-y-3">
              {upcomingTarefas.map((t: any) => {
                const date = t.data_fim ? new Date(t.data_fim + "T00:00:00") : null;
                return (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="text-center shrink-0">
                      {date && (
                        <>
                          <p className="text-lg font-bold font-display text-primary leading-none">{String(date.getDate()).padStart(2, "0")}</p>
                          <p className="text-[10px] text-muted-foreground">/{String(date.getMonth() + 1).padStart(2, "0")}</p>
                        </>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground leading-snug truncate">{t.titulo}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.responsavel || "Sem responsável"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Resumo Executivo das Coordenações */}
        <motion.div variants={item} className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground font-display">Resumo Executivo — Coordenações</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-display text-foreground">{totalPercent}%</p>
              <p className="text-[10px] text-muted-foreground">{totalDone}/{totalTarefas} tarefas concluídas</p>
            </div>
          </div>
          <div className="mb-5">
            <Progress value={totalPercent} className="h-2.5" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coordProgress.map((coord, i) => (
              <button key={coord.slug} onClick={() => navigate(`/coordenacao/${coord.slug}`)} className="text-left p-4 rounded-lg bg-muted/30 hover:bg-muted/60 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-border/30 cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground truncate pr-2">{coord.nome.replace("Coordenação ", "")}</span>
                  <span className="text-xs font-bold font-display" style={{ color: coordColors[i % coordColors.length] }}>{coord.percent}%</span>
                </div>
                <Progress value={coord.percent} className="h-1.5 mb-2" />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-success" /> {coord.done} concluídas</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-warning" /> {coord.pending} pendentes</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: BarChart3, label: "Rel. Coordenação", color: "bg-primary/10 text-primary", path: "/relatorio-coordenacao" },
            { icon: MessageSquare, label: "Demandas", color: "bg-warning/10 text-warning", path: "/demandas" },
            { icon: Calendar, label: "Eventos", color: "bg-secondary/10 text-secondary", path: "/eventos" },
            { icon: Users, label: "Pessoas", color: "bg-success/10 text-success", path: "/pessoas" },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.path)} className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer">
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
