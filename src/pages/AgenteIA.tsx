import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User, Sparkles, FileText, BarChart3, Lightbulb, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const AGENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agente-ia`;

const QUICK_PROMPTS = [
  { icon: BarChart3, label: "Relatório de Demandas", prompt: "Gere um relatório executivo completo sobre o status atual de todas as demandas do gabinete, incluindo análise por categoria, prioridade e responsável. Destaque os pontos críticos." },
  { icon: FileText, label: "Relatório de Tarefas", prompt: "Crie um relatório detalhado sobre as tarefas de todas as coordenações. Mostre as atrasadas, pendentes e concluídas, e identifique quais coordenações precisam de atenção imediata." },
  { icon: Lightbulb, label: "Insights Estratégicos", prompt: "Com base nos dados atuais do mandato, quais são os 5 principais insights estratégicos que o Deputado Comandante Dan deve considerar para otimizar a gestão do gabinete? Seja específico e prático." },
  { icon: Sparkles, label: "Pauta da Semana", prompt: "Com base nos eventos próximos, demandas urgentes e tarefas atrasadas, sugira uma pauta de trabalho priorizada para esta semana. Organize por urgência e impacto." },
];

async function streamChat(
  messages: Msg[],
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (msg: string) => void
) {
  const resp = await fetch(AGENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
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

const AgenteIA = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasAutoSent = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-send prompt from navigation state (e.g. "Analisar com IA" from Demandas)
  useEffect(() => {
    const statePrompt = (location.state as { prompt?: string } | null)?.prompt;
    if (statePrompt && !hasAutoSent.current) {
      hasAutoSent.current = true;
      send(statePrompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat(
        newMessages,
        upsertAssistant,
        () => setIsLoading(false),
        (errMsg) => {
          setIsLoading(false);
          toast({ title: "Erro no Agente IA", description: errMsg, variant: "destructive" });
        }
      );
    } catch {
      setIsLoading(false);
      toast({ title: "Erro de conexão", description: "Não foi possível conectar ao agente.", variant: "destructive" });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

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
              <p className="text-xs text-muted-foreground">Especialista em gestão do mandato — Comandante Dan</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-lg hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar conversa
            </button>
          )}
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
                  Especialista em gestão parlamentar com acesso em tempo real aos dados do mandato do Dep. Comandante Dan.
                  Gere relatórios, analise demandas e obtenha insights estratégicos.
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
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "gradient-primary" : "bg-muted border border-border"
                }`}>
                  {msg.role === "user"
                    ? <User className="w-4 h-4 text-primary-foreground" />
                    : <Bot className="w-4 h-4 text-primary" />
                  }
                </div>

                {/* Bubble */}
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
          <div className="glass-card rounded-xl p-3 flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Peça um relatório, análise ou insight sobre o mandato... (Enter para enviar)"
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
            Shift+Enter para nova linha • Dados atualizados em tempo real
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default AgenteIA;
