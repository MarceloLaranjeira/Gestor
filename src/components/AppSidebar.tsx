import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import logoDan from "@/assets/logo-dan.png";
import { useSidebarState } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, Users, ClipboardList, Calendar, CalendarSync, BarChart3, FileText, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Shield, MessageSquare, Church,
  Megaphone, Database, Building2, UsersRound, Bot, Wallet, KeyRound, Flag, BookUser,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const coordenacaoItems = [
  { icon: Database, label: "Calhas e Municípios", path: "/coord/calhas-municipios" },
  { icon: UsersRound, label: "Coordenadores", path: "/coord/coordenadores" },
  { icon: Shield, label: "Assessores", path: "/coord/assessores" },
  { icon: Megaphone, label: "Monitor de Contatos", path: "/coord/monitor" },
  { icon: Church, label: "Planejamento de Visitas", path: "/coord/planejamento" },
];

interface NavItem { icon: any; label: string; path: string; module?: string }

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  { icon: Flag, label: "Modo Campanha", path: "/campanha", module: "campanha" },
  { icon: Bot, label: "Assessor IA", path: "/agente-ia", module: "agente-ia" },
  { icon: Users, label: "Pessoas", path: "/pessoas", module: "pessoas" },
  { icon: ClipboardList, label: "Demandas", path: "/demandas", module: "demandas" },
  { icon: Calendar, label: "Eventos", path: "/eventos", module: "eventos" },
  { icon: CalendarSync, label: "Calendário", path: "/calendario", module: "calendario" },
  { icon: Wallet, label: "Financeiro", path: "/financas", module: "financas" },
  { icon: BookUser, label: "Prontuário", path: "/prontuario", module: "prontuario" },
  { icon: MessageSquare, label: "Movimentos", path: "/movimentos", module: "movimentos" },
];

const bottomItems: NavItem[] = [
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", module: "relatorios" },
  { icon: FileText, label: "Rel. Coordenação", path: "/relatorio-coordenacao", module: "relatorio-coordenacao" },
  { icon: Users, label: "Usuários", path: "/usuarios", module: "usuarios" },
  { icon: KeyRound, label: "Permissões", path: "/permissoes", module: "usuarios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "configuracoes" },
];

export const SIDEBAR_WIDTH = 250;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { collapsed } = useSidebarState();
  const isMobile = useIsMobile();
  const [coordOpen, setCoordOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { hasAccess } = usePermissions();

  const isCoordActive = location.pathname.startsWith("/coord");
  const isGestor = user?.role === "Gestor";
  const showLabels = isMobile || !collapsed;

  const canSee = (item: NavItem) => {
    if (!item.module) return true;
    return hasAccess(item.module);
  };

  const renderLink = (item: NavItem, small = false) => {
    if (!canSee(item)) return null;
    if (item.path === "/permissoes" && !isGestor) return null;
    const isActive = location.pathname === item.path;
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm transition-all duration-200 cursor-pointer",
          small ? "px-3 py-2 pl-10" : "px-3 py-2.5",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-semibold"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <Icon className={cn("shrink-0", small ? "w-4 h-4" : "w-5 h-5")} />
        {showLabels && <span className="truncate text-xs">{item.label}</span>}
      </Link>
    );
  };

  const showCoord = hasAccess("coordenacoes");

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border">
        <img
          src={logoDan}
          alt="Gabinete CMD Dan"
          className={!showLabels ? "w-10 h-10 object-contain shrink-0" : "h-12 w-auto max-w-[160px] object-contain shrink-0"}
        />
        {showLabels && (
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-accent truncate leading-tight">
              Gestão Inteligente
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => renderLink(item))}

        {showCoord && (
          <div>
            <button
              onClick={(e) => { e.stopPropagation(); setCoordOpen(!coordOpen); }}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full cursor-pointer",
                isCoordActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <ClipboardList className="w-5 h-5 shrink-0" />
              {showLabels && (
                <>
                  <span className="truncate flex-1 text-left text-xs">Coordenações</span>
                  <ChevronDown className={cn("w-4 h-4 transition-transform", coordOpen && "rotate-180")} />
                </>
              )}
            </button>
            {coordOpen && showLabels && (
              <div className="mt-1 space-y-0.5">
                {coordenacaoItems.map((item) => renderLink(item as NavItem, true))}
              </div>
            )}
          </div>
        )}

        <div className="my-2 border-t border-sidebar-border/50" />
        {bottomItems.map((item) => renderLink(item))}
      </nav>

      {/* User */}
      <div className="border-t border-sidebar-border p-3">
        {showLabels && user && (
          <div className="mb-2 px-2">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/50">{user.role}</p>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); logout(); }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {showLabels && <span>Sair</span>}
        </button>
      </div>
    </div>
  );
};

const AppSidebar = () => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebarState();
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[280px] gradient-primary border-r-0">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      className="fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 gradient-primary"
    >
      <SidebarContent />
      {/* Collapse toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors z-50 cursor-pointer"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5 text-foreground" /> : <ChevronLeft className="w-3.5 h-3.5 text-foreground" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
