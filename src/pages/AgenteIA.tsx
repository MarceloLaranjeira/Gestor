import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Mic, MicOff, Square, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { AgentSettingsPanel, DEFAULT_SETTINGS, type AgentSettings } from "@/components/AgentSettingsPanel";
import { supabase } from "@/integrations/supabase/client";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agente-ia`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-multi`;

async function streamChat(
  messages: Msg[],
  model: string,
  customInstructions: string,
  extraSettings: { temperature: number; assertiveness: number; formality: string },
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void,
  signal?: AbortSignal
) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { onError("Não autorizado."); return; }

  const resp = await fetch(AGENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messages, model, attachments: [], customInstructions, ...extraSettings }),
    signal,
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || "Erro ao conectar.");
    return;
  }

  if (!resp.body) { onError("Resposta inválida."); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }
  onDone();
}

function createUnlockedAudio(): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = "auto";
  audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
  audio.volume = 0;
  audio.play().then(() => { audio.pause(); audio.volume = 1; audio.currentTime = 0; }).catch(() => {});
  return audio;
}

async function requestMicrophonePermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(t => t.stop());
    return true;
  } catch { return false; }
}

async function speakText(
  text: string,
  settings: AgentSettings,
  preUnlockedAudio?: HTMLAudioElement
): Promise<{ audio: HTMLAudioElement }> {
  const clean = text
    .replace(/#{1,6}\s/g, "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1").replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "").replace(/\n{2,}/g, ". ").trim();

  const audio = preUnlockedAudio || new Audio();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("Não autorizado");

  const resp = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      text: clean.slice(0, 2500),
      provider: settings.ttsProvider || "elevenlabs",
      voiceId: settings.voiceId,
      stability: settings.stability,
      speed: settings.speed,
      googleApiKey: settings.googleTtsApiKey || undefined,
      openaiApiKey: settings.openaiTtsApiKey || undefined,
      googleVoiceName: settings.googleVoiceName || "Kore",
    }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || "Erro ao gerar áudio");
  }

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  audio.src = url;
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  await audio.play();
  return { audio };
}

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// ---------------------------------------------------------------------------
// Particle Sphere
// ---------------------------------------------------------------------------
interface SphereState {
  isListening: boolean;
  isSpeaking: boolean;
  isLoading: boolean;
}

const HorusSphere = ({ isListening, isSpeaking, isLoading }: SphereState) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<SphereState>({ isListening, isSpeaking, isLoading });

  useEffect(() => {
    stateRef.current = { isListening, isSpeaking, isLoading };
  }, [isListening, isSpeaking, isLoading]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fibonacci sphere points
    const N = 220;
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    const pts: { x: number; y: number; z: number }[] = [];
    for (let i = 0; i < N; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / N);
      const phi = 2 * Math.PI * i / goldenRatio;
      pts.push({
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta),
      });
    }

    let rotY = 0;
    let rotX = 0.3;
    let time = 0;

    const draw = () => {
      const { isListening, isSpeaking, isLoading } = stateRef.current;
      const W = canvas.width;
      const H = canvas.height;
      const CX = W / 2;
      const CY = H / 2;

      ctx.clearRect(0, 0, W, H);

      const rotSpeed = isListening ? 0.022 : isSpeaking ? 0.01 : 0.004;
      const baseR = isSpeaking ? 118 : isListening ? 110 : 95;
      const radius = baseR + (isSpeaking ? Math.sin(time * 4) * 9 : isLoading ? Math.sin(time * 2) * 4 : 0);

      const color = isListening ? [255, 110, 50] : isSpeaking ? [0, 230, 255] : [0, 190, 230];

      rotY += rotSpeed;
      rotX += rotSpeed * 0.22;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // Ambient glow
      const glowAlpha = isSpeaking ? 0.22 : isListening ? 0.18 : 0.06;
      const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, radius * 1.7);
      glow.addColorStop(0, `rgba(${color.join(",")},${glowAlpha})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Project and sort
      const projected = pts.map((pt, idx) => {
        const x1 = pt.x * cosY + pt.z * sinY;
        const z1 = -pt.x * sinY + pt.z * cosY;
        const y1 = pt.y * cosX - z1 * sinX;
        const z2 = pt.y * sinX + z1 * cosX;

        let r = radius;
        if (isSpeaking) r += Math.sin(time * 6 + idx * 0.11) * 7;
        if (isLoading)  r += Math.sin(time * 3 + idx * 0.2)  * 5;

        const fov = 4;
        const scale = fov / (fov + z2);
        return { x: CX + x1 * scale * r, y: CY + y1 * scale * r, z: z2, scale };
      });

      projected.sort((a, b) => a.z - b.z);

      projected.forEach(pt => {
        const depth = (pt.z + 1) / 2;
        const opacity = 0.12 + depth * 0.88;
        const dotSize = Math.max(0.7, pt.scale * 2.3);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.join(",")},${opacity})`;
        ctx.fill();
      });

      time += 0.016;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={310}
      height={310}
      style={{ filter: "drop-shadow(0 0 24px rgba(0,200,255,0.35))" }}
    />
  );
};

