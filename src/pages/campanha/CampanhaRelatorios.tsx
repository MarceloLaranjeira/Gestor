import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import KpiDetailDialog from "@/components/campanha/KpiDetailDialog";
import DiagnosticoSelector from "@/components/campanha/DiagnosticoSelector";
import CampanhaAIDialog from "@/components/campanha/CampanhaAIDialog";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Users, MapPin, Target, TrendingUp, AlertTriangle, CheckCircle2, Clock,
  Eye, Percent, Activity, Zap, Shield, Map, Sparkles,
} from "lucide-react";
import { differenceInDays, parseISO, subDays } from "date-fns";

const COLORS = ["#1e40af", "#16a34a", "#eab308", "#dc2626", "#6366f1", "#14b8a6", "#f97316", "#ec4899"];

interface Calha { id: string; nome: string; municipios: number; votos_validos: number; percentual_cristaos: number; potencial_votos: number; regiao: string; latitude: number | null; longitude: number | null; }
interface Coordenador { id: string; nome: string; calha_id: string | null; status: string; ultimo_contato: string | null; created_at: string; }
interface Visita { id: string; calha_id: string | null; coordenador_id: string | null; data_visita: string; status: string; objetivo: string; created_at: string; }
interface Assessor { id: string; coordenador_id: string | null; nome: string; funcao: string; }
interface Local { id: string; tipo: string; calha_id: string | null; created_at: string; }

interface KpiCard {
  id: string; icon: any; label: string; value: string | number; sub?: string; color?: string;
  details?: { label: string; value: string | number }[]; aiContext: string;
}

const NOTES_KEY = "campanha_kpi_notes";
const loadNotes = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || "{}"); } catch { return {}; }
};
const saveNotes = (notes: Record<string, string>) => localStorage.setItem(NOTES_KEY, JSON.stringify(notes));

