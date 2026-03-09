import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff, UserPlus } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import AutomatikusLogo from "@/components/AutomatikusLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { login, loginWithGoogle, signup } = useAuth();
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

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => { canvas.width = canvas.offsetWidth * 2; canvas.height = canvas.offsetHeight * 2; };
    resize();
    window.addEventListener("resize", resize);

    const NUM = 120;
    const particles = Array.from({ length: NUM }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 0.35 + 0.05;
      return {
        angle,
        dist,
        size: Math.random() * 3 + 1.5,
        opacity: Math.random() * 0.5 + 0.25,
        speed: (Math.random() * 0.003 + 0.001) * (i < NUM / 2 ? 1 : -1),
        yOffset: (Math.random() - 0.5) * 0.1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = Math.min(cx, cy) * 0.75;

      for (const p of particles) {
        p.angle += p.speed;
        p.pulse += p.pulseSpeed;
        const x = cx + Math.cos(p.angle) * radius * p.dist;
        const y = cy + Math.sin(p.angle) * radius * p.dist + Math.sin(p.pulse) * 8;
        const s = p.size * (1 + Math.sin(p.pulse) * 0.3);

        ctx.beginPath();
        ctx.arc(x, y, s, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(213, 94%, 75%, ${p.opacity * (0.7 + Math.sin(p.pulse) * 0.3)})`;
        ctx.shadowColor = "hsla(213, 94%, 62%, 0.4)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  const inputClass = "w-full h-11 px-4 text-sm rounded-xl bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50 transition-all";

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[45%] gradient-primary relative overflow-hidden items-center justify-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="relative z-10 text-center px-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex flex-col items-center">
            <AutomatikusLogo variant="full" className="w-72 mb-8 drop-shadow-2xl" />
            <p className="text-sm text-white/55 max-w-sm text-center">
              Plataforma inteligente de gestão parlamentar — demandas, eventos, coordenações e IA integrada.
            </p>
            <div className="flex items-center justify-center gap-6 mt-10">
              {[
                { label: "Demandas", value: "Controle" },
                { label: "Pessoas", value: "Gestão" },
                { label: "Eventos", value: "Agenda" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-xs font-bold text-accent">{item.value}</p>
                  <p className="text-[10px] text-primary-foreground/50 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="w-full max-w-sm">
          {/* Logo centralizada acima do formulário */}
          <div className="flex flex-col items-center mb-8">
            <AutomatikusLogo variant="icon" iconSize={56} className="mb-3" />
            <span className="text-base font-bold text-foreground font-display">Gestão Inteligente</span>
            <span className="text-xs text-muted-foreground">Automatikus — Automações Digitais</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold font-display text-foreground mb-1">
              {isSignup ? "Criar Conta" : "Bem-vindo de volta"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isSignup ? "Preencha os dados para criar sua conta." : "Entre com suas credenciais para acessar."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className={inputClass}
                />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isSignup && (
              <div className="flex items-start gap-2.5 pt-1">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Li e aceito os{" "}
                  <a href="/termos-uso" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Termos de Uso</a>{" "}e a{" "}
                  <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Política de Privacidade</a>.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignup && !acceptedTerms)}
              className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-md"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isSignup ? (
                <><UserPlus className="w-4 h-4" /> Criar Conta</>
              ) : (
                <><LogIn className="w-4 h-4" /> Entrar no Sistema</>
              )}
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              const result = await loginWithGoogle();
              if (!result.success) {
                toast({ title: "Erro ao entrar com Google", description: result.error, variant: "destructive" });
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full h-11 rounded-lg border border-border bg-background hover:bg-muted/50 text-foreground font-medium text-sm transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Entrar com Google
          </button>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="w-full mt-4 text-xs text-center text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignup ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se"}
          </button>

          <div className="flex justify-center gap-4 mt-4 text-[11px] text-muted-foreground/70">
            <a href="/politica-privacidade" className="hover:text-primary transition-colors">Privacidade</a>
            <span>·</span>
            <a href="/termos-uso" className="hover:text-primary transition-colors">Termos de Uso</a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
