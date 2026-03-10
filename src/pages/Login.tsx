import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LogIn, Eye, EyeOff, UserPlus, ArrowRight,
  BarChart3, Users, CalendarDays, MessageSquare,
  Sparkles, Shield, Zap, Globe
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import AutomatikusLogo from "@/components/AutomatikusLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/* ─── Feature list ─────────────────────────────────────── */
const FEATURES = [
  { icon: BarChart3, label: "Dashboard com IA", color: "#60A5FA" },
  { icon: CalendarDays, label: "Agenda Inteligente", color: "#34D399" },
  { icon: Users, label: "Gestão de Pessoas", color: "#A78BFA" },
  { icon: MessageSquare, label: "WhatsApp Integrado", color: "#4ADE80" },
  { icon: Globe, label: "Movimentos Sociais", color: "#FB923C" },
  { icon: Shield, label: "Segurança e Controle", color: "#F472B6" },
];

/* ─── Particle canvas ───────────────────────────────────── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Particle {
      x: number; y: number; vx: number; vy: number;
      r: number; op: number; pulse: number; pSpeed: number;
    }
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;

    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * W(), y: Math.random() * H(),
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 0.8,
      op: Math.random() * 0.4 + 0.15,
      pulse: Math.random() * Math.PI * 2,
      pSpeed: Math.random() * 0.015 + 0.005,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, W(), H());

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(215, 90%, 70%, ${(1 - d / 120) * 0.12})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        p.pulse += p.pSpeed;
        if (p.x < 0) p.x = W(); if (p.x > W()) p.x = 0;
        if (p.y < 0) p.y = H(); if (p.y > H()) p.y = 0;

        const glow = p.r * (1 + Math.sin(p.pulse) * 0.3);
        const alpha = p.op * (0.8 + Math.sin(p.pulse) * 0.2);

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow * 4);
        grad.addColorStop(0, `hsla(210, 100%, 75%, ${alpha})`);
        grad.addColorStop(1, `hsla(210, 100%, 75%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, glow * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(210, 100%, 80%, ${alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ─── Floating orb (right panel bg) ──────────────────── */
