import { motion } from "framer-motion";
import { User, Bell, Shield, Palette } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";

const Configuracoes = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências</p>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
              <span className="text-2xl font-bold text-primary-foreground">{user?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="text-lg font-bold font-display text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.role} • {user?.email}</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { icon: User, label: "Perfil", desc: "Editar informações pessoais" },
              { icon: Bell, label: "Notificações", desc: "Configurar alertas e avisos" },
              { icon: Shield, label: "Segurança", desc: "Senha e autenticação" },
              { icon: Palette, label: "Aparência", desc: "Tema e personalização" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4 p-4 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
};

export default Configuracoes;
