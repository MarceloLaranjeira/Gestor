import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Heart, Car, Building2, Leaf, Users,
  ChevronRight, Loader2, Activity,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

const SOCIAL_THEMES = [
  {
    id: "seguranca",
    nome: "Segurança Pública",
    descricao: "Ações voltadas à segurança comunitária, prevenção à violência, policiamento e ordem pública.",
    icone: "Shield",
    accentColor: "hsl(213,94%,52%)",
    iconBg: "hsl(213,94%,52% / 0.10)",
    badgeClass: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    id: "saude",
    nome: "Saúde",
    descricao: "Iniciativas de saúde pública, atenção básica, UPAs, hospitais e bem-estar da população.",
    icone: "Heart",
    accentColor: "hsl(0,72%,51%)",
    iconBg: "hsl(0,72%,51% / 0.10)",
    badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
  },
  {
    id: "mobilidade",
    nome: "Mobilidade Urbana",
    descricao: "Transporte público, vias, pavimentação, ciclovias e acessibilidade na locomoção cidadã.",
    icone: "Car",
    accentColor: "hsl(38,92%,50%)",
    iconBg: "hsl(38,92%,50% / 0.10)",
    badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    id: "infraestrutura",
    nome: "Infraestrutura",
    descricao: "Obras públicas, saneamento básico, iluminação, habitação e serviços urbanos essenciais.",
    icone: "Building2",
    accentColor: "hsl(239,84%,67%)",
    iconBg: "hsl(239,84%,67% / 0.10)",
    badgeClass: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    id: "meio-ambiente",
    nome: "Meio Ambiente",
    descricao: "Preservação ambiental, sustentabilidade, parques, áreas verdes e combate às mudanças climáticas.",
    icone: "Leaf",
    accentColor: "hsl(142,70%,40%)",
    iconBg: "hsl(142,70%,40% / 0.10)",
    badgeClass: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    id: "inclusao",
    nome: "Inclusão Social",
    descricao: "Políticas de equidade, acessibilidade, assistência social e combate à desigualdade.",
    icone: "Users",
    accentColor: "hsl(262,80%,60%)",
    iconBg: "hsl(262,80%,60% / 0.10)",
    badgeClass: "bg-purple-50 text-purple-600 border-purple-200",
  },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield, Heart, Car, Building2, Leaf, Users,
  // legacy icon support
  Fish: Leaf, Accessibility: Users, Scale: Building2, Cross: Heart,
  Radio: Activity,
};

interface Movimento {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
}

interface AcaoCount {
  movimento_id: string;
  total: number;
  em_andamento: number;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const Movimentos = () => {
  const navigate = useNavigate();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [counts, setCounts] = useState<Record<string, AcaoCount>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: movs } = await supabase.from("movimentos").select("*").order("created_at");
      setMovimentos((movs as Movimento[]) || []);

      const { data: acoes } = await supabase.from("acoes_movimento").select("id, movimento_id, status");
      const map: Record<string, AcaoCount> = {};
      (acoes || []).forEach((a: any) => {
        if (!map[a.movimento_id]) map[a.movimento_id] = { movimento_id: a.movimento_id, total: 0, em_andamento: 0 };
        map[a.movimento_id].total++;
        if (a.status === "em_andamento") map[a.movimento_id].em_andamento++;
      });
      setCounts(map);
      setLoading(false);
    };
    load();
  }, []);

  // Merge DB movimentos with social themes:
  // If a DB movement's id/nome matches a social theme, use the richer theme data.
  // Otherwise fall back to SOCIAL_THEMES when DB is empty.
  const displayThemes = movimentos.length > 0
    ? movimentos.map((mov) => {
        const social = SOCIAL_THEMES.find(
          (t) => t.id === mov.id || t.nome.toLowerCase() === mov.nome.toLowerCase()
        );
        return { ...social, ...mov, id: mov.id };
      })
    : SOCIAL_THEMES.map((t) => ({ ...t }));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-60">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Eixos Temáticos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bandeiras sociais do mandato parlamentar — acompanhe as ações por área
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3">
          {SOCIAL_THEMES.map((t) => {
            const Icon = ICON_MAP[t.icone] ?? Shield;
            const dbMov = movimentos.find((m) => m.id === t.id || m.nome.toLowerCase() === t.nome.toLowerCase());
            const c = dbMov ? counts[dbMov.id] : null;
            return (
              <div key={t.id}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${t.badgeClass ?? "bg-muted text-foreground border-border"}`}>
                <Icon className="w-3 h-3" />
                {t.nome.split(" ")[0]}
                {c && <span className="opacity-60">· {c.total}</span>}
              </div>
            );
          })}
        </div>

        {/* Theme grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {displayThemes.map((theme, i) => {
            const social = SOCIAL_THEMES.find(
              (t) => t.id === theme.id || t.nome?.toLowerCase() === (theme as any).nome?.toLowerCase()
            ) ?? SOCIAL_THEMES[i % SOCIAL_THEMES.length];
            const Icon = ICON_MAP[(theme as any).icone ?? social.icone] ?? Shield;
            const dbMov = movimentos.find((m) => m.id === theme.id);
            const c = dbMov ? counts[dbMov.id] : null;
            const accentColor = social.accentColor;
            const iconBg = social.iconBg;

            return (
              <motion.div
                key={(theme as any).id ?? i}
                variants={cardAnim}
                onClick={() => dbMov && navigate(`/movimentos/${dbMov.id}`)}
                className={`glass-card rounded-xl overflow-hidden group transition-all duration-200 relative
                  ${dbMov ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-lg" : "cursor-default opacity-90"}`}
              >
                {/* Top accent bar */}
                <div className="h-1 w-full" style={{ background: accentColor }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: iconBg }}
                    >
                      <Icon className="w-6 h-6" style={{ color: accentColor }} />
                    </div>
                    {dbMov && (
                      <ChevronRight
                        className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                        style={{ color: accentColor }}
                      />
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-foreground font-display group-hover:text-primary transition-colors">
                    {(theme as any).nome ?? social.nome}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                    {(theme as any).descricao ?? social.descricao}
                  </p>

                  <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border/50">
                    <span className="text-xs font-semibold tabular-nums" style={{ color: accentColor }}>
                      {c?.total ?? 0} ações
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">
                      {c?.em_andamento ?? 0} em andamento
                    </span>
                    {!dbMov && (
                      <span className="ml-auto text-[10px] text-muted-foreground/50 italic">sem dados</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};

export default Movimentos;
