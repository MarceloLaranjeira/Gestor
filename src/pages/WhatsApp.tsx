import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Search, MessageSquare, Check, CheckCheck, AlertCircle,
  MoreVertical, User, Phone, Info,
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

// WhatsApp green palette
const WA_GREEN = "#00a884";
const WA_GREEN_DARK = "#008069";
const WA_BG = "#efeae2";
const WA_BG_DARK = "#0b141a";
const WA_SENT = "#d9fdd3";
const WA_SIDEBAR = "#ffffff";
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

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchConfig(); }, []);

  useEffect(() => {
    if (!config) return;
    fetchMensagens();
    const channel = supabase
      .channel("whatsapp-msgs")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "integracao_agente_mensagens",
        filter: `config_id=eq.${config.id}`,
      }, (payload) => {
        setMensagens((prev) => [payload.new as Mensagem, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [config?.id]);

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

  const contacts = useMemo(() => {
    const map = new Map<string, { contato: string; lastMsg: Mensagem; count: number; unread: number }>();
    mensagens.forEach((m) => {
      const key = m.contato_externo || "desconhecido";
      if (!map.has(key)) {
        map.set(key, { contato: key, lastMsg: m, count: 1, unread: m.direcao === "recebida" ? 1 : 0 });
      } else {
        const c = map.get(key)!;
        c.count++;
        if (m.direcao === "recebida") c.unread++;
      }
    });
    const arr = Array.from(map.values());
    if (searchTerm) return arr.filter((c) => c.contato.includes(searchTerm));
    return arr;
  }, [mensagens, searchTerm]);

  const chatMessages = useMemo(() => {
    if (!selectedContact) return [];
    return mensagens
      .filter((m) => (m.contato_externo || "desconhecido") === selectedContact)
      .reverse();
  }, [mensagens, selectedContact]);

  // Group messages by date
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
    if (isToday(d)) return "Hoje";
    if (isYesterday(d)) return "Ontem";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  };

  const getPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.text) return c.text;
    if (c?.message) return c.message;
    if (c?.caption) return `📎 ${c.caption}`;
    if (c?.media) return "📎 Mídia";
    if (c?.dados?.nome) return `👤 ${c.dados.nome}`;
    if (c?.acao) return `⚡ ${c.acao}`;
    return JSON.stringify(c).slice(0, 60);
  };

  const getMediaPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.media && (msg.tipo === "image" || c?.mediatype === "image")) {
      return <img src={c.media} alt="media" className="max-w-[220px] rounded-lg mb-1" />;
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
          <div className="w-[360px] flex flex-col shrink-0 border-r" style={{ backgroundColor: WA_SIDEBAR }}>
            {/* Sidebar header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: WA_HEADER }}>
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback style={{ backgroundColor: WA_GREEN }} className="text-white text-sm font-semibold">
                    {user?.email?.slice(0, 2).toUpperCase() || "GB"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setShowSearch(!showSearch)}>
                  <Search className="w-5 h-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar ou começar uma nova conversa"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 text-sm rounded-lg border-0 bg-muted/50"
                />
              </div>
            </div>

            {/* New conversation */}
            <div className="px-3 py-2 border-b space-y-2">
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Nome da instância"
                className="h-8 text-xs rounded-lg"
              />
              <div className="flex gap-2">
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="5592999999999"
                  className="h-8 text-xs flex-1 rounded-lg"
                />
                <Button
                  size="sm"
                  className="h-8 px-3 rounded-lg text-xs text-white"
                  style={{ backgroundColor: WA_GREEN }}
                  onClick={() => { if (numero) setSelectedContact(numero); }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Contact list */}
            <ScrollArea className="flex-1">
              <div>
                {contacts.map((c) => (
                  <button
                    key={c.contato}
                    onClick={() => { setSelectedContact(c.contato); setNumero(c.contato); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-muted/40 transition-colors border-b border-muted/30",
                      selectedContact === c.contato && "bg-muted/60"
                    )}
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarFallback style={{ backgroundColor: avatarColor(c.contato) }} className="text-white text-sm font-bold">
                        {getInitials(c.contato)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{c.contato}</span>
                        <span className={cn("text-[11px]", c.unread > 0 ? "font-medium" : "text-muted-foreground")}
                          style={c.unread > 0 ? { color: WA_GREEN } : {}}>
                          {format(new Date(c.lastMsg.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-muted-foreground truncate pr-2">
                          {c.lastMsg.direcao === "enviada" && (
                            <CheckCheck className="w-3.5 h-3.5 inline mr-1" style={{ color: "#53bdeb" }} />
                          )}
                          {c.lastMsg.conteudo?.auto_reply && "🤖 "}
                          {getPreview(c.lastMsg)}
                        </p>
                        {c.unread > 0 && selectedContact !== c.contato && (
                          <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold text-white px-1.5"
                            style={{ backgroundColor: WA_GREEN }}>
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                {contacts.length === 0 && (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
                    <p className="text-xs text-muted-foreground mt-1">As mensagens do n8n aparecerão aqui</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ========== CHAT AREA ========== */}
          <div className="flex-1 flex flex-col" style={{ backgroundColor: WA_BG }}>
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: "#f0f2f5" }}>
                <div className="text-center space-y-4 max-w-md">
                  <div className="w-[200px] h-[200px] mx-auto rounded-full flex items-center justify-center bg-muted/30">
                    <MessageSquare className="w-24 h-24 text-muted-foreground/20" />
                  </div>
                  <h2 className="text-2xl font-light text-muted-foreground">Gabinete WhatsApp</h2>
                  <p className="text-sm text-muted-foreground">
                    Envie e receba mensagens dos eleitores em tempo real.<br />
                    Configure o webhook no n8n para receber dados automaticamente.
                  </p>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground pt-4">
                    <span className="inline-block w-4 h-4 rounded-full" style={{ backgroundColor: WA_GREEN }} />
                    Conectado ao sistema do Gabinete
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center justify-between px-4 py-2 border-b" style={{ backgroundColor: WA_HEADER }}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback style={{ backgroundColor: avatarColor(selectedContact) }} className="text-white font-bold text-sm">
                        {getInitials(selectedContact)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedContact}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {chatMessages.length} mensagens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setShowInfo(!showInfo)}>
                      <Info className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex flex-1 overflow-hidden">
                  <ScrollArea className="flex-1">
                    <div className="px-[6%] py-3 space-y-1 min-h-full">
                      {groupedMessages.map((group) => (
                        <div key={group.date}>
                          {/* Date separator */}
                          <div className="flex justify-center my-3">
                            <span className="bg-white/90 text-[11px] text-muted-foreground px-3 py-1 rounded-lg shadow-sm font-medium">
                              {formatDateLabel(group.date)}
                            </span>
                          </div>
                          {group.messages.map((msg) => {
                            const isSent = msg.direcao === "enviada";
                            return (
                              <div key={msg.id} className={cn("flex mb-1", isSent ? "justify-end" : "justify-start")}>
                                <div
                                  className={cn(
                                    "max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative",
                                    isSent ? "rounded-tr-none" : "rounded-tl-none"
                                  )}
                                  style={{
                                    backgroundColor: isSent ? WA_SENT : "#ffffff",
                                  }}
                                >
                                  {/* Tail */}
                                  <div
                                    className={cn("absolute top-0 w-2 h-3", isSent ? "-right-2" : "-left-2")}
                                    style={{
                                      borderTop: `6px solid ${isSent ? WA_SENT : "#ffffff"}`,
                                      ...(isSent
                                        ? { borderRight: "8px solid transparent" }
                                        : { borderLeft: "8px solid transparent" }),
                                    }}
                                  />

                                  {msg.conteudo?.auto_reply && (
                                    <span className="text-[10px] font-semibold block mb-0.5" style={{ color: WA_GREEN }}>
                                      🤖 IA do Gabinete
                                    </span>
                                  )}
                                  {!isSent && msg.conteudo?.dados?.nome && (
                                    <span className="text-[10px] font-semibold block mb-0.5" style={{ color: avatarColor(msg.contato_externo) }}>
                                      {msg.conteudo.dados.nome}
                                    </span>
                                  )}
                                  {getMediaPreview(msg)}
                                  <p className="text-[13.5px] leading-[19px] whitespace-pre-wrap break-words pr-14">
                                    {getPreview(msg)}
                                  </p>
                                  {msg.erro && (
                                    <p className="text-[10px] text-destructive mt-1">❌ {msg.erro}</p>
                                  )}
                                  <span className="float-right text-[11px] text-muted-foreground -mb-1 ml-2 mt-1 flex items-center gap-0.5">
                                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                    {isSent && (
                                      msg.status === "enviada" || msg.status === "processada"
                                        ? <CheckCheck className="w-4 h-3.5 ml-0.5" style={{ color: "#53bdeb" }} />
                                        : msg.status === "erro"
                                          ? <AlertCircle className="w-3 h-3 ml-0.5 text-destructive" />
                                          : <Check className="w-3.5 h-3 ml-0.5" />
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

                  {/* Info Panel */}
                  {showInfo && (
                    <ContactInfoPanel contato={selectedContact} onClose={() => setShowInfo(false)} />
                  )}
                </div>

                {/* Input */}
                <ChatInputBar
                  config={config}
                  instanceName={instanceName}
                  numero={numero}
                  onSent={() => setSelectedContact(numero)}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default WhatsApp;
