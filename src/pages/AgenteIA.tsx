import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, Bot, User, Sparkles, FileText, BarChart3,
  Lightbulb, Trash2, Settings, Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import { AgentSettingsPanel, DEFAULT_SETTINGS, type AgentSettings, type ResponseMode } from "@/components/AgentSettingsPanel";

type Msg = { role: "user" | "assistant"; content: string };

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agente-ia`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const QUICK_PROMPTS = [
  { icon: BarChart3, label: "Relatório de Demandas", prompt: "Gere um relatório executivo completo sobre o status atual de todas as demandas do gabinete, incluindo análise por categoria, prioridade e responsável. Destaque os pontos críticos." },
  { icon: FileText, label: "Relatório de Tarefas", prompt: "Crie um relatório detalhado sobre as tarefas de todas as coordenações. Mostre as atrasadas, pendentes e concluídas, e identifique quais coordenações precisam de atenção imediata." },
  { icon: Lightbulb, label: "Insights Estratégicos", prompt: "Com base nos dados atuais do mandato, quais são os 5 principais insights estratégicos que o Deputado Comandante Dan deve considerar para otimizar a gestão do gabinete? Seja específico e prático." },
  { icon: Sparkles, label: "Pauta da Semana", prompt: "Com base nos eventos próximos, demandas urgentes e tarefas atrasadas, sugira uma pauta de trabalho priorizada para esta semana. Organize por urgência e impacto." },
];

// --- Streaming chat ---
async function streamChat(
  messages: Msg[],
  model: string,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
) {
  const resp = await fetch(AGENT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ messages, model }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    if (resp.status === 429) { onError(data.error || "Limite de requisições atingido."); return; }
    if (resp.status === 402) { onError(data.error || "Créditos insuficientes."); return; }
    onError(data.error || "Erro ao conectar com o agente.");
    return;
  }

  if (!resp.body) { onError("Resposta inválida do servidor."); return; }

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

// --- TTS ---
async function speakText(text: string, settings: AgentSettings): Promise<void> {
  // Strip markdown for TTS
  const clean = text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "")
    .replace(/\n{2,}/g, ". ")
    .trim();

  const resp = await fetch(TTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({
      text: clean.slice(0, 2500),
      voiceId: settings.voiceId,
      stability: settings.stability,
      speed: settings.speed,
    }),
  });

  if (!resp.ok) throw new Error("Erro ao gerar áudio");

  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Erro ao reproduzir áudio")); };
    audio.play().catch(reject);
  });
}

// --- Speech recognition ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const AgenteIA = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AgentSettings>(() => {
    try {
      const saved = localStorage.getItem("agent-settings");
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem("agent-settings", JSON.stringify(settings));
  }, [settings]);

  // Auto-send prompt from navigation state
  useEffect(() => {
    const statePrompt = (location.state as { prompt?: string } | null)?.prompt;
    if (statePrompt && !hasAutoSent.current) {
      hasAutoSent.current = true;
      send(statePrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const modeIcon = (mode: ResponseMode) => {
    if (mode === "voice") return Volume2;
    if (mode === "text") return null;
    return Volume2;
  };

  const send = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    let fullResponse = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      fullResponse += chunk;
      if (settings.responseMode !== "voice") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      }
    };

    try {
      await streamChat(
        newMessages,
        settings.model,
        upsertAssistant,
        async () => {
          setIsLoading(false);
          // If voice-only mode, add the message now
          if (settings.responseMode === "voice") {
            setMessages((prev) => [...prev, { role: "assistant", content: fullResponse }]);
          }
          // Speak if voice enabled
          if (settings.responseMode !== "text" && fullResponse) {
            setIsSpeaking(true);
            try {
              await speakText(fullResponse, settings);
            } catch (e) {
              toast({ title: "Erro de voz", description: "Não foi possível reproduzir o áudio.", variant: "destructive" });
            } finally {
              setIsSpeaking(false);
            }
          }
        },
        (errMsg) => {
          setIsLoading(false);
          toast({ title: "Erro no Agente IA", description: errMsg, variant: "destructive" });
        }
      );
    } catch {
      setIsLoading(false);
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao agente.", variant: "destructive" });
    }
  }, [messages, isLoading, settings, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const toggleListening = useCallback(() => {
    if (!SpeechRecognition) {
      toast({ title: "Não suportado", description: "Reconhecimento de voz não suportado neste navegador.", variant: "destructive" });
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      send(transcript);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== "no-speech") {
        toast({ title: "Erro no microfone", description: "Não foi possível capturar áudio.", variant: "destructive" });
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, send, toast]);

  const modelLabel = (() => {
    if (settings.model.startsWith("google/")) return settings.model.replace("google/", "").replace(/-/g, " ");
    return settings.model.replace("openai/", "").toUpperCase();
  })();

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-4 shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-foreground">Assessor de IA</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground capitalize">{modelLabel}</p>
                <span className="text-muted-foreground/40">·</span>
                <p className="text-xs text-muted-foreground">
                  {settings.responseMode === "both" ? "Texto + Voz" : settings.responseMode === "voice" ? "Somente Voz" : "Somente Texto"}
                </p>
                {isSpeaking && (
                  <span className="flex items-center gap-1 text-xs text-primary animate-pulse">
                    <Volume2 className="w-3 h-3" /> falando...
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações
            </button>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6 py-12"
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <h2 className="text-lg font-bold font-display text-foreground mb-1">Assessor de Inteligência Digital</h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Especialista em gestão parlamentar com acesso em tempo real aos dados do mandato.
                  Gere relatórios, analise demandas e obtenha insights estratégicos — por texto ou voz.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                {QUICK_PROMPTS.map((qp) => (
                  <button
                    key={qp.label}
                    onClick={() => send(qp.prompt)}
                    className="glass-card rounded-xl p-4 text-left hover:shadow-md hover:scale-[1.01] transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <qp.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{qp.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{qp.prompt}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "gradient-primary" : "bg-muted border border-border"
                }`}>
                  {msg.role === "user"
                    ? <User className="w-4 h-4 text-primary-foreground" />
                    : <Bot className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "gradient-primary text-primary-foreground rounded-tr-sm"
                    : "glass-card rounded-tl-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Analisando dados do mandato...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 pt-3 border-t border-border">
          <div className="glass-card rounded-xl p-3 flex items-end gap-2">
            {/* Mic button */}
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`shrink-0 h-9 w-9 rounded-lg flex items-center justify-center transition-all ${
                isListening
                  ? "bg-destructive/20 text-destructive animate-pulse"
                  : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
              }`}
              title={isListening ? "Parar gravação" : "Falar com o agente"}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isListening
                  ? "Ouvindo... fale sua pergunta"
                  : "Peça um relatório, análise ou insight... (Enter para enviar)"
              }
              rows={1}
              style={{ resize: "none", maxHeight: "120px", overflowY: "auto" }}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none leading-relaxed"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = Math.min(t.scrollHeight, 120) + "px";
              }}
            />

            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="gradient-primary text-primary-foreground border-0 shrink-0 h-9 w-9 p-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            🎤 Microfone · Shift+Enter para nova linha · Dados em tempo real ·{" "}
            <span className="capitalize">{settings.voiceName || "Brian"}</span>
          </p>
        </div>
      </div>

      {/* Settings Panel */}
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
