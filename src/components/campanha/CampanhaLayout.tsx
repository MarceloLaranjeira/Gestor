import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Map, Users, UserCheck, CalendarCheck, BarChart3, Globe, MapPin,
  Database, Megaphone, Shield, Navigation, Activity, Plus,
} from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/campanha" },
  { icon: Map, label: "Calhas", path: "/campanha/calhas" },
  { icon: Globe, label: "Mapa", path: "/campanha/mapa" },
  { icon: MapPin, label: "Locais", path: "/campanha/locais" },
  { icon: Users, label: "Coordenadores", path: "/campanha/coordenadores" },
  { icon: UserCheck, label: "Assessores", path: "/campanha/assessores" },
  { icon: CalendarCheck, label: "Visitas", path: "/campanha/visitas" },
  { icon: BarChart3, label: "Relatórios", path: "/campanha/relatorios" },
  { icon: Database, label: "Calhas e Municípios", path: "/campanha/coord/calhas" },
  { icon: Shield, label: "CRM Coordenadores", path: "/campanha/coord/coordenadores" },
  { icon: UserCheck, label: "Assessores Coord.", path: "/campanha/coord/assessores" },
  { icon: Activity, label: "Monitor Contatos", path: "/campanha/coord/monitor" },
  { icon: Navigation, label: "Plan. Visitas", path: "/campanha/coord/planejamento" },
];

interface Props {
  title: string;
  children: ReactNode;
}

/* Maps each campaign path to a query-param that triggers the insert dialog in that page */
const INSERT_PARAM: Record<string, string> = {
  "/campanha/calhas":              "?inserir=1",
  "/campanha/coordenadores":       "?inserir=1",
  "/campanha/assessores":          "?inserir=1",
  "/campanha/visitas":             "?inserir=1",
  "/campanha/locais":              "?inserir=1",
  "/campanha/coord/calhas":        "?inserir=1",
  "/campanha/coord/coordenadores": "?inserir=1",
  "/campanha/coord/assessores":    "?inserir=1",
  "/campanha/coord/monitor":       "?inserir=1",
  "/campanha/coord/planejamento":  "?inserir=1",
};

const CampanhaLayout = ({ title, children }: Props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const canInsert = INSERT_PARAM[pathname];

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-display">{title}</h1>
          {canInsert && (
            <button
              onClick={() => navigate(pathname + canInsert)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              title="Inserir novo dado"
            >
              <Plus className="w-3.5 h-3.5" />
              Inserir Dados
            </button>
          )}
        </div>

        {/* Sub-navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
          {tabs.map((t) => {
            const active = pathname === t.path || pathname.startsWith(t.path + "?");
            const Icon = t.icon;
            return (
              <Link
                key={t.path}
                to={t.path}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </AppLayout>
  );
};

export default CampanhaLayout;
