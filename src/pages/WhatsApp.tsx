import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Phone, ArrowDownLeft, ArrowUpRight,
  Search, MessageSquare, Check, CheckCheck, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ChatInputBar from "@/components/whatsapp/ChatInputBar";

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

const WhatsApp = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // Send form
  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

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
      .limit(200);
    setMensagens((data as Mensagem[]) || []);
  };

  // Group contacts
  const contacts = useMemo(() => {
    const map = new Map<string, { contato: string; lastMsg: Mensagem; count: number }>();
    mensagens.forEach((m) => {
      const key = m.contato_externo || "desconhecido";
      if (!map.has(key)) {
        map.set(key, { contato: key, lastMsg: m, count: 1 });
      } else {
        map.get(key)!.count++;
      }
    });
    const arr = Array.from(map.values());
    if (searchTerm) {
      return arr.filter((c) => c.contato.includes(searchTerm));
    }
    return arr;
  }, [mensagens, searchTerm]);

  const chatMessages = useMemo(() => {
    if (!selectedContact) return [];
    return mensagens
      .filter((m) => (m.contato_externo || "desconhecido") === selectedContact)
      .reverse();
  }, [mensagens, selectedContact]);

  const getPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.text) return c.text;
    if (c?.caption) return `📎 ${c.caption}`;
    if (c?.media) return "📎 Mídia";
    if (c?.dados?.nome) return `👤 ${c.dados.nome}`;
    if (c?.acao) return `⚡ ${c.acao}`;
    return JSON.stringify(c).slice(0, 60);
  };

  const getMediaPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.media && (msg.tipo === "image" || c?.mediatype === "image")) {
      return <img src={c.media} alt="media" className="max-w-[200px] rounded-lg mt-1" />;
    }
    return null;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      </AppLayout>
    );
  }

  if (!config) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground" />
          <p className="text-muted-foreground">Configure a integração primeiro em <strong>Integração</strong>.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-bold font-display text-foreground">WhatsApp</h1>
            <Badge variant={config.ativo ? "default" : "secondary"} className="text-[10px]">
              {config.ativo ? "Online" : "Offline"}
            </Badge>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Contact List */}
          <div className="w-[320px] border-r bg-card flex flex-col shrink-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contato..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* New conversation fields */}
            <div className="p-3 border-b space-y-2">
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Instância"
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="5592999999999"
                  className="h-8 text-xs flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                  onClick={() => { if (numero) setSelectedContact(numero); }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y">
                {contacts.map((c) => (
                  <button
                    key={c.contato}
                    onClick={() => { setSelectedContact(c.contato); setNumero(c.contato); }}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                      selectedContact === c.contato && "bg-muted"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{c.contato}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(c.lastMsg.created_at), "HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.lastMsg.direcao === "enviada" && "✓ "}
                        {getPreview(c.lastMsg)}
                      </p>
                    </div>
                    {c.count > 1 && (
                      <Badge variant="default" className="text-[9px] h-5 px-1.5 shrink-0">{c.count}</Badge>
                    )}
                  </button>
                ))}
                {contacts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Nenhuma conversa ainda</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-muted/20">
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <MessageSquare className="w-16 h-16 text-muted-foreground/30 mx-auto" />
                  <p className="text-muted-foreground text-sm">Selecione um contato ou digite um número</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b bg-card">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{selectedContact}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {chatMessages.length} mensagens
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 px-4 py-3">
                  <div className="space-y-3 max-w-3xl mx-auto">
                    {chatMessages.map((msg) => {
                      const isSent = msg.direcao === "enviada";
                      return (
                        <div key={msg.id} className={cn("flex", isSent ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                            isSent
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card border rounded-bl-md"
                          )}>
                            {getMediaPreview(msg)}
                            <p className="text-sm whitespace-pre-wrap break-words">{getPreview(msg)}</p>
                            {msg.erro && (
                              <p className={cn("text-[10px] mt-1", isSent ? "text-primary-foreground/70" : "text-destructive")}>
                                ❌ {msg.erro}
                              </p>
                            )}
                            <div className={cn(
                              "flex items-center gap-1 justify-end mt-1",
                              isSent ? "text-primary-foreground/60" : "text-muted-foreground"
                            )}>
                              <span className="text-[10px]">
                                {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                              </span>
                              {isSent && (
                                msg.status === "enviada" || msg.status === "processada"
                                  ? <CheckCheck className="w-3 h-3" />
                                  : msg.status === "erro"
                                    ? <AlertCircle className="w-3 h-3" />
                                    : <Check className="w-3 h-3" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {config && (
                  <ChatInputBar
                    config={config}
                    instanceName={instanceName}
                    numero={numero}
                    onSent={() => setSelectedContact(numero)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default WhatsApp;
