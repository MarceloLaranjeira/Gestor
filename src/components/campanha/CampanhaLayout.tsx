import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Map, Users, UserCheck, CalendarCheck, BarChart3,
} from "lucide-react";

const tabs = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/campanha" },
  { icon: Map, label: "Calhas", path: "/campanha/calhas" },
  { icon: Users, label: "Coordenadores", path: "/campanha/coordenadores" },
  { icon: UserCheck, label: "Assessores", path: "/campanha/assessores" },
  { icon: CalendarCheck, label: "Visitas", path: "/campanha/visitas" },
  { icon: BarChart3, label: "Relatórios", path: "/campanha/relatorios" },
];

interface Props {
  title: string;
  children: ReactNode;
}

const CampanhaLayout = ({ title, children }: Props) => {
  const { pathname } = useLocation();

  return (
    <AppLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold font-display">{title}</h1>

        {/* Sub-navigation */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-border">
          {tabs.map((t) => {
            const active = pathname === t.path;
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
