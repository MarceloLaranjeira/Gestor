import { createContext, useContext, useState, ReactNode } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  user: { name: string; role: string; email: string } | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const MOCK_USERS = [
  { email: "admin@gabinete.com", password: "admin123", name: "Administrador", role: "Gestor" },
  { email: "assessor@gabinete.com", password: "assessor123", name: "Assessor Parlamentar", role: "Assessor" },
  { email: "coord@gabinete.com", password: "coord123", name: "Coordenador", role: "Coordenador" },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthContextType["user"]>(() => {
    const saved = localStorage.getItem("gabinete_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (email: string, password: string) => {
    const found = MOCK_USERS.find((u) => u.email === email && u.password === password);
    if (found) {
      const userData = { name: found.name, role: found.role, email: found.email };
      setUser(userData);
      localStorage.setItem("gabinete_user", JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("gabinete_user");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
