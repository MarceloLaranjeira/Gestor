import { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="ml-[250px] transition-all duration-300">
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
