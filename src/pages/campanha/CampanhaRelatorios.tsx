import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Users, MapPin, Target, TrendingUp, AlertTriangle, CheckCircle2, Clock, BarChart3,
  Eye, Percent, Activity, Zap, Shield, Map,
} from "lucide-react";
import { format, differenceInDays, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ["#1e40af", "#16a34a", "#eab308", "#dc2626", "#6366f1", "#14b8a6", "#f97316", "#ec4899"];

interface Calha {
  id: string; nome: string; municipios: number; votos_validos: number;
  percentual_cristaos: number; potencial_votos: number; regiao: string;
  latitude: number | null; longitude: number | null;
}
interface Coordenador {
  id: string; nome: string; calha_id: string | null; status: string;
  ultimo_contato: string | null; created_at: string;
}
interface Visita {
  id: string; calha_id: string | null; coordenador_id: string | null;
  data_visita: string; status: string; objetivo: string; created_at: string;
}
interface Assessor { id: string; coordenador_id: string | null; nome: string; funcao: string; }
interface Local { id: string; tipo: string; calha_id: string | null; created_at: string; }

const StatMini = ({ icon: Icon, label, value, sub, color = "text-primary" }: any) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
    <div className={`p-2 rounded-lg bg-background ${color}`}><Icon className="w-4 h-4" /></div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </div>
);

