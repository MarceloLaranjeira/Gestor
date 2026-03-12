import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, MessageSquare, Users, Flag, AlertTriangle, Wallet,
  Hash, Loader2, MessageCircle,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ChatSala {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  icone: string;
  cor: string;
  created_at: string;
}

interface ChatMensagem {
  id: string;
  sala_id: string;
  user_id: string;
  conteudo: string;
  tipo: string;
  created_at: string;
  profile?: { nome: string } | null;
}

/* ─── Icon map ───────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Users,
  Flag,
  AlertTriangle,
  Wallet,
  Hash,
  MessageCircle,
};

const RoomIcon = ({ icone, className }: { icone: string; className?: string }) => {
  const Icon = ICON_MAP[icone] || Hash;
  return <Icon className={className} />;
};

/* ─── Relative time helper ──────────────────────────────────────────── */
function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 30) return "agora";
  if (diff < 60) return `${diff}s atrás`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

/* ─── Avatar ─────────────────────────────────────────────────────────── */
const Avatar = ({ name, isOwn }: { name: string; isOwn: boolean }) => (
  <div
    className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
      isOwn
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground"
    )}
  >
    {name?.charAt(0)?.toUpperCase() || "?"}
  </div>
);

/* ─── Message bubble ─────────────────────────────────────────────────── */
const MessageBubble = ({
  msg,
  isOwn,
  showName,
}: {
  msg: ChatMensagem;
  isOwn: boolean;
  showName: boolean;
}) => {
  const name = msg.profile?.nome || "Usuário";

  if (msg.tipo === "sistema") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {msg.conteudo}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-2 mb-1", isOwn ? "flex-row-reverse" : "flex-row")}
    >
      {!isOwn && <Avatar name={name} isOwn={false} />}

      <div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
        {showName && !isOwn && (
          <span className="text-[11px] font-semibold text-muted-foreground mb-0.5 px-1">
            {name}
          </span>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
            isOwn
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {msg.conteudo}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
          {relativeTime(msg.created_at)}
        </span>
      </div>

      {isOwn && <Avatar name={name} isOwn={true} />}
    </motion.div>
  );
};

/* ─── Sala item ──────────────────────────────────────────────────────── */
const SalaItem = ({
  sala,
  isActive,
  unread,
  onClick,
}: {
  sala: ChatSala;
  isActive: boolean;
  unread: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
      isActive
        ? "bg-primary/10 text-primary font-semibold"
        : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
    )}
  >
    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm", sala.cor)}>
      <RoomIcon icone={sala.icone} className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{sala.nome}</p>
      {sala.descricao && (
        <p className="text-[10px] text-muted-foreground truncate">{sala.descricao}</p>
      )}
    </div>
    {unread > 0 && (
      <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
        {unread > 99 ? "99+" : unread}
      </span>
    )}
  </button>
);

