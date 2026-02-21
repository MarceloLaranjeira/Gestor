import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { usePermissions, getModuleForRoute } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Pessoas from "./pages/Pessoas";
import Demandas from "./pages/Demandas";
import Eventos from "./pages/Eventos";
import Movimentos from "./pages/Movimentos";
import Relatorios from "./pages/Relatorios";
import Configuracoes from "./pages/Configuracoes";
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import RelatorioCoordenacao from "./pages/RelatorioCoordenacao";
import CoordenacaoPage from "./pages/CoordenacaoPage";
import AgenteIA from "./pages/AgenteIA";
import Financas from "./pages/Financas";
import Calendario from "./pages/Calendario";
import MovimentoDetalhes from "./pages/MovimentoDetalhes";
import Permissoes from "./pages/Permissoes";
import AcessoNegado from "./pages/AcessoNegado";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PermissionRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { hasAccess, loading: permLoading } = usePermissions();
  const location = useLocation();

  if (authLoading || permLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const module = getModuleForRoute(location.pathname);
  if (module && !hasAccess(module)) return <Navigate to="/acesso-negado" replace />;

  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/agente-ia" element={<PermissionRoute><AgenteIA /></PermissionRoute>} />
    <Route path="/pessoas" element={<PermissionRoute><Pessoas /></PermissionRoute>} />
    <Route path="/demandas" element={<PermissionRoute><Demandas /></PermissionRoute>} />
    <Route path="/eventos" element={<PermissionRoute><Eventos /></PermissionRoute>} />
    <Route path="/calendario" element={<PermissionRoute><Calendario /></PermissionRoute>} />
    <Route path="/movimentos" element={<PermissionRoute><Movimentos /></PermissionRoute>} />
    <Route path="/movimentos/:id" element={<PermissionRoute><MovimentoDetalhes /></PermissionRoute>} />
    <Route path="/relatorios" element={<PermissionRoute><Relatorios /></PermissionRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
    <Route path="/usuarios" element={<PermissionRoute><GerenciarUsuarios /></PermissionRoute>} />
    <Route path="/relatorio-coordenacao" element={<PermissionRoute><RelatorioCoordenacao /></PermissionRoute>} />
    <Route path="/coordenacao/:id" element={<PermissionRoute><CoordenacaoPage /></PermissionRoute>} />
    <Route path="/financas" element={<PermissionRoute><Financas /></PermissionRoute>} />
    <Route path="/permissoes" element={<ProtectedRoute><Permissoes /></ProtectedRoute>} />
    <Route path="/acesso-negado" element={<ProtectedRoute><AcessoNegado /></ProtectedRoute>} />
    <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
    <Route path="/termos-uso" element={<TermosUso />} />
    <Route path="/auth/google-calendar/callback" element={<GoogleCalendarCallback />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
