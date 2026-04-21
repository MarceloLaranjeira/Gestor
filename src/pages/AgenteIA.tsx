import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Mic, MicOff, Square, Trash2, Send, Smile, Paperclip, Camera, Volume2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useToast } from "@/hooks/use-toast";
import { AgentSettingsPanel, DEFAULT_SETTINGS, type AgentSettings } from "@/components/AgentSettingsPanel";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

type Msg = {
  role: "user" | "assistant";
  content: string;
  isLive?: boolean;
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

const HorusSphere = ({ isListening, isSpeaking, isLoading, size = 280 }: SphereState & { size?: number }) => {
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
      const scale310 = (canvas.width / 310);
      const baseR = (isSpeaking ? 118 : isListening ? 110 : 95) * scale310;
      const radius = baseR + (isSpeaking ? Math.sin(time * 4) * 9 : isLoading ? Math.sin(time * 2) * 4 : 0);

      const color = isListening ? [255, 110, 50] : isSpeaking ? [0, 230, 255] : [0, 190, 230];

      rotY += rotSpeed;
      rotX += rotSpeed * 0.22;

      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      const glowAlpha = isSpeaking ? 0.22 : isListening ? 0.18 : 0.06;
      const glow = ctx.createRadialGradient(CX, CY, 0, CX, CY, radius * 1.7);
      glow.addColorStop(0, `rgba(${color.join(",")},${glowAlpha})`);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

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
      width={size}
      height={size}
      style={{ filter: "drop-shadow(0 0 24px rgba(0,200,255,0.35))" }}
    />
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const AgenteIA = () => {
  const { toast } = useToast();
  const location = useLocation();
  const isMobile = useIsMobile();
  const sphereSize = isMobile ? 200 : 260;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [isLoading, setIsLoading]   = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [inputText, setInputText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(() => {
    try {
      const saved = localStorage.getItem("agent-settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const hasAutoSent      = useRef(false);
  const recognitionRef   = useRef<any>(null);
  const finalTranscriptRef = useRef("");
  const abortRef         = useRef<AbortController | null>(null);
  const audioRef         = useRef<HTMLAudioElement | null>(null);
  const unlockedAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("agent-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, liveTranscript]);

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

  useEffect(() => {
    const unlock = () => ensureAudioUnlocked();
    document.addEventListener("touchstart", unlock, { once: true, passive: true });
    document.addEventListener("click", unlock, { once: true });
    return () => {
      document.removeEventListener("touchstart", unlock);
      document.removeEventListener("click", unlock);
    };
  }, [ensureAudioUnlocked]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    const preUnlockedAudio = unlockedAudioRef.current ?? undefined;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
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
          if (fullResponse && settings.responseMode !== "text") {
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

  const stopSpeaking = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setIsSpeaking(false);
  }, []);

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
    recognition.interimResults = true;

    finalTranscriptRef.current = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      finalTranscriptRef.current = final;
      setLiveTranscript(interim || final);
    };

    recognition.onend = () => {
      setIsListening(false);
      const text = finalTranscriptRef.current.trim();
      setLiveTranscript("");
      if (text) send(text);
    };

    recognition.onerror = (e: any) => {
      setIsListening(false);
      setLiveTranscript("");
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
    "AGUARDANDO";

  const statusColor =
    isListening ? "#22c55e" :
    isLoading   ? "#eab308" :
    isSpeaking  ? "#06b6d4" :
    "#64748b";

  const handleSendText = () => {
    const text = inputText.trim();
    if (text) send(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  return (
    <AppLayout>
      <div
        className="flex flex-col h-[calc(100vh-4.5rem)] overflow-hidden rounded-xl"
        style={{ background: "linear-gradient(160deg, #020c18 0%, #040f1f 60%, #030b17 100%)" }}
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(rgba(0,200,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,200,255,0.03) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />

        {/* ── Header ── */}
        <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[11px] font-mono tracking-[0.35em] text-cyan-400/70 uppercase">
                Horus — IA Conversacional
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ backgroundColor: statusColor }}
                />
                <span className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-400 text-[11px] font-mono tracking-wider hover:bg-cyan-400/20 transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Parar voz</span>
              </button>
            )}
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 text-[11px] font-mono tracking-wider hover:bg-white/10 hover:text-white/70 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Limpar</span>
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-1.5 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70 transition-all"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="relative z-10 flex-1 overflow-y-auto flex flex-col">
          {/* Sphere section */}
          <div className="flex items-center justify-center py-6 shrink-0">
            {/* Circular frame */}
            <div
              className="relative flex items-center justify-center rounded-full"
              style={{
                width: sphereSize + 40,
                height: sphereSize + 40,
                background: "radial-gradient(circle, rgba(0,30,60,0.9) 40%, rgba(0,15,35,0.95) 100%)",
                border: "1px solid rgba(0,200,255,0.12)",
                boxShadow: "0 0 60px rgba(0,200,255,0.06), inset 0 0 40px rgba(0,0,0,0.4)",
              }}
            >
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1px solid rgba(0,200,255,0.06)",
                  transform: "scale(1.06)",
                }}
              />
              <HorusSphere
                isListening={isListening}
                isSpeaking={isSpeaking}
                isLoading={isLoading}
                size={sphereSize}
              />
            </div>
          </div>

          {/* Chat messages */}
          <div className="flex-1 px-3 sm:px-6 pb-3 space-y-3">
            {/* Welcome state */}
            {messages.length === 0 && !liveTranscript && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-[10px] font-mono tracking-[0.4em] text-cyan-400/20 uppercase">
                  Toque no microfone para iniciar
                </p>
              </div>
            )}

            {/* Message history */}
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {msg.role === "user" ? (
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(0,200,255,0.06)",
                      border: "1px solid rgba(0,200,255,0.12)",
                    }}
                  >
                    <p className="text-[9px] font-mono tracking-[0.35em] text-cyan-400/40 uppercase mb-1">
                      Você • Transcrição ao vivo
                    </p>
                    <p className="text-sm text-white/75 leading-relaxed">{msg.content}</p>
                  </div>
                ) : (
                  <div
                    className="rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                )}
              </motion.div>
            ))}

            {/* AI is typing indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}

            {/* Live transcription card */}
            <AnimatePresence>
              {isListening && liveTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="rounded-xl px-4 py-3"
                  style={{
                    background: "rgba(0,200,255,0.08)",
                    border: "1px solid rgba(0,200,255,0.2)",
                  }}
                >
                  <p className="text-[9px] font-mono tracking-[0.35em] text-cyan-400/60 uppercase mb-1">
                    Transcrição em tempo real
                  </p>
                  <p className="text-sm text-cyan-100/80 leading-relaxed">{liveTranscript}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ── Bottom input bar ── */}
        <div
          className="relative z-10 border-t shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(2,12,24,0.95)" }}
        >
          <div className="flex items-end gap-2 px-3 sm:px-4 py-3">
            {/* Left icons */}
            <div className="flex items-center gap-1 shrink-0 pb-1">
              <button className="p-2 rounded-full text-white/25 hover:text-white/50 hover:bg-white/5 transition-all">
                <Smile className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full text-white/25 hover:text-white/50 hover:bg-white/5 transition-all">
                <Paperclip className="w-5 h-5" />
              </button>
              <button className="hidden sm:flex p-2 rounded-full text-white/25 hover:text-white/50 hover:bg-white/5 transition-all">
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                value={isListening ? liveTranscript || "" : inputText}
                onChange={e => { if (!isListening) setInputText(e.target.value); }}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Ouvindo... toque no microfone para enviar" : "Digite uma mensagem..."}
                readOnly={isListening}
                rows={1}
                className="w-full resize-none rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  maxHeight: "120px",
                  lineHeight: "1.5",
                }}
              />
            </div>

            {/* Mic button */}
            <button
              onClick={toggleListening}
              disabled={isLoading || isSpeaking}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                isListening
                  ? "bg-orange-500/90 text-white shadow-[0_0_16px_rgba(249,115,22,0.5)]"
                  : isLoading || isSpeaking
                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                    : "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30"
              }`}
            >
              {isListening ? <MicOff className="w-4.5 h-4.5" /> : <Mic className="w-4.5 h-4.5" />}
            </button>

            {/* Send button */}
            <button
              onClick={handleSendText}
              disabled={!inputText.trim() || isLoading}
              className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                inputText.trim() && !isLoading
                  ? "bg-cyan-500 text-white hover:bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-white/5 text-white/15 cursor-not-allowed"
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom hint */}
          <div className="pb-2 text-center">
            <p className="text-[9px] font-mono tracking-[0.4em] uppercase" style={{ color: "rgba(255,255,255,0.1)" }}>
              {isListening
                ? "Toque no microfone para parar e enviar"
                : "Toque no microfone para falar"}
            </p>
          </div>
        </div>
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
