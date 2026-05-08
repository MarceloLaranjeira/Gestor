import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Frown,
  Loader2,
  Meh,
  MessageSquare,
  Smile,
  TrendingUp,
  Users,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SAC_SETORES } from "@/data/sacSetores";

interface NPSRespostas {
  atendimento_satisfatorio: boolean | null;
  problema_resolvido: boolean | null;
  recomendaria: boolean | null;
  nota: number | null;
  comentario: string;
}

interface LogbookEntrada {
  id: string;
  demanda_id: string | null;
  acao: string;
  descricao: string;
  created_at: string;
  user_id: string;
}

interface DemandaInfo {
  id: string;
  titulo: string;
  solicitante: string;
  setor_sac: string | null;
  coluna_kanban: string;
}

interface NPSEntry {
  id: string;
  demanda_id: string | null;
  created_at: string;
  respostas: NPSRespostas;
  demanda: DemandaInfo | null;
}

type Categoria = "promotor" | "neutro" | "detrator";

const getCategoria = (nota: number | null): Categoria | null => {
  if (nota === null) return null;
  if (nota >= 9) return "promotor";
  if (nota >= 7) return "neutro";
  return "detrator";
};

const CATEGORIA_CONFIG: Record<Categoria, { label: string; color: string; bg: string; icon: typeof Smile; range: string }> = {
  promotor: { label: "Promotores", color: "#22c55e", bg: "bg-green-500/10 text-green-600 dark:text-green-400", icon: Smile, range: "9 a 10" },
  neutro: { label: "Neutros", color: "#f59e0b", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400", icon: Meh, range: "7 a 8" },
  detrator: { label: "Detratores", color: "#ef4444", bg: "bg-red-500/10 text-red-600 dark:text-red-400", icon: Frown, range: "0 a 6" },
};

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs space-y-1">
      {label && <p className="font-semibold text-foreground mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.fill }} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.fill }} />
          {entry.name}: <span className="font-bold">{entry.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function RelatorioNPS() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<NPSEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSetor, setFilterSetor] = useState("all");
  const [filterPeriodo, setFilterPeriodo] = useState("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: logRows, error: logError } = await supabase
          .from("logbook_entradas")
          .select("id, demanda_id, acao, descricao, created_at, user_id")
          .eq("acao", "nps")
          .order("created_at", { ascending: false });

        if (logError) throw logError;

        const rows = (logRows as LogbookEntrada[]) || [];
        const demandaIds = [...new Set(rows.map((r) => r.demanda_id).filter(Boolean))] as string[];

        let demandasMap: Record<string, DemandaInfo> = {};
        if (demandaIds.length > 0) {
          const { data: demandasRows } = await supabase
            .from("demandas")
            .select("id, titulo, solicitante, setor_sac, coluna_kanban")
            .in("id", demandaIds);
          (demandasRows as DemandaInfo[] || []).forEach((d) => { demandasMap[d.id] = d; });
        }

        const parsed: NPSEntry[] = rows.map((row) => {
          let respostas: NPSRespostas = { atendimento_satisfatorio: null, problema_resolvido: null, recomendaria: null, nota: null, comentario: "" };
          try { respostas = JSON.parse(row.descricao) as NPSRespostas; } catch {}
          return {
            id: row.id,
            demanda_id: row.demanda_id,
            created_at: row.created_at,
            respostas,
            demanda: row.demanda_id ? demandasMap[row.demanda_id] ?? null : null,
          };
        });

        setEntries(parsed);
      } catch (error) {
        toast({ title: "Erro ao carregar dados NPS", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [toast]);

  const filtered = useMemo(() => {
    const now = new Date();
    return entries.filter((e) => {
      if (filterSetor !== "all" && e.demanda?.setor_sac !== filterSetor) return false;
      if (filterPeriodo !== "all") {
        const created = new Date(e.created_at);
        const diffMs = now.getTime() - created.getTime();
        const diffDays = diffMs / 86400000;
        if (filterPeriodo === "7" && diffDays > 7) return false;
        if (filterPeriodo === "30" && diffDays > 30) return false;
        if (filterPeriodo === "90" && diffDays > 90) return false;
      }
      return true;
    });
  }, [entries, filterSetor, filterPeriodo]);

  const withNota = useMemo(() => filtered.filter((e) => e.respostas.nota !== null), [filtered]);

  const counts = useMemo(() => {
    const promotores = withNota.filter((e) => getCategoria(e.respostas.nota) === "promotor").length;
    const neutros = withNota.filter((e) => getCategoria(e.respostas.nota) === "neutro").length;
    const detratores = withNota.filter((e) => getCategoria(e.respostas.nota) === "detrator").length;
    const total = withNota.length;
    const npsScore = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : null;
    return { promotores, neutros, detratores, total, npsScore };
  }, [withNota]);

  const simNaoCounts = useMemo(() => {
    const atend = filtered.filter((e) => e.respostas.atendimento_satisfatorio === true).length;
    const resolvido = filtered.filter((e) => e.respostas.problema_resolvido === true).length;
    const recomenda = filtered.filter((e) => e.respostas.recomendaria === true).length;
    const n = filtered.filter((e) => e.respostas.atendimento_satisfatorio !== null).length;
    const pct = (v: number) => (n > 0 ? Math.round((v / n) * 100) : 0);
    return { atend, resolvido, recomenda, n, pctAtend: pct(atend), pctResolvido: pct(resolvido), pctRecomenda: pct(recomenda) };
  }, [filtered]);

  const distribuicaoNotas = useMemo(() => {
    const map: Record<number, number> = {};
    for (let i = 0; i <= 10; i++) map[i] = 0;
    withNota.forEach((e) => { if (e.respostas.nota !== null) map[e.respostas.nota]++; });
    return Array.from({ length: 11 }, (_, i) => ({
      nota: String(i),
      qtd: map[i],
      fill: i >= 9 ? "#22c55e" : i >= 7 ? "#f59e0b" : "#ef4444",
    }));
  }, [withNota]);

  const evolucaoMensal = useMemo(() => {
    const map: Record<string, { promotores: number; detratores: number; neutros: number }> = {};
    withNota.forEach((e) => {
      const d = new Date(e.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[key]) map[key] = { promotores: 0, detratores: 0, neutros: 0 };
      const cat = getCategoria(e.respostas.nota);
      if (cat) map[key][cat === "promotor" ? "promotores" : cat === "neutro" ? "neutros" : "detratores"]++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, val]) => {
        const [year, month] = key.split("-");
        return { mes: `${MONTHS_PT[Number(month) - 1]}/${year.slice(2)}`, ...val };
      });
  }, [withNota]);

  const pieData = useMemo(() => [
    { name: "Promotores", value: counts.promotores, fill: "#22c55e" },
    { name: "Neutros", value: counts.neutros, fill: "#f59e0b" },
    { name: "Detratores", value: counts.detratores, fill: "#ef4444" },
  ].filter((d) => d.value > 0), [counts]);

  const npsColor = counts.npsScore === null ? "text-muted-foreground"
    : counts.npsScore >= 75 ? "text-green-500"
    : counts.npsScore >= 50 ? "text-green-400"
    : counts.npsScore >= 25 ? "text-amber-500"
    : counts.npsScore >= 0 ? "text-amber-400"
    : "text-red-500";

  const npsLabel = counts.npsScore === null ? "—"
    : counts.npsScore >= 75 ? "Excelente"
    : counts.npsScore >= 50 ? "Muito Bom"
    : counts.npsScore >= 25 ? "Favorável"
    : counts.npsScore >= 0 ? "Neutro"
    : "Crítico";

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Relatório NPS</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Pesquisa de satisfação dos beneficiários · Demandas SAC</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={filterSetor} onValueChange={setFilterSetor}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {SAC_SETORES.map((s) => <SelectItem key={s.slug} value={s.slug}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* NPS Score Principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Score NPS */}
          <div className="sm:col-span-2 lg:col-span-1 bg-card border border-border/60 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 mb-1">Score NPS</p>
            <p className={cn("text-6xl font-black", npsColor)}>
              {counts.npsScore !== null ? counts.npsScore : "—"}
            </p>
            <p className={cn("text-sm font-semibold mt-1", npsColor)}>{npsLabel}</p>
            <p className="text-[10px] text-muted-foreground mt-2">{counts.total} avaliações com nota</p>
            <p className="text-[9px] text-muted-foreground/60 mt-1">NPS = %Promotores − %Detratores</p>
          </div>

          {/* Categorias */}
          {(["promotor", "neutro", "detrator"] as Categoria[]).map((cat) => {
            const cfg = CATEGORIA_CONFIG[cat];
            const Icon = cfg.icon;
            const val = counts[cat === "promotor" ? "promotores" : cat === "neutro" ? "neutros" : "detratores"];
            const pct = counts.total > 0 ? Math.round((val / counts.total) * 100) : 0;
            return (
              <div key={cat} className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", cfg.bg.split(" ")[0])}>
                    <Icon className={cn("w-4 h-4", cfg.bg.split(" ").slice(1).join(" "))} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground">{cfg.range}</span>
                </div>
                <p className="text-2xl font-black text-foreground">{val}</p>
                <p className="text-xs font-semibold text-muted-foreground">{cfg.label}</p>
                <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.color }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{pct}% do total</p>
              </div>
            );
          })}
        </div>

        {/* Métricas Sim/Não */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Atendimento satisfatório", pct: simNaoCounts.pctAtend, val: simNaoCounts.atend, icon: CheckCircle2, color: "text-green-500" },
            { label: "Problema resolvido", pct: simNaoCounts.pctResolvido, val: simNaoCounts.resolvido, icon: Award, color: "text-blue-500" },
            { label: "Recomendaria o serviço", pct: simNaoCounts.pctRecomenda, val: simNaoCounts.recomenda, icon: TrendingUp, color: "text-purple-500" },
          ].map(({ label, pct, val, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border/60 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Icon className={cn("w-4 h-4", color)} />
                <p className="text-xs font-medium text-foreground">{label}</p>
              </div>
              <p className="text-3xl font-black text-foreground">{pct}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{val} de {simNaoCounts.n} responderam Sim</p>
              <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Distribuição por nota */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Distribuição por Nota (0–10)</p>
            {withNota.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">Nenhum dado</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distribuicaoNotas} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="nota" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="qtd" name="Respostas" radius={[4, 4, 0, 0]}>
                    {distribuicaoNotas.map((entry) => <Cell key={entry.nota} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex gap-4 mt-3 justify-center">
              {(["detrator", "neutro", "promotor"] as Categoria[]).map((cat) => (
                <span key={cat} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: CATEGORIA_CONFIG[cat].color }} />
                  {CATEGORIA_CONFIG[cat].label} ({CATEGORIA_CONFIG[cat].range})
                </span>
              ))}
            </div>
          </div>

          {/* Pizza de categorias */}
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Distribuição por Categoria</p>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">Nenhum dado</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [value, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Evolução mensal */}
        {evolucaoMensal.length > 0 && (
          <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
            <p className="text-sm font-semibold text-foreground mb-4">Evolução Mensal</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="promotores" name="Promotores" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="neutros" name="Neutros" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="detratores" name="Detratores" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Perfis de beneficiários */}
        <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Perfis dos Beneficiários</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{filtered.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-xs">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma resposta NPS encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {filtered.map((entry) => {
                const cat = getCategoria(entry.respostas.nota);
                const cfg = cat ? CATEGORIA_CONFIG[cat] : null;
                const Icon = cfg?.icon ?? Meh;
                return (
                  <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border/50 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", cfg ? cfg.bg.split(" ")[0] : "bg-muted")}>
                        <Icon className={cn("w-4 h-4", cfg ? cfg.bg.split(" ").slice(1).join(" ") : "text-muted-foreground")} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{entry.demanda?.solicitante || "Sem nome"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{entry.demanda?.titulo || "Demanda não identificada"}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {entry.demanda?.setor_sac && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{entry.demanda.setor_sac}</span>
                      )}
                      {entry.respostas.nota !== null && (
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", cfg?.bg ?? "bg-muted text-muted-foreground")}>
                          Nota {entry.respostas.nota} · {cfg?.label ?? "—"}
                        </span>
                      )}
                      <div className="flex gap-1">
                        {[
                          { key: "atendimento_satisfatorio" as const, title: "Atend." },
                          { key: "problema_resolvido" as const, title: "Resolvido" },
                          { key: "recomendaria" as const, title: "Recomenda" },
                        ].map(({ key, title }) => {
                          const val = entry.respostas[key];
                          return val !== null ? (
                            <span key={key} className={cn("text-[9px] px-1.5 py-0.5 rounded font-medium", val ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500")}>
                              {title}: {val ? "Sim" : "Não"}
                            </span>
                          ) : null;
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">{new Date(entry.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    {entry.respostas.comentario && (
                      <div className="w-full sm:w-auto flex items-start gap-1 mt-1 sm:mt-0">
                        <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground italic line-clamp-2">{entry.respostas.comentario}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </AppLayout>
  );
}
