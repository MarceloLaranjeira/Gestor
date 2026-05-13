import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Users, ClipboardList, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, BarChart3, MessageSquare, Calendar, MapPin,
  Bell, Handshake, Wallet, BookOpen, Scale,
  PlusCircle,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import StatCard from "@/components/StatCard";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import AppLayout from "@/components/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SAC_SETORES } from "@/data/sacSetores";
import { COORDENADORIA_DEMANDAS } from "@/data/coordenadoriaDemandas";

/* ── helpers ─────────────────────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDate = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
const greet = (h: number) => h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

/* ── animation ───────────────────────────────────────────────────── */
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp  = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

/* ── types ───────────────────────────────────────────────────────── */
interface CoordProgress { slug: string; nome: string; total: number; done: number; pending: number; percent: number; }
interface TarefaRow     { id: string; titulo: string; status: boolean; responsavel: string|null; data_fim: string|null; created_at: string; secao_id: string; }
interface SecaoRow      { id: string; coordenacao_id: string; }
interface CoordRow      { id: string; slug: string; nome: string; }
interface ProximoEvento { id: string; titulo: string; data: string; hora: string; local: string; tipo: string; }

/* ── mock fallback ───────────────────────────────────────────────── */
const MOCK_COORD: CoordProgress[] = [
  { slug: "legislativa",  nome: "Legislativa",          total: 28, done: 22, pending: 6,  percent: 79 },
  { slug: "comunicacao",  nome: "Comunicação",          total: 35, done: 31, pending: 4,  percent: 89 },
  { slug: "articulacao",  nome: "Articulação Política", total: 18, done: 12, pending: 6,  percent: 67 },
  { slug: "projetos",     nome: "Projetos Sociais",     total: 22, done: 19, pending: 3,  percent: 86 },
  { slug: "gabinete",     nome: "Gabinete",             total: 40, done: 35, pending: 5,  percent: 88 },
  { slug: "eventos",      nome: "Eventos",              total: 15, done: 10, pending: 5,  percent: 67 },
];
const MOCK_EVENTOS: ProximoEvento[] = [
  { id: "e1", titulo: "Sessão Plenária — PL 2341",    data: "2026-04-22", hora: "09:00", local: "Plenário Principal",  tipo: "Plenário"  },
  { id: "e2", titulo: "Reunião Comissão de Educação", data: "2026-04-23", hora: "14:00", local: "Sala 204",            tipo: "Comissão"  },
  { id: "e3", titulo: "Audiência Pública — Saúde",    data: "2026-04-24", hora: "10:00", local: "Auditório",          tipo: "Audiência" },
  { id: "e4", titulo: "Visita Técnica — Hospital",    data: "2026-04-25", hora: "08:30", local: "Hospital Regional",  tipo: "Visita"    },
];
const MOCK_RECENT: any[] = [
  { id: "t1", titulo: "Elaborar parecer PL 2341",          status: true,  coordenacao: "Legislativa",         responsavel: "Dr. Marcos Silva", data_fim: "2026-04-20", isOverdue: false },
  { id: "t2", titulo: "Preparar clipping para redes",      status: false, coordenacao: "Comunicação",         responsavel: "Ana Beatriz",      data_fim: "2026-04-22", isOverdue: false },
  { id: "t3", titulo: "Agendar reunião bancada evangélica",status: false, coordenacao: "Articulação Política",responsavel: "Carlos Mendes",    data_fim: "2026-04-21", isOverdue: true  },
  { id: "t4", titulo: "Relatório projeto 'Escola Viva'",   status: true,  coordenacao: "Projetos Sociais",    responsavel: "Juliana Costa",    data_fim: "2026-04-19", isOverdue: false },
  { id: "t5", titulo: "Revisar discurso sessão solene",    status: false, coordenacao: "Gabinete",            responsavel: "Pedro Almeida",    data_fim: "2026-04-21", isOverdue: true  },
];
const MOCK_UPCOMING: any[] = [
  { id: "u1", titulo: "Entrega relatório Educação",  data_fim: "2026-04-22", responsavel: "Marcos Silva"  },
  { id: "u2", titulo: "Enviar convites audiência",   data_fim: "2026-04-23", responsavel: "Ana Beatriz"   },
  { id: "u3", titulo: "Reunião de alinhamento",      data_fim: "2026-04-24", responsavel: "Carlos Mendes" },
  { id: "u4", titulo: "Material visita técnica",     data_fim: "2026-04-25", responsavel: "Juliana Costa" },
];

