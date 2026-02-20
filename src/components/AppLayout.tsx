import { ReactNode, useState, createContext, useContext } from "react";
import AppSidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "./AppSidebar";
import AppHeader from "./AppHeader";

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div
        className="transition-all duration-300"
        style={{ marginLeft: SIDEBAR_WIDTH }}
      >
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
