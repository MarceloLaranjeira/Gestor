import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebarState } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LayoutDashboard, Users, ClipboardList, Calendar, CalendarSync, BarChart3, FileText, Settings,
  ChevronLeft, ChevronRight, ChevronDown, LogOut, Shield, MessageSquare,
  Megaphone, Database, Building2, UsersRound, Bot, Wallet, KeyRound, Flag, BookUser, BookOpen, Plug, Phone,
  Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import AutomatikusLogo from "./AutomatikusLogo";

const coordenacaoItems = [
  { icon: Building2, label: "Eclesiástica", path: "/coordenacao/eclesiastica" },
  { icon: Megaphone, label: "Comunicação", path: "/coordenacao/comunicacao" },
  { icon: Database, label: "Inteligência", path: "/coordenacao/inteligencia" },
  { icon: Shield, label: "Segurança", path: "/coordenacao/cspjd" },
  { icon: Layers, label: "Gabinete", path: "/coordenacao/gabinete" },
  { icon: UsersRound, label: "Equipe Interna", path: "/coordenacao/equipe" },
  { icon: ClipboardList, label: "Plenária", path: "/coordenacao/plenaria" },
];

interface NavItem { icon: any; label: string; path: string; module?: string }

const principalItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  { icon: Bot, label: "Assessor IA", path: "/agente-ia", module: "agente-ia" },
];

const legislativoItems: NavItem[] = [
  { icon: MessageSquare, label: "Demandas", path: "/demandas", module: "demandas" },
  { icon: Calendar, label: "Eventos", path: "/eventos", module: "eventos" },
  { icon: CalendarSync, label: "Calendário", path: "/calendario", module: "calendario" },
  { icon: ClipboardList, label: "Movimentos", path: "/movimentos", module: "movimentos" },
];

const gestaoItems: NavItem[] = [
  { icon: Users, label: "Pessoas", path: "/pessoas", module: "pessoas" },
  { icon: BookUser, label: "Prontuário", path: "/prontuario", module: "prontuario" },
  { icon: Wallet, label: "Financeiro", path: "/financas", module: "financas" },
  { icon: BookOpen, label: "Logbook", path: "/logbook", module: "logbook" },
];

const operacoesItems: NavItem[] = [
  { icon: Flag, label: "Modo Campanha", path: "/campanha", module: "campanha" },
  { icon: Phone, label: "WhatsApp", path: "/whatsapp", module: "integracao" },
  { icon: Plug, label: "Integração", path: "/integracao", module: "integracao" },
];

const sistemaItems: NavItem[] = [
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", module: "relatorios" },
  { icon: FileText, label: "Rel. Coordenação", path: "/relatorio-coordenacao", module: "relatorio-coordenacao" },
  { icon: Users, label: "Usuários", path: "/usuarios", module: "usuarios" },
  { icon: KeyRound, label: "Permissões", path: "/permissoes", module: "usuarios" },
  { icon: Settings, label: "Configurações", path: "/configuracoes", module: "configuracoes" },
];

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 68;

const SectionLabel = ({ label, show }: { label: string; show: boolean }) => {
  if (!show) return <div className="h-3" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/35 select-none">
      {label}
    </p>
  );
};

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { collapsed } = useSidebarState();
  const isMobile = useIsMobile();
  const [coordOpen, setCoordOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuth();
  const { hasAccess } = usePermissions();

  const isCoordActive = location.pathname.startsWith("/coordenacao") || location.pathname === "/coordenacoes";
  const isGestor = user?.role === "Gestor";
  const showLabels = isMobile || !collapsed;

  const canSee = (item: NavItem) => {
    if (!item.module) return true;
    return hasAccess(item.module);
  };

  const renderLink = (item: NavItem, small = false) => {
    if (!canSee(item)) return null;
    if (item.path === "/permissoes" && !isGestor) return null;
    const isActive = item.path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.path);
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        to={item.path}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm transition-all duration-200 cursor-pointer group relative",
          small ? "px-3 py-2 pl-10" : "px-3 py-2.5",
          isActive
            ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-primary font-semibold border border-sidebar-primary/20"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
        )}
        <Icon className={cn("shrink-0", small ? "w-4 h-4" : "w-4 h-4", isActive && "text-sidebar-primary")} />
        {showLabels && <span className="truncate text-xs font-medium">{item.label}</span>}
      </Link>
    );
  };

  const showCoord = hasAccess("coordenacoes");

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Brand — Automatikus */}
      <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border/60">
        {showLabels ? (
          <AutomatikusLogo variant="full" className="w-full max-w-[184px]" />
        ) : (
          <AutomatikusLogo variant="icon" iconSize={38} className="shrink-0" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto scrollbar-thin">

        {/* PRINCIPAL */}
        <SectionLabel label="Principal" show={showLabels} />
        <div className="space-y-0.5">
          {principalItems.map((item) => renderLink(item))}
        </div>

        {/* LEGISLATIVO */}
        <SectionLabel label="Atividade" show={showLabels} />
        <div className="space-y-0.5">
          {legislativoItems.map((item) => renderLink(item))}
        </div>

        {/* GESTÃO */}
        <SectionLabel label="Gestão" show={showLabels} />
        <div className="space-y-0.5">
          {gestaoItems.map((item) => renderLink(item))}
        </div>

        {/* OPERAÇÕES */}
        <SectionLabel label="Operações" show={showLabels} />
        <div className="space-y-0.5">
          {operacoesItems.map((item) => renderLink(item))}
        </div>

        {/* COORDENAÇÕES */}
        {showCoord && (
          <>
            <SectionLabel label="Coordenações" show={showLabels} />
            <div className="space-y-0.5">
              <Link
                to="/coordenacoes"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full cursor-pointer relative",
                  isCoordActive
                    ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-primary font-semibold border border-sidebar-primary/20"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                {isCoordActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
                )}
                <ClipboardList className="w-4 h-4 shrink-0" />
                {showLabels && (
                  <>
                    <span className="truncate flex-1 text-left text-xs font-medium">Todas as Coordenações</span>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCoordOpen(!coordOpen); }}
                      className="p-0.5 rounded hover:bg-sidebar-accent/80"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-sidebar-foreground/50", coordOpen && "rotate-180")} />
                    </button>
                  </>
                )}
              </Link>
              {coordOpen && showLabels && (
                <div className="mt-0.5 space-y-0.5">
                  {coordenacaoItems.map((item) => renderLink(item as NavItem, true))}
                </div>
              )}
            </div>
          </>
        )}

        {/* SISTEMA */}
        <div className="my-3 border-t border-sidebar-border/40" />
        <SectionLabel label="Sistema" show={showLabels} />
        <div className="space-y-0.5">
          {sistemaItems.map((item) => renderLink(item))}
        </div>
      </nav>

      {/* User Footer */}
      <div className="border-t border-sidebar-border/60 p-3">
        {showLabels && user && (
          <div className="mb-2 px-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-white">
                {user.name?.charAt(0) || "U"}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/45 leading-tight">{user.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); logout(); }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {showLabels && <span className="text-xs">Sair</span>}
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
