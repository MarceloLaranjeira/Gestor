import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Leaf, Heart, Shield, Fish, Accessibility, Scale, Cross, Radio, Loader2, ChevronRight,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Heart, Leaf, Shield, Fish, Accessibility, Scale, Cross, Radio,
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

const Movimentos = () => {
  const navigate = useNavigate();
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [counts, setCounts] = useState<Record<string, AcaoCount>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
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
    fetch();
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Movimentos</h1>
          <p className="text-sm text-muted-foreground">Bandeiras e movimentos do mandato do Comandante Dan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {movimentos.map((mov, i) => {
            const Icon = ICON_MAP[mov.icone] || Heart;
            const c = counts[mov.id];
            return (
              <motion.div
                key={mov.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/movimentos/${mov.id}`)}
                className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl ${mov.cor} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </div>
                <h3 className="text-sm font-bold text-foreground font-display group-hover:text-primary transition-colors">
                  Movimento {mov.nome}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{mov.descricao}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{c?.total || 0} ações</span>
                  <span>•</span>
                  <span>{c?.em_andamento || 0} em andamento</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Movimentos;