const StatMini = ({ icon: Icon, label, value, sub, color = "text-primary", onClick }: any) => (
  <button onClick={onClick}
    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border text-left w-full transition-all hover:scale-[1.02] hover:shadow-md hover:border-primary/30 cursor-pointer group">
    <div className={`p-2 rounded-lg bg-background ${color} group-hover:bg-primary/10 transition-colors`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  </button>
);

const CampanhaRelatorios = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpiNotes, setKpiNotes] = useState<Record<string, string>>(loadNotes);
  const [selectedKpi, setSelectedKpi] = useState<KpiCard | null>(null);

  const updateNote = useCallback((id: string, note: string) => {
    setKpiNotes(prev => {
      const next = { ...prev, [id]: note };
      saveNotes(next);
      return next;
    });
  }, []);

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
    const coordSemContato30d = coordenadores.filter(c => { if (!c.ultimo_contato) return true; return differenceInDays(hoje, parseISO(c.ultimo_contato)) > 30; });
    const visitasRealizadas = visitas.filter(v => v.status === "realizada");
    const visitasPlanejadas = visitas.filter(v => v.status === "planejada");
    const visitasCanceladas = visitas.filter(v => v.status === "cancelada");
    const visitasUlt30 = visitas.filter(v => parseISO(v.created_at) >= dias30);
    const visitasUlt7 = visitas.filter(v => parseISO(v.created_at) >= dias7);
    const taxaConversao = visitas.length > 0 ? (visitasRealizadas.length / visitas.length) * 100 : 0;
    const calhasVisitadas = new Set(visitasRealizadas.filter(v => v.calha_id).map(v => v.calha_id));
    const coberturaVisitas = calhas.length > 0 ? (calhasVisitadas.size / calhas.length) * 100 : 0;
    const assessoresPorCoord = coordenadores.map(c => ({ nome: c.nome, assessores: assessores.filter(a => a.coordenador_id === c.id).length })).sort((a, b) => b.assessores - a.assessores);
    const mediaAssessores = coordenadores.length > 0 ? assessores.length / coordenadores.length : 0;
    const locaisPorTipo: Record<string, number> = {}; locais.forEach(l => { locaisPorTipo[l.tipo] = (locaisPorTipo[l.tipo] || 0) + 1; });
    const calhasComGeo = calhas.filter(c => c.latitude != null);
    const geoCobertura = calhas.length > 0 ? (calhasComGeo.length / calhas.length) * 100 : 0;
    const regioes: Record<string, { calhas: number; votos: number; potencial: number; coordenadores: number }> = {};
    calhas.forEach(c => { const r = c.regiao || "Sem região"; if (!regioes[r]) regioes[r] = { calhas: 0, votos: 0, potencial: 0, coordenadores: 0 }; regioes[r].calhas++; regioes[r].votos += c.votos_validos; regioes[r].potencial += c.potencial_votos; });
    coordenadores.forEach(c => { const calha = calhas.find(ca => ca.id === c.calha_id); const r = calha?.regiao || "Sem região"; if (regioes[r]) regioes[r].coordenadores++; });
    const visitasPorStatus: Record<string, number> = {}; visitas.forEach(v => { visitasPorStatus[v.status] = (visitasPorStatus[v.status] || 0) + 1; });
    const topCalhas = [...calhas].sort((a, b) => b.potencial_votos - a.potencial_votos).slice(0, 10);
    const radarData = Object.entries(regioes).map(([nome, d]) => ({ regiao: nome.length > 12 ? nome.slice(0, 12) + "…" : nome, Calhas: d.calhas, Coordenadores: d.coordenadores, "Potencial (mil)": Math.round(d.potencial / 1000) }));
    const calhasRisco = calhas.map(c => { let risco = 0; if (!calhasComCoord.has(c.id)) risco += 3; if (!calhasVisitadas.has(c.id)) risco += 2; if (c.latitude == null) risco += 1; const cc = coordenadores.filter(co => co.calha_id === c.id); if (cc.length > 0 && cc.every(co => coordSemContato30d.includes(co))) risco += 2; return { ...c, risco }; }).filter(c => c.risco >= 3).sort((a, b) => b.risco - a.risco);

    return { totalVotos, totalPotencial, cobertura, coordAtivos, coordInativos, coordSemContato30d, visitasRealizadas, visitasPlanejadas, visitasCanceladas, visitasUlt30, visitasUlt7, taxaConversao, coberturaVisitas, assessoresPorCoord, mediaAssessores, locaisPorTipo, geoCobertura, regioes, visitasPorStatus, topCalhas, radarData, calhasRisco, calhasSemCoord, calhasComCoord: calhasComCoord.size };
  }, [calhas, coordenadores, visitas, assessores, locais]);

  // Build KPI card definitions
  const kpiCards: KpiCard[] = useMemo(() => [
    { id: "potencial", icon: Target, label: "Potencial Total de Votos", value: kpis.totalPotencial.toLocaleString("pt-BR"), sub: `De ${kpis.totalVotos.toLocaleString("pt-BR")} votos válidos`,
      details: [{ label: "Votos válidos", value: kpis.totalVotos.toLocaleString("pt-BR") }, { label: "Potencial estimado", value: kpis.totalPotencial.toLocaleString("pt-BR") }, { label: "Taxa de conversão", value: `${kpis.totalVotos > 0 ? ((kpis.totalPotencial / kpis.totalVotos) * 100).toFixed(1) : 0}%` }],
      aiContext: `Potencial Total de Votos = ${kpis.totalPotencial.toLocaleString("pt-BR")} de ${kpis.totalVotos.toLocaleString("pt-BR")} votos válidos. Analise como maximizar a captação.` },
    { id: "cobertura", icon: Shield, label: "Cobertura de Calhas", value: `${kpis.cobertura.toFixed(0)}%`, sub: `${kpis.calhasComCoord} de ${calhas.length} com coordenador`, color: "text-green-600",
      details: [{ label: "Com coordenador", value: kpis.calhasComCoord }, { label: "Sem coordenador", value: kpis.calhasSemCoord.length }, { label: "Total calhas", value: calhas.length }],
      aiContext: `Cobertura de Calhas = ${kpis.cobertura.toFixed(0)}%. Sem coordenador: ${kpis.calhasSemCoord.map(c => c.nome).join(", ")}` },
    { id: "coord_ativos", icon: Users, label: "Coordenadores Ativos", value: kpis.coordAtivos.length, sub: `${kpis.coordInativos.length} inativos`,
      details: [{ label: "Ativos", value: kpis.coordAtivos.length }, { label: "Inativos", value: kpis.coordInativos.length }, { label: "Total", value: coordenadores.length }],
      aiContext: `Coordenadores: ${kpis.coordAtivos.length} ativos, ${kpis.coordInativos.length} inativos de ${coordenadores.length} total.` },
    { id: "visitas_realizadas", icon: Eye, label: "Visitas Realizadas", value: kpis.visitasRealizadas.length, sub: `Taxa: ${kpis.taxaConversao.toFixed(0)}% de ${visitas.length}`, color: "text-blue-600",
      details: [{ label: "Realizadas", value: kpis.visitasRealizadas.length }, { label: "Planejadas", value: kpis.visitasPlanejadas.length }, { label: "Canceladas", value: kpis.visitasCanceladas.length }, { label: "Taxa conversão", value: `${kpis.taxaConversao.toFixed(0)}%` }],
      aiContext: `Visitas: ${kpis.visitasRealizadas.length} realizadas, ${kpis.visitasPlanejadas.length} planejadas, ${kpis.visitasCanceladas.length} canceladas. Taxa: ${kpis.taxaConversao.toFixed(0)}%.` },
    { id: "visitas_7d", icon: Activity, label: "Visitas (últ. 7 dias)", value: kpis.visitasUlt7.length, sub: "Atividade recente",
      details: [{ label: "Últimos 7 dias", value: kpis.visitasUlt7.length }, { label: "Últimos 30 dias", value: kpis.visitasUlt30.length }, { label: "Total histórico", value: visitas.length }],
      aiContext: `Atividade: ${kpis.visitasUlt7.length} visitas em 7d, ${kpis.visitasUlt30.length} em 30d, ${visitas.length} total.` },
    { id: "visitas_30d", icon: TrendingUp, label: "Visitas (últ. 30 dias)", value: kpis.visitasUlt30.length,
      details: [{ label: "Últimos 30 dias", value: kpis.visitasUlt30.length }, { label: "Média semanal", value: (kpis.visitasUlt30.length / 4).toFixed(1) }],
      aiContext: `${kpis.visitasUlt30.length} visitas em 30 dias. Tendência e produtividade.` },
    { id: "locais", icon: MapPin, label: "Locais Mapeados", value: locais.length, sub: `${Object.keys(kpis.locaisPorTipo).length} tipos`,
      details: Object.entries(kpis.locaisPorTipo).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v })),
      aiContext: `${locais.length} locais: ${Object.entries(kpis.locaisPorTipo).map(([k,v]) => `${k}: ${v}`).join(", ")}.` },
    { id: "geo", icon: Map, label: "Calhas Geolocalizadas", value: `${kpis.geoCobertura.toFixed(0)}%`, sub: `${calhas.filter(c => c.latitude != null).length} de ${calhas.length}`,
      details: [{ label: "Geolocalizadas", value: calhas.filter(c => c.latitude != null).length }, { label: "Sem geolocalização", value: calhas.filter(c => c.latitude == null).length }],
      aiContext: `${kpis.geoCobertura.toFixed(0)}% geolocalizadas. Sem geo: ${calhas.filter(c => c.latitude == null).map(c => c.nome).join(", ") || "nenhuma"}.` },
    { id: "cobertura_visitas", icon: Percent, label: "Cobertura de Visitas", value: `${kpis.coberturaVisitas.toFixed(0)}%`, sub: "Calhas já visitadas", color: "text-emerald-600",
      details: [{ label: "Calhas visitadas", value: `${kpis.coberturaVisitas.toFixed(0)}%` }, { label: "Com coordenador", value: `${kpis.cobertura.toFixed(0)}%` }],
      aiContext: `Cobertura visitas: ${kpis.coberturaVisitas.toFixed(0)}% calhas visitadas.` },
    { id: "assessores", icon: Users, label: "Total Assessores", value: assessores.length, sub: `Média: ${kpis.mediaAssessores.toFixed(1)} por coordenador`,
      details: [{ label: "Total", value: assessores.length }, { label: "Média/coordenador", value: kpis.mediaAssessores.toFixed(1) }, ...kpis.assessoresPorCoord.slice(0, 5).map(a => ({ label: a.nome, value: a.assessores }))],
      aiContext: `${assessores.length} assessores, média ${kpis.mediaAssessores.toFixed(1)}. Top: ${kpis.assessoresPorCoord.slice(0, 5).map(a => `${a.nome}: ${a.assessores}`).join(", ")}.` },
    { id: "sem_contato", icon: AlertTriangle, label: "Sem Contato +30d", value: kpis.coordSemContato30d.length, sub: "Coordenadores", color: "text-destructive",
      details: kpis.coordSemContato30d.slice(0, 8).map(c => ({ label: c.nome, value: c.ultimo_contato ? `${differenceInDays(new Date(), parseISO(c.ultimo_contato))}d` : "Nunca" })),
      aiContext: `ALERTA: ${kpis.coordSemContato30d.length} sem contato +30d: ${kpis.coordSemContato30d.map(c => c.nome).join(", ")}.` },
    { id: "sem_coord", icon: Zap, label: "Calhas sem Coordenador", value: kpis.calhasSemCoord.length, sub: "Atenção necessária", color: "text-yellow-600",
      details: kpis.calhasSemCoord.map(c => ({ label: c.nome, value: `${c.potencial_votos.toLocaleString("pt-BR")} votos` })),
      aiContext: `${kpis.calhasSemCoord.length} calhas sem coordenador: ${kpis.calhasSemCoord.map(c => `${c.nome} (${c.potencial_votos} votos)`).join(", ")}.` },
  ], [kpis, calhas, coordenadores, visitas, assessores, locais]);

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

  const renderKpiGrid = (ids: string[]) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {ids.map(id => {
        const k = kpiCards.find(c => c.id === id);
        if (!k) return null;
        return <StatMini key={k.id} icon={k.icon} label={k.label} value={k.value} sub={k.sub} color={k.color} onClick={() => setSelectedKpi(k)} />;
      })}
    </div>
  );

  return (
    <CampanhaLayout title="Relatórios Estratégicos">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">💡 Clique em qualquer card para ver detalhes e analisar com Horus</p>
        <DiagnosticoSelector kpis={kpiCards.map(k => ({ id: k.id, label: k.label, context: `${k.label} = ${k.value}. ${k.aiContext}` }))} />
      </div>

      {/* KPI Detail Dialog */}
      {selectedKpi && (
        <KpiDetailDialog
          open={!!selectedKpi}
          onOpenChange={(v) => !v && setSelectedKpi(null)}
          icon={selectedKpi.icon}
          label={selectedKpi.label}
          value={selectedKpi.value}
          sub={selectedKpi.sub}
          color={selectedKpi.color}
          details={selectedKpi.details}
          notes={kpiNotes[selectedKpi.id]}
          onNotesChange={(note) => updateNote(selectedKpi.id, note)}
          aiContext={selectedKpi.aiContext}
        />
      )}

      <Tabs defaultValue="visao" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="visao">Visão Geral</TabsTrigger>
          <TabsTrigger value="territorial">Territorial</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="operacional">Operacional</TabsTrigger>
          <TabsTrigger value="riscos">Riscos</TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="visao" className="space-y-4">
          {renderKpiGrid(["potencial", "cobertura", "coord_ativos", "visitas_realizadas"])}
          {renderKpiGrid(["visitas_7d", "visitas_30d", "locais", "geo"])}
          {renderKpiGrid(["cobertura_visitas", "assessores", "sem_contato", "sem_coord"])}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Visitas por Status</CardTitle></CardHeader>
              <CardContent>
                {visitasStatusData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={visitasStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                      {visitasStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /><Legend /></PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Locais por Tipo</CardTitle></CardHeader>
              <CardContent>
                {locaisData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart><Pie data={locaisData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                      {locaisData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie><Tooltip /><Legend /></PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TERRITORIAL */}
        <TabsContent value="territorial" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Análise por Região</CardTitle></CardHeader>
            <CardContent>
              {regioesData.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regioesData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Legend />
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
                    <RadarChart data={kpis.radarData}><PolarGrid /><PolarAngleAxis dataKey="regiao" tick={{ fontSize: 10 }} /><PolarRadiusAxis />
                      <Radar name="Calhas" dataKey="Calhas" stroke="#1e40af" fill="#1e40af" fillOpacity={0.3} />
                      <Radar name="Coordenadores" dataKey="Coordenadores" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                      <Tooltip /><Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Top 10 Calhas — Potencial</CardTitle></CardHeader>
              <CardContent>
                {kpis.topCalhas.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kpis.topCalhas} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="nome" type="category" width={100} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                      <Bar dataKey="potencial_votos" name="Potencial" fill="#1e40af" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Detalhamento Regional</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b text-left">
                    <th className="py-2 pr-3 font-semibold">Região</th><th className="py-2 pr-3 font-semibold text-right">Calhas</th>
                    <th className="py-2 pr-3 font-semibold text-right">Coordenadores</th><th className="py-2 pr-3 font-semibold text-right">Votos Válidos</th>
                    <th className="py-2 pr-3 font-semibold text-right">Potencial</th><th className="py-2 font-semibold text-right">Cobertura</th>
                  </tr></thead>
                  <tbody>
                    {regioesData.map((r) => (
                      <tr key={r.nome} className="border-b border-border/50"><td className="py-2 pr-3 font-medium">{r.nome}</td>
                        <td className="py-2 pr-3 text-right">{r.calhas}</td><td className="py-2 pr-3 text-right">{r.coordenadores}</td>
                        <td className="py-2 pr-3 text-right">{r.votos.toLocaleString("pt-BR")}</td><td className="py-2 pr-3 text-right">{r.potencial.toLocaleString("pt-BR")}</td>
                        <td className="py-2 text-right"><Badge variant={r.coordenadores >= r.calhas ? "default" : "destructive"} className="text-[10px]">{r.calhas > 0 ? `${Math.min(100, Math.round((r.coordenadores / r.calhas) * 100))}%` : "—"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EQUIPE */}
        <TabsContent value="equipe" className="space-y-4">
          {renderKpiGrid(["coord_ativos", "assessores", "sem_contato"])}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Assessores por Coordenador</CardTitle></CardHeader>
              <CardContent>
                {kpis.assessoresPorCoord.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kpis.assessoresPorCoord.slice(0, 15)} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 10 }} /><Tooltip />
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
                  <div className="text-center py-8"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Todos em contato!</p></div>
                ) : (
                  <div className="space-y-2">
                    {kpis.coordSemContato30d.map((c) => {
                      const dias = c.ultimo_contato ? differenceInDays(new Date(), parseISO(c.ultimo_contato)) : null;
                      return (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-md bg-destructive/5 border border-destructive/20">
                          <div><p className="text-xs font-medium">{c.nome}</p><p className="text-[10px] text-muted-foreground">{c.ultimo_contato ? `${dias} dias atrás` : "Nunca contatado"}</p></div>
                          <Badge variant="destructive" className="text-[10px]">{dias ? `${dias}d` : "Nunca"}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* OPERACIONAL */}
        <TabsContent value="operacional" className="space-y-4">
          {renderKpiGrid(["visitas_realizadas", "visitas_7d", "visitas_30d", "cobertura_visitas"])}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Taxa de Conversão de Visitas</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray={`${kpis.taxaConversao} ${100 - kpis.taxaConversao}`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl font-bold">{kpis.taxaConversao.toFixed(0)}%</span></div>
                </div>
                <p className="text-xs text-muted-foreground">Visitas realizadas vs total</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Cobertura por Calha</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center gap-3 py-6">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-xs"><span>Calhas visitadas</span><span className="font-semibold">{kpis.coberturaVisitas.toFixed(0)}%</span></div>
                  <Progress value={kpis.coberturaVisitas} className="h-3" />
                </div>
                <div className="w-full max-w-xs space-y-2 mt-4">
                  <div className="flex justify-between text-xs"><span>Cobertura com coordenador</span><span className="font-semibold">{kpis.cobertura.toFixed(0)}%</span></div>
                  <Progress value={kpis.cobertura} className="h-3" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RISCOS */}
        <TabsContent value="riscos" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" />Calhas em Risco (Score ≥ 3)</CardTitle></CardHeader>
            <CardContent>
              {kpis.calhasRisco.length === 0 ? (
                <div className="text-center py-8"><CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Nenhuma calha em risco crítico!</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b text-left"><th className="py-2 pr-3 font-semibold">Calha</th><th className="py-2 pr-3 font-semibold">Região</th><th className="py-2 pr-3 font-semibold text-right">Potencial</th><th className="py-2 pr-3 font-semibold text-center">Risco</th><th className="py-2 font-semibold">Problemas</th></tr></thead>
                    <tbody>
                      {kpis.calhasRisco.map((c: any) => {
                        const problemas: string[] = [];
                        if (!coordenadores.some(co => co.calha_id === c.id)) problemas.push("Sem coordenador");
                        if (!kpis.visitasRealizadas.some(v => v.calha_id === c.id)) problemas.push("Sem visitas");
                        if (c.latitude == null) problemas.push("Sem geolocalização");
                        return (
                          <tr key={c.id} className="border-b border-border/50"><td className="py-2 pr-3 font-medium">{c.nome}</td><td className="py-2 pr-3">{c.regiao || "—"}</td>
                            <td className="py-2 pr-3 text-right">{c.potencial_votos.toLocaleString("pt-BR")}</td>
                            <td className="py-2 pr-3 text-center"><Badge variant={c.risco >= 5 ? "destructive" : "secondary"} className="text-[10px]">{c.risco}/8</Badge></td>
                            <td className="py-2"><div className="flex flex-wrap gap-1">{problemas.map(p => <Badge key={p} variant="outline" className="text-[10px] border-destructive/30 text-destructive">{p}</Badge>)}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          {renderKpiGrid(["sem_coord", "sem_contato"])}
        </TabsContent>
      </Tabs>
    </CampanhaLayout>
  );
};

export default CampanhaRelatorios;