// ---------------------------------------------------------------------------
// Frequency Visualizer
// ---------------------------------------------------------------------------
const FrequencyVisualizer = ({ isActive }: { isActive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const activeRef = useRef(isActive);

  useEffect(() => { activeRef.current = isActive; }, [isActive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const BARS = 52;
    const heights = Array(BARS).fill(0);
    let time = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const active = activeRef.current;
      const barW = W / BARS;

      for (let i = 0; i < BARS; i++) {
        let target = 1;
        if (active) {
          target = (
            Math.abs(Math.sin(time * 2.8 + i * 0.38)) * 0.45 +
            Math.abs(Math.sin(time * 5.9 + i * 0.82)) * 0.30 +
            Math.abs(Math.sin(time * 11.5 + i * 1.35)) * 0.18 +
            0.07
          ) * H * 0.9;
        }
        heights[i] += (target - heights[i]) * (active ? 0.14 : 0.07);

        const h = heights[i];
        const x = i * barW;
        const grad = ctx.createLinearGradient(0, H / 2 - h / 2, 0, H / 2 + h / 2);
        grad.addColorStop(0,   "rgba(0,200,255,0.04)");
        grad.addColorStop(0.5, `rgba(0,200,255,${active ? 0.88 : 0.18})`);
        grad.addColorStop(1,   "rgba(0,200,255,0.04)");
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, H / 2 - h / 2, barW - 2, h);
      }

      time += 0.016;
      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return <canvas ref={canvasRef} width={420} height={72} />;
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const AgenteIA = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(() => {
    try {
      const saved = localStorage.getItem("agent-settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const hasAutoSent     = useRef(false);
  const recognitionRef  = useRef<any>(null);
  const abortRef        = useRef<AbortController | null>(null);
  const audioRef        = useRef<HTMLAudioElement | null>(null);
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    localStorage.setItem("agent-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const statePrompt = (location.state as { prompt?: string } | null)?.prompt;
    if (statePrompt && !hasAutoSent.current) {
      hasAutoSent.current = true;
      send(statePrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureAudioUnlocked = useCallback(() => {
    if (!unlockedAudioRef.current) unlockedAudioRef.current = createUnlockedAudio();
  }, []);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const preUnlockedAudio = unlockedAudioRef.current ?? undefined;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    let fullResponse = "";
    try {
      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        newMessages,
        settings.model,
        settings.customInstructions,
        { temperature: settings.temperature, assertiveness: settings.assertiveness, formality: settings.formality },
        (chunk) => { fullResponse += chunk; },
        async () => {
          abortRef.current = null;
          setIsLoading(false);
          setMessages(prev => [...prev, { role: "assistant", content: fullResponse }]);
          if (fullResponse) {
            setIsSpeaking(true);
            try {
              const { audio } = await speakText(fullResponse, settings, preUnlockedAudio);
              audioRef.current = audio;
              await new Promise<void>(resolve => {
                audio.onended = () => { audioRef.current = null; resolve(); };
              });
            } catch {
              toast({ title: "Erro de voz", description: "Não foi possível reproduzir o áudio.", variant: "destructive" });
            } finally {
              audioRef.current = null;
              setIsSpeaking(false);
            }
          }
        },
        (errMsg) => {
          abortRef.current = null;
          setIsLoading(false);
          toast({ title: "Erro no Horus", description: errMsg, variant: "destructive" });
        },
        controller.signal
      );
    } catch (e: any) {
      abortRef.current = null;
      setIsLoading(false);
      if (e?.name !== "AbortError") {
        toast({ title: "Erro de conexão", description: "Não foi possível conectar ao agente.", variant: "destructive" });
      }
    }
  }, [messages, isLoading, settings, toast]);

  const toggleListening = useCallback(async () => {
    if (!SpeechRecognitionAPI) {
      toast({ title: "Não suportado", description: "Reconhecimento de voz não disponível neste navegador.", variant: "destructive" });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const hasMic = await requestMicrophonePermission();
    if (!hasMic) {
      toast({ title: "Permissão negada", description: "Permita o uso do microfone.", variant: "destructive" });
      return;
    }

    ensureAudioUnlocked();
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = false;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + " ";
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = finalTranscript.trim();
      if (text) send(text);
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast({ title: "Permissão negada", description: "Permita o microfone no navegador.", variant: "destructive" });
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      toast({ title: "Erro no microfone", description: "Falha ao iniciar gravação.", variant: "destructive" });
      setIsListening(false);
    }
  }, [ensureAudioUnlocked, isListening, send, toast]);

  const statusLabel =
    isListening ? "OUVINDO"     :
    isLoading   ? "PROCESSANDO" :
    isSpeaking  ? "FALANDO"     :
    messages.length > 0 ? "AGUARDANDO" : "PRONTO";

  const hintText = isListening ? "TOQUE PARA PARAR" : isSpeaking || isLoading ? "" : "TOQUE PARA FALAR";

  return (
    <AppLayout>
      <div
        className="flex flex-col items-center justify-center h-[calc(100vh-80px)] relative overflow-hidden select-none"
        style={{ background: "linear-gradient(160deg, #020c18 0%, #040f1f 60%, #030b17 100%)" }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,200,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.04) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* Corner scan-lines accent */}
        <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none opacity-20"
          style={{ background: "linear-gradient(135deg, rgba(0,200,255,0.15) 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none opacity-20"
          style={{ background: "linear-gradient(315deg, rgba(0,200,255,0.15) 0%, transparent 60%)" }} />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
          <span className="text-[10px] font-mono tracking-[0.45em] text-cyan-400/30 uppercase">
            Sistema Ativo
          </span>
          <div className="flex items-center gap-4">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 text-[10px] font-mono tracking-[0.3em] text-cyan-400/25 hover:text-cyan-400/60 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> LIMPAR
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-cyan-400/30 hover:text-cyan-400/70 transition-colors"
              title="Configurações"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-5 z-10"
        >
          <h1
            className="text-4xl font-black tracking-[0.55em] font-mono text-cyan-400"
            style={{ textShadow: "0 0 30px rgba(0,200,255,0.55), 0 0 60px rgba(0,200,255,0.2)" }}
          >
            HORUS
          </h1>
          <p className="text-[9px] tracking-[0.5em] font-mono text-cyan-400/25 mt-1.5 uppercase">
            Assessor de Inteligência Artificial
          </p>
        </motion.div>

        {/* Sphere */}
        <div className="z-10">
          <HorusSphere isListening={isListening} isSpeaking={isSpeaking} isLoading={isLoading} />
        </div>

        {/* Status */}
        <div className="mt-3 h-7 flex items-center justify-center z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={statusLabel}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              {isListening && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              )}
              {isSpeaking && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              )}
              {isLoading && (
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              )}
              <span className="text-[11px] font-mono tracking-[0.4em] text-cyan-400/55">
                {statusLabel}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Frequency visualizer */}
        <div className="mt-3 mb-5 z-10">
          <FrequencyVisualizer isActive={isSpeaking} />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-8 z-10">
          {/* Stop speaking */}
          <AnimatePresence>
            {isSpeaking && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => {
                  audioRef.current?.pause();
                  audioRef.current = null;
                  setIsSpeaking(false);
                }}
                className="w-11 h-11 rounded-full border border-red-400/40 bg-red-400/10 text-red-400/80 flex items-center justify-center hover:bg-red-400/20 hover:text-red-400 transition-all"
                title="Parar fala"
              >
                <Square className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Mic button */}
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={toggleListening}
            disabled={isLoading || isSpeaking}
            className={`w-[68px] h-[68px] rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
              isListening
                ? "border-orange-400 bg-orange-400/20 text-orange-400 shadow-[0_0_24px_rgba(255,110,50,0.45)]"
                : isLoading || isSpeaking
                  ? "border-cyan-400/15 bg-cyan-400/5 text-cyan-400/25 cursor-not-allowed"
                  : "border-cyan-400/45 bg-cyan-400/10 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-400/20 hover:shadow-[0_0_24px_rgba(0,200,255,0.35)]"
            }`}
          >
            {isListening
              ? <MicOff className="w-6 h-6" />
              : <Mic    className="w-6 h-6" />
            }
          </motion.button>

          {/* Stop processing */}
          <AnimatePresence>
            {isLoading && (
              <motion.button
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                onClick={() => {
                  abortRef.current?.abort();
                  abortRef.current = null;
                  setIsLoading(false);
                }}
                className="w-11 h-11 rounded-full border border-yellow-400/40 bg-yellow-400/10 text-yellow-400/80 flex items-center justify-center hover:bg-yellow-400/20 hover:text-yellow-400 transition-all"
                title="Cancelar"
              >
                <Square className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom hint */}
        <AnimatePresence>
          {hintText && (
            <motion.p
              key={hintText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-5 text-[10px] font-mono tracking-[0.4em] text-cyan-400/20"
            >
              {hintText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AgentSettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={setSettings}
      />
    </AppLayout>
  );
};

export default AgenteIA;
