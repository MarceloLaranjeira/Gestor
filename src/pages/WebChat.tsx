import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, MessageSquare, Users, Flag, AlertTriangle, Wallet,
  Hash, Loader2, MessageCircle, Plus, Search, X, Lock, ChevronLeft,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ChatSala {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  icone: string;
  cor: string;
  participantes: string[] | null;
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

interface Membro {
  user_id: string;
  nome: string;
  cargo?: string;
}

/* ─── Icon map ───────────────────────────────────────────────────────── */
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare, Users, Flag, AlertTriangle, Wallet, Hash, MessageCircle,
};
const RoomIcon = ({ icone, className }: { icone: string; className?: string }) => {
  const Icon = ICON_MAP[icone] || Hash;
  return <Icon className={className} />;
};

/* ─── Relative time ─────────────────────────────────────────────────── */
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
  <div className={cn(
    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
    isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
  )}>
    {name?.charAt(0)?.toUpperCase() || "?"}
  </div>
);

/* ─── Message bubble ─────────────────────────────────────────────────── */
const MessageBubble = ({ msg, isOwn, showName }: { msg: ChatMensagem; isOwn: boolean; showName: boolean }) => {
  const name = msg.profile?.nome || "Usuário";
  if (msg.tipo === "sistema") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{msg.conteudo}</span>
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
          <span className="text-[11px] font-semibold text-muted-foreground mb-0.5 px-1">{name}</span>
        )}
        <div className={cn(
          "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
          isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {msg.conteudo}
        </div>
        <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{relativeTime(msg.created_at)}</span>
      </div>
      {isOwn && <Avatar name={name} isOwn={true} />}
    </motion.div>
  );
};

