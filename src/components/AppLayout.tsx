import { ReactNode, useState, createContext, useContext } from "react";
import AppSidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "./AppSidebar";
import AppHeader from "./AppHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebarState = () => useContext(SidebarContext);

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsedState] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const currentWidth = isMobile ? 0 : collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  const setCollapsed = (v: boolean) => {
    setCollapsedState(v);
    try { localStorage.setItem("sidebar-collapsed", String(v)); } catch {}
  };

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div
          className="transition-all duration-300"
          style={{ marginLeft: currentWidth }}
        >
          <AppHeader />
          <main className="p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

export default AppLayout;
