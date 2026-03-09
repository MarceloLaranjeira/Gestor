import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-sm animate-fade-in">
        <p className="text-8xl font-bold font-display text-primary/20 mb-2">404</p>
        <h1 className="text-2xl font-bold font-display text-foreground mb-2">Página não encontrada</h1>
        <p className="text-sm text-muted-foreground mb-8">
          A rota <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{location.pathname}</code> não existe no sistema.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors text-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg gradient-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            <Home className="w-4 h-4" /> Ir para o Início
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