/* ─── Sala item ──────────────────────────────────────────────────────── */
const SalaItem = ({ sala, isActive, unread, onClick, isPrivate, otherName }: {
  sala: ChatSala; isActive: boolean; unread: number; onClick: () => void;
  isPrivate?: boolean; otherName?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
      isActive ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
    )}
  >
    {isPrivate ? (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
        {(otherName || "?").charAt(0).toUpperCase()}
      </div>
    ) : (
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm", sala.cor)}>
        <RoomIcon icone={sala.icone} className="w-4 h-4" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{isPrivate ? otherName : sala.nome}</p>
      {!isPrivate && sala.descricao && (
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

/* ─── Member search modal ────────────────────────────────────────────── */
const MemberSearchModal = ({ membros, currentUserId, onSelect, onClose }: {
  membros: Membro[]; currentUserId: string;
  onSelect: (membro: Membro) => void; onClose: () => void;
}) => {
  const [search, setSearch] = useState("");
  const filtered = membros.filter(m =>
    m.user_id !== currentUserId &&
    m.nome.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-border"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold">Nova Mensagem Direta</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar membro..."
              className="pl-9 text-sm"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum membro encontrado</p>
          ) : (
            filtered.map(m => (
              <button
                key={m.user_id}
                onClick={() => onSelect(m)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {m.nome.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{m.nome}</p>
                  {m.cargo && <p className="text-xs text-muted-foreground">{m.cargo}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

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
  const isMobile = useIsMobile();

  const [salas, setSalas] = useState<ChatSala[]>([]);
  const [salasLoading, setSalasLoading] = useState(true);
  const [selectedSala, setSelectedSala] = useState<ChatSala | null>(null);

  // Mobile: show the sidebar (rooms list) or the chat panel
  const [showSidebar, setShowSidebar] = useState(true);

  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [mensagensLoading, setMensagensLoading] = useState(false);

  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);

  const [unread, setUnread] = useState<Record<string, number>>({});

  const [membros, setMembros] = useState<Membro[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  /* ── Load membros ─────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, nome, cargo")
        .order("nome");
      if (data) setMembros(data as Membro[]);
    };
    load();
  }, []);

  /* ── Load salas (canais públicos + DMs do usuário) ───────────────── */
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setSalasLoading(true);
      const { data, error } = await (supabase as any)
        .from("chat_salas")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        // Filter: show non-private salas + private salas where user is participant
        const visible = (data as ChatSala[]).filter(s =>
          s.tipo !== "privado" ||
          (s.participantes && s.participantes.includes(user.user_id))
        );
        setSalas(visible);
        if (visible.length > 0) setSelectedSala(visible[0]);
      }
      setSalasLoading(false);
    };
    load();
  }, [user]);

  /* ── Load messages (two-step: fetch msgs then profiles) ───────────── */
  const loadMensagens = useCallback(async (salaId: string) => {
    setMensagensLoading(true);
    setMensagens([]);

    const { data: msgs, error } = await (supabase as any)
      .from("chat_mensagens")
      .select("id, sala_id, user_id, conteudo, tipo, created_at")
      .eq("sala_id", salaId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error || !msgs) {
      setMensagensLoading(false);
      return;
    }

    // Collect unique user_ids
    const userIds: string[] = [...new Set((msgs as ChatMensagem[]).map(m => m.user_id))];

    // Fetch profiles (use cache + fill missing)
    const missing = userIds.filter(id => !profileCache[id]);
    let newCache = { ...profileCache };

    if (missing.length > 0) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("user_id, nome")
        .in("user_id", missing);
      if (profs) {
        for (const p of profs as { user_id: string; nome: string }[]) {
          newCache[p.user_id] = p.nome;
        }
        setProfileCache(newCache);
      }
    }

    const enriched = (msgs as ChatMensagem[]).map(m => ({
      ...m,
      profile: { nome: newCache[m.user_id] || "Usuário" },
    }));

    setMensagens(enriched);
    setMensagensLoading(false);

    setUnread(prev => ({ ...prev, [salaId]: 0 }));
  }, [profileCache]);

  useEffect(() => {
    if (selectedSala) loadMensagens(selectedSala.id);
  }, [selectedSala?.id]); // eslint-disable-line

  /* ── Auto-scroll ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mensagensLoading) setTimeout(() => scrollToBottom(false), 50);
  }, [mensagensLoading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [mensagens.length, scrollToBottom]);

  /* ── Realtime subscription ───────────────────────────────────────── */
  useEffect(() => {
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

          // Fetch profile (check cache first)
          let nome = profileCache[newMsg.user_id];
          if (!nome) {
            const { data: p } = await (supabase as any)
              .from("profiles")
              .select("nome")
              .eq("user_id", newMsg.user_id)
              .single();
            nome = p?.nome || "Usuário";
            setProfileCache(prev => ({ ...prev, [newMsg.user_id]: nome }));
          }

          const enriched: ChatMensagem = { ...newMsg, profile: { nome } };

          if (selectedSala && newMsg.sala_id === selectedSala.id) {
            setMensagens(prev => {
              if (prev.some(m => m.id === enriched.id)) return prev;
              return [...prev, enriched];
            });
          } else {
            setUnread(prev => ({ ...prev, [newMsg.sala_id]: (prev[newMsg.sala_id] || 0) + 1 }));
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [selectedSala, profileCache]);

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
      setTexto(content);
    }

    setSending(false);
    textareaRef.current?.focus();
  }, [texto, selectedSala, user, sending, toast]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  /* ── Open/create DM ──────────────────────────────────────────────── */
  const handleOpenDM = async (membro: Membro) => {
    setShowMemberSearch(false);
    if (!user) return;

    const myId = user.user_id;
    const otherId = membro.user_id;

    // Check if DM sala already exists
    const existing = salas.find(s =>
      s.tipo === "privado" &&
      s.participantes?.includes(myId) &&
      s.participantes?.includes(otherId)
    );

    if (existing) {
      setSelectedSala(existing);
      if (isMobile) setShowSidebar(false);
      return;
    }

    // Create new DM sala
    const { data: newSala, error } = await (supabase as any)
      .from("chat_salas")
      .insert({
        nome: `DM: ${membro.nome}`,
        descricao: "",
        tipo: "privado",
        icone: "MessageCircle",
        cor: "bg-primary/10 text-primary",
        created_by: myId,
        participantes: [myId, otherId],
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao abrir conversa", description: error.message, variant: "destructive" });
      return;
    }

    setSalas(prev => [...prev, newSala as ChatSala]);
    setSelectedSala(newSala as ChatSala);
    if (isMobile) setShowSidebar(false);
  };

  /* ── DM display name (the other person) ─────────────────────────── */
  const getDMName = (sala: ChatSala): string => {
    if (!user || !sala.participantes) return sala.nome;
    const otherId = sala.participantes.find(id => id !== user.user_id);
    if (!otherId) return sala.nome;
    return membros.find(m => m.user_id === otherId)?.nome || profileCache[otherId] || "Usuário";
  };

  /* ── Split salas ─────────────────────────────────────────────────── */
  const canais = salas.filter(s => s.tipo !== "privado");
  const dms = salas.filter(s => s.tipo === "privado");

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl">

        {/* ── Left panel: Rooms list ──────────────────────────────────── */}
        <div className={cn(
          "shrink-0 border-r border-border flex flex-col glass-card overflow-hidden transition-all duration-200",
          isMobile
            ? showSidebar ? "w-full rounded-xl" : "w-0 hidden"
            : "w-[250px] rounded-l-xl"
        )}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">WebChat</h2>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Comunicação em tempo real</p>
          </div>

          {/* Salas list */}
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {salasLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <>
                {/* Canais */}
                {canais.length > 0 && (
                  <>
                    <p className="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                      Canais
                    </p>
                    {canais.map(sala => (
                      <SalaItem
                        key={sala.id}
                        sala={sala}
                        isActive={selectedSala?.id === sala.id}
                        unread={unread[sala.id] || 0}
                        onClick={() => { setSelectedSala(sala); setUnread(p => ({ ...p, [sala.id]: 0 })); if (isMobile) setShowSidebar(false); }}
                      />
                    ))}
                  </>
                )}

                {/* Mensagens Diretas */}
                <div className="flex items-center justify-between px-2 pt-4 pb-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                    Mensagens Diretas
                  </p>
                  <button
                    onClick={() => setShowMemberSearch(true)}
                    className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    title="Nova mensagem direta"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {dms.length === 0 ? (
                  <button
                    onClick={() => setShowMemberSearch(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova conversa privada
                  </button>
                ) : (
                  dms.map(sala => (
                    <SalaItem
                      key={sala.id}
                      sala={sala}
                      isActive={selectedSala?.id === sala.id}
                      unread={unread[sala.id] || 0}
                      isPrivate
                      otherName={getDMName(sala)}
                      onClick={() => { setSelectedSala(sala); setUnread(p => ({ ...p, [sala.id]: 0 })); if (isMobile) setShowSidebar(false); }}
                    />
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Right panel: Chat area ────────────────────────────────── */}
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden glass-card",
          isMobile ? (showSidebar ? "hidden" : "w-full rounded-xl") : "rounded-r-xl"
        )}>
          {selectedSala ? (
            <>
              {/* Chat header */}
              <div className="px-3 sm:px-5 py-3 border-b border-border flex items-center gap-2 sm:gap-3 shrink-0">
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {selectedSala.tipo === "privado" ? (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {getDMName(selectedSala).charAt(0).toUpperCase()}
                  </div>
                ) : (
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", selectedSala.cor)}>
                    <RoomIcon icone={selectedSala.icone} className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {selectedSala.tipo === "privado" ? getDMName(selectedSala) : selectedSala.nome}
                    </h3>
                    {selectedSala.tipo === "privado" && (
                      <Lock className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  {selectedSala.descricao && selectedSala.tipo !== "privado" && (
                    <p className="text-[11px] text-muted-foreground">{selectedSala.descricao}</p>
                  )}
                  {selectedSala.tipo === "privado" && (
                    <p className="text-[11px] text-muted-foreground">Conversa privada</p>
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
                      {selectedSala.tipo === "privado" ? (
                        <>
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                            {getDMName(selectedSala).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{getDMName(selectedSala)}</p>
                            <p className="text-xs text-muted-foreground mt-1">Início da conversa privada. Diga olá!</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", selectedSala.cor)}>
                            <RoomIcon icone={selectedSala.icone} className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Bem-vindo ao {selectedSala.nome}!</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedSala.descricao || "Nenhuma mensagem ainda. Seja o primeiro a enviar!"}
                            </p>
                          </div>
                        </>
                      )}
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
                          <MessageBubble key={msg.id} msg={msg} isOwn={isOwn} showName={showName} />
                        );
                      })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input bar */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-border shrink-0">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={texto}
                      onChange={e => setTexto(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedSala.tipo === "privado"
                          ? `Mensagem para ${getDMName(selectedSala)}...`
                          : `Mensagem para #${selectedSala.nome}... (Enter para enviar)`
                      }
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
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
                  Shift+Enter para nova linha · Enter para enviar
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Selecione uma sala</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha um canal ou inicie uma conversa privada
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member search modal */}
      <AnimatePresence>
        {showMemberSearch && (
          <MemberSearchModal
            membros={membros}
            currentUserId={user?.user_id || ""}
            onSelect={handleOpenDM}
            onClose={() => setShowMemberSearch(false)}
          />
        )}
      </AnimatePresence>
    </AppLayout>
  );
};

export default WebChat;