/* ─── Skeleton ───────────────────────────────────────────────────────── */
const MessageSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className={cn("flex gap-2", i % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="space-y-1 max-w-[60%]">
          <div className="h-4 bg-muted animate-pulse rounded w-20" />
          <div className={cn("h-10 bg-muted animate-pulse rounded-2xl", i % 2 === 0 ? "w-48" : "w-64")} />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Main component ─────────────────────────────────────────────────── */
const WebChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [salas, setSalas] = useState<ChatSala[]>([]);
  const [salasLoading, setSalasLoading] = useState(true);
  const [selectedSala, setSelectedSala] = useState<ChatSala | null>(null);

  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [mensagensLoading, setMensagensLoading] = useState(false);

  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);

  // unread counts per sala
  const [unread, setUnread] = useState<Record<string, number>>({});
  const lastSeenRef = useRef<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* ── Scroll to bottom ─────────────────────────────────────────────── */
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  /* ── Load salas ──────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setSalasLoading(true);
      const { data, error } = await (supabase as any)
        .from("chat_salas")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data) {
        setSalas(data as ChatSala[]);
        if (data.length > 0) setSelectedSala(data[0] as ChatSala);
      }
      setSalasLoading(false);
    };
    load();
  }, []);

  /* ── Load messages for selected sala ─────────────────────────────── */
  const loadMensagens = useCallback(async (salaId: string) => {
    setMensagensLoading(true);
    setMensagens([]);

    const { data, error } = await (supabase as any)
      .from("chat_mensagens")
      .select("*, profile:profiles!chat_mensagens_user_id_fkey(nome)")
      .eq("sala_id", salaId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (!error && data) {
      setMensagens(data as ChatMensagem[]);
    }
    setMensagensLoading(false);

    // mark as read
    if (data && data.length > 0) {
      lastSeenRef.current[salaId] = data[data.length - 1].id;
      setUnread((prev) => ({ ...prev, [salaId]: 0 }));
    }
  }, []);

  useEffect(() => {
    if (selectedSala) loadMensagens(selectedSala.id);
  }, [selectedSala, loadMensagens]);

  /* ── Auto-scroll on new messages ─────────────────────────────────── */
  useEffect(() => {
    if (!mensagensLoading) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [mensagensLoading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [mensagens.length, scrollToBottom]);

  /* ── Realtime subscription ───────────────────────────────────────── */
  useEffect(() => {
    // Unsubscribe previous
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel("chat_realtime_global")
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "chat_mensagens" },
        async (payload: any) => {
          const newMsg = payload.new as ChatMensagem;

          // Fetch profile name for the new message
          const { data: profileData } = await (supabase as any)
            .from("profiles")
            .select("nome")
            .eq("user_id", newMsg.user_id)
            .single();

          const enriched: ChatMensagem = {
            ...newMsg,
            profile: profileData ? { nome: profileData.nome } : null,
          };

          if (selectedSala && newMsg.sala_id === selectedSala.id) {
            setMensagens((prev) => {
              // Deduplicate
              if (prev.some((m) => m.id === enriched.id)) return prev;
              return [...prev, enriched];
            });
          } else {
            // Increment unread for other salas
            setUnread((prev) => ({
              ...prev,
              [newMsg.sala_id]: (prev[newMsg.sala_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSala]);

  /* ── Send message ────────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const content = texto.trim();
    if (!content || !selectedSala || !user || sending) return;

    setSending(true);
    setTexto("");

    const { error } = await (supabase as any)
      .from("chat_mensagens")
      .insert({
        sala_id: selectedSala.id,
        user_id: user.user_id,
        conteudo: content,
        tipo: "texto",
      });

    if (error) {
      toast({ title: "Erro ao enviar mensagem", description: error.message, variant: "destructive" });
      setTexto(content); // restore
    }

    setSending(false);
    textareaRef.current?.focus();
  }, [texto, selectedSala, user, sending, toast]);

  /* ── Key handler ─────────────────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Select sala ─────────────────────────────────────────────────── */
  const handleSelectSala = (sala: ChatSala) => {
    setSelectedSala(sala);
    setUnread((prev) => ({ ...prev, [sala.id]: 0 }));
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

        {/* ── Left panel: Salas list ─────────────────────────────────── */}
        <div className="w-[250px] shrink-0 border-r border-border flex flex-col glass-card rounded-none rounded-l-xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">WebChat</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Comunicação em tempo real</p>
          </div>

          {/* Salas */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {salasLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : salas.length === 0 ? (
              <div className="p-4 text-center">
                <Hash className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Nenhuma sala disponível</p>
              </div>
            ) : (
              salas.map((sala) => (
                <SalaItem
                  key={sala.id}
                  sala={sala}
                  isActive={selectedSala?.id === sala.id}
                  unread={unread[sala.id] || 0}
                  onClick={() => handleSelectSala(sala)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right panel: Chat area ────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden glass-card rounded-none rounded-r-xl">
          {selectedSala ? (
            <>
              {/* Chat header */}
              <div className="px-5 py-3 border-b border-border flex items-center gap-3 shrink-0">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", selectedSala.cor)}>
                  <RoomIcon icone={selectedSala.icone} className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedSala.nome}</h3>
                  {selectedSala.descricao && (
                    <p className="text-[11px] text-muted-foreground">{selectedSala.descricao}</p>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto">
                {mensagensLoading ? (
                  <MessageSkeleton />
                ) : mensagens.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-8">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", selectedSala.cor)}>
                        <RoomIcon icone={selectedSala.icone} className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Bem-vindo ao {selectedSala.nome}!
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedSala.descricao || "Nenhuma mensagem ainda. Seja o primeiro a enviar!"}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  <div className="p-4 space-y-1">
                    <AnimatePresence initial={false}>
                      {mensagens.map((msg, idx) => {
                        const isOwn = msg.user_id === user?.user_id;
                        const prevMsg = idx > 0 ? mensagens[idx - 1] : null;
                        const showName = !prevMsg || prevMsg.user_id !== msg.user_id;
                        return (
                          <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isOwn={isOwn}
                            showName={showName}
                          />
                        );
                      })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div className="px-4 py-3 border-t border-border shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Mensagem para #${selectedSala.nome}... (Enter para enviar)`}
                      className="resize-none min-h-[42px] max-h-[120px] pr-2 text-sm"
                      rows={1}
                      disabled={sending}
                    />
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={!texto.trim() || sending}
                    size="sm"
                    className="gradient-primary h-[42px] px-4 shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  Shift+Enter para nova linha · Enter para enviar
                </p>
              </div>
            </>
          ) : (
            /* No sala selected */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Selecione uma sala</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha uma sala no painel à esquerda para começar a conversar
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default WebChat;
