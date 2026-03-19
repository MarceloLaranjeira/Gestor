import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Brain, Droplets, Heart, Users,
  FileText, Scale, ArrowRight, TrendingUp, CheckCircle2,
  AlertCircle, Clock, Gavel, ScrollText, GitFork, BarChart3,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface Causa {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  status: string;
  impacto_estimado: number;
  cor: string;
  icone: string;
}

interface Propositura {
  id: string;
  numero: string;
  titulo: string;
  tipo: string;
  status: string;
  data_apresentacao: string | null;
  causa_id: string | null;
  beneficiarios: number;
}

interface Stats {
  total: number;
  leis_sancionadas: number;
  projetos: number;
  indicacoes: number;
  emendas: number;
  requerimentos: number;
  total_beneficiarios: number;
  aprovadas: number;
}

const CAUSA_ICONS: Record<string, React.ElementType> = {
  PROTECAO_MULHER: Shield,
  INCLUSAO_PCD: Users,
  AUTISMO_TEA: Brain,
  SANEAMENTO_BASICO: Droplets,
  DIGNIDADE_SOCIAL: Heart,
};

const TIPO_COLORS: Record<string, string> = {
  LEI_SANCIONADA:  "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  PROJETO_LEI:     "bg-blue-500/15 text-blue-600 border-blue-500/30",
  INDICACAO:       "bg-amber-500/15 text-amber-600 border-amber-500/30",
  EMENDA:          "bg-purple-500/15 text-purple-600 border-purple-500/30",
  REQUERIMENTO:    "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

const TIPO_LABELS: Record<string, string> = {
  LEI_SANCIONADA: "Lei Sancionada",
  PROJETO_LEI:    "Projeto de Lei",
  INDICACAO:      "Indicação",
  EMENDA:         "Emenda",
  REQUERIMENTO:   "Requerimento",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  Sancionada:    CheckCircle2,
  Aprovada:      CheckCircle2,
  "Em Discussão": Clock,
  Apresentada:   FileText,
  Arquivada:     AlertCircle,
};

const STATUS_COLOR: Record<string, string> = {
  Sancionada:    "text-emerald-500",
  Aprovada:      "text-blue-500",
  "Em Discussão": "text-amber-500",
  Apresentada:   "text-slate-400",
  Arquivada:     "text-destructive",
};

const quickLinks = [
  { label: "Proposituras", path: "/parlamentar/proposituras", icon: ScrollText, desc: "Gerenciar todas as proposituras" },
  { label: "Fiscalização", path: "/parlamentar/fiscalizacao", icon: Gavel, desc: "CPIs e gabinete de fiscalização" },
  { label: "Trajetória", path: "/parlamentar/trajetoria", icon: GitFork, desc: "Linha do tempo política" },
];

export default function RadarCausas() {
  const [causas, setCausas] = useState<Causa[]>([]);
  const [proposituras, setProposituras] = useState<Propositura[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, leis_sancionadas: 0, projetos: 0, indicacoes: 0, emendas: 0, requerimentos: 0, total_beneficiarios: 0, aprovadas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [causasRes, propRes] = await Promise.all([
        supabase.from("causas_sociais").select("*").order("categoria"),
        supabase.from("proposituras").select("id, numero, titulo, tipo, status, data_apresentacao, causa_id, beneficiarios").order("created_at", { ascending: false }),
      ]);

      const props = propRes.data || [];
      setCausas(causasRes.data || []);
      setProposituras(props);

      setStats({
        total: props.length,
        leis_sancionadas: props.filter(p => p.tipo === "LEI_SANCIONADA").length,
        projetos:         props.filter(p => p.tipo === "PROJETO_LEI").length,
        indicacoes:       props.filter(p => p.tipo === "INDICACAO").length,
        emendas:          props.filter(p => p.tipo === "EMENDA").length,
        requerimentos:    props.filter(p => p.tipo === "REQUERIMENTO").length,
        total_beneficiarios: props.reduce((s, p) => s + (p.beneficiarios || 0), 0),
        aprovadas: props.filter(p => ["Aprovada", "Sancionada"].includes(p.status)).length,
      });
      setLoading(false);
    };
    load();
  }, []);

  const countForCausa = (causaId: string) => proposituras.filter(p => p.causa_id === causaId).length;
  const leisForCausa  = (causaId: string) => proposituras.filter(p => p.causa_id === causaId && p.tipo === "LEI_SANCIONADA").length;
  const maxProp = Math.max(...causas.map(c => countForCausa(c.id)), 1);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Gestão Parlamentar</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Radar de Causas · Vereadora Thaysa Lippi · Câmara Municipal de Manaus
          </p>
        </div>

        {/* KPI Cards */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {[
              { label: "Leis Sancionadas", value: stats.leis_sancionadas, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Total Proposituras", value: stats.total, icon: FileText, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "Aprovadas / Sancionadas", value: stats.aprovadas, icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
              { label: "Pessoas Beneficiadas", value: stats.total_beneficiarios.toLocaleString("pt-BR") + "+", icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
            ].map((kpi) => (
              <Card key={kpi.label} className="border border-border/50">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground leading-tight">{kpi.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${kpi.bg}`}>
                      <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Radar de Causas */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Radar de Causas Parlamentares
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" />)
                ) : causas.map((causa) => {
                  const count = countForCausa(causa.id);
                  const leis  = leisForCausa(causa.id);
                  const pct   = Math.round((count / maxProp) * 100);
                  const Icon  = CAUSA_ICONS[causa.categoria] || Heart;
                  return (
                    <motion.div
                      key={causa.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${causa.cor}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <span className="font-medium truncate max-w-[200px]">{causa.nome}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted-foreground">{leis} leis</span>
                          <span className="text-xs font-semibold text-primary">{count} prop.</span>
                        </div>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{causa.descricao}</p>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Distribuição por Tipo */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribuição por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { tipo: "LEI_SANCIONADA", count: stats.leis_sancionadas },
                    { tipo: "PROJETO_LEI",    count: stats.projetos },
                    { tipo: "EMENDA",         count: stats.emendas },
                    { tipo: "INDICACAO",      count: stats.indicacoes },
                    { tipo: "REQUERIMENTO",   count: stats.requerimentos },
                  ].map(({ tipo, count }) => (
                    <div key={tipo} className={`rounded-xl p-3 border text-center ${TIPO_COLORS[tipo]}`}>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-[10px] font-medium leading-tight mt-0.5">{TIPO_LABELS[tipo]}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Quick links */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Módulos Parlamentares</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickLinks.map((lnk) => (
                  <Link key={lnk.path} to={lnk.path}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors group cursor-pointer">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <lnk.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{lnk.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{lnk.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            {/* Proposituras Recentes */}
            <Card className="border border-border/50">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Proposituras Recentes</CardTitle>
                <Link to="/parlamentar/proposituras">
                  <Button variant="ghost" size="sm" className="text-xs h-7">Ver todas</Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  [...Array(5)].map((_, i) => <div key={i} className="h-10 rounded bg-muted/40 animate-pulse" />)
                ) : proposituras.slice(0, 6).map((prop) => {
                  const StatusIcon = STATUS_ICON[prop.status] || FileText;
                  return (
                    <div key={prop.id} className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
                      <StatusIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${STATUS_COLOR[prop.status] || "text-muted-foreground"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate leading-tight">{prop.titulo}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className={`text-[9px] h-4 px-1 border ${TIPO_COLORS[prop.tipo]}`}>
                            {TIPO_LABELS[prop.tipo]}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{prop.numero}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