/* ── colors ──────────────────────────────────────────────────────── */
const TIPO_CLR: Record<string,string> = {
  "Plenário":  "bg-primary/10 text-primary",
  "Comissão":  "bg-purple-500/10 text-purple-600",
  "Audiência": "bg-blue-500/10 text-blue-600",
  "Visita":    "bg-emerald-500/10 text-emerald-600",
  "Interno":   "bg-muted text-muted-foreground",
};
const COORD_CLR = [
  "hsl(var(--primary))","hsl(205,70%,45%)","hsl(142,70%,40%)",
  "hsl(38,92%,50%)","hsl(280,60%,50%)","hsl(0,72%,51%)",
];

/* ── SectionLabel ────────────────────────────────────────────────── */
const SectionLabel = ({ label, icon: Icon }: { label: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-2 pt-2 pb-1">
    <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">{label}</p>
    <div className="flex-1 h-px bg-border/60" />
  </div>
);

/* ═══════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const now      = new Date();
  const todayStr = now.toISOString().split("T")[0];

  /* state */
  const [loading,         setLoading]         = useState(true);
  const [useMock,         setUseMock]         = useState(false);
  const [coordProgress,   setCoordProgress]   = useState<CoordProgress[]>([]);
  const [tarefas,         setTarefas]         = useState<TarefaRow[]>([]);
  const [secoes,          setSecoes]          = useState<SecaoRow[]>([]);
  const [coords,          setCoords]          = useState<CoordRow[]>([]);
  const [totalUsers,      setTotalUsers]      = useState(0);
  const [totalPessoas,    setTotalPessoas]    = useState(0);
  const [demandaPendente, setDemandaPendente] = useState(0);
  const [demandaAndamento,setDemandaAndamento]= useState(0);
  const [demandaConcluida,setDemandaConcluida]= useState(0);
  const [demandaAtrasada, setDemandaAtrasada] = useState(0);
  const [demandaTotal,    setDemandaTotal]    = useState(0);
  const [compromissosPending, setCompromissosPending] = useState(0);
  const [alertasCount,    setAlertasCount]    = useState(0);
  const [proximosEventos, setProximosEventos] = useState<ProximoEvento[]>([]);
  const [selEvento,       setSelEvento]       = useState<ProximoEvento|null>(null);
  const [selTarefa,       setSelTarefa]       = useState<any|null>(null);

  /* quick-insert dialogs */
  const [qDemanda,   setQDemanda]   = useState(false);
  const [qEvento,    setQEvento]    = useState(false);
  const [qComp,      setQComp]      = useState(false);
  const [qAlerta,    setQAlerta]    = useState(false);
  const [qPessoa,    setQPessoa]    = useState(false);
  const [saving,     setSaving]     = useState(false);

  /* quick-insert form fields */
  const [qDemandaForm, setQDemandaForm] = useState({ titulo: "", status: "pendente" });
  const [qEventoForm,  setQEventoForm]  = useState({ titulo: "", data: todayStr, hora: "09:00", local: "", tipo: "Interno" });
  const [qCompForm,    setQCompForm]    = useState({ titulo: "", data: todayStr, descricao: "" });
  const [qAlertaForm,  setQAlertaForm]  = useState({ titulo: "", mensagem: "", tipo: "info" });
  const [qPessoaForm,  setQPessoaForm]  = useState({ nome: "", tipo: "Cidadão", telefone: "" });

  useEffect(() => {
    (async () => {
      try {
        const [coordsR, secoesR, tarefasR, profilesR, pessoasR,
               demandasR, eventosR, compromissosR, alertasR] = await Promise.all([
          supabase.from("coordenacoes").select("id,slug,nome"),
          supabase.from("secoes").select("id,coordenacao_id"),
          supabase.from("tarefas").select("id,titulo,status,responsavel,data_fim,created_at,secao_id"),
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("pessoas").select("id",   { count: "exact", head: true }),
          supabase.from("demandas").select("status"),
          supabase.from("eventos").select("id,titulo,data,hora,local,tipo")
            .gte("data", todayStr).order("data").order("hora").limit(4),
          supabase.from("compromissos").select("id", { count: "exact", head: true })
            .eq("status", "pendente"),
          supabase.from("alertas_sistema").select("id", { count: "exact", head: true })
            .eq("lido", false),
        ]);

        const cd = coordsR.data || [], sd = secoesR.data || [], td = tarefasR.data || [];
        const hasData = td.length > 3 || (demandasR.data || []).length > 3;

        if (!hasData) {
          setUseMock(true);
          setCoordProgress(MOCK_COORD);
          setTotalUsers(12); setTotalPessoas(847);
          setDemandaTotal(127); setDemandaPendente(18);
          setDemandaAndamento(34); setDemandaConcluida(68); setDemandaAtrasada(7);
          setProximosEventos(MOCK_EVENTOS);
          setCompromissosPending(5); setAlertasCount(3);
          setLoading(false); return;
        }

        setCoords(cd); setSecoes(sd); setTarefas(td);
        setTotalUsers(profilesR.count || 0);
        setTotalPessoas(pessoasR.count || 0);
        setCompromissosPending(compromissosR.count || 0);
        setAlertasCount(alertasR.count || 0);

        const dm = demandasR.data || [];
        setDemandaTotal(dm.length);
        setDemandaPendente(dm.filter(d => d.status === "pendente").length);
        setDemandaAndamento(dm.filter(d => d.status === "andamento").length);
        setDemandaConcluida(dm.filter(d => d.status === "concluida").length);
        setDemandaAtrasada(dm.filter(d => d.status === "atrasada").length);

        setProximosEventos((eventosR.data as ProximoEvento[]) || []);

        const s2c: Record<string,string> = {};
        sd.forEach(s => { s2c[s.id] = s.coordenacao_id; });
        setCoordProgress(cd.map(c => {
          const ct   = td.filter(t => s2c[t.secao_id] === c.id);
          const done = ct.filter(t => t.status).length;
          return {
            slug: c.slug,
            nome: c.nome.replace(/^Coord(enação|\.)\s*/i, ""),
            total: ct.length, done,
            pending: ct.length - done,
            percent: ct.length > 0 ? Math.round(done / ct.length * 100) : 0,
          };
        }));

        setLoading(false);
      } catch {
        setUseMock(true);
        setCoordProgress(MOCK_COORD);
        setTotalUsers(12); setTotalPessoas(847);
        setDemandaTotal(127); setDemandaPendente(18);
        setDemandaAndamento(34); setDemandaConcluida(68); setDemandaAtrasada(7);
        setProximosEventos(MOCK_EVENTOS);
        setCompromissosPending(5); setAlertasCount(3);
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* real-time subscriptions for key tables */
  useEffect(() => {
    const channels = [
      supabase.channel("rt-demandas").on("postgres_changes", { event: "*", schema: "public", table: "demandas" }, async () => {
        const { data } = await supabase.from("demandas").select("status");
        const dm = data || [];
        setDemandaTotal(dm.length);
        setDemandaPendente(dm.filter(d => d.status === "pendente").length);
        setDemandaAndamento(dm.filter(d => d.status === "andamento").length);
        setDemandaConcluida(dm.filter(d => d.status === "concluida").length);
        setDemandaAtrasada(dm.filter(d => d.status === "atrasada").length);
      }).subscribe(),
      supabase.channel("rt-eventos-db").on("postgres_changes", { event: "*", schema: "public", table: "eventos" }, async () => {
        const { data } = await supabase.from("eventos").select("id,titulo,data,hora,local,tipo").gte("data", todayStr).order("data").order("hora").limit(4);
        setProximosEventos((data as ProximoEvento[]) || []);
      }).subscribe(),
      supabase.channel("rt-compromissos-db").on("postgres_changes", { event: "*", schema: "public", table: "compromissos" }, async () => {
        const { count } = await supabase.from("compromissos").select("id", { count: "exact", head: true }).eq("status", "pendente");
        setCompromissosPending(count || 0);
      }).subscribe(),
      supabase.channel("rt-alertas-db").on("postgres_changes", { event: "*", schema: "public", table: "alertas_sistema" }, async () => {
        const { count } = await supabase.from("alertas_sistema").select("id", { count: "exact", head: true }).eq("lido", false);
        setAlertasCount(count || 0);
      }).subscribe(),
      supabase.channel("rt-pessoas-db").on("postgres_changes", { event: "*", schema: "public", table: "pessoas" }, async () => {
        const { count } = await supabase.from("pessoas").select("id", { count: "exact", head: true });
        setTotalPessoas(count || 0);
      }).subscribe(),
    ];
    return () => { channels.forEach(c => supabase.removeChannel(c)); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayStr]);

  /* quick-insert savers */
  const saveDemanda = async () => {
    if (!qDemandaForm.titulo.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("demandas").insert({ titulo: qDemandaForm.titulo, status: qDemandaForm.status });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar demanda"); return; }
    toast.success("Demanda criada!");
    setQDemanda(false);
    setQDemandaForm({ titulo: "", status: "pendente" });
  };

  const saveEvento = async () => {
    if (!qEventoForm.titulo.trim() || !qEventoForm.data) return;
    setSaving(true);
    const { error } = await supabase.from("eventos").insert(qEventoForm);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar evento"); return; }
    toast.success("Evento criado!");
    setQEvento(false);
    setQEventoForm({ titulo: "", data: todayStr, hora: "09:00", local: "", tipo: "Interno" });
  };

  const saveComp = async () => {
    if (!qCompForm.titulo.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("compromissos").insert({ titulo: qCompForm.titulo, data: qCompForm.data, descricao: qCompForm.descricao, status: "pendente" });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar compromisso"); return; }
    toast.success("Compromisso criado!");
    setQComp(false);
    setQCompForm({ titulo: "", data: todayStr, descricao: "" });
  };

  const saveAlerta = async () => {
    if (!qAlertaForm.titulo.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("alertas_sistema").insert({ titulo: qAlertaForm.titulo, mensagem: qAlertaForm.mensagem, tipo: qAlertaForm.tipo, lido: false });
    setSaving(false);
    if (error) { toast.error("Erro ao salvar alerta"); return; }
    toast.success("Alerta criado!");
    setQAlerta(false);
    setQAlertaForm({ titulo: "", mensagem: "", tipo: "info" });
  };

  const savePessoa = async () => {
    if (!qPessoaForm.nome.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("pessoas").insert(qPessoaForm);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar pessoa"); return; }
    toast.success("Pessoa cadastrada!");
    setQPessoa(false);
    setQPessoaForm({ nome: "", tipo: "Cidadão", telefone: "" });
  };

  /* derived */
  const totalTarefas = useMock ? 158 : tarefas.length;
  const totalDone    = useMock ? 129 : tarefas.filter(t => t.status).length;
  const totalPending = totalTarefas - totalDone;
  const totalPct     = totalTarefas > 0 ? Math.round(totalDone / totalTarefas * 100) : 0;
  const overdueList  = useMock
    ? MOCK_RECENT.filter(t => t.isOverdue)
    : tarefas.filter(t => !t.status && t.data_fim && t.data_fim < todayStr);

  const recentTarefas = useMemo(() => {
    if (useMock) return MOCK_RECENT;
    const s2c: Record<string,string> = {}, c2n: Record<string,string> = {};
    secoes.forEach(s => { s2c[s.id] = s.coordenacao_id; });
    coords.forEach(c  => { c2n[c.id] = c.nome; });
    return [...tarefas]
      .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      .map(t => ({ ...t, coordenacao: c2n[s2c[t.secao_id]] || "—", isOverdue: !t.status && !!t.data_fim && t.data_fim < todayStr }));
  }, [tarefas, secoes, coords, todayStr, useMock]);

  const upcomingTarefas = useMemo(() => {
    if (useMock) return MOCK_UPCOMING;
    return [...tarefas]
      .filter(t => !t.status && t.data_fim && t.data_fim >= todayStr)
      .sort((a,b) => (a.data_fim||"").localeCompare(b.data_fim||""))
      .slice(0, 4);
  }, [tarefas, todayStr, useMock]);

  const coordBarData = useMemo(() => coordProgress.map(c => ({
    nome: c.nome.substring(0, 12),
    concluidas: c.done,
    pendentes:  c.pending,
  })), [coordProgress]);

  const statusPie = [
    { name: "Concluídas", value: totalDone,                                    color: "hsl(142,70%,40%)" },
    { name: "Pendentes",  value: Math.max(0, totalPending - overdueList.length), color: "hsl(205,70%,45%)" },
    { name: "Atrasadas",  value: overdueList.length,                            color: "hsl(0,72%,51%)"   },
  ];

  if (loading) return <AppLayout><DashboardSkeleton /></AppLayout>;

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5">

        {/* Greeting */}
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              {greet(now.getHours())}, {user?.name?.split(" ")[0] || "Gestor"} 👋
            </h1>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{fmtDate(now)}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold font-mono text-foreground/80 tabular-nums">
              {pad(now.getHours())}:{pad(now.getMinutes())}
            </p>
          </div>
        </motion.div>

        {/* ══ ATIVIDADE ══════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}>
          <SectionLabel label="Atividade" icon={ClipboardList} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-3">
            <StatCard title="Demandas"     value={demandaTotal}         subtitle={`${demandaPendente} pendentes`}          icon={<MessageSquare className="w-5 h-5" style={{color:"hsl(38,92%,50%)"}}   />} href="/movimentos"   accentColor="hsl(38,92%,50%)"   onEdit={() => setQDemanda(true)}  />
            <StatCard title="Compromissos" value={compromissosPending}  subtitle="pendentes"                               icon={<Handshake      className="w-5 h-5" style={{color:"hsl(205,70%,45%)"}}  />} href="/compromissos" accentColor="hsl(205,70%,45%)"  onEdit={() => setQComp(true)}     />
            <StatCard title="Próx. Eventos" value={proximosEventos.length} subtitle="agendados a partir de hoje"           icon={<Calendar       className="w-5 h-5" style={{color:"hsl(239,84%,67%)"}}  />} href="/eventos"      accentColor="hsl(239,84%,67%)"  onEdit={() => setQEvento(true)}   />
            <StatCard title="Alertas"      value={alertasCount}         subtitle="não lidos"                               icon={<Bell           className="w-5 h-5" style={{color:"hsl(0,72%,51%)"}}    />} href="/alertas"      accentColor="hsl(0,72%,51%)"    onEdit={() => setQAlerta(true)}   />
          </div>
        </motion.div>

        {/* Atividade — conteúdo */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Demandas por status */}
          <div className="bg-card border border-border/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/movimentos")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Demandas por Status</h3>
              <span className="text-xs text-primary flex items-center gap-1 hover:underline">Ver todas <ArrowRight className="w-3 h-3" /></span>
            </div>
            <div className="space-y-3">
              {[
                { label: "Concluídas",   value: demandaConcluida, color: "hsl(142,70%,40%)" },
                { label: "Em andamento", value: demandaAndamento,  color: "hsl(205,70%,45%)" },
                { label: "Pendentes",    value: demandaPendente,   color: "hsl(38,92%,50%)"  },
                { label: "Atrasadas",    value: demandaAtrasada,   color: "hsl(0,72%,51%)"   },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 text-xs text-muted-foreground">{s.label}</div>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: demandaTotal > 0 ? `${Math.round(s.value/demandaTotal*100)}%` : "0%", backgroundColor: s.color }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-6 text-right">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Próximos Eventos */}
          <div className="bg-card border border-border/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/eventos")}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Próximos Eventos</h3>
              <span className="text-xs text-primary flex items-center gap-1 hover:underline">Ver agenda <ArrowRight className="w-3 h-3" /></span>
            </div>
            <div className="space-y-2.5">
              {proximosEventos.map(ev => {
                const d = new Date(ev.data + "T00:00:00");
                return (
                  <div key={ev.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    onClick={e => { e.stopPropagation(); setSelEvento(ev); }}>
                    <div className="shrink-0 w-10 text-center bg-primary/10 rounded-lg py-1.5">
                      <p className="text-base font-bold text-primary leading-none">{pad(d.getDate())}</p>
                      <p className="text-[9px] text-muted-foreground">/{pad(d.getMonth()+1)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{ev.titulo}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{ev.hora}</span>
                        {ev.local && <span className="flex items-center gap-0.5 truncate"><MapPin className="w-2.5 h-2.5 shrink-0" />{ev.local}</span>}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TIPO_CLR[ev.tipo]||"bg-muted text-muted-foreground"}`}>{ev.tipo}</span>
                  </div>
                );
              })}
              {proximosEventos.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento próximo</p>}
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Demandas SAC</h3>
            <button onClick={() => navigate("/movimentos")} className="text-xs text-primary flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
            {SAC_SETORES.map((setor) => (
              <button
                key={setor.path}
                onClick={() => navigate(setor.path)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/60 transition-colors group text-center"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${setor.quickColorClass.split(" ")[1]}`}>
                  <setor.icon className={`w-4 h-4 ${setor.quickColorClass.split(" ")[0]}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                  {setor.nome}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Demandas das Coordenadorias</h3>
            <button onClick={() => navigate("/coordenacoes")} className="text-xs text-primary flex items-center gap-1 hover:underline">
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2">
            {COORDENADORIA_DEMANDAS.map((coordenadoria) => (
              <button
                key={coordenadoria.path}
                onClick={() => navigate(coordenadoria.path)}
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted/60 transition-colors group text-center"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${coordenadoria.quickColorClass.split(" ")[1]}`}>
                  <coordenadoria.icon className={`w-4 h-4 ${coordenadoria.quickColorClass.split(" ")[0]}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                  {coordenadoria.nome}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ══ GESTÃO ═════════════════════════════════════════════════ */}
        <motion.div variants={fadeUp}>
          <SectionLabel label="Gestão" icon={Users} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-3">
            <StatCard title="Pessoas"   value={totalPessoas}  subtitle="contatos cadastrados"     icon={<Users  className="w-5 h-5" style={{color:"hsl(199,89%,48%)"}} />} href="/pessoas"  accentColor="hsl(199,89%,48%)" onEdit={() => setQPessoa(true)} />
            <StatCard title="Usuários"  value={totalUsers}    subtitle="membros do sistema"        icon={<Users  className="w-5 h-5" style={{color:"hsl(239,84%,67%)"}} />} href="/usuarios" accentColor="hsl(239,84%,67%)" />
            <StatCard title="Financeiro" value="—"            subtitle="ver relatório financeiro"  icon={<Wallet className="w-5 h-5" style={{color:"hsl(142,70%,40%)"}} />} href="/financas" accentColor="hsl(142,70%,40%)" />
            <StatCard title="Logbook"   value="—"             subtitle="registros de atividades"   icon={<BookOpen className="w-5 h-5" style={{color:"hsl(38,92%,50%)"}} />} href="/logbook" accentColor="hsl(38,92%,50%)"  />
          </div>
        </motion.div>

        {/* ══ COORDENAÇÕES ═══════════════════════════════════════════ */}
        <motion.div variants={fadeUp}>
          <SectionLabel label="Coordenações" icon={BarChart3} />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mt-3">
            <StatCard title="Total Tarefas" value={totalTarefas}     subtitle={`${coordProgress.length} coordenações`}     icon={<ClipboardList  className="w-5 h-5" style={{color:"hsl(213,94%,52%)"}} />} href="/relatorio-coordenacao" accentColor="hsl(213,94%,52%)" />
            <StatCard title="Concluídas"    value={totalDone}        subtitle={`${totalPct}% do total`}                    icon={<CheckCircle2   className="w-5 h-5" style={{color:"hsl(142,70%,40%)"}} />} href="/relatorio-coordenacao" accentColor="hsl(142,70%,40%)" />
            <StatCard title="Atrasadas"     value={overdueList.length} subtitle={`${upcomingTarefas.length} vencem em 7d`} icon={<AlertTriangle  className="w-5 h-5" style={{color:"hsl(0,72%,51%)"}}   />} href="/relatorio-coordenacao" accentColor="hsl(0,72%,51%)"   />
            <StatCard title="Em Andamento"  value={totalPending - overdueList.length} subtitle="tarefas pendentes"         icon={<Clock          className="w-5 h-5" style={{color:"hsl(38,92%,50%)"}}  />} href="/relatorio-coordenacao" accentColor="hsl(38,92%,50%)"  />
          </div>
        </motion.div>

        {/* Coordenações — gráficos */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/relatorio-coordenacao")}>
            <h3 className="text-sm font-semibold text-foreground mb-4">Tarefas por Coordenação</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={coordBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="nome" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="concluidas" stackId="s" fill="hsl(142,70%,40%)" name="Concluídas" radius={[0,0,0,0]} />
                <Bar dataKey="pendentes"  stackId="s" fill="hsl(var(--primary))" name="Pendentes" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Pie */}
          <div className="bg-card border border-border/50 rounded-xl p-5 cursor-pointer hover:shadow-md transition-all" onClick={() => navigate("/relatorio-coordenacao")}>
            <h3 className="text-sm font-semibold text-foreground mb-3">Status das Tarefas</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value">
                  {statusPie.map((e,i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {statusPie.map(s => (
                <div key={s.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground">{s.name}</span>
                  </div>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Resumo Executivo coordenações */}
        <motion.div variants={fadeUp} className="bg-card border border-border/50 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Resumo Executivo — Coordenações</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{totalPct}%</p>
              <p className="text-[10px] text-muted-foreground">{totalDone}/{totalTarefas} tarefas</p>
            </div>
          </div>
          <Progress value={totalPct} className="h-2 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {coordProgress.map((coord, i) => (
              <button key={coord.slug} onClick={() => navigate(`/coordenacao/${coord.slug}`)}
                className="text-left p-3.5 rounded-xl bg-muted/30 hover:bg-muted/60 border border-transparent hover:border-border/50 hover:shadow-sm hover:scale-[1.01] transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground truncate pr-2">{coord.nome}</span>
                  <span className="text-xs font-bold shrink-0" style={{ color: COORD_CLR[i % COORD_CLR.length] }}>{coord.percent}%</span>
                </div>
                <Progress value={coord.percent} className="h-1.5 mb-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" />{coord.done} ok</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-amber-500" />{coord.pending} pend.</span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tarefas recentes + prazos */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tarefas recentes */}
          <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Tarefas Recentes</h3>
              <button onClick={() => navigate("/relatorio-coordenacao")} className="text-xs text-primary flex items-center gap-1 hover:underline">
                Ver todas <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-t border-border bg-muted/20">
                    <th className="text-left py-2.5 px-5 text-muted-foreground font-medium">Tarefa</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground font-medium hidden sm:table-cell">Responsável</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground font-medium hidden md:table-cell">Prazo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTarefas.map((t: any) => (
                    <tr key={t.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setSelTarefa(t)}>
                      <td className="py-3 px-5 font-medium text-foreground max-w-[220px] truncate">{t.titulo}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          t.status ? "bg-emerald-500/10 text-emerald-600"
                          : t.isOverdue ? "bg-rose-500/10 text-rose-600"
                          : "bg-amber-500/10 text-amber-600"}`}>
                          {t.status ? "Concluída" : t.isOverdue ? "Atrasada" : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">{t.responsavel || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{t.data_fim || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Próximos prazos */}
          <div className="bg-card border border-border/50 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Próximos Prazos</h3>
            <div className="space-y-3">
              {upcomingTarefas.map((t: any) => {
                const d = t.data_fim ? new Date(t.data_fim + "T00:00:00") : null;
                return (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    {d && (
                      <div className="shrink-0 w-9 text-center">
                        <p className="text-base font-bold text-primary leading-none">{pad(d.getDate())}</p>
                        <p className="text-[9px] text-muted-foreground">/{pad(d.getMonth()+1)}</p>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{t.titulo}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t.responsavel || "Sem responsável"}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ══ ACESSO RÁPIDO — espelho do sidebar ═════════════════════ */}
        <motion.div variants={fadeUp}>
          <SectionLabel label="Acesso Rápido" icon={ArrowRight} />
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 mt-3">
            {[
              { icon: MessageSquare, label: "Demandas",      color: "text-amber-500   bg-amber-500/10",   path: "/demandas"               },
              { icon: Calendar,      label: "Eventos",       color: "text-blue-500    bg-blue-500/10",    path: "/eventos"                },
              { icon: Handshake,     label: "Compromissos",  color: "text-purple-500  bg-purple-500/10",  path: "/compromissos"           },
              { icon: Bell,          label: "Alertas",       color: "text-rose-500    bg-rose-500/10",    path: "/alertas"                },
              { icon: Users,         label: "Pessoas",       color: "text-sky-500     bg-sky-500/10",     path: "/pessoas"                },
              { icon: Scale,         label: "Parlamentar",   color: "text-emerald-500 bg-emerald-500/10", path: "/parlamentar"            },
              { icon: BarChart3,     label: "Relatório",     color: "text-primary     bg-primary/10",     path: "/relatorio-coordenacao"  },
              { icon: Wallet,        label: "Financeiro",    color: "text-green-500   bg-green-500/10",   path: "/financas"               },
            ].map(a => (
              <button key={a.path} onClick={() => navigate(a.path)}
                className="flex flex-col items-center gap-2 p-3 bg-card border border-border/50 rounded-xl hover:shadow-md hover:border-border hover:scale-[1.02] transition-all duration-200">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color.split(" ")[1]}`}>
                  <a.icon className={`w-5 h-5 ${a.color.split(" ")[0]}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{a.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

      </motion.div>

      {/* ── Quick-insert: Demanda ──────────────────────────────────── */}
      <Dialog open={qDemanda} onOpenChange={setQDemanda}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" />Nova Demanda</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Título *</Label>
              <Input className="mt-1" placeholder="Descreva a demanda..." value={qDemandaForm.titulo} onChange={e => setQDemandaForm(p => ({ ...p, titulo: e.target.value }))} onKeyDown={e => e.key === "Enter" && saveDemanda()} />
            </div>
            <div><Label className="text-xs">Status</Label>
              <Select value={qDemandaForm.status} onValueChange={v => setQDemandaForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="atrasada">Atrasada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQDemanda(false)}>Cancelar</Button>
            <Button size="sm" disabled={saving || !qDemandaForm.titulo.trim()} onClick={saveDemanda}>{saving ? "Salvando…" : "Criar Demanda"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick-insert: Evento ────────────────────────────────────── */}
      <Dialog open={qEvento} onOpenChange={setQEvento}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" />Novo Evento</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Título *</Label>
              <Input className="mt-1" placeholder="Nome do evento..." value={qEventoForm.titulo} onChange={e => setQEventoForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><Label className="text-xs">Data *</Label>
                <Input type="date" className="mt-1" value={qEventoForm.data} onChange={e => setQEventoForm(p => ({ ...p, data: e.target.value }))} />
              </div>
              <div><Label className="text-xs">Hora</Label>
                <Input type="time" className="mt-1" value={qEventoForm.hora} onChange={e => setQEventoForm(p => ({ ...p, hora: e.target.value }))} />
              </div>
            </div>
            <div><Label className="text-xs">Local</Label>
              <Input className="mt-1" placeholder="Plenário, sala, etc." value={qEventoForm.local} onChange={e => setQEventoForm(p => ({ ...p, local: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={qEventoForm.tipo} onValueChange={v => setQEventoForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Plenário","Comissão","Audiência","Visita","Interno"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQEvento(false)}>Cancelar</Button>
            <Button size="sm" disabled={saving || !qEventoForm.titulo.trim()} onClick={saveEvento}>{saving ? "Salvando…" : "Criar Evento"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick-insert: Compromisso ───────────────────────────────── */}
      <Dialog open={qComp} onOpenChange={setQComp}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" />Novo Compromisso</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Título *</Label>
              <Input className="mt-1" placeholder="Descrição do compromisso..." value={qCompForm.titulo} onChange={e => setQCompForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Data</Label>
              <Input type="date" className="mt-1" value={qCompForm.data} onChange={e => setQCompForm(p => ({ ...p, data: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Descrição</Label>
              <Input className="mt-1" placeholder="Detalhes opcionais..." value={qCompForm.descricao} onChange={e => setQCompForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQComp(false)}>Cancelar</Button>
            <Button size="sm" disabled={saving || !qCompForm.titulo.trim()} onClick={saveComp}>{saving ? "Salvando…" : "Criar Compromisso"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick-insert: Alerta ────────────────────────────────────── */}
      <Dialog open={qAlerta} onOpenChange={setQAlerta}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" />Novo Alerta</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Título *</Label>
              <Input className="mt-1" placeholder="Título do alerta..." value={qAlertaForm.titulo} onChange={e => setQAlertaForm(p => ({ ...p, titulo: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Mensagem</Label>
              <Input className="mt-1" placeholder="Detalhe da ocorrência..." value={qAlertaForm.mensagem} onChange={e => setQAlertaForm(p => ({ ...p, mensagem: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={qAlertaForm.tipo} onValueChange={v => setQAlertaForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQAlerta(false)}>Cancelar</Button>
            <Button size="sm" disabled={saving || !qAlertaForm.titulo.trim()} onClick={saveAlerta}>{saving ? "Salvando…" : "Criar Alerta"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick-insert: Pessoa ────────────────────────────────────── */}
      <Dialog open={qPessoa} onOpenChange={setQPessoa}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><PlusCircle className="w-4 h-4 text-primary" />Nova Pessoa</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs">Nome *</Label>
              <Input className="mt-1" placeholder="Nome completo..." value={qPessoaForm.nome} onChange={e => setQPessoaForm(p => ({ ...p, nome: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Telefone</Label>
              <Input className="mt-1" placeholder="(99) 99999-9999" value={qPessoaForm.telefone} onChange={e => setQPessoaForm(p => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div><Label className="text-xs">Tipo</Label>
              <Select value={qPessoaForm.tipo} onValueChange={v => setQPessoaForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Cidadão","Liderança","Vereador","Empresário","Parceiro","Assessor","Outro"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setQPessoa(false)}>Cancelar</Button>
            <Button size="sm" disabled={saving || !qPessoaForm.nome.trim()} onClick={savePessoa}>{saving ? "Salvando…" : "Cadastrar Pessoa"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evento dialog */}
      <Dialog open={!!selEvento} onOpenChange={o => !o && setSelEvento(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          {selEvento && (() => {
            const d = new Date(selEvento.data + "T00:00:00");
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_CLR[selEvento.tipo]||"bg-muted text-muted-foreground"}`}>{selEvento.tipo}</span>
                    {selEvento.titulo}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2 text-sm">
                  <div className="flex gap-2 items-center text-muted-foreground">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{d.toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})} às {selEvento.hora}</span>
                  </div>
                  {selEvento.local && (
                    <div className="flex gap-2 items-center text-muted-foreground">
                      <MapPin className="w-4 h-4 shrink-0" /><span>{selEvento.local}</span>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelEvento(null)}>Fechar</Button>
                  <Button onClick={() => { setSelEvento(null); navigate("/eventos"); }}>
                    <ArrowRight className="w-3.5 h-3.5 mr-1" />Ver Agenda
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Tarefa dialog */}
      <Dialog open={!!selTarefa} onOpenChange={o => !o && setSelTarefa(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-md">
          {selTarefa && (
            <>
              <DialogHeader><DialogTitle>{selTarefa.titulo}</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <Badge variant="outline" className={selTarefa.status ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : selTarefa.isOverdue ? "bg-rose-500/10 text-rose-600 border-rose-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}>
                  {selTarefa.status ? "Concluída" : selTarefa.isOverdue ? "Atrasada" : "Pendente"}
                </Badge>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {selTarefa.coordenacao && selTarefa.coordenacao !== "—" && (
                    <div><p className="text-xs text-muted-foreground">Coordenação</p><p className="font-medium">{selTarefa.coordenacao}</p></div>
                  )}
                  {selTarefa.responsavel && (
                    <div><p className="text-xs text-muted-foreground">Responsável</p><p className="font-medium">{selTarefa.responsavel}</p></div>
                  )}
                  {selTarefa.data_fim && (
                    <div><p className="text-xs text-muted-foreground">Prazo</p><p className="font-medium">{new Date(selTarefa.data_fim+"T00:00:00").toLocaleDateString("pt-BR")}</p></div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelTarefa(null)}>Fechar</Button>
                <Button onClick={() => { setSelTarefa(null); navigate("/relatorio-coordenacao"); }}>
                  <ArrowRight className="w-3.5 h-3.5 mr-1" />Ver Coordenação
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Dashboard;