function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, #3B82F6, transparent)" }} />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #0EA5E9, transparent)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.025]"
        style={{ background: "radial-gradient(circle, #1D4ED8, transparent)" }} />
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [activeFeature, setActiveFeature] = useState(0);

  const { login, loginWithGoogle, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Cycle through features on the left panel
  useEffect(() => {
    const id = setInterval(() => setActiveFeature(f => (f + 1) % FEATURES.length), 2500);
    return () => clearInterval(id);
  }, []);

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

  /* ─── Floating label input ─────────────────────────── */
  const FloatInput = ({
    id, label, type, value, onChange, placeholder, required, minLength, rightSlot
  }: {
    id: string; label: string; type: string; value: string;
    onChange: (v: string) => void; placeholder?: string;
    required?: boolean; minLength?: number;
    rightSlot?: React.ReactNode;
  }) => {
    const active = focusedField === id || value.length > 0;
    return (
      <div className="relative">
        <label
          htmlFor={id}
          className={`absolute left-4 pointer-events-none transition-all duration-200 z-10 select-none ${
            active
              ? "top-2 text-[10px] font-semibold text-blue-400"
              : "top-1/2 -translate-y-1/2 text-sm text-muted-foreground/60"
          }`}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocusedField(id)}
          onBlur={() => setFocusedField(null)}
          placeholder={active ? placeholder : ""}
          required={required}
          minLength={minLength}
          className={`w-full h-14 px-4 pt-5 pb-2 text-sm rounded-xl border outline-none transition-all duration-200 bg-white/[0.03] text-foreground placeholder:text-muted-foreground/40 ${
            focusedField === id
              ? "border-blue-500/60 ring-2 ring-blue-500/15 shadow-[0_0_0_3px_rgba(59,130,246,0.08)]"
              : "border-white/[0.08] hover:border-white/[0.15]"
          } ${rightSlot ? "pr-11" : ""}`}
        />
        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#080e1c]">

      {/* ══════════════════ LEFT PANEL ══════════════════ */}
      <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col">
        {/* Gradient background */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(145deg, #0a1628 0%, #0d1f3c 40%, #0f2855 70%, #0a1e45 100%)" }} />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: "linear-gradient(90deg, transparent, #3B82F6, #0EA5E9, transparent)" }} />

        <ParticleCanvas />

        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,179,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px"
          }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-14 py-14">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <AutomatikusLogo variant="full" className="w-56" />
          </motion.div>

          {/* Hero text */}
          <div className="flex-1 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/8 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-blue-300">Potencializado por Inteligência Artificial</span>
              </div>

              <h1 className="text-4xl font-black text-white leading-[1.1] mb-4 tracking-tight">
                Gestão parlamentar<br />
                <span style={{
                  background: "linear-gradient(90deg, #60A5FA, #38BDF8, #34D399)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  no seu nível.
                </span>
              </h1>

              <p className="text-sm text-white/45 leading-relaxed max-w-xs mb-10">
                Tudo que o seu gabinete precisa em uma única plataforma. Demandas, pessoas, agenda, WhatsApp e IA — integrados e simples.
              </p>

              {/* Animated features */}
              <div className="space-y-3">
                {FEATURES.map((f, i) => {
                  const Icon = f.icon;
                  const isActive = activeFeature === i;
                  return (
                    <motion.div
                      key={f.label}
                      animate={{
                        opacity: isActive ? 1 : 0.38,
                        x: isActive ? 4 : 0,
                        scale: isActive ? 1.02 : 1,
                      }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="flex items-center gap-3 cursor-default"
                      onClick={() => setActiveFeature(i)}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                        style={{
                          background: isActive ? `${f.color}22` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? f.color + "44" : "rgba(255,255,255,0.06)"}`,
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: isActive ? f.color : "rgba(255,255,255,0.35)" }} />
                      </div>
                      <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? "text-white" : "text-white/35"}`}>
                        {f.label}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="activeDot"
                          className="ml-auto w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: f.color }}
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Bottom stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center gap-8 pt-8 border-t border-white/[0.06]"
          >
            {[
              { value: "10+", label: "Módulos integrados" },
              { value: "IA", label: "Assessor virtual" },
              { value: "100%", label: "Web & Mobile" },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-lg font-black text-white">{stat.value}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ══════════════════ RIGHT PANEL ══════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <FloatingOrbs />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="w-full max-w-[400px] relative z-10"
        >
          {/* Card */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm p-8 shadow-2xl">

            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-6">
              <AutomatikusLogo variant="full" className="w-44" />
            </div>

            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={isSignup ? "signup" : "login"}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22 }}
                className="mb-7"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                    {isSignup
                      ? <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                      : <Zap className="w-3.5 h-3.5 text-blue-400" />
                    }
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {isSignup ? "Criar conta" : "Acessar sistema"}
                  </h2>
                </div>
                <p className="text-sm text-white/40 pl-[38px]">
                  {isSignup
                    ? "Preencha para criar sua conta gratuita."
                    : "Entre com suas credenciais para continuar."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Google button */}
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
              className="w-full h-11 rounded-xl border border-white/[0.09] bg-white/[0.04] hover:bg-white/[0.08] text-white/80 font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 mb-5 group"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar com Google
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 -ml-1 group-hover:translate-x-0.5 transition-all duration-200" />
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.06]" />
              <span className="text-[11px] text-white/25 font-medium uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence>
                {isSignup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <FloatInput
                      id="nome" label="Nome completo" type="text"
                      value={nome} onChange={setNome}
                      placeholder="Seu nome completo" required
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <FloatInput
                id="email" label="Email" type="email"
                value={email} onChange={setEmail}
                placeholder="seu@email.com" required
              />

              <FloatInput
                id="password" label="Senha" type={showPassword ? "text" : "password"}
                value={password} onChange={setPassword}
                placeholder="••••••••" required minLength={6}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="text-white/30 hover:text-white/70 transition-colors p-1"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              <AnimatePresence>
                {isSignup && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 pt-1">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={c => setAcceptedTerms(c === true)}
                        className="mt-0.5 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                      <label htmlFor="terms" className="text-xs text-white/40 leading-relaxed cursor-pointer">
                        Li e aceito os{" "}
                        <a href="/termos-uso" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Termos de Uso</a>
                        {" "}e a{" "}
                        <a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Política de Privacidade</a>.
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading || (isSignup && !acceptedTerms)}
                className="w-full h-12 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 relative overflow-hidden group"
                style={{ background: "linear-gradient(135deg, #1D4ED8, #0EA5E9)" }}
              >
                {/* Hover shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: "linear-gradient(135deg, #2563EB, #38BDF8)" }} />
                <div className="relative flex items-center gap-2 text-white">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : isSignup ? (
                    <><UserPlus className="w-4 h-4" /> Criar Conta</>
                  ) : (
                    <><LogIn className="w-4 h-4" /> Entrar no Sistema</>
                  )}
                </div>
              </button>
            </form>

            {/* Toggle login/signup */}
            <button
              onClick={() => setIsSignup(s => !s)}
              className="w-full mt-5 text-xs text-center text-white/30 hover:text-blue-400 transition-colors py-1"
            >
              {isSignup ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se gratuitamente"}
            </button>
          </div>

          {/* Footer links */}
          <div className="flex justify-center gap-4 mt-5 text-[11px] text-white/20">
            <a href="/politica-privacidade" className="hover:text-white/50 transition-colors">Privacidade</a>
            <span>·</span>
            <a href="/termos-uso" className="hover:text-white/50 transition-colors">Termos de Uso</a>
            <span>·</span>
            <span>gestor.automatikus.com.br</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
