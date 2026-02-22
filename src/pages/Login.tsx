import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff, UserPlus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
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
        ctx.fillStyle = `hsla(45, 85%, 65%, ${p.opacity * (0.7 + Math.sin(p.pulse) * 0.3)})`;
        ctx.shadowColor = "hsla(45, 85%, 65%, 0.3)";
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden items-center justify-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
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

            {isSignup && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                  Li e aceito os{" "}
                  <a href="/termos-uso" target="_blank" className="text-primary hover:underline">Termos de Uso</a>{" "}e a{" "}
                  <a href="/politica-privacidade" target="_blank" className="text-primary hover:underline">Política de Privacidade</a>.
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (isSignup && !acceptedTerms)}
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
