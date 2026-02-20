import { motion } from "framer-motion";
import { Leaf, Heart, Shield, Fish, Accessibility, Gavel, Scale, Cross, Radio } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const movimentos = [
  { nome: "Cidadania com Amor e Fé", descricao: "Promoção da cidadania com valores cristãos", icon: Heart, cor: "bg-destructive/10 text-destructive" },
  { nome: "Solidariedade", descricao: "Ações de solidariedade e assistência social", icon: Heart, cor: "bg-info/10 text-info" },
  { nome: "Comunicação pela Paz", descricao: "Comunicação para cultura de paz nas comunidades", icon: Radio, cor: "bg-secondary/10 text-secondary" },
  { nome: "Consciência Ecológica", descricao: "Sustentabilidade e preservação ambiental", icon: Leaf, cor: "bg-success/10 text-success" },
  { nome: "Saúde Comunitária", descricao: "Promoção de saúde nas comunidades", icon: Cross, cor: "bg-primary/10 text-primary" },
  { nome: "Pesca Sustentável", descricao: "Regulamentação e apoio à pesca sustentável", icon: Fish, cor: "bg-warning/10 text-warning" },
  { nome: "Mobilidade Inclusiva", descricao: "Acessibilidade e mobilidade para todos", icon: Accessibility, cor: "bg-info/10 text-info" },
  { nome: "Segurança Inovadora", descricao: "Inovação em segurança pública", icon: Shield, cor: "bg-accent/10 text-accent-foreground" },
  { nome: "Cultura de Paz", descricao: "Promoção da paz e diálogo comunitário", icon: Heart, cor: "bg-success/10 text-success" },
  { nome: "Leis que Amparam", descricao: "Legislação de proteção e amparo social", icon: Scale, cor: "bg-primary/10 text-primary" },
];

const Movimentos = () => {
  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Movimentos</h1>
          <p className="text-sm text-muted-foreground">Bandeiras e movimentos do mandato do Comandante Dan</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {movimentos.map((mov, i) => (
            <motion.div
              key={mov.nome}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className={`w-12 h-12 rounded-xl ${mov.cor} flex items-center justify-center mb-4`}>
                <mov.icon className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground font-display group-hover:text-primary transition-colors">
                Movimento {mov.nome}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{mov.descricao}</p>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>12 ações</span>
                <span>•</span>
                <span>5 em andamento</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Movimentos;
