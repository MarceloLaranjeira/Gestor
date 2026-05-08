import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebarState } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import type { LucideProps } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  BookUser,
  Bot,
  Calendar,
  CalendarSync,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  Flag,
  Gavel,
  GitBranch,
  Handshake,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Map,
  MapPinned,
  MessageCircle,
  PieChart,
  Phone,
  Plug,
  Scale,
  ScrollText,
  Settings,
  SmilePlus,
  Users,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import AutomatikusLogo from "./AutomatikusLogo";
import { SAC_SETORES } from "@/data/sacSetores";
import { COORDENADORIA_DEMANDAS } from "@/data/coordenadoriaDemandas";

interface NavItem {
  icon: React.ComponentType<LucideProps>;
  label: string;
  path: string;
  module?: string;
}

const SIDEBAR_SCROLL_KEY = "app-sidebar-scroll";
const SIDEBAR_SAC_OPEN_KEY = "app-sidebar-sac-open";
const SIDEBAR_COORD_OPEN_KEY = "app-sidebar-coord-open";

const readStoredBoolean = (key: string, fallback: boolean) => {
  try {
    const value = sessionStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
};

const writeStoredBoolean = (key: string, value: boolean) => {
  try {
    sessionStorage.setItem(key, String(value));
  } catch {}
};

const writeStoredScroll = (value: number) => {
  try {
    sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(value));
  } catch {}
};

const readStoredScroll = () => {
  try {
    const value = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
};

const principalItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", module: "dashboard" },
  { icon: Bot, label: "Assessor IA", path: "/agente-ia", module: "agente-ia" },
];

const atividadeItems: NavItem[] = [
  { icon: ClipboardList, label: "Demandas SAC", path: "/movimentos", module: "movimentos" },
  { icon: Handshake, label: "Compromissos", path: "/compromissos", module: "compromissos" },
  { icon: Calendar, label: "Eventos", path: "/eventos", module: "eventos" },
  { icon: CalendarSync, label: "Calendário", path: "/calendario", module: "calendario" },
];

const coordenadoriaItems: NavItem[] = COORDENADORIA_DEMANDAS.map((item) => ({
  icon: item.icon,
  label: item.nome,
  path: item.path,
  module: "coordenacoes",
}));

const gestaoItems: NavItem[] = [
  { icon: Users, label: "Pessoas", path: "/pessoas", module: "pessoas" },
  { icon: Map, label: "Mapa", path: "/mapa", module: "mapa" },
  { icon: MessageCircle, label: "WebChat", path: "/webchat", module: "webchat" },
  { icon: BookUser, label: "Prontuário", path: "/prontuario", module: "prontuario" },
  { icon: Wallet, label: "Financeiro", path: "/financas", module: "financas" },
  { icon: BookOpen, label: "Logbook", path: "/logbook", module: "logbook" },
];

const operacoesItems: NavItem[] = [
  { icon: MapPinned, label: "Modo Pesquisa", path: "/pesquisa", module: "mapa" },
  { icon: Flag, label: "Modo Campanha", path: "/campanha", module: "campanha" },
  { icon: PieChart, label: "Power BI", path: "/powerbi", module: "powerbi" },
  { icon: Phone, label: "WhatsApp", path: "/whatsapp", module: "whatsapp" },
  { icon: Plug, label: "Integração", path: "/integracao", module: "integracao" },
];

const parlamentarItems: NavItem[] = [
  { icon: Scale, label: "Radar de Causas", path: "/parlamentar", module: "parlamentar" },
  { icon: ScrollText, label: "Proposituras", path: "/parlamentar/proposituras", module: "parlamentar" },
  { icon: Gavel, label: "Fiscalização", path: "/parlamentar/fiscalizacao", module: "parlamentar" },
  { icon: GitBranch, label: "Trajetória", path: "/parlamentar/trajetoria", module: "parlamentar" },
];

