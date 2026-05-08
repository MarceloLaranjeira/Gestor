import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { SAC_SETORES, type SacSetorSlug } from "@/data/sacSetores";

interface DemandaResumo {
  setor_sac: string | null;
  status: string;
}

interface SetorCount {
  total: number;
  andamento: number;
  concluidas: number;
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const cardAnim = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

const emptyCount = (): SetorCount => ({ total: 0, andamento: 0, concluidas: 0 });

const Movimentos = () => {
  const navigate = useNavigate();
  const [counts, setCounts] = useState<Record<SacSetorSlug, SetorCount>>(
    Object.fromEntries(SAC_SETORES.map((setor) => [setor.slug, emptyCount()])) as Record<SacSetorSlug, SetorCount>,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("demandas")
        .select("setor_sac, status")
        .in("setor_sac", SAC_SETORES.map((setor) => setor.slug));

      const nextCounts = Object.fromEntries(SAC_SETORES.map((setor) => [setor.slug, emptyCount()])) as Record<SacSetorSlug, SetorCount>;

      if (!error) {
        ((data as DemandaResumo[]) || []).forEach((demanda) => {
          if (!demanda.setor_sac) return;
          const slug = demanda.setor_sac as SacSetorSlug;
          if (!nextCounts[slug]) return;

          nextCounts[slug].total += 1;
          if (demanda.status === "andamento") nextCounts[slug].andamento += 1;
          if (demanda.status === "concluida") nextCounts[slug].concluidas += 1;
        });
      }

      setCounts(nextCounts);
      setLoading(false);
    };

    load();
  }, []);

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
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Demandas SAC</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cada setor tem coordenadoria fixa e kanban proprio, sem compartilhar informacoes com os demais.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {SAC_SETORES.map((setor) => {
            const count = counts[setor.slug];
            return (
              <div
                key={setor.slug}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${setor.badgeClass}`}
              >
                <setor.icon className="w-3 h-3" />
                {setor.nome}
                <span className="opacity-60">· {count.total}</span>
              </div>
            );
          })}
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
        >
          {SAC_SETORES.map((setor) => {
            const count = counts[setor.slug];
            return (
              <motion.button
                key={setor.slug}
                variants={cardAnim}
                onClick={() => navigate(setor.path)}
                className="glass-card rounded-xl overflow-hidden group transition-all duration-200 relative text-left hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="h-1 w-full" style={{ background: setor.accentColor }} />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: setor.iconBg }}
                    >
                      <setor.icon className="w-6 h-6" style={{ color: setor.accentColor }} />
                    </div>
                    <ChevronRight
                      className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                      style={{ color: setor.accentColor }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-foreground font-display group-hover:text-primary transition-colors">
                      {setor.nome}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{setor.descricao}</p>
                  </div>

                  <div className="mt-4 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Coordenadoria fixa</p>
                    <p className="text-xs font-medium text-foreground mt-1">{setor.coordenadoriaNome}</p>
                  </div>

                  <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border/50 text-xs">
                    <span className="font-semibold" style={{ color: setor.accentColor }}>
                      {count.total} cards
                    </span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{count.andamento} em andamento</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-muted-foreground">{count.concluidas} concluídas</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </motion.div>
    </AppLayout>
  );
};

export default Movimentos;
