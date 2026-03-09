import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { usePermissions, getModuleForRoute } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";
import { Analytics } from "@vercel/analytics/react";
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
import Coordenacoes from "./pages/Coordenacoes";
import PoliticaPrivacidade from "./pages/PoliticaPrivacidade";
import TermosUso from "./pages/TermosUso";
import GoogleCalendarCallback from "./pages/GoogleCalendarCallback";
import NotFound from "./pages/NotFound";

// Campanha
import CampanhaDashboard from "./pages/campanha/CampanhaDashboard";
import CampanhaCalhas from "./pages/campanha/CampanhaCalhas";
import CampanhaCoordenadores from "./pages/campanha/CampanhaCoordenadores";
import CampanhaAssessores from "./pages/campanha/CampanhaAssessores";
import CampanhaVisitas from "./pages/campanha/CampanhaVisitas";
import CampanhaRelatorios from "./pages/campanha/CampanhaRelatorios";
import CampanhaMapa from "./pages/campanha/CampanhaMapa";
import CampanhaLocais from "./pages/campanha/CampanhaLocais";

// Coordenações (Módulo Estratégico)
import CoordCalhasMunicipios from "./pages/coord/CoordCalhasMunicipios";
import CoordCoordenadores from "./pages/coord/CoordCoordenadores";
import CoordAssessores from "./pages/coord/CoordAssessores";
import CoordMonitorContatos from "./pages/coord/CoordMonitorContatos";
import CoordPlanejamentoVisitas from "./pages/coord/CoordPlanejamentoVisitas";

// Prontuário Parlamentar
import ApoiadoresList from "./pages/prontuario/ApoiadoresList";

// Logbook de Calhas
import LogbookCalhas from "./pages/logbook/LogbookCalhas";
import LogbookDetalhes from "./pages/logbook/LogbookDetalhes";
import LogbookMunicipioForm from "./pages/logbook/LogbookMunicipioForm";

// Integração
import Integracao from "./pages/Integracao";
import WhatsApp from "./pages/WhatsApp";
import ApoiadorForm from "./pages/prontuario/ApoiadorForm";
import ApoiadorDetalhes from "./pages/prontuario/ApoiadorDetalhes";
import ResumoExecutivo from "./pages/prontuario/ResumoExecutivo";

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
    <Route path="/coordenacoes" element={<PermissionRoute><Coordenacoes /></PermissionRoute>} />
    <Route path="/coordenacao/:id" element={<PermissionRoute><CoordenacaoPage /></PermissionRoute>} />
    {/* Coordenações Estratégicas (dentro de Campanha) */}
    <Route path="/campanha/coord/calhas" element={<PermissionRoute><CoordCalhasMunicipios /></PermissionRoute>} />
    <Route path="/campanha/coord/coordenadores" element={<PermissionRoute><CoordCoordenadores /></PermissionRoute>} />
    <Route path="/campanha/coord/assessores" element={<PermissionRoute><CoordAssessores /></PermissionRoute>} />
    <Route path="/campanha/coord/monitor" element={<PermissionRoute><CoordMonitorContatos /></PermissionRoute>} />
    <Route path="/campanha/coord/planejamento" element={<PermissionRoute><CoordPlanejamentoVisitas /></PermissionRoute>} />
    <Route path="/financas" element={<PermissionRoute><Financas /></PermissionRoute>} />
    <Route path="/permissoes" element={<ProtectedRoute><Permissoes /></ProtectedRoute>} />
    <Route path="/acesso-negado" element={<ProtectedRoute><AcessoNegado /></ProtectedRoute>} />
    <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
    <Route path="/termos-uso" element={<TermosUso />} />
    <Route path="/auth/google-calendar/callback" element={<GoogleCalendarCallback />} />
    {/* Campanha */}
    <Route path="/campanha" element={<PermissionRoute><CampanhaDashboard /></PermissionRoute>} />
    <Route path="/campanha/calhas" element={<PermissionRoute><CampanhaCalhas /></PermissionRoute>} />
    <Route path="/campanha/mapa" element={<PermissionRoute><CampanhaMapa /></PermissionRoute>} />
    <Route path="/campanha/locais" element={<PermissionRoute><CampanhaLocais /></PermissionRoute>} />
    <Route path="/campanha/coordenadores" element={<PermissionRoute><CampanhaCoordenadores /></PermissionRoute>} />
    <Route path="/campanha/assessores" element={<PermissionRoute><CampanhaAssessores /></PermissionRoute>} />
    <Route path="/campanha/visitas" element={<PermissionRoute><CampanhaVisitas /></PermissionRoute>} />
    <Route path="/campanha/relatorios" element={<PermissionRoute><CampanhaRelatorios /></PermissionRoute>} />
    {/* Prontuário Parlamentar */}
    <Route path="/prontuario" element={<PermissionRoute><ApoiadoresList /></PermissionRoute>} />
    <Route path="/prontuario/novo" element={<PermissionRoute><ApoiadorForm /></PermissionRoute>} />
    <Route path="/prontuario/resumo" element={<PermissionRoute><ResumoExecutivo /></PermissionRoute>} />
    <Route path="/prontuario/:id" element={<PermissionRoute><ApoiadorDetalhes /></PermissionRoute>} />
    <Route path="/prontuario/:id/editar" element={<PermissionRoute><ApoiadorForm /></PermissionRoute>} />
    {/* Logbook de Calhas */}
    <Route path="/logbook" element={<PermissionRoute><LogbookCalhas /></PermissionRoute>} />
    <Route path="/logbook/:id" element={<PermissionRoute><LogbookDetalhes /></PermissionRoute>} />
    <Route path="/logbook/:calhaId/municipio/:munId" element={<PermissionRoute><LogbookMunicipioForm /></PermissionRoute>} />
    {/* Integração */}
    <Route path="/integracao" element={<PermissionRoute><Integracao /></PermissionRoute>} />
    <Route path="/whatsapp" element={<PermissionRoute><WhatsApp /></PermissionRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);
const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
      <Analytics />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