const CampanhaRelatorios = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [ca, co, vi, as_, lo] = await Promise.all([
        supabase.from("campanha_calhas").select("*"),
        supabase.from("campanha_coordenadores").select("*"),
        supabase.from("campanha_visitas").select("*"),
        supabase.from("campanha_assessores").select("*"),
        supabase.from("campanha_locais").select("id, tipo, calha_id, created_at"),
      ]);
      setCalhas((ca.data as Calha[]) || []);
      setCoordenadores((co.data as Coordenador[]) || []);
      setVisitas((vi.data as Visita[]) || []);
      setAssessores((as_.data as Assessor[]) || []);
      setLocais((lo.data as Local[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const kpis = useMemo(() => {
    const totalVotos = calhas.reduce((s, c) => s + c.votos_validos, 0);
    const totalPotencial = calhas.reduce((s, c) => s + c.potencial_votos, 0);
    const calhasComCoord = new Set(coordenadores.filter(c => c.calha_id).map(c => c.calha_id));
    const calhasSemCoord = calhas.filter(c => !calhasComCoord.has(c.id));
    const cobertura = calhas.length > 0 ? (calhasComCoord.size / calhas.length) * 100 : 0;

    const coordAtivos = coordenadores.filter(c => c.status === "ativo");
    const coordInativos = coordenadores.filter(c => c.status !== "ativo");

    const hoje = new Date();
    const dias30 = subDays(hoje, 30);
    const dias7 = subDays(hoje, 7);

    const coordSemContato30d = coordenadores.filter(c => {
      if (!c.ultimo_contato) return true;
      return differenceInDays(hoje, parseISO(c.ultimo_contato)) > 30;
    });

    const visitasRealizadas = visitas.filter(v => v.status === "realizada");
    const visitasPlanejadas = visitas.filter(v => v.status === "planejada");
    const visitasCanceladas = visitas.filter(v => v.status === "cancelada");
    const visitasUlt30 = visitas.filter(v => parseISO(v.created_at) >= dias30);
    const visitasUlt7 = visitas.filter(v => parseISO(v.created_at) >= dias7);
    const taxaConversao = visitas.length > 0 ? (visitasRealizadas.length / visitas.length) * 100 : 0;

    const calhasVisitadas = new Set(visitasRealizadas.filter(v => v.calha_id).map(v => v.calha_id));
    const coberturaVisitas = calhas.length > 0 ? (calhasVisitadas.size / calhas.length) * 100 : 0;

    const assessoresPorCoord = coordenadores.map(c => ({
      nome: c.nome,
      assessores: assessores.filter(a => a.coordenador_id === c.id).length,
    })).sort((a, b) => b.assessores - a.assessores);

    const mediaAssessores = coordenadores.length > 0 ? assessores.length / coordenadores.length : 0;

    const locaisPorTipo: Record<string, number> = {};
    locais.forEach(l => { locaisPorTipo[l.tipo] = (locaisPorTipo[l.tipo] || 0) + 1; });

    const calhasComGeo = calhas.filter(c => c.latitude != null);
    const geoCobertura = calhas.length > 0 ? (calhasComGeo.length / calhas.length) * 100 : 0;

    // Per-region analysis
    const regioes: Record<string, { calhas: number; votos: number; potencial: number; coordenadores: number }> = {};
    calhas.forEach(c => {
      const r = c.regiao || "Sem região";
      if (!regioes[r]) regioes[r] = { calhas: 0, votos: 0, potencial: 0, coordenadores: 0 };
      regioes[r].calhas++;
      regioes[r].votos += c.votos_validos;
      regioes[r].potencial += c.potencial_votos;
    });
    coordenadores.forEach(c => {
      const calha = calhas.find(ca => ca.id === c.calha_id);
      const r = calha?.regiao || "Sem região";
      if (regioes[r]) regioes[r].coordenadores++;
    });

    // Visitas por status
    const visitasPorStatus: Record<string, number> = {};
    visitas.forEach(v => { visitasPorStatus[v.status] = (visitasPorStatus[v.status] || 0) + 1; });

    // Top calhas by potential
    const topCalhas = [...calhas].sort((a, b) => b.potencial_votos - a.potencial_votos).slice(0, 10);

    // Radar data per region
    const radarData = Object.entries(regioes).map(([nome, d]) => ({
      regiao: nome.length > 12 ? nome.slice(0, 12) + "…" : nome,
      Calhas: d.calhas,
      Coordenadores: d.coordenadores,
      "Potencial (mil)": Math.round(d.potencial / 1000),
    }));

    // Risk score per calha
    const calhasRisco = calhas.map(c => {
      let risco = 0;
      if (!calhasComCoord.has(c.id)) risco += 3;
      if (!calhasVisitadas.has(c.id)) risco += 2;
      if (c.latitude == null) risco += 1;
      const coordsCalha = coordenadores.filter(co => co.calha_id === c.id);
      if (coordsCalha.length > 0 && coordsCalha.every(co => coordSemContato30d.includes(co))) risco += 2;
      return { ...c, risco };
    }).filter(c => c.risco >= 3).sort((a, b) => b.risco - a.risco);

    return {
      totalVotos, totalPotencial, cobertura, coordAtivos, coordInativos,
      coordSemContato30d, visitasRealizadas, visitasPlanejadas, visitasCanceladas,
      visitasUlt30, visitasUlt7, taxaConversao, coberturaVisitas,
      assessoresPorCoord, mediaAssessores, locaisPorTipo, geoCobertura,
      regioes, visitasPorStatus, topCalhas, radarData, calhasRisco,
      calhasSemCoord, calhasComCoord: calhasComCoord.size,
    };
  }, [calhas, coordenadores, visitas, assessores, locais]);

  if (loading) {
    return (
      <CampanhaLayout title="Relatórios">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </CampanhaLayout>
    );
  }

  const visitasStatusData = Object.entries(kpis.visitasPorStatus).map(([name, value]) => ({ name, value }));
  const locaisData = Object.entries(kpis.locaisPorTipo).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  const regioesData = Object.entries(kpis.regioes).map(([nome, d]) => ({ nome, ...d })).sort((a, b) => b.potencial - a.potencial);

  return (
    <CampanhaLayout title="Relatórios Estratégicos">
      <Tabs defaultValue="visao" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="territorial">Territorial</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="riscos">Riscos</TabsTrigger>
        </TabsList>

        {/* ====== VISÃO GERAL ====== */}
        <TabsContent value="visao" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatMini icon={Target} label="Potencial Total de Votos" value={kpis.totalPotencial.toLocaleString("pt-BR")} sub={`De ${kpis.totalVotos.toLocaleString("pt-BR")} votos válidos`} />
            <StatMini icon={Shield} label="Cobertura de Calhas" value={`${kpis.cobertura.toFixed(0)}%`} sub={`${kpis.calhasComCoord} de ${calhas.length} com coordenador`} color="text-green-600" />
            <StatMini icon={Users} label="Coordenadores Ativos" value={kpis.coordAtivos.length} sub={`${kpis.coordInativos.length} inativos`} />
            <StatMini icon={Eye} label="Visitas Realizadas" value={kpis.visitasRealizadas.length} sub={`Taxa: ${kpis.taxaConversao.toFixed(0)}% de ${visitas.length}`} color="text-blue-600" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatMini icon={Activity} label="Visitas (últ. 7 dias)" value={kpis.visitasUlt7.length} sub="Atividade recente" />
            <StatMini icon={TrendingUp} label="Visitas (últ. 30 dias)" value={kpis.visitasUlt30.length} />
            <StatMini icon={MapPin} label="Locais Mapeados" value={locais.length} sub={`${Object.keys(kpis.locaisPorTipo).length} tipos`} />
            <StatMini icon={Map} label="Calhas Geolocalizadas" value={`${kpis.geoCobertura.toFixed(0)}%`} sub={`${calhas.filter(c => c.latitude != null).length} de ${calhas.length}`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatMini icon={Percent} label="Cobertura de Visitas" value={`${kpis.coberturaVisitas.toFixed(0)}%`} sub="Calhas já visitadas" color="text-emerald-600" />
            <StatMini icon={Users} label="Total Assessores" value={assessores.length} sub={`Média: ${kpis.mediaAssessores.toFixed(1)} por coordenador`} />
            <StatMini icon={AlertTriangle} label="Sem Contato +30d" value={kpis.coordSemContato30d.length} sub="Coordenadores" color="text-destructive" />
            <StatMini icon={Zap} label="Calhas sem Coordenador" value={kpis.calhasSemCoord.length} sub="Atenção necessária" color="text-yellow-600" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Visitas por Status</CardTitle></CardHeader>
              <CardContent>
                {visitasStatusData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={visitasStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                        {visitasStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Locais por Tipo</CardTitle></CardHeader>
              <CardContent>
                {locaisData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={locaisData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                        {locaisData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== TERRITORIAL ====== */}
        <TabsContent value="territorial" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Análise por Região</CardTitle></CardHeader>
            <CardContent>
              {regioesData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regioesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="potencial" name="Potencial Votos" fill="#1e40af" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="votos" name="Votos Válidos" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Radar Regional</CardTitle></CardHeader>
              <CardContent>
                {kpis.radarData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RadarChart data={kpis.radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="regiao" tick={{ fontSize: 10 }} />
                      <PolarRadiusAxis />
                      <Radar name="Calhas" dataKey="Calhas" stroke="#1e40af" fill="#1e40af" fillOpacity={0.3} />
                      <Radar name="Coordenadores" dataKey="Coordenadores" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                      <Tooltip />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Top 10 Calhas — Potencial de Votos</CardTitle></CardHeader>
              <CardContent>
                {kpis.topCalhas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kpis.topCalhas} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                      <Bar dataKey="potencial_votos" name="Potencial" fill="#1e40af" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Region details table */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalhamento Regional</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3 font-semibold">Região</th>
                      <th className="py-2 pr-3 font-semibold text-right">Calhas</th>
                      <th className="py-2 pr-3 font-semibold text-right">Coordenadores</th>
                      <th className="py-2 pr-3 font-semibold text-right">Votos Válidos</th>
                      <th className="py-2 pr-3 font-semibold text-right">Potencial</th>
                      <th className="py-2 font-semibold text-right">Cobertura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regioesData.map((r) => (
                      <tr key={r.nome} className="border-b border-border/50">
                        <td className="py-2 pr-3 font-medium">{r.nome}</td>
                        <td className="py-2 pr-3 text-right">{r.calhas}</td>
                        <td className="py-2 pr-3 text-right">{r.coordenadores}</td>
                        <td className="py-2 pr-3 text-right">{r.votos.toLocaleString("pt-BR")}</td>
                        <td className="py-2 pr-3 text-right">{r.potencial.toLocaleString("pt-BR")}</td>
                        <td className="py-2 text-right">
                          <Badge variant={r.coordenadores >= r.calhas ? "default" : "destructive"} className="text-[10px]">
                            {r.calhas > 0 ? `${Math.min(100, Math.round((r.coordenadores / r.calhas) * 100))}%` : "—"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ====== EQUIPE ====== */}
        <TabsContent value="equipe" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatMini icon={Users} label="Coordenadores" value={coordenadores.length} sub={`${kpis.coordAtivos.length} ativos`} />
            <StatMini icon={Users} label="Assessores" value={assessores.length} sub={`Média: ${kpis.mediaAssessores.toFixed(1)}/coord.`} />
            <StatMini icon={AlertTriangle} label="Sem contato +30d" value={kpis.coordSemContato30d.length} color="text-destructive" />
            <StatMini icon={CheckCircle2} label="Coordenadores Inativos" value={kpis.coordInativos.length} color="text-yellow-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Assessores por Coordenador</CardTitle></CardHeader>
              <CardContent>
                {kpis.assessoresPorCoord.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kpis.assessoresPorCoord.slice(0, 15)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="assessores" name="Assessores" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Coordenadores sem Contato (+30 dias)</CardTitle></CardHeader>
              <CardContent className="max-h-[300px] overflow-y-auto">
                {kpis.coordSemContato30d.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Todos os coordenadores estão em contato!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {kpis.coordSemContato30d.map((c) => {
                      const dias = c.ultimo_contato ? differenceInDays(new Date(), parseISO(c.ultimo_contato)) : null;
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/5 border border-destructive/20">
                          <div>
                            <p className="text-xs font-medium">{c.nome}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {c.ultimo_contato ? `Último contato: ${dias} dias atrás` : "Nunca contatado"}
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-[10px]">
                            {dias ? `${dias}d` : "Nunca"}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== OPERACIONAL ====== */}
        <TabsContent value="operacional" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatMini icon={Eye} label="Total Visitas" value={visitas.length} />
            <StatMini icon={CheckCircle2} label="Realizadas" value={kpis.visitasRealizadas.length} color="text-green-600" />
            <StatMini icon={Clock} label="Planejadas" value={kpis.visitasPlanejadas.length} color="text-blue-600" />
            <StatMini icon={AlertTriangle} label="Canceladas" value={kpis.visitasCanceladas.length} color="text-destructive" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Taxa de Conversão de Visitas</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e40af" strokeWidth="2.5"
                      strokeDasharray={`${kpis.taxaConversao} ${100 - kpis.taxaConversao}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{kpis.taxaConversao.toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Visitas realizadas vs total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Cobertura de Visitas por Calha</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Calhas visitadas</span>
                    <span className="font-semibold">{kpis.coberturaVisitas.toFixed(0)}%</span>
                  </div>
                  <Progress value={kpis.coberturaVisitas} className="h-3" />
                  <p className="text-[10px] text-muted-foreground text-center">
                    {new Set(kpis.visitasRealizadas.filter(v => v.calha_id).map(v => v.calha_id)).size} de {calhas.length} calhas
                  </p>
                </div>
                <div className="w-full max-w-xs space-y-2 mt-4">
                  <div className="flex justify-between text-xs">
                    <span>Cobertura com coordenador</span>
                    <span className="font-semibold">{kpis.cobertura.toFixed(0)}%</span>
                  </div>
                  <Progress value={kpis.cobertura} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ====== RISCOS ====== */}
        <TabsContent value="riscos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Calhas em Risco (Score ≥ 3)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.calhasRisco.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma calha em risco crítico!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 pr-3 font-semibold">Calha</th>
                        <th className="py-2 pr-3 font-semibold">Região</th>
                        <th className="py-2 pr-3 font-semibold text-right">Potencial</th>
                        <th className="py-2 pr-3 font-semibold text-center">Risco</th>
                        <th className="py-2 font-semibold">Problemas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kpis.calhasRisco.map((c: any) => {
                        const problemas: string[] = [];
                        if (!coordenadores.some(co => co.calha_id === c.id)) problemas.push("Sem coordenador");
                        if (!kpis.visitasRealizadas.some(v => v.calha_id === c.id)) problemas.push("Sem visitas");
                        if (c.latitude == null) problemas.push("Sem geolocalização");
                        const coordsCalha = coordenadores.filter(co => co.calha_id === c.id);
                        if (coordsCalha.length > 0 && coordsCalha.every(co => kpis.coordSemContato30d.includes(co))) problemas.push("Contato inativo");
                        return (
                          <tr key={c.id} className="border-b border-border/50">
                            <td className="py-2 pr-3 font-medium">{c.nome}</td>
                            <td className="py-2 pr-3">{c.regiao || "—"}</td>
                            <td className="py-2 pr-3 text-right">{c.potencial_votos.toLocaleString("pt-BR")}</td>
                            <td className="py-2 pr-3 text-center">
                              <Badge variant={c.risco >= 5 ? "destructive" : "secondary"} className="text-[10px]">
                                {c.risco}/8
                              </Badge>
                            </td>
                            <td className="py-2">
                              <div className="flex flex-wrap gap-1">
                                {problemas.map((p) => (
                                  <Badge key={p} variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm">Calhas sem Coordenador</CardTitle></CardHeader>
            <CardContent>
              {kpis.calhasSemCoord.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Todas as calhas possuem coordenador.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {kpis.calhasSemCoord.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-xs">
                      {c.nome} — {c.potencial_votos.toLocaleString("pt-BR")} votos
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </CampanhaLayout>
  );
};

export default CampanhaRelatorios;
