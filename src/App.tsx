import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import MovimentoDetalhes from "./pages/MovimentoDetalhes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/agente-ia" element={<ProtectedRoute><AgenteIA /></ProtectedRoute>} />
    <Route path="/pessoas" element={<ProtectedRoute><Pessoas /></ProtectedRoute>} />
    <Route path="/demandas" element={<ProtectedRoute><Demandas /></ProtectedRoute>} />
    <Route path="/eventos" element={<ProtectedRoute><Eventos /></ProtectedRoute>} />
    <Route path="/movimentos" element={<ProtectedRoute><Movimentos /></ProtectedRoute>} />
    <Route path="/movimentos/:id" element={<ProtectedRoute><MovimentoDetalhes /></ProtectedRoute>} />
    <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
    <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
    <Route path="/usuarios" element={<ProtectedRoute><GerenciarUsuarios /></ProtectedRoute>} />
    <Route path="/relatorio-coordenacao" element={<ProtectedRoute><RelatorioCoordenacao /></ProtectedRoute>} />
    <Route path="/coordenacao/:id" element={<ProtectedRoute><CoordenacaoPage /></ProtectedRoute>} />
    <Route path="/financas" element={<ProtectedRoute><Financas /></ProtectedRoute>} />
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
