import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff, UserPlus } from "lucide-react";
import logoDan from "@/assets/logo-dan.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isSignup) {
      const result = await signup(email, password, nome);
      if (result.success) {
        toast({ title: "Conta criada!", description: "Você já está logado no sistema." });
        navigate("/");
      } else {
        toast({ title: "Erro ao criar conta", description: result.error, variant: "destructive" });
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        navigate("/");
      } else {
        toast({ title: "Erro de autenticação", description: result.error || "Email ou senha inválidos.", variant: "destructive" });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-sidebar-primary blur-[100px]" />
          <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-secondary blur-[120px]" />
        </div>
        <div className="relative z-10 text-center px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <img src={logoDan} alt="Gabinete CMD Dan" className="w-64 mx-auto mb-8 drop-shadow-lg" />
            <h2 className="text-2xl font-bold text-accent mb-2 font-display">Gestão Inteligente</h2>
            <p className="text-sm text-primary-foreground/50 max-w-md">
              Sistema integrado de gestão parlamentar — pessoas, demandas, eventos e inteligência institucional.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-sm">
          {/* Logo centralizada acima do formulário */}
          <div className="flex flex-col items-center mb-8">
            <img src={logoDan} alt="Gabinete CMD Dan" className="h-20 w-auto object-contain mb-2" />
            <span className="text-sm font-bold text-accent font-display">Gestão Inteligente</span>
          </div>

          <h2 className="text-2xl font-bold font-display text-foreground mb-1">
            {isSignup ? "Criar Conta" : "Bem-vindo"}
          </h2>
          <p className="text-sm text-muted-foreground mb-8">
            {isSignup ? "Preencha os dados para criar sua conta." : "Entre com suas credenciais para acessar o sistema."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignup && (
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full h-11 px-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-all"
                />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full h-11 px-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full h-11 px-4 pr-10 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground/50 transition-all"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isSignup ? (
                <><UserPlus className="w-4 h-4" /> Criar Conta</>
              ) : (
                <><LogIn className="w-4 h-4" /> Entrar</>
              )}
            </button>
          </form>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="w-full mt-4 text-xs text-center text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignup ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
          </button>

          <div className="flex justify-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <a href="/politica-privacidade" className="hover:text-primary transition-colors">Política de Privacidade</a>
            <span>•</span>
            <a href="/termos-uso" className="hover:text-primary transition-colors">Termos de Uso</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
