import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RolePermission {
  role: string;
  module: string;
  enabled: boolean;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  "agente-ia": "Assessor IA",
  pessoas: "Pessoas",
  demandas: "Demandas",
  eventos: "Eventos",
  financas: "Financeiro",
  calendario: "Calendário",
  movimentos: "Movimentos",
  coordenacoes: "Coordenações",
  relatorios: "Relatórios",
  "relatorio-coordenacao": "Rel. Coordenação",
  usuarios: "Usuários",
  configuracoes: "Configurações",
  campanha: "Modo Campanha",
  prontuario: "Prontuário Parlamentar",
  logbook: "Logbook de Calhas",
  integracao: "Integração",
  webchat: "WebChat",
  whatsapp: "WhatsApp",
};

export const ALL_MODULES = Object.keys(MODULE_LABELS);
export const getModuleLabel = (module: string) => MODULE_LABELS[module] || module;

// Map route paths to module keys
const ROUTE_TO_MODULE: Record<string, string> = {
  "/": "dashboard",
  "/agente-ia": "agente-ia",
  "/pessoas": "pessoas",
  "/demandas": "demandas",
  "/eventos": "eventos",
  "/financas": "financas",
  "/calendario": "calendario",
  "/movimentos": "movimentos",
  "/relatorios": "relatorios",
  "/relatorio-coordenacao": "relatorio-coordenacao",
  "/usuarios": "usuarios",
  "/configuracoes": "configuracoes",
  "/campanha": "campanha",
  "/prontuario": "prontuario",
};

export function getModuleForRoute(path: string): string | null {
  if (path === "/coordenacoes" || path.startsWith("/coordenacao")) return "coordenacoes";
  if (path.startsWith("/movimentos/")) return "movimentos";
  if (path.startsWith("/campanha")) return "campanha";
  if (path.startsWith("/prontuario")) return "prontuario";
  if (path.startsWith("/logbook")) return "logbook";
  if (path.startsWith("/integracao")) return "integracao";
  if (path.startsWith("/whatsapp")) return "whatsapp";
  if (path.startsWith("/webchat")) return "webchat";
  return ROUTE_TO_MODULE[path] || null;
}

export function usePermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("role, module, enabled")
        .order("role")
        .order("module");
      if (!error) setPermissions((data as RolePermission[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const userRole = user?.role === "Gestor" ? "gestor" : user?.role === "Coordenador" ? "coordenador" : "assessor";

  const hasAccess = (module: string): boolean => {
    if (userRole === "gestor") return true;
    const perm = permissions.find((p) => p.role === userRole && p.module === module);
    return perm?.enabled ?? false;
  };

  const togglePermission = async (role: string, module: string, enabled: boolean) => {
    await supabase
      .from("role_permissions")
      .update({ enabled })
      .eq("role", role as "gestor" | "assessor" | "coordenador")
      .eq("module", module);
    setPermissions((prev) =>
      prev.map((p) => (p.role === role && p.module === module ? { ...p, enabled } : p))
    );
  };

  return { permissions, loading, hasAccess, togglePermission, refetch: fetchPermissions };
}
