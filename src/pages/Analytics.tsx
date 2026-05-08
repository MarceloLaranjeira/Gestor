import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart3, TrendingUp, Users, ClipboardList, Wallet,
  Flag, Bell, RefreshCw, Download, Calendar,
  CheckCircle2, Clock, AlertTriangle, MessageSquare,
  Maximize2, Upload, FileUp, X, ChevronDown,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ── helpers ────────────────────────────────────────────────────────────────── */
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
  color: "hsl(var(--foreground))",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(205,70%,45%)",
  "hsl(142,70%,40%)",
  "hsl(38,92%,50%)",
  "hsl(280,60%,50%)",
  "hsl(0,72%,51%)",
  "hsl(199,89%,48%)",
  "hsl(48,96%,53%)",
];

const fmtBRL = (v: number) =>
  v?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "R$ 0";
const fmtN = (v: number) => v?.toLocaleString("pt-BR") ?? "0";

const PERIODS = [
  { label: "7 dias",  value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
  { label: "12 meses",value: 365 },
];

type TabKey = "geral" | "demandas" | "pessoas" | "coordenacoes" | "financeiro" | "campanha";

const tabs: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "geral",        label: "Visão Geral",   icon: BarChart3     },
  { key: "demandas",     label: "Demandas",       icon: MessageSquare },
  { key: "pessoas",      label: "Pessoas",        icon: Users         },
  { key: "coordenacoes", label: "Coordenações",   icon: ClipboardList },
  { key: "financeiro",   label: "Financeiro",     icon: Wallet        },
  { key: "campanha",     label: "Campanha",       icon: Flag          },
];

