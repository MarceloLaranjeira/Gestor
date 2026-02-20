import { ReactNode, useState, createContext, useContext } from "react";
import AppSidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "./AppSidebar";
import AppHeader from "./AppHeader";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({ collapsed: false, setCollapsed: () => {} });

export const useSidebarState = () => useContext(SidebarContext);

const AppLayout = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const currentWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className="min-h-screen bg-background">
        <AppSidebar />
        <div
          className="transition-all duration-300"
          style={{ marginLeft: currentWidth }}
        >
          <AppHeader />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
};

export default AppLayout;
