import { Search, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationPanel from "@/components/NotificationPanel";
import { useSidebarState } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";

const AppHeader = () => {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebarState();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-card/90 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-6 gap-2">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={isMobile ? "Buscar..." : "Buscar demandas, pessoas, eventos..."}
            className="w-full h-9 pl-10 pr-4 text-sm rounded-lg bg-muted/50 border-0 outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground/60 text-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <NotificationPanel />

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-xs font-bold text-primary-foreground">
              {user?.name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