const sistemaItems: NavItem[] = [
  { icon: BarChart3, label: "Relatórios", path: "/relatorios", module: "relatorios" },
  { icon: FileText, label: "Rel. Coordenação", path: "/relatorio-coordenacao", module: "relatorio-coordenacao" },
  { icon: SmilePlus, label: "Relatório NPS", path: "/relatorio-nps", module: "relatorios" },
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
  const location = useLocation();
  const { user, logout } = useAuth();
  const { hasAccess } = usePermissions();
  const navRef = useRef<HTMLElement | null>(null);

  const showLabels = isMobile || !collapsed;
  const isGestor = user?.role === "Gestor";
  const isSacActive = location.pathname.startsWith("/movimentos");
  const isCoordActive = location.pathname.startsWith("/coordenacao/") || location.pathname === "/coordenacoes";

  const [sacOpen, setSacOpen] = useState(() =>
    readStoredBoolean(SIDEBAR_SAC_OPEN_KEY, isSacActive),
  );
  const [coordOpen, setCoordOpen] = useState(() =>
    readStoredBoolean(SIDEBAR_COORD_OPEN_KEY, true),
  );

  useEffect(() => {
    if (isSacActive) {
      setSacOpen(true);
    }
  }, [isSacActive]);

  useEffect(() => {
    if (isCoordActive) {
      setCoordOpen(true);
    }
  }, [isCoordActive]);

  useEffect(() => {
    writeStoredBoolean(SIDEBAR_SAC_OPEN_KEY, sacOpen);
  }, [sacOpen]);

  useEffect(() => {
    writeStoredBoolean(SIDEBAR_COORD_OPEN_KEY, coordOpen);
  }, [coordOpen]);

  useEffect(() => {
    const target = navRef.current;
    if (!target) return;
    const scrollTop = readStoredScroll();
    requestAnimationFrame(() => {
      target.scrollTop = scrollTop;
    });
  }, [location.pathname]);

  const rememberScroll = () => {
    if (!navRef.current) return;
    writeStoredScroll(navRef.current.scrollTop);
  };

  const handleNavigate = () => {
    rememberScroll();
    onNavigate?.();
  };

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
        onClick={handleNavigate}
        className={cn(
          "flex items-center gap-3 rounded-lg text-sm transition-all duration-200 cursor-pointer relative",
          small ? "px-3 py-2 pl-10" : "px-3 py-2.5",
          isActive
            ? "bg-sidebar-accent text-sidebar-primary font-semibold nav-active-indicator"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
        )}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
        )}
        <Icon className={cn("w-4 h-4 shrink-0", isActive && "text-sidebar-primary")} />
        {showLabels && <span className="truncate text-xs font-medium">{item.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-4 border-b border-sidebar-border/60">
        {showLabels ? (
          <AutomatikusLogo variant="full" className="w-full max-w-[184px]" />
        ) : (
          <AutomatikusLogo variant="icon" iconSize={38} className="shrink-0" />
        )}
      </div>

      <nav
        ref={navRef}
        onScroll={rememberScroll}
        className="flex-1 py-2 px-2 overflow-y-auto scrollbar-thin"
      >
        <SectionLabel label="Principal" show={showLabels} />
        <div className="space-y-0.5">
          {principalItems.map((item) => renderLink(item))}
        </div>

        <SectionLabel label="Atividade" show={showLabels} />
        <div className="space-y-0.5">
          <Link
            to="/movimentos"
            onClick={handleNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full cursor-pointer relative",
              isSacActive
                ? "bg-sidebar-accent text-sidebar-primary font-semibold nav-active-indicator"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
            )}
          >
            {isSacActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
            )}
            <ClipboardList className={cn("w-4 h-4 shrink-0", isSacActive && "text-sidebar-primary")} />
            {showLabels && (
              <>
                <span className="truncate flex-1 text-left text-xs font-medium">Demandas SAC</span>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setSacOpen((current) => !current);
                  }}
                  className="p-0.5 rounded hover:bg-sidebar-accent/80"
                >
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-sidebar-foreground/50", sacOpen && "rotate-180")} />
                </button>
              </>
            )}
          </Link>

          {sacOpen && showLabels && (
            <div className="mt-0.5 space-y-0.5">
              {SAC_SETORES.map((setor) =>
                renderLink(
                  {
                    icon: setor.icon,
                    label: setor.nome,
                    path: setor.path,
                    module: "movimentos",
                  },
                  true,
                ),
              )}
            </div>
          )}

          {hasAccess("coordenacoes") && (
            <>
              <Link
                to="/coordenacoes"
                onClick={handleNavigate}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 w-full cursor-pointer relative",
                  location.pathname === "/coordenacoes"
                    ? "bg-gradient-to-r from-sidebar-primary/20 to-sidebar-primary/5 text-sidebar-primary font-semibold border border-sidebar-primary/20"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                {location.pathname === "/coordenacoes" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sidebar-primary rounded-full" />
                )}
                <ClipboardList className="w-4 h-4 shrink-0" />
                {showLabels && (
                  <>
                    <span className="truncate flex-1 text-left text-xs font-medium">Demandas das Coordenadorias</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setCoordOpen((current) => !current);
                      }}
                      className="p-0.5 rounded hover:bg-sidebar-accent/80"
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 transition-transform text-sidebar-foreground/50", coordOpen && "rotate-180")} />
                    </button>
                  </>
                )}
              </Link>

              {coordOpen && showLabels && (
                <div className="mt-0.5 space-y-0.5">
                  {coordenadoriaItems.map((item) => renderLink(item, true))}
                </div>
              )}
            </>
          )}

          {atividadeItems
            .filter((item) => item.path !== "/movimentos")
            .map((item) => renderLink(item))}
        </div>

        <SectionLabel label="Gestão" show={showLabels} />
        <div className="space-y-0.5">
          {gestaoItems.map((item) => renderLink(item))}
        </div>

        <SectionLabel label="Operações" show={showLabels} />
        <div className="space-y-0.5">
          {operacoesItems.map((item) => renderLink(item))}
        </div>

        {hasAccess("parlamentar") && (
          <>
            <SectionLabel label="Parlamentar" show={showLabels} />
            <div className="space-y-0.5">
              {parlamentarItems.map((item) => renderLink(item))}
            </div>
          </>
        )}

        <div className="my-3 border-t border-sidebar-border/40" />
        <SectionLabel label="Sistema" show={showLabels} />
        <div className="space-y-0.5">
          {sistemaItems.map((item) => renderLink(item))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {showLabels && user ? (
          <div className="flex items-center gap-2.5 mb-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/30">
            <div className="w-7 h-7 rounded-full bg-sidebar-primary/20 border border-sidebar-primary/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sidebar-primary">{user.name?.charAt(0) || "U"}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-sidebar-foreground truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">{user.role}</p>
            </div>
          </div>
        ) : null}

        <button
          onClick={(event) => {
            event.stopPropagation();
            logout();
          }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive transition-colors cursor-pointer"
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
      <button
        onClick={(event) => {
          event.stopPropagation();
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
