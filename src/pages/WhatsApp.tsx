import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Search, MessageSquare, Check, CheckCheck, AlertCircle,
  MoreVertical, Info, Trash2, Pencil, Copy, Reply, Star, Forward,
  ChevronDown, ArrowDown, X,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ChatInputBar from "@/components/whatsapp/ChatInputBar";
import ContactInfoPanel from "@/components/whatsapp/ContactInfoPanel";

interface Config {
  id: string;
  api_url: string;
  api_token: string;
  auth_header_type: string;
  ativo: boolean;
}

interface Mensagem {
  id: string;
  config_id: string;
  direcao: string;
  tipo: string;
  conteudo: any;
  status: string;
  plataforma: string;
  contato_externo: string;
  erro: string | null;
  created_at: string;
}

const WA_GREEN = "#00a884";
const WA_BG = "#efeae2";
const WA_SENT = "#d9fdd3";
const WA_HEADER = "#f0f2f5";

const WhatsApp = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);

  // Message actions
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; text: string } | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [showScrollDown, setShowScrollDown] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const notifAudioRef = useRef<HTMLAudioElement | null>(null);
  const [unreadByContact, setUnreadByContact] = useState<Map<string, number>>(new Map());

  // Create notification sound on mount
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const createBeep = () => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    };
    (window as any).__waBeep = createBeep;
    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => { fetchConfig(); }, []);

  useEffect(() => {
    if (!config) return;
    fetchMensagens();
    const channel = supabase
      .channel("whatsapp-msgs")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "integracao_agente_mensagens",
        filter: `config_id=eq.${config.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newMsg = payload.new as Mensagem;
          setMensagens((prev) => [newMsg, ...prev]);
          // Notification for incoming messages
          if (newMsg.direcao === "recebida") {
            // Play sound
            try { (window as any).__waBeep?.(); } catch {}
            // Update unread badge
            setUnreadByContact((prev) => {
              const next = new Map(prev);
              const contact = newMsg.contato_externo || "desconhecido";
              if (contact !== selectedContact) {
                next.set(contact, (next.get(contact) || 0) + 1);
              }
              return next;
            });
            // Browser notification
            if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
              const text = newMsg.conteudo?.text || newMsg.conteudo?.message || "Nova mensagem";
              const contact = newMsg.contato_externo || "Contato";
              new Notification(`💬 ${contact}`, { body: text.slice(0, 100), icon: "/favicon.png", tag: "wa-msg" });
            }
            // Toast notification
            const contactName = newMsg.contato_externo || "Contato";
            const preview = newMsg.conteudo?.text || newMsg.conteudo?.message || "Nova mensagem";
            toast({ title: `💬 ${contactName}`, description: preview.slice(0, 80) });
          }
        } else if (payload.eventType === "UPDATE") {
          setMensagens((prev) => prev.map((m) => m.id === (payload.new as Mensagem).id ? payload.new as Mensagem : m));
        } else if (payload.eventType === "DELETE") {
          setMensagens((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [config?.id, selectedContact]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens, selectedContact]);

  const fetchConfig = async () => {
    const { data } = await supabase.from("integracao_agente_config").select("id, api_url, api_token, auth_header_type, ativo").limit(1).single();
    if (data) setConfig(data as Config);
    setLoading(false);
  };

  const fetchMensagens = async () => {
    if (!config) return;
    const { data } = await supabase
      .from("integracao_agente_mensagens")
      .select("*")
      .eq("config_id", config.id)
      .eq("plataforma", "whatsapp")
      .order("created_at", { ascending: false })
      .limit(500);
    setMensagens((data as Mensagem[]) || []);
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("integracao_agente_mensagens").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setMensagens((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Mensagem excluída 🗑️" });
    }
    setDeleteDialog(null);
  };

  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado! 📋" });
  };

  const toggleStar = (id: string) => {
    setStarredMessages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast({ title: "Desmarcado ⭐" }); }
      else { next.add(id); toast({ title: "Mensagem marcada ⭐" }); }
      return next;
    });
  };

  const contacts = useMemo(() => {
    const map = new Map<string, { contato: string; lastMsg: Mensagem; count: number; unread: number; nome?: string }>();
    mensagens.forEach((m) => {
      const key = m.contato_externo || "desconhecido";
      if (!map.has(key)) {
        map.set(key, {
          contato: key,
          lastMsg: m,
          count: 1,
          unread: m.direcao === "recebida" ? 1 : 0,
          nome: m.conteudo?.nome || m.conteudo?.dados?.nome,
        });
      } else {
        const c = map.get(key)!;
        c.count++;
        if (m.direcao === "recebida") c.unread++;
        if (!c.nome && (m.conteudo?.nome || m.conteudo?.dados?.nome)) {
          c.nome = m.conteudo?.nome || m.conteudo?.dados?.nome;
        }
      }
    });
    const arr = Array.from(map.values());
    if (searchTerm) return arr.filter((c) => c.contato.includes(searchTerm) || c.nome?.toLowerCase().includes(searchTerm.toLowerCase()));
    return arr;
  }, [mensagens, searchTerm]);

  const chatMessages = useMemo(() => {
    if (!selectedContact) return [];
    let msgs = mensagens
      .filter((m) => (m.contato_externo || "desconhecido") === selectedContact)
      .reverse();
    if (chatSearch) {
      msgs = msgs.filter((m) => getPreview(m).toLowerCase().includes(chatSearch.toLowerCase()));
    }
    return msgs;
  }, [mensagens, selectedContact, chatSearch]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Mensagem[] }[] = [];
    let currentDate = "";
    chatMessages.forEach((msg) => {
      const d = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (d !== currentDate) {
        currentDate = d;
        groups.push({ date: d, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  }, [chatMessages]);

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isToday(d)) return "HOJE";
    if (isYesterday(d)) return "ONTEM";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  };

  const getPreview = useCallback((msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.text) return c.text;
    if (c?.message) return c.message;
    if (c?.caption) return `📎 ${c.caption}`;
    if (c?.media) return "📎 Mídia";
    if (c?.dados?.nome) return `👤 ${c.dados.nome}`;
    if (c?.acao) return `⚡ ${c.acao}`;
    return JSON.stringify(c).slice(0, 60);
  }, []);

  const getMediaPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.media && (msg.tipo === "image" || c?.mediatype === "image")) {
      return <img src={c.media} alt="media" className="max-w-[220px] rounded-lg mb-1" />;
    }
    if (c?.media && (msg.tipo === "audio" || c?.mediatype === "audio")) {
      return <audio controls src={c.media} className="max-w-[220px] mb-1" />;
    }
    if (c?.media && (msg.tipo === "video" || c?.mediatype === "video")) {
      return <video controls src={c.media} className="max-w-[220px] rounded-lg mb-1" />;
    }
    return null;
  };

  const getInitials = (name: string) => {
    const clean = name.replace(/\D/g, "");
    if (clean.length > 4) return clean.slice(-2);
    return name.slice(0, 2).toUpperCase();
  };

  const avatarColor = (name: string) => {
    const colors = ["#00a884", "#53bdeb", "#7c8db5", "#d97706", "#e11d48", "#8b5cf6", "#06b6d4"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: WA_GREEN }} />
        </div>
      </AppLayout>
    );
  }

  if (!config) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: WA_GREEN }}>
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <p className="text-muted-foreground text-center max-w-sm">
            Configure a integração primeiro em <strong>Integração</strong> para conectar ao WhatsApp via n8n.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden rounded-lg border shadow-lg">
        <div className="flex flex-1 overflow-hidden">
          {/* ========== SIDEBAR ========== */}
          <div className="w-[360px] flex flex-col shrink-0 border-r bg-white">
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: WA_HEADER }}>
              <Avatar className="h-10 w-10">
                <AvatarFallback style={{ backgroundColor: WA_GREEN }} className="text-white text-sm font-semibold">
                  {user?.email?.slice(0, 2).toUpperCase() || "GB"}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setShowSearch(!showSearch)}>
                  <Search className="w-5 h-5 text-muted-foreground" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => fetchMensagens()}>Atualizar conversas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowSearch(!showSearch)}>Pesquisar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Search */}
            <div className="px-2 py-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar ou começar uma nova conversa"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-[35px] text-sm rounded-lg border-0" style={{ backgroundColor: "#f0f2f5" }}
                />
              </div>
            </div>

            {/* New conversation */}
            <div className="px-3 py-2 border-b space-y-1.5">
              <Input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="Instância" className="h-8 text-xs rounded-lg" />
              <div className="flex gap-2">
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="5592999999999" className="h-8 text-xs flex-1 rounded-lg" />
                <Button size="sm" className="h-8 px-3 rounded-lg text-xs text-white" style={{ backgroundColor: WA_GREEN }}
                  onClick={() => { if (numero) setSelectedContact(numero); }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Contact list */}
            <ScrollArea className="flex-1">
              {contacts.map((c) => (
                <button
                  key={c.contato}
                  onClick={() => {
                    setSelectedContact(c.contato);
                    setNumero(c.contato);
                    setShowChatSearch(false);
                    setChatSearch("");
                    setUnreadByContact((prev) => { const next = new Map(prev); next.delete(c.contato); return next; });
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-[#f5f6f6] transition-colors",
                    selectedContact === c.contato && "bg-[#f0f2f5]"
                  )}
                >
                  <Avatar className="h-[49px] w-[49px] shrink-0">
                    <AvatarFallback style={{ backgroundColor: avatarColor(c.contato) }} className="text-white text-sm font-bold">
                      {getInitials(c.nome || c.contato)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 border-b border-[#e9edef] pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[17px] font-normal truncate">{c.nome || c.contato}</span>
                      <span className={cn("text-[12px]", c.unread > 0 ? "font-medium" : "text-[#667781]")}
                        style={c.unread > 0 ? { color: "#25d366" } : {}}>
                        {format(new Date(c.lastMsg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[14px] text-[#667781] truncate pr-2">
                        {c.lastMsg.direcao === "enviada" && <CheckCheck className="w-[18px] h-[14px] inline mr-0.5" style={{ color: "#53bdeb" }} />}
                        {c.lastMsg.conteudo?.auto_reply && "🤖 "}
                        {getPreview(c.lastMsg)}
                      </p>
                      {(unreadByContact.get(c.contato) || 0) > 0 && selectedContact !== c.contato && (
                        <span className="flex items-center justify-center min-w-[20px] h-[20px] rounded-full text-[11px] font-bold text-white px-1 animate-pulse"
                          style={{ backgroundColor: "#25d366" }}>
                          {unreadByContact.get(c.contato)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-16">
                  <MessageSquare className="w-16 h-16 text-[#d1d7db] mx-auto mb-4" />
                  <p className="text-[#667781] text-sm">Nenhuma conversa</p>
                  <p className="text-[#667781] text-xs mt-1">As mensagens do n8n aparecerão aqui</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* ========== CHAT AREA ========== */}
          <div className="flex-1 flex flex-col" style={{ backgroundColor: WA_BG }}>
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#f0f2f5" }}>
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-[200px] h-[200px] mx-auto flex items-center justify-center">
                    <MessageSquare className="w-32 h-32 text-[#d1d7db]" />
                  </div>
                  <h2 className="text-[32px] font-light text-[#41525d]">Gabinete WhatsApp</h2>
                  <p className="text-[14px] text-[#667781] leading-5">
                    Envie e receba mensagens dos eleitores em tempo real.<br />
                    Configure o webhook no n8n para receber dados automaticamente.
                  </p>
                  <div className="pt-6 flex items-center justify-center gap-2 text-[12px] text-[#8696a0]">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: "#25d366" }} />
                    Conectado ao sistema do Gabinete
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-4 py-[10px]" style={{ backgroundColor: WA_HEADER }}>
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: avatarColor(selectedContact) }} className="text-white font-bold text-sm">
                        {getInitials(contacts.find((c) => c.contato === selectedContact)?.nome || selectedContact)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[16px] font-normal">{contacts.find((c) => c.contato === selectedContact)?.nome || selectedContact}</p>
                      <p className="text-[13px] text-[#667781]">
                        {chatMessages.length} mensagens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => { setShowChatSearch(!showChatSearch); setChatSearch(""); }}>
                      <Search className="w-5 h-5 text-[#54656f]" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                          <MoreVertical className="w-5 h-5 text-[#54656f]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowInfo(!showInfo)}>
                          <Info className="w-4 h-4 mr-2" /> Dados do contato
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowChatSearch(true)}>
                          <Search className="w-4 h-4 mr-2" /> Pesquisar na conversa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setSelectedContact(null)}>
                          Fechar conversa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Chat search bar */}
                {showChatSearch && (
                  <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: "#ffffff" }}>
                    <Search className="w-4 h-4 text-[#54656f] shrink-0" />
                    <Input
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      placeholder="Pesquisar mensagens..."
                      className="h-8 text-sm border-0 bg-transparent"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                      onClick={() => { setShowChatSearch(false); setChatSearch(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="flex flex-1 overflow-hidden">
                  {/* Messages */}
                  <div className="flex-1 flex flex-col relative">
                    <ScrollArea className="flex-1" ref={scrollContainerRef}>
                      {/* WhatsApp-style background pattern */}
                      <div className="px-[7%] py-4 space-y-0.5 min-h-full"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d5dbd4' fill-opacity='0.15'%3E%3Cpath d='M20 20h1v1h-1zM40 40h1v1h-1zM60 60h1v1h-1zM10 50h1v1h-1zM50 10h1v1h-1zM30 70h1v1h-1zM70 30h1v1h-1z'/%3E%3C/g%3E%3C/svg%3E")`,
                        }}>
                        {groupedMessages.map((group) => (
                          <div key={group.date}>
                            <div className="flex justify-center my-3">
                              <span className="text-[12.5px] text-[#54656f] px-3 py-[6px] rounded-[7.5px] shadow-sm font-normal"
                                style={{ backgroundColor: "#ffffff", boxShadow: "0 1px 0.5px rgba(11,20,26,.13)" }}>
                                {formatDateLabel(group.date)}
                              </span>
                            </div>
                            {group.messages.map((msg) => {
                              const isSent = msg.direcao === "enviada";
                              const msgText = getPreview(msg);
                              const isStarred = starredMessages.has(msg.id);

                              return (
                                <div
                                  key={msg.id}
                                  className={cn("flex mb-[2px] group/msg relative", isSent ? "justify-end" : "justify-start")}
                                >
                                  <div
                                    className={cn(
                                      "max-w-[65%] rounded-[7.5px] px-[9px] py-[6px] relative",
                                      isSent ? "rounded-tr-none" : "rounded-tl-none"
                                    )}
                                    style={{
                                      backgroundColor: isSent ? WA_SENT : "#ffffff",
                                      boxShadow: "0 1px 0.5px rgba(11,20,26,.13)",
                                    }}
                                  >
                                    {/* Tail */}
                                    <div
                                      className={cn("absolute top-0 w-[8px] h-[13px]", isSent ? "-right-[8px]" : "-left-[8px]")}
                                      style={{
                                        borderTop: `6px solid ${isSent ? WA_SENT : "#ffffff"}`,
                                        ...(isSent
                                          ? { borderRight: "8px solid transparent" }
                                          : { borderLeft: "8px solid transparent" }),
                                      }}
                                    />

                                    {/* Message dropdown - always rendered, visible on hover via CSS */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button className="absolute top-1 right-1 p-0.5 rounded bg-transparent hover:bg-black/5 z-10 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                          <ChevronDown className="w-4 h-4 text-[#8696a0]" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align={isSent ? "end" : "start"} className="w-48">
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setReplyingTo({ id: msg.id, text: msgText, sender: isSent ? "Você" : msg.contato_externo }); }}>
                                          <Reply className="w-4 h-4 mr-2" /> Responder
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyMessage(msgText); }}>
                                          <Copy className="w-4 h-4 mr-2" /> Copiar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleStar(msg.id); }}>
                                          <Star className={cn("w-4 h-4 mr-2", isStarred && "fill-yellow-400 text-yellow-400")} />
                                          {isStarred ? "Desmarcar" : "Marcar com estrela"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(msgText);
                                          toast({ title: "Mensagem pronta para encaminhar 📨" });
                                        }}>
                                          <Forward className="w-4 h-4 mr-2" /> Encaminhar
                                        </DropdownMenuItem>
                                        {isSent && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingMessage({ id: msg.id, text: msgText }); }}>
                                              <Pencil className="w-4 h-4 mr-2" /> Editar
                                            </DropdownMenuItem>
                                          </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ id: msg.id, text: msgText }); }}>
                                          <Trash2 className="w-4 h-4 mr-2" /> Apagar
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>

                                    {/* Reply preview */}
                                    {msg.conteudo?.quotedMsgId && (
                                      <div className="rounded px-2 py-1 mb-1 border-l-4 text-[12px]" style={{ backgroundColor: isSent ? "#c8edbf" : "#f0f0f0", borderColor: WA_GREEN }}>
                                        <p className="text-[#667781] truncate">{msg.conteudo.quotedMsgId}</p>
                                      </div>
                                    )}

                                    {msg.conteudo?.auto_reply && (
                                      <span className="text-[11px] font-semibold block mb-0.5" style={{ color: WA_GREEN }}>
                                        🤖 IA do Gabinete
                                      </span>
                                    )}
                                    {!isSent && msg.conteudo?.nome && (
                                      <span className="text-[12.5px] font-medium block mb-0.5" style={{ color: avatarColor(msg.contato_externo) }}>
                                        {msg.conteudo.nome}
                                      </span>
                                    )}
                                    {isStarred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 inline mr-1" />}
                                    {getMediaPreview(msg)}
                                    <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words pr-[58px]">
                                      {msgText}
                                    </p>
                                    {msg.conteudo?.edited && (
                                      <span className="text-[11px] text-[#667781] italic mr-1">editada</span>
                                    )}
                                    {msg.erro && (
                                      <p className="text-[11px] text-destructive mt-1">❌ {msg.erro}</p>
                                    )}
                                    <span className={cn(
                                      "float-right text-[11px] -mb-[5px] ml-[4px] mt-[3px] flex items-center gap-[3px]",
                                      isSent ? "text-[#667781]" : "text-[#667781]"
                                    )}>
                                      {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                      {isSent && (
                                        msg.status === "enviada" || msg.status === "processada"
                                          ? <CheckCheck className="w-[18px] h-[13px]" style={{ color: "#53bdeb" }} />
                                          : msg.status === "erro"
                                            ? <AlertCircle className="w-[13px] h-[13px] text-destructive" />
                                            : msg.status === "agendada"
                                              ? <span className="text-[10px]">📅</span>
                                              : <Check className="w-[16px] h-[13px]" />
                                      )}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Scroll to bottom */}
                    <Button
                      size="icon"
                      className="absolute bottom-4 right-6 h-10 w-10 rounded-full shadow-lg bg-white hover:bg-gray-50 text-[#54656f] z-10"
                      onClick={scrollToBottom}
                    >
                      <ArrowDown className="w-5 h-5" />
                    </Button>
                  </div>

                  {/* Info Panel */}
                  {showInfo && <ContactInfoPanel contato={selectedContact} onClose={() => setShowInfo(false)} />}
                </div>

                <ChatInputBar
                  config={config}
                  instanceName={instanceName}
                  numero={numero}
                  onSent={() => setSelectedContact(numero)}
                  editingMessage={editingMessage}
                  onCancelEdit={() => setEditingMessage(null)}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar mensagem?</DialogTitle>
            <DialogDescription>
              <span className="block mt-2 p-3 rounded-lg bg-muted text-sm">"{deleteDialog?.text?.slice(0, 100)}"</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteDialog && deleteMessage(deleteDialog.id)}>
              <Trash2 className="w-4 h-4 mr-1" /> Apagar para mim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WhatsApp;
