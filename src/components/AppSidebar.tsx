import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebarState } from "./AppLayout";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  MessageSquare,
  Church,
  Megaphone,
  Database,
  Building2,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const coordenacaoItems = [
  { icon: Church, label: "Eclesiástica", path: "/coordenacao/eclesiastica" },
  { icon: Megaphone, label: "Comunicação", path: "/coordenacao/comunicacao" },
  { icon: Database, label: "Inteligência de Dados", path: "/coordenacao/inteligencia" },
  { icon: Shield, label: "CSPJD", path: "/coordenacao/cspjd" },
  { icon: Building2, label: "Gabinete", path: "/coordenacao/gabinete" },
  { icon: UsersRound, label: "Equipe CMT Dan", path: "/coordenacao/equipe" },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Pessoas", path: "/pessoas" },
  { icon: ClipboardList, label: "Demandas", path: "/demandas" },
  { icon: Calendar, label: "Eventos", path: "/eventos" },
  { icon: MessageSquare, label: "Movimentos", path: "/movimentos" },
];

const bottomItems = [
  { icon: BarChart3, label: "Relatórios", path: "/relatorios" },
  { icon: FileText, label: "Rel. Coordenação", path: "/relatorio-coordenacao" },
  { icon: Users, label: "Usuários", path: "/usuarios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

export const SIDEBAR_WIDTH = 250;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

const AppSidebar = () => {
  const { collapsed, setCollapsed } = useSidebarState();
  const [coordOpen, setCoordOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isCoordActive = location.pathname.startsWith("/coordenacao");

  const renderLink = (item: { icon: any; label: string; path: string }, small = false) => {
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm transition-all duration-200 cursor-pointer",
          small ? "px-3 py-2 pl-10" : "px-3 py-2.5",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-semibold"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn("shrink-0", small ? "w-4 h-4" : "w-5 h-5")} />
        {!collapsed && <span className="truncate text-xs">{item.label}</span>}
      </Link>
    );
  };

  return (
    <aside
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      className="fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 gradient-primary"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-sidebar-primary shrink-0">
          <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sidebar-foreground font-display truncate">
              Gabinete CMD Dan
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">
              Sistema de Gestão
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => renderLink(item))}

        {/* Coordenações expandable */}
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCoordOpen(!coordOpen);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full cursor-pointer",
              isCoordActive
                ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <ClipboardList className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left text-xs">Coordenações</span>
                <ChevronDown className={cn("w-4 h-4 transition-transform", coordOpen && "rotate-180")} />
              </>
            )}
          </button>
          {coordOpen && !collapsed && (
            <div className="mt-1 space-y-0.5">
              {coordenacaoItems.map((item) => renderLink(item, true))}
            </div>
          )}
        </div>

        <div className="my-2 border-t border-sidebar-border/50" />
        {bottomItems.map((item) => renderLink(item))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="mb-2 px-2">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{user.role}</p>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            logout();
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setCollapsed(!collapsed);
        }}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-50 cursor-pointer"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-foreground" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
        )}
      </button>
    </aside>
  );
};

export default AppSidebar;