/* ── KPI card ───────────────────────────────────────────────────────────────── */
const KPI = ({
  label, value, sub, icon: Icon, color = "hsl(var(--primary))",
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; color?: string;
}) => (
  <div className="bg-card border border-border/50 rounded-xl p-5 flex items-start justify-between gap-3">
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-bold text-foreground mt-1.5 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}1a` }}>
      <Icon className="w-5 h-5" style={{ color }} />
    </div>
  </div>
);

/* ── chart wrapper ──────────────────────────────────────────────────────────── */
const ChartCard = ({
  title, children, className, action,
}: {
  title: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) => (
  <div className={cn("bg-card border border-border/50 rounded-xl p-5", className)}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

/* ── csv export ─────────────────────────────────────────────────────────────── */
function exportCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const rows = [keys.join(","), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

/* ══════════════════════════════════════════════════════════════════════════════
   Main component
══════════════════════════════════════════════════════════════════════════════ */
const Analytics = () => {
  const [tab, setTab]       = useState<TabKey>("geral");
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importTarget, setImportTarget] = useState("movimentos_financeiros");
  const [importData, setImportData]   = useState<Record<string,string>[]>([]);
  const [importing, setImporting]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* raw data */
  const [demandasMensal,    setDemandasMensal]    = useState<any[]>([]);
  const [demandasStatus,    setDemandasStatus]    = useState<any[]>([]);
  const [pessoasMensal,     setPessoasMensal]     = useState<any[]>([]);
  const [pessoasTipo,       setPessoasTipo]       = useState<any[]>([]);
  const [tarefasCoord,      setTarefasCoord]      = useState<any[]>([]);
  const [tarefasMensal,     setTarefasMensal]     = useState<any[]>([]);
  const [finMensal,         setFinMensal]         = useState<any[]>([]);
  const [finCategoria,      setFinCategoria]      = useState<any[]>([]);
  const [campanhaCalhas,    setCampanhaCalhas]    = useState<any[]>([]);
  const [campanhaVisitas,   setCampanhaVisitas]   = useState<any[]>([]);
  const [alertasData,       setAlertasData]       = useState<any[]>([]);

  /* summary counts */
  const [totalDemandas,  setTotalDemandas]  = useState(0);
  const [totalPessoas,   setTotalPessoas]   = useState(0);
  const [totalTarefas,   setTotalTarefas]   = useState(0);
  const [totalUsuarios,  setTotalUsuarios]  = useState(0);
  const [saldoTotal,     setSaldoTotal]     = useState(0);
  const [totalEventos,   setTotalEventos]   = useState(0);
  const [totalAlertas,   setTotalAlertas]   = useState(0);
  const [totalCoordenacoes, setTotalCoordenacoes] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dm, ds, pm, pt, tc, tm, fm, fc, cc, cv, al,
        tdCount, tpCount, ttCount, tuCount, teCount, taCount, tcoCount,
      ] = await Promise.all([
        supabase.from("analytics_demandas_mensal").select("*").limit(12),
        supabase.from("analytics_demandas_por_status").select("*"),
        supabase.from("analytics_pessoas_mensal").select("*").limit(12),
        supabase.from("analytics_pessoas_por_tipo").select("*"),
        supabase.from("analytics_tarefas_por_coord").select("*"),
        supabase.from("analytics_tarefas_mensal").select("*").limit(12),
        supabase.from("analytics_financeiro_mensal").select("*").limit(12),
        supabase.from("analytics_financeiro_por_categoria").select("*"),
        supabase.from("analytics_campanha_calhas").select("*").limit(10),
        supabase.from("analytics_campanha_visitas").select("*"),
        supabase.from("analytics_alertas").select("*"),
        supabase.from("demandas").select("id", { count: "exact", head: true }),
        supabase.from("pessoas").select("id",  { count: "exact", head: true }),
        supabase.from("tarefas").select("id",  { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("eventos").select("id",  { count: "exact", head: true }),
        supabase.from("alertas_sistema").select("id", { count: "exact", head: true }).eq("lido", false),
        supabase.from("coordenacoes").select("id", { count: "exact", head: true }),
      ]);

      setDemandasMensal((dm.data || []).reverse());
      setDemandasStatus(ds.data || []);
      setPessoasMensal((pm.data || []).reverse());
      setPessoasTipo(pt.data || []);
      setTarefasCoord(tc.data || []);
      setTarefasMensal((tm.data || []).reverse());
      setFinMensal((fm.data || []).reverse());
      setFinCategoria(fc.data || []);
      setCampanhaCalhas(cc.data || []);
      setCampanhaVisitas(cv.data || []);
      setAlertasData(al.data || []);

      setTotalDemandas(tdCount.count || 0);
      setTotalPessoas(tpCount.count || 0);
      setTotalTarefas(ttCount.count || 0);
      setTotalUsuarios(tuCount.count || 0);
      setTotalEventos(teCount.count || 0);
      setTotalAlertas(taCount.count || 0);
      setTotalCoordenacoes(tcoCount.count || 0);

      const saldo = (fm.data || []).reduce((s: number, r: any) =>
        s + (Number(r.receitas) || 0) - (Number(r.despesas) || 0), 0);
      setSaldoTotal(saldo);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  /* derived */
  const tarefasTotal   = tarefasCoord.reduce((s, r) => s + r.total, 0);
  const tarefasDone    = tarefasCoord.reduce((s, r) => s + r.concluidas, 0);
  const tarefasPct     = tarefasTotal > 0 ? Math.round(tarefasDone / tarefasTotal * 100) : 0;
  const demandasPend   = demandasStatus.find(d => d.status === "pendente")?.total || 0;
  const receitaTotal   = finMensal.reduce((s, r) => s + (Number(r.receitas) || 0), 0);
  const despesaTotal   = finMensal.reduce((s, r) => s + (Number(r.despesas) || 0), 0);
  const potencialTotal = campanhaCalhas.reduce((s, r) => s + (r.potencial_votos || 0), 0);

  /* ── fullscreen ─────────────────────────────────────────────────────────── */
  const openFullscreen = () => {
    window.open(window.location.href, "_blank", "width=1400,height=900,menubar=no,toolbar=no,location=no,status=no");
  };

  /* ── import CSV ──────────────────────────────────────────────────────────── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) { toast.error("CSV vazio ou inválido"); return; }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      const rows = lines.slice(1).map(line => {
        const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
        return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
      });
      setImportData(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const TABLE_IMPORT_MAP: Record<string, { label: string; required: string[] }> = {
    movimentos_financeiros: { label: "Financeiro",  required: ["tipo","valor","data"] },
    demandas:               { label: "Demandas",    required: ["titulo","status"]     },
    pessoas:                { label: "Pessoas",     required: ["nome"]                },
    eventos:                { label: "Eventos",     required: ["titulo","data"]       },
  };

  const doImport = async () => {
    if (!importData.length) return;
    setImporting(true);
    const { error } = await supabase.from(importTarget).insert(importData as any);
    setImporting(false);
    if (error) { toast.error("Erro ao importar: " + error.message); return; }
    toast.success(`${importData.length} registros importados com sucesso!`);
    setImportData([]);
    setImportOpen(false);
    setRefreshKey(k => k + 1);
  };

  /* ── export all ──────────────────────────────────────────────────────────── */
  const exportAll = () => {
    const sections: Record<string, any[]> = {
      demandas_mensal: demandasMensal,
      demandas_status: demandasStatus,
      pessoas_tipo: pessoasTipo,
      tarefas_coord: tarefasCoord,
      financeiro_mensal: finMensal,
      financeiro_categoria: finCategoria,
    };
    Object.entries(sections).forEach(([name, data]) => {
      if (data.length) exportCSV(data, `analytics_${name}.csv`);
    });
    toast.success("Arquivos CSV exportados!");
  };

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-display text-foreground">Analytics</h1>
            {loading && <span className="text-xs text-muted-foreground animate-pulse">atualizando…</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* period filter */}
            <div className="flex rounded-lg border border-border/60 overflow-hidden text-xs">
              {PERIODS.map(p => (
                <button key={p.value} onClick={() => setPeriod(p.value)}
                  className={cn("px-2.5 py-1.5 transition-colors", period === p.value
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted")}>
                  {p.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey(k => k + 1)} title="Atualizar dados">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} title="Importar CSV" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Importar
            </Button>
            <Button size="sm" variant="outline" onClick={exportAll} title="Exportar todos os dados" className="gap-1.5">
              <Download className="w-3.5 h-3.5" /> Exportar
            </Button>
            <Button size="sm" variant="outline" onClick={openFullscreen} title="Abrir em tela cheia" className="gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" /> Tela Cheia
            </Button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
          {tabs.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn("flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap",
                  tab === t.key
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted")}>
                <Icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* ── VISÃO GERAL ───────────────────────────────────────────────────── */}
        {tab === "geral" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Demandas"      value={fmtN(totalDemandas)}  sub={`${demandasPend} pendentes`}     icon={MessageSquare} color="hsl(38,92%,50%)" />
              <KPI label="Pessoas"       value={fmtN(totalPessoas)}   sub="contatos cadastrados"             icon={Users}         color="hsl(199,89%,48%)" />
              <KPI label="Tarefas"       value={fmtN(totalTarefas)}   sub={`${tarefasPct}% concluídas`}     icon={ClipboardList} color="hsl(213,94%,52%)" />
              <KPI label="Usuários"      value={fmtN(totalUsuarios)}  sub="no sistema"                      icon={Users}         color="hsl(239,84%,67%)" />
              <KPI label="Coordenações"  value={fmtN(totalCoordenacoes)} sub="ativas"                       icon={BarChart3}     color="hsl(142,70%,40%)" />
              <KPI label="Eventos"       value={fmtN(totalEventos)}   sub="cadastrados"                     icon={Calendar}      color="hsl(280,60%,50%)" />
              <KPI label="Alertas"       value={fmtN(totalAlertas)}   sub="não lidos"                       icon={Bell}          color="hsl(0,72%,51%)" />
              <KPI label="Saldo"         value={fmtBRL(saldoTotal)}   sub="receitas − despesas"             icon={Wallet}        color="hsl(142,70%,40%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Demandas por Status"
                action={<button onClick={() => exportCSV(demandasStatus, "demandas_status.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={demandasStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="total" name="Demandas" radius={[4,4,0,0]}>
                      {demandasStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Tarefas por Coordenação"
                action={<button onClick={() => exportCSV(tarefasCoord, "tarefas_coord.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tarefasCoord.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="coordenacao" type="category" width={100} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: string) => v.length > 14 ? v.slice(0,14)+"…" : v} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="concluidas" stackId="s" fill="hsl(142,70%,40%)" name="Concluídas" />
                    <Bar dataKey="pendentes"  stackId="s" fill="hsl(var(--primary))" name="Pendentes" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Pessoas por Tipo"
                action={<button onClick={() => exportCSV(pessoasTipo, "pessoas_tipo.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={pessoasTipo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3}>
                        {pessoasTipo.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1.5">
                    {pessoasTipo.map((r: any, i: number) => (
                      <div key={r.tipo} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground truncate max-w-[100px]">{r.tipo || "Sem tipo"}</span>
                        </div>
                        <span className="font-semibold text-foreground">{fmtN(r.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>

              <ChartCard title="Receitas vs Despesas (mensal)"
                action={<button onClick={() => exportCSV(finMensal, "financeiro_mensal.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={finMensal.slice(-6)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receitas" fill="hsl(142,70%,40%)" name="Receitas" radius={[4,4,0,0]} />
                    <Bar dataKey="despesas" fill="hsl(0,72%,51%)"   name="Despesas" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ── DEMANDAS ─────────────────────────────────────────────────────── */}
        {tab === "demandas" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Total" value={fmtN(totalDemandas)} icon={MessageSquare} color="hsl(38,92%,50%)" />
              <KPI label="Pendentes"  value={fmtN(demandasStatus.find(d => d.status === "pendente")?.total || 0)}  icon={Clock}        color="hsl(38,92%,50%)" />
              <KPI label="Andamento"  value={fmtN(demandasStatus.find(d => d.status === "andamento")?.total || 0)} icon={TrendingUp}    color="hsl(205,70%,45%)" />
              <KPI label="Concluídas" value={fmtN(demandasStatus.find(d => d.status === "concluida")?.total || 0)} icon={CheckCircle2}  color="hsl(142,70%,40%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Volume de Demandas por Mês"
                action={<button onClick={() => exportCSV(demandasMensal, "demandas_mensal.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={demandasMensal.slice(-8)}>
                    <defs>
                      <linearGradient id="grad_d" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#grad_d)" name="Total" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Distribuição por Status">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={demandasStatus} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={90} paddingAngle={3} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {demandasStatus.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* tabela resumo */}
            <ChartCard title="Resumo por Status"
              action={<button onClick={() => exportCSV(demandasStatus, "demandas_status.csv")} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Download className="w-3 h-3" />CSV</button>}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-muted-foreground font-medium text-xs uppercase">Status</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs uppercase">Qtd</th>
                      <th className="text-right py-2 px-3 text-muted-foreground font-medium text-xs uppercase">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandasStatus.map((r: any) => (
                      <tr key={r.status} className="border-b border-border/40 hover:bg-muted/30">
                        <td className="py-2.5 px-3 capitalize font-medium">{r.status}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{fmtN(r.total)}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-muted-foreground">
                          {totalDemandas > 0 ? ((r.total / totalDemandas) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        )}

        {/* ── PESSOAS ──────────────────────────────────────────────────────── */}
        {tab === "pessoas" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <KPI label="Total de Pessoas"    value={fmtN(totalPessoas)} sub="contatos cadastrados" icon={Users} color="hsl(199,89%,48%)" />
              <KPI label="Tipos Distintos"     value={pessoasTipo.length} sub="categorias"           icon={Users} color="hsl(280,60%,50%)" />
              <KPI label="Usuários do Sistema" value={fmtN(totalUsuarios)} sub="acessos ativos"      icon={Users} color="hsl(239,84%,67%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Cadastro de Pessoas por Mês"
                action={<button onClick={() => exportCSV(pessoasMensal, "pessoas_mensal.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={pessoasMensal.slice(-8)}>
                    <defs>
                      <linearGradient id="grad_p" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(199,89%,48%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(199,89%,48%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="total" stroke="hsl(199,89%,48%)" fill="url(#grad_p)" name="Pessoas" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Distribuição por Tipo">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={pessoasTipo} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="tipo" type="category" width={90} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="total" name="Pessoas" radius={[0,4,4,0]}>
                      {pessoasTipo.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ── COORDENAÇÕES ─────────────────────────────────────────────────── */}
        {tab === "coordenacoes" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Total Tarefas"  value={fmtN(tarefasCoord.reduce((s,r) => s + r.total,0))}     icon={ClipboardList} color="hsl(213,94%,52%)" />
              <KPI label="Concluídas"     value={fmtN(tarefasCoord.reduce((s,r) => s + r.concluidas,0))} icon={CheckCircle2}  color="hsl(142,70%,40%)" />
              <KPI label="Pendentes"      value={fmtN(tarefasCoord.reduce((s,r) => s + r.pendentes,0))}  icon={Clock}         color="hsl(38,92%,50%)" />
              <KPI label="Atrasadas"      value={fmtN(tarefasCoord.reduce((s,r) => s + r.atrasadas,0))}  icon={AlertTriangle}  color="hsl(0,72%,51%)" />
            </div>

            <ChartCard title="Progresso por Coordenação"
              action={<button onClick={() => exportCSV(tarefasCoord, "tarefas_coordenacao.csv")} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Download className="w-3 h-3" />CSV</button>}>
              <div className="space-y-3">
                {tarefasCoord.map((r: any) => (
                  <div key={r.slug} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-muted-foreground truncate shrink-0">
                      {r.coordenacao.replace(/^Coord(enação|\.)\s*/i, "")}
                    </div>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${r.pct_concluido}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-10 text-right tabular-nums">{r.pct_concluido}%</span>
                    <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">{fmtN(r.concluidas)}/{fmtN(r.total)}</span>
                  </div>
                ))}
              </div>
            </ChartCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Evolução de Tarefas por Mês">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={tarefasMensal.slice(-8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="concluidas" stroke="hsl(142,70%,40%)" name="Concluídas" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="pendentes"  stroke="hsl(var(--primary))" name="Pendentes" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="total"      stroke="hsl(205,70%,45%)" name="Total" strokeWidth={2} dot={false} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Tabela de Coordenações"
                action={<button onClick={() => exportCSV(tarefasCoord, "coordenacoes.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground font-medium uppercase">Coord.</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium uppercase">Total</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium uppercase">Concl.</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium uppercase">Atr.</th>
                        <th className="text-right py-2 px-2 text-muted-foreground font-medium uppercase">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tarefasCoord.map((r: any) => (
                        <tr key={r.slug} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-2 px-2 font-medium truncate max-w-[120px]">{r.coordenacao.replace(/^Coord(enação|\.)\s*/i,"")}</td>
                          <td className="py-2 px-2 text-right tabular-nums">{fmtN(r.total)}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-emerald-600">{fmtN(r.concluidas)}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-rose-600">{fmtN(r.atrasadas)}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-semibold">{r.pct_concluido}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ── FINANCEIRO ───────────────────────────────────────────────────── */}
        {tab === "financeiro" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Receitas"      value={fmtBRL(receitaTotal)} sub="total acumulado"  icon={TrendingUp}  color="hsl(142,70%,40%)" />
              <KPI label="Despesas"      value={fmtBRL(despesaTotal)} sub="total acumulado"  icon={TrendingUp}  color="hsl(0,72%,51%)" />
              <KPI label="Saldo"         value={fmtBRL(saldoTotal)}   sub="receitas−despesas" icon={Wallet}      color={saldoTotal >= 0 ? "hsl(142,70%,40%)" : "hsl(0,72%,51%)"} />
              <KPI label="Meses de dados" value={finMensal.length}    sub="histórico"         icon={Calendar}    color="hsl(205,70%,45%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Receitas vs Despesas por Mês"
                action={<button onClick={() => exportCSV(finMensal, "financeiro_mensal.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={finMensal.slice(-8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtBRL(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="receitas" fill="hsl(142,70%,40%)" name="Receitas" radius={[4,4,0,0]} />
                    <Bar dataKey="despesas" fill="hsl(0,72%,51%)"   name="Despesas" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Saldo Acumulado">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={finMensal.slice(-8)}>
                    <defs>
                      <linearGradient id="grad_s" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142,70%,40%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142,70%,40%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtBRL(v)} />
                    <Area type="monotone" dataKey="saldo" stroke="hsl(142,70%,40%)" fill="url(#grad_s)" name="Saldo" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Despesas por Categoria" className="lg:col-span-2"
                action={<button onClick={() => exportCSV(finCategoria, "financeiro_categorias.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={finCategoria.filter((r: any) => r.tipo === "despesa").slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => `R$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <YAxis dataKey="categoria" type="category" width={80} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtBRL(v)} />
                      <Bar dataKey="total" fill="hsl(0,72%,51%)" name="Despesa" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-muted-foreground font-medium uppercase">Tipo</th>
                          <th className="text-left py-2 px-2 text-muted-foreground font-medium uppercase">Categoria</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium uppercase">Total</th>
                          <th className="text-right py-2 px-2 text-muted-foreground font-medium uppercase">Qtd</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finCategoria.slice(0, 12).map((r: any, i: number) => (
                          <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                            <td className="py-2 px-2">
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${r.tipo === "receita" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>{r.tipo}</span>
                            </td>
                            <td className="py-2 px-2 font-medium">{r.categoria}</td>
                            <td className="py-2 px-2 text-right tabular-nums font-semibold">{fmtBRL(r.total)}</td>
                            <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{fmtN(r.qtd)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ChartCard>
            </div>
          </div>
        )}

        {/* ── CAMPANHA ─────────────────────────────────────────────────────── */}
        {tab === "campanha" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPI label="Calhas"            value={campanhaCalhas.length}                                     sub="territórios"         icon={Flag}       color="hsl(var(--primary))" />
              <KPI label="Votos Válidos"     value={fmtN(campanhaCalhas.reduce((s,r) => s+(r.votos_validos||0),0))} sub="eleitores"     icon={Users}      color="hsl(205,70%,45%)" />
              <KPI label="Potencial Total"   value={fmtN(potencialTotal)}                                      sub="votos potenciais"    icon={TrendingUp} color="hsl(142,70%,40%)" />
              <KPI label="Visitas Plan."     value={fmtN(campanhaVisitas.find(v => v.status === "planejada")?.total || 0)} sub="programadas" icon={Calendar} color="hsl(38,92%,50%)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <ChartCard title="Top 10 Calhas — Potencial de Votos"
                action={<button onClick={() => exportCSV(campanhaCalhas, "calhas.csv")} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></button>}>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={campanhaCalhas.slice(0,10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtN(v)} axisLine={false} tickLine={false} />
                    <YAxis dataKey="nome" type="category" width={90} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: string) => v.length > 12 ? v.slice(0,12)+"…" : v} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => fmtN(v)} />
                    <Bar dataKey="potencial_votos" fill="hsl(var(--primary))" name="Potencial" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Status das Visitas">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={campanhaVisitas} dataKey="total" nameKey="status" cx="50%" cy="50%" outerRadius={80} paddingAngle={3} label={({ status, percent }) => `${status} ${(percent*100).toFixed(0)}%`}>
                      {campanhaVisitas.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {campanhaVisitas.map((r: any, i: number) => (
                    <div key={r.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground capitalize">{r.status}</span>
                      </div>
                      <span className="font-semibold">{fmtN(r.total)}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Tabela de Calhas" className="lg:col-span-2"
                action={<button onClick={() => exportCSV(campanhaCalhas, "calhas.csv")} className="flex items-center gap-1.5 text-xs text-primary hover:underline"><Download className="w-3 h-3" />CSV</button>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium uppercase">Calha</th>
                        <th className="text-left py-2 px-3 text-muted-foreground font-medium uppercase">Região</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium uppercase">Municípios</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium uppercase">Votos Válidos</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium uppercase">% Cristãos</th>
                        <th className="text-right py-2 px-3 text-muted-foreground font-medium uppercase">Potencial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campanhaCalhas.map((r: any, i: number) => (
                        <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-medium">{r.nome}</td>
                          <td className="py-2.5 px-3 text-muted-foreground">{r.regiao || "—"}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{fmtN(r.municipios)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{fmtN(r.votos_validos)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{Number(r.percentual_cristaos).toFixed(1)}%</td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-primary">{fmtN(r.potencial_votos)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </div>
          </div>
        )}

      </div>

      {/* ── IMPORT DIALOG ───────────────────────────────────────────────── */}
      <Dialog open={importOpen} onOpenChange={o => { setImportOpen(o); if (!o) setImportData([]); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-4 h-4 text-primary" /> Importar Dados via CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Destino da importação</Label>
              <Select value={importTarget} onValueChange={setImportTarget}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TABLE_IMPORT_MAP).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label} ({k})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Colunas obrigatórias: <span className="font-mono text-primary">{TABLE_IMPORT_MAP[importTarget]?.required.join(", ")}</span>
              </p>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
            >
              <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Clique para selecionar um arquivo CSV</p>
              <p className="text-xs text-muted-foreground mt-1">A primeira linha deve conter os nomes das colunas</p>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
            </div>

            {importData.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-3 border border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{importData.length} registros carregados</p>
                  <button onClick={() => setImportData([])} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto max-h-40">
                  <table className="text-[10px] w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {Object.keys(importData[0]).map(k => (
                          <th key={k} className="text-left py-1 px-2 text-muted-foreground font-medium">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b border-border/30">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="py-1 px-2 text-foreground truncate max-w-[120px]">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importData.length > 5 && <p className="text-[10px] text-muted-foreground text-center pt-1">…e mais {importData.length - 5} linhas</p>}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setImportOpen(false); setImportData([]); }}>Cancelar</Button>
            <Button size="sm" onClick={doImport} disabled={!importData.length || importing}>
              {importing ? <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5 mr-1.5" />}
              Importar {importData.length > 0 ? `(${importData.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Analytics;
