import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface ThemePreset {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    sidebarBg: string;
    sidebarAccent: string;
    sidebarPrimary: string;
    sidebarBorder: string;
    sidebarRing: string;
  };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "verde-institucional",
    name: "Verde Institucional",
    colors: {
      primary: "152 55% 24%",
      secondary: "205 70% 45%",
      accent: "45 85% 55%",
      success: "142 70% 40%",
      warning: "38 92% 50%",
      sidebarBg: "152 45% 14%",
      sidebarAccent: "152 35% 20%",
      sidebarPrimary: "45 85% 55%",
      sidebarBorder: "152 30% 22%",
      sidebarRing: "45 85% 55%",
    },
  },
  {
    id: "azul-moderno",
    name: "Azul Moderno",
    colors: {
      primary: "220 70% 40%",
      secondary: "200 60% 50%",
      accent: "35 90% 55%",
      success: "142 70% 40%",
      warning: "38 92% 50%",
      sidebarBg: "220 55% 15%",
      sidebarAccent: "220 45% 22%",
      sidebarPrimary: "35 90% 55%",
      sidebarBorder: "220 40% 25%",
      sidebarRing: "35 90% 55%",
    },
  },
  {
    id: "roxo-elegante",
    name: "Roxo Elegante",
    colors: {
      primary: "270 55% 40%",
      secondary: "290 50% 50%",
      accent: "45 85% 55%",
      success: "142 70% 40%",
      warning: "38 92% 50%",
      sidebarBg: "270 40% 14%",
      sidebarAccent: "270 35% 22%",
      sidebarPrimary: "45 85% 55%",
      sidebarBorder: "270 30% 25%",
      sidebarRing: "45 85% 55%",
    },
  },
  {
    id: "vermelho-executivo",
    name: "Vermelho Executivo",
    colors: {
      primary: "0 60% 40%",
      secondary: "15 55% 50%",
      accent: "45 85% 55%",
      success: "142 70% 40%",
      warning: "38 92% 50%",
      sidebarBg: "0 45% 14%",
      sidebarAccent: "0 35% 22%",
      sidebarPrimary: "45 85% 55%",
      sidebarBorder: "0 30% 25%",
      sidebarRing: "45 85% 55%",
    },
  },
  {
    id: "cinza-corporativo",
    name: "Cinza Corporativo",
    colors: {
      primary: "210 15% 30%",
      secondary: "210 20% 50%",
      accent: "200 70% 50%",
      success: "142 70% 40%",
      warning: "38 92% 50%",
      sidebarBg: "210 15% 12%",
      sidebarAccent: "210 12% 20%",
      sidebarPrimary: "200 70% 50%",
      sidebarBorder: "210 10% 22%",
      sidebarRing: "200 70% 50%",
    },
  },
  {
    id: "verde-oliva",
    name: "Verde Oliva Militar",
    colors: {
      primary: "80 40% 30%",
      secondary: "60 30% 45%",
      accent: "45 85% 55%",
      success: "142 70% 40%",
      warning: "38 92% 50%",
      sidebarBg: "80 35% 12%",
      sidebarAccent: "80 30% 20%",
      sidebarPrimary: "45 85% 55%",
      sidebarBorder: "80 25% 22%",
      sidebarRing: "45 85% 55%",
    },
  },
];

interface ThemeContextType {
  currentTheme: ThemePreset;
  setTheme: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: THEME_PRESETS[0],
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyTheme(preset: ThemePreset) {
  const root = document.documentElement;
  const c = preset.colors;
  root.style.setProperty("--primary", c.primary);
  root.style.setProperty("--secondary", c.secondary);
  root.style.setProperty("--accent", c.accent);
  root.style.setProperty("--success", c.success);
  root.style.setProperty("--warning", c.warning);
  root.style.setProperty("--ring", c.primary);
  root.style.setProperty("--sidebar-background", c.sidebarBg);
  root.style.setProperty("--sidebar-accent", c.sidebarAccent);
  root.style.setProperty("--sidebar-primary", c.sidebarPrimary);
  root.style.setProperty("--sidebar-border", c.sidebarBorder);
  root.style.setProperty("--sidebar-ring", c.sidebarRing);
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<ThemePreset>(() => {
    try {
      const saved = localStorage.getItem("app-theme");
      if (saved) {
        const found = THEME_PRESETS.find((t) => t.id === saved);
        if (found) return found;
      }
    } catch {}
    return THEME_PRESETS[0];
  });

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = (id: string) => {
    const found = THEME_PRESETS.find((t) => t.id === id);
    if (found) {
      setCurrentTheme(found);
      try { localStorage.setItem("app-theme", id); } catch {}
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
