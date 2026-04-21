import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, ALL_MODULES, getModuleLabel } from "@/hooks/usePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigate } from "react-router-dom";

const ROLES_TO_MANAGE = ["coordenador", "assessor"] as const;

const roleLabels: Record<string, string> = {
  coordenador: "Coordenador",
  assessor: "Assessor",
};

const Permissoes = () => {
  const { user } = useAuth();
  const { permissions, loading, togglePermission } = usePermissions();
  const { toast } = useToast();

  if (user?.role !== "Gestor") return <Navigate to="/" replace />;

  const getEnabled = (role: string, module: string) =>
    permissions.find((p) => p.role === role && p.module === module)?.enabled ?? false;

  const handleToggle = async (role: string, module: string, checked: boolean) => {
    await togglePermission(role, module, checked);
    toast({
      title: checked ? "Acesso liberado" : "Acesso removido",
      description: `${getModuleLabel(module)} para ${roleLabels[role]}`,
    });
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Permissões de Acesso
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie quais módulos cada cargo pode acessar. O Gestor tem acesso total.
          </p>
        </div>

        {/* Gestor info */}
        <div className="glass-card rounded-xl p-4 flex items-center gap-3 border border-primary/20">
          <Lock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Gestor</p>
            <p className="text-xs text-muted-foreground">Acesso total a todos os módulos (não editável)</p>
          </div>
          <Badge className="ml-auto">Acesso Total</Badge>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando permissões...</div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {ROLES_TO_MANAGE.map((role) => (
              <div key={role} className="glass-card rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={role === "coordenador" ? "default" : "secondary"} className="text-sm">
                    {roleLabels[role]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    ({permissions.filter((p) => p.role === role && p.enabled).length}/{ALL_MODULES.length} módulos)
                  </span>
                </div>
                <div className="space-y-2">
                  {ALL_MODULES.map((module) => {
                    const enabled = getEnabled(role, module);
                    return (
                      <label
                        key={module}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={enabled}
                          onCheckedChange={(checked) => handleToggle(role, module, !!checked)}
                        />
                        <span className="text-sm text-foreground">{getModuleLabel(module)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default Permissoes;
