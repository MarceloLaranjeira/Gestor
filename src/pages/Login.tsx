import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  LogIn, Eye, EyeOff, UserPlus,
  BarChart3, Users, CalendarDays, MessageSquare,
  Sparkles, Shield, Globe, FileText, Wallet, Bot,
} from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import AutomatikusLogo from "@/components/AutomatikusLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/* ─── All features grid ────────────────────────────────── */
const FEATURES = [
  { icon: BarChart3,    label: "Dashboard",        desc: "Analytics com IA",          color: "#60A5FA", bg: "#1e3a5f" },
  { icon: CalendarDays, label: "Agenda",            desc: "Calendário integrado",      color: "#34D399", bg: "#0d3a2a" },
  { icon: FileText,     label: "Demandas",          desc: "Controle total",            color: "#A78BFA", bg: "#2d1b4e" },
  { icon: MessageSquare,label: "WhatsApp",          desc: "Web integrado",             color: "#4ADE80", bg: "#0d3320" },
  { icon: Users,        label: "Pessoas",           desc: "Gestão de contatos",        color: "#F472B6", bg: "#3d1a2e" },
  { icon: Globe,        label: "Movimentos",        desc: "Temas sociais",             color: "#FB923C", bg: "#3d2010" },
  { icon: Wallet,       label: "Financeiro",        desc: "Orçamento e gastos",        color: "#FBBF24", bg: "#3d2e00" },
  { icon: Bot,          label: "Assessor IA",       desc: "Inteligência artificial",   color: "#38BDF8", bg: "#0a2d3d" },
  { icon: Shield,       label: "Segurança",         desc: "Acesso e controle",         color: "#F87171", bg: "#3d1010" },
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
    const W = () => canvas.offsetWidth;
    const H = () => canvas.offsetHeight;
    interface P { x:number;y:number;vx:number;vy:number;r:number;op:number;pulse:number;ps:number }
    const pts: P[] = Array.from({ length: 60 }, () => ({
      x: Math.random()*W(), y: Math.random()*H(),
      vx: (Math.random()-.5)*.35, vy: (Math.random()-.5)*.35,
      r: Math.random()*2+0.6, op: Math.random()*.35+.1,
      pulse: Math.random()*Math.PI*2, ps: Math.random()*.012+.004,
    }));
    const draw = () => {
      ctx.clearRect(0,0,W(),H());
      for (let i=0;i<pts.length;i++) for (let j=i+1;j<pts.length;j++) {
        const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y, d=Math.hypot(dx,dy);
        if (d<100) { ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
          ctx.strokeStyle=`hsla(215,90%,70%,${(1-d/100)*.1})`; ctx.lineWidth=.7; ctx.stroke(); }
      }
      for (const p of pts) {
        p.x+=p.vx; p.y+=p.vy; p.pulse+=p.ps;
        if (p.x<0) p.x=W(); if (p.x>W()) p.x=0;
        if (p.y<0) p.y=H(); if (p.y>H()) p.y=0;
        const g=p.r*(1+Math.sin(p.pulse)*.25), a=p.op*(0.8+Math.sin(p.pulse)*.2);
        const gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,g*4);
        gr.addColorStop(0,`hsla(210,100%,75%,${a})`); gr.addColorStop(1,`hsla(210,100%,75%,0)`);
        ctx.beginPath(); ctx.arc(p.x,p.y,g*4,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x,p.y,g,0,Math.PI*2); ctx.fillStyle=`hsla(210,100%,80%,${a})`; ctx.fill();
      }
      animId=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ─── Main ──────────────────────────────────────────────── */
const Login = () => {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [nome, setNome]                 = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [isSignup, setIsSignup]         = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login, loginWithGoogle, signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isSignup) {
      const r = await signup(email, password, nome);
      if (r.success) { toast({ title: "Conta criada!" }); navigate("/"); }
      else toast({ title: "Erro", description: r.error, variant: "destructive" });
    } else {
      const r = await login(email, password);
      if (r.success) navigate("/");
      else toast({ title: "Erro de autenticação", description: r.error || "Email ou senha inválidos.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    const r = await loginWithGoogle();
    if (!r.success) {
      toast({ title: "Erro ao entrar com Google", description: r.error, variant: "destructive" });
      setLoading(false);
    }
  };

  /* Floating label input */
  const FloatInput = ({ id, label, type, value, onChange, placeholder, required, minLength, rightSlot }: {
    id: string; label: string; type: string; value: string;
    onChange: (v: string) => void; placeholder?: string;
    required?: boolean; minLength?: number; rightSlot?: React.ReactNode;
  }) => {
    const active = focusedField === id || value.length > 0;
    return (
      <div className="relative">
        <label htmlFor={id} className={`absolute left-4 pointer-events-none transition-all duration-200 z-10 select-none ${active ? "top-2 text-[10px] font-semibold text-blue-400" : "top-1/2 -translate-y-1/2 text-sm text-white/40"}`}>
          {label}
        </label>
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocusedField(id)}
          onBlur={() => setFocusedField(null)}
          placeholder={active ? placeholder : ""}
          required={required} minLength={minLength}
          className={`w-full h-14 px-4 pt-5 pb-2 text-sm rounded-xl border outline-none transition-all duration-200 bg-white/[0.04] text-white placeholder:text-white/25 ${focusedField === id ? "border-blue-500/60 ring-2 ring-blue-500/15" : "border-white/[0.09] hover:border-white/[0.18]"} ${rightSlot ? "pr-11" : ""}`}
        />
        {rightSlot && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightSlot}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#070d1a]">

      {/* ══════════ LEFT PANEL ══════════ */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col">
        <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#070d1a 0%,#0b1a35 45%,#0d2148 100%)" }} />
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg,transparent,#3B82F6,#0EA5E9,transparent)" }} />
        <ParticleCanvas />
        {/* subtle grid */}
        <div className="absolute inset-0 opacity-[0.022]" style={{ backgroundImage: "linear-gradient(rgba(99,179,237,1) 1px,transparent 1px),linear-gradient(90deg,rgba(99,179,237,1) 1px,transparent 1px)", backgroundSize: "44px 44px" }} />

        <div className="relative z-10 flex flex-col h-full px-12 py-12">
          {/* Logo */}
          <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ duration:.55 }}>
            <AutomatikusLogo variant="full" className="w-52" />
          </motion.div>

          {/* Hero */}
          <motion.div
            initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:.65, delay:.12 }}
            className="mt-10 mb-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/[0.08] mb-5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium text-blue-300">Potencializado por Inteligência Artificial</span>
            </div>
            <h1 className="text-[2.1rem] font-black text-white leading-[1.1] tracking-tight mb-3">
              Gestão parlamentar<br />
              <span style={{ background:"linear-gradient(90deg,#60A5FA,#38BDF8,#34D399)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                no seu nível.
              </span>
            </h1>
            <p className="text-sm text-white/40 leading-relaxed max-w-sm">
              Um sistema completo para o gabinete moderno — do atendimento ao eleitor à prestação de contas, tudo integrado.
            </p>
          </motion.div>

          {/* ── Feature grid — ALL highlighted ── */}
          <motion.div
            initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:.65, delay:.25 }}
            className="grid grid-cols-3 gap-3 flex-1"
          >
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  initial={{ opacity:0, scale:.9 }}
                  animate={{ opacity:1, scale:1 }}
                  transition={{ duration:.4, delay:.3 + i * .06 }}
                  className="rounded-xl p-3.5 flex flex-col gap-2 border transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default"
                  style={{
                    background: `linear-gradient(135deg, ${f.bg}cc, ${f.bg}88)`,
                    borderColor: `${f.color}22`,
                    boxShadow: `0 0 0 1px ${f.color}15 inset`,
                  }}
                  whileHover={{ boxShadow: `0 8px 30px ${f.color}20, 0 0 0 1px ${f.color}30 inset` }}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${f.color}20`, border: `1px solid ${f.color}35` }}>
                    <Icon className="w-4 h-4" style={{ color: f.color }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-white leading-none mb-0.5">{f.label}</p>
                    <p className="text-[11px] text-white/40 leading-snug">{f.desc}</p>
                  </div>
                  {/* colored bottom accent */}
                  <div className="h-[2px] rounded-full mt-auto" style={{ background: `linear-gradient(90deg,${f.color}60,transparent)` }} />
                </motion.div>
              );
            })}
          </motion.div>

          {/* Bottom stats */}
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            transition={{ duration:.6, delay:.55 }}
            className="flex items-center gap-8 pt-6 mt-6 border-t border-white/[0.06]"
          >
            {[
              { value:"9+",   label:"Módulos integrados" },
              { value:"IA",   label:"Assessor virtual" },
              { value:"100%", label:"Web & Mobile" },
            ].map(s => (
              <div key={s.label}>
                <p className="text-lg font-black text-white">{s.value}</p>
                <p className="text-[11px] text-white/35 mt-0.5">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL ══════════ */}
      <div className="flex-1 flex items-center justify-center p-6 relative">
        {/* bg orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]" style={{ background:"radial-gradient(circle,#3B82F6,transparent)" }} />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full opacity-[0.05]" style={{ background:"radial-gradient(circle,#0EA5E9,transparent)" }} />
        </div>

        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:.55, delay:.1 }}
          className="w-full max-w-[390px] relative z-10"
        >
          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] backdrop-blur-md p-8 shadow-2xl">

            {/* Mobile logo */}
            <div className="flex lg:hidden justify-center mb-6">
              <AutomatikusLogo variant="full" className="w-44" />
            </div>

            {/* Header */}
            <AnimatePresence mode="wait">
              <motion.div key={isSignup?"s":"l"} initial={{ opacity:0,y:-8 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:8 }} transition={{ duration:.2 }} className="mb-6">
                <h2 className="text-xl font-bold text-white mb-1">
                  {isSignup ? "Criar conta" : "Acessar sistema"}
                </h2>
                <p className="text-sm text-white/35">
                  {isSignup ? "Preencha para criar sua conta gratuita." : "Entre para acessar seu gabinete."}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ── Google — destaque principal ── */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="w-full h-13 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 mb-2 relative overflow-hidden group"
              style={{ background:"linear-gradient(135deg,#ffffff10,#ffffff08)", border:"1px solid rgba(255,255,255,0.15)" }}
            >
              {/* hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" style={{ background:"linear-gradient(135deg,#ffffff18,#ffffff0a)" }} />
              <svg className="w-5 h-5 flex-shrink-0 relative z-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="relative z-10 text-white font-semibold text-[15px]">Continuar com Google</span>
              <span className="relative z-10 ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full text-blue-300" style={{ background:"rgba(59,130,246,0.18)", border:"1px solid rgba(59,130,246,0.25)" }}>
                Recomendado
              </span>
            </button>

            <p className="text-[11px] text-white/25 text-center mb-5">
              Acesso rápido e seguro com sua conta Google
            </p>

            {/* Divider */}
            <div className="relative flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.07]" />
              <span className="text-[11px] text-white/20 uppercase tracking-wider">ou entre com email</span>
              <div className="flex-1 h-px bg-white/[0.07]" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <AnimatePresence>
                {isSignup && (
                  <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }} transition={{ duration:.22 }} className="overflow-hidden">
                    <FloatInput id="nome" label="Nome completo" type="text" value={nome} onChange={setNome} placeholder="Seu nome" required />
                  </motion.div>
                )}
              </AnimatePresence>

              <FloatInput id="email" label="Email" type="email" value={email} onChange={setEmail} placeholder="seu@email.com" required />

              <FloatInput
                id="password" label="Senha" type={showPassword?"text":"password"}
                value={password} onChange={setPassword} placeholder="••••••••" required minLength={6}
                rightSlot={
                  <button type="button" onClick={() => setShowPassword(s=>!s)} className="text-white/30 hover:text-white/70 transition-colors p-1" aria-label={showPassword?"Ocultar senha":"Mostrar senha"}>
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                }
              />

              <AnimatePresence>
                {isSignup && (
                  <motion.div initial={{ opacity:0,height:0 }} animate={{ opacity:1,height:"auto" }} exit={{ opacity:0,height:0 }} transition={{ duration:.22 }} className="overflow-hidden">
                    <div className="flex items-start gap-2.5 pt-1">
                      <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={c=>setAcceptedTerms(c===true)} className="mt-0.5 border-white/20 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                      <label htmlFor="terms" className="text-xs text-white/35 leading-relaxed cursor-pointer">
                        Li e aceito os{" "}<a href="/termos-uso" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">Termos de Uso</a>{" "}e a{" "}<a href="/politica-privacidade" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 font-medium">Política de Privacidade</a>.
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading || (isSignup && !acceptedTerms)}
                className="w-full h-12 rounded-xl font-semibold text-sm text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1 relative overflow-hidden group"
                style={{ background:"linear-gradient(135deg,#1D4ED8,#0EA5E9)" }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background:"linear-gradient(135deg,#2563EB,#38BDF8)" }} />
                <span className="relative flex items-center gap-2">
                  {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : isSignup ? <><UserPlus className="w-4 h-4"/> Criar Conta</>
                    : <><LogIn className="w-4 h-4"/> Entrar</>}
                </span>
              </button>
            </form>

            <button onClick={() => setIsSignup(s=>!s)} className="w-full mt-4 text-xs text-center text-white/30 hover:text-blue-400 transition-colors py-1">
              {isSignup ? "Já tem conta? Faça login" : "Não tem conta? Cadastre-se gratuitamente"}
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-center gap-4 mt-4 text-[11px] text-white/18">
            <a href="/politica-privacidade" className="hover:text-white/45 transition-colors">Privacidade</a>
            <span>·</span>
            <a href="/termos-uso" className="hover:text-white/45 transition-colors">Termos</a>
            <span>·</span>
            <span>gestor.automatikus.com.br</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
