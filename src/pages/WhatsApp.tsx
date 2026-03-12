import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  ChevronDown, ArrowDown, X, Upload, RefreshCw, Smartphone,
  QrCode, Wifi, WifiOff, Link2, LogOut, Filter, Circle,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ChatInputBar from "@/components/whatsapp/ChatInputBar";
import ContactInfoPanel from "@/components/whatsapp/ContactInfoPanel";
import StarredMessagesPanel from "@/components/whatsapp/StarredMessagesPanel";

/* ─── Types ─────────────────────────────────────────────────────────── */
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

/* ─── Constants ─────────────────────────────────────────────────────── */
const WA_GREEN   = "#00a884";
const WA_TEAL    = "#008069";
const WA_BG      = "#efeae2";
const WA_SENT    = "#d9fdd3";
const WA_HEADER  = "#f0f2f5";
const WA_DARK    = "#111b21";
const WA_GREY    = "#667781";

/* ─── Emoji sets ─────────────────────────────────────────────────────── */
const EMOJIS = ["😀","😂","😍","🥰","😎","😢","😮","😡","👍","👎","❤️","🔥","🙏","💪","😭","🎉","✅","❌","💬","📞"];

/* ─── Helpers ────────────────────────────────────────────────────────── */
const getInitials = (name: string) => {
  const clean = name.replace(/\D/g, "");
  if (clean.length > 4) return clean.slice(-2);
  return name.slice(0, 2).toUpperCase();
};
const avatarColor = (name: string) => {
  const colors = ["#5e5ce6","#53bdeb","#d97706","#e11d48","#8b5cf6","#06b6d4","#0ea5e9","#10b981"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
};
const getMsgText = (msg: Mensagem) => {
  const c = msg.conteudo;
  if (c?.text) return c.text;
  if (c?.message) return c.message;
  if (c?.caption) return `📎 ${c.caption}`;
  if (c?.media) return "📎 Mídia";
  if (c?.dados?.nome) return `👤 ${c.dados.nome}`;
  if (c?.acao) return `⚡ ${c.acao}`;
  return JSON.stringify(c).slice(0, 60);
};

/* ═══════════════════════════════════════════════════════════════════════
   SETUP SCREEN (first-time config, embedded in WhatsApp page)
═══════════════════════════════════════════════════════════════════════ */
const WhatsAppSetupScreen = ({ onConfigSaved }: { onConfigSaved: (cfg: Config) => void }) => {
  const [apiUrl, setApiUrl] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!apiUrl.trim() || !apiToken.trim()) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("integracao_agente_config")
      .insert({ api_url: apiUrl.trim(), api_token: apiToken.trim(), auth_header_type: "apikey", ativo: true })
      .select()
      .single();
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar configuração", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ Configuração salva!", description: "Gerando QR Code..." });
    onConfigSaved(data as Config);
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-background">
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-border bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: WA_HEADER }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: WA_TEAL }}>
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: WA_DARK }}>WhatsApp — Configuração Inicial</p>
            <p className="text-xs" style={{ color: WA_GREY }}>Configure uma vez e conecte via QR Code</p>
          </div>
        </div>

        <div className="px-8 py-8 space-y-6">
          <div>
            <p className="text-[20px] font-light" style={{ color: "#41525d" }}>Conectar WhatsApp</p>
            <p className="text-sm mt-1" style={{ color: WA_GREY }}>
              Informe os dados da API Evolution para gerar o QR Code de conexão.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "#8696a0" }}>
                URL da API Evolution
              </label>
              <Input
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://sua-api.exemplo.com"
                className="h-11 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: "#8696a0" }}>
                API Token (Global Key)
              </label>
              <Input
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="Sua chave de API"
                className="h-11 text-sm"
              />
            </div>
          </div>

          <Button
            className="w-full h-11 text-sm font-semibold gap-2 text-white"
            style={{ backgroundColor: WA_GREEN }}
            onClick={handleSave}
            disabled={saving || !apiUrl.trim() || !apiToken.trim()}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar e gerar QR Code"}
          </Button>

          <p className="text-[11px] text-center" style={{ color: "#8696a0" }}>
            Esta configuração é feita uma única vez. Após salvar, o QR Code será gerado automaticamente.
          </p>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   QR CODE SCREEN
═══════════════════════════════════════════════════════════════════════ */
interface QRScreenProps {
  config: Config;
  instanceName: string;
  onInstanceChange: (v: string) => void;
  onConnected: () => void;
}
const QRScreen = ({ config, instanceName, onInstanceChange, onConnected }: QRScreenProps) => {
  const [status, setStatus] = useState<"idle" | "checking" | "open" | "close">("idle");
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const autoFetchedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Use Supabase function as proxy to avoid CORS */
  const callApi = useCallback(async (endpoint: string, method = "GET") => {
    const { data, error } = await supabase.functions.invoke("integracao-enviar", {
      body: {
        config_id: config.id,
        endpoint,
        method,
        plataforma: "system",
        contato_externo: "__wa_system__",
      },
    });
    if (error) throw error;
    return data?.data ?? data;
  }, [config.id]);

  const checkStatus = useCallback(async (): Promise<boolean> => {
    if (!instanceName.trim()) return false;
    try {
      const data = await callApi(`/instance/connectionState/${instanceName.trim()}`);
      const state: string = data?.instance?.state || data?.state || "close";
      const open = state === "open";
      setStatus(open ? "open" : "close");
      return open;
    } catch {
      setStatus("close");
      return false;
    }
  }, [callApi, instanceName]);

  const fetchQR = useCallback(async () => {
    if (!instanceName.trim() || qrLoading) return;
    setQrLoading(true);
    setQrBase64(null);
    try {
      const data = await callApi(`/instance/connect/${instanceName.trim()}`);
      const qr = data?.base64 || data?.qrcode?.base64 || data?.qr;
      if (qr) {
        setQrBase64(qr);
        setCountdown(30);
      } else {
        toast({ title: "QR Code não retornado", description: "Verifique o nome da instância e token", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao obter QR Code", description: "Verifique a URL e token da API", variant: "destructive" });
    } finally {
      setQrLoading(false);
    }
  }, [callApi, instanceName, qrLoading]);

  const handleVerify = async () => {
    setStatus("checking");
    const open = await checkStatus();
    if (open) {
      toast({ title: "✅ WhatsApp conectado!", description: `Instância "${instanceName}" está ativa.` });
      onConnected();
    } else {
      toast({ title: "Não conectado", description: "Gere o QR Code e escaneie com o WhatsApp", variant: "destructive" });
    }
  };

  /* Poll every 3s after QR is shown */
  useEffect(() => {
    if (!qrBase64 || status === "open") return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const open = await checkStatus();
      if (open) {
        clearInterval(pollRef.current!);
        toast({ title: "✅ WhatsApp conectado!" });
        onConnected();
      }
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [qrBase64, status]);

  /* 30-second countdown + auto-refresh */
  useEffect(() => {
    if (countdown <= 0) return;
    if (cdRef.current) clearInterval(cdRef.current);
    cdRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(cdRef.current!);
          fetchQR();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => { if (cdRef.current) clearInterval(cdRef.current); };
  }, [countdown]);

  /* Auto-check connection then fetch QR on mount */
  useEffect(() => {
    if (autoFetchedRef.current || !instanceName.trim()) return;
    autoFetchedRef.current = true;
    checkStatus().then(open => {
      if (!open) fetchQR();
    });
  }, [instanceName]); // eslint-disable-line

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-background">
      <div className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-border animate-scale-in bg-white">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ background: WA_HEADER }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: WA_TEAL }}>
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[15px] font-semibold" style={{ color: WA_DARK }}>WhatsApp — Conectar Dispositivo</p>
            <p className="text-xs" style={{ color: WA_GREY }}>Use o WhatsApp no navegador do Gestor Inteligente</p>
          </div>
          <div className="ml-auto">
            {status === "checking" && <span className="flex items-center gap-1.5 text-xs" style={{ color: WA_GREY }}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verificando...</span>}
            {status === "open"     && <span className="flex items-center gap-1.5 text-xs text-emerald-600"><Wifi className="w-3.5 h-3.5" /> Conectado</span>}
            {status === "close"    && <span className="flex items-center gap-1.5 text-xs text-red-500"><WifiOff className="w-3.5 h-3.5" /> Desconectado</span>}
          </div>
        </div>

        <div className="flex flex-col md:flex-row">
          {/* Left — instructions + inputs */}
          <div className="flex-1 px-8 py-8 space-y-6">
            <div>
              <p className="text-[22px] font-light" style={{ color: "#41525d" }}>Vincule seu WhatsApp</p>
              <p className="text-sm mt-1" style={{ color: WA_GREY }}>Conecte seu número para enviar e receber mensagens dos eleitores.</p>
            </div>

            <ol className="space-y-3.5">
              {[
                "Abra o WhatsApp no seu celular",
                "Toque em Menu (⋮) ou Configurações",
                "Selecione Dispositivos conectados",
                "Toque em Conectar dispositivo e escaneie o QR code",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5"
                    style={{ backgroundColor: WA_GREEN }}>{i + 1}</span>
                  <span className="text-sm" style={{ color: "#41525d" }}>{text}</span>
                </li>
              ))}
            </ol>

            {/* Actions */}
            <div className="space-y-3 pt-3 border-t border-[#e9edef]">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 h-10 text-sm gap-2"
                  onClick={handleVerify}
                  disabled={status === "checking"}
                >
                  {status === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Verificar conexão
                </Button>
                <Button
                  className="flex-1 h-10 text-sm gap-2 text-white"
                  style={{ backgroundColor: WA_GREEN }}
                  onClick={fetchQR}
                  disabled={qrLoading}
                >
                  {qrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  Novo QR Code
                </Button>
              </div>
              <p className="text-[11px]" style={{ color: "#8696a0" }}>
                O QR Code é gerado automaticamente. Escaneie com seu celular.
              </p>
            </div>
          </div>

          {/* Right — QR display */}
          <div className="w-full md:w-[300px] flex flex-col items-center justify-center px-8 py-8 border-t md:border-t-0 md:border-l border-[#e9edef] bg-[#fafafa]">
            {qrLoading ? (
              <div className="w-[196px] h-[196px] border border-[#e9edef] rounded-xl flex items-center justify-center bg-white shadow-sm">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: WA_GREEN }} />
              </div>
            ) : qrBase64 ? (
              <div className="text-center space-y-3">
                <div className="w-[196px] h-[196px] p-2 bg-white border border-[#e9edef] rounded-xl shadow-md overflow-hidden">
                  <img src={qrBase64} alt="QR Code WhatsApp" className="w-full h-full object-contain" />
                </div>
                <button onClick={fetchQR}
                  className="flex items-center gap-1.5 text-xs font-medium mx-auto"
                  style={{ color: WA_GREEN }}>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {countdown > 0 ? `Atualiza em ${countdown}s` : "Atualizar QR Code"}
                </button>
                <p className="text-[11px]" style={{ color: "#8696a0" }}>Verificando conexão automaticamente...</p>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-[196px] h-[196px] border border-[#e9edef] rounded-xl flex flex-col items-center justify-center gap-3 bg-white shadow-sm mx-auto">
                  <QrCode className="w-14 h-14 text-[#d1d7db]" />
                  <p className="text-xs px-4" style={{ color: "#8696a0" }}>Clique em "Gerar QR Code"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════
   MAIN WHATSAPP PAGE
═══════════════════════════════════════════════════════════════════════ */
const WhatsApp = () => {
  const { user } = useAuth();

  /* ── Config & Messages ── */
  const [config, setConfig] = useState<Config | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Instance / Connection ── */
  const [instanceName, setInstanceName] = useState(() => {
    try { return localStorage.getItem("wa-instance") || "gabinete-inteligente"; } catch { return "gabinete-inteligente"; }
  });
  const [connected, setConnected] = useState(false);

  /* ── UI State ── */
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showStarredPanel, setShowStarredPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);

  /* ── Message Actions ── */
  const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ id: string; text: string; sender: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; text: string } | null>(null);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());
  const [unreadByContact, setUnreadByContact] = useState<Map<string, number>>(new Map());
  const [numero, setNumero] = useState("");

  /* ── Scroll / Drag ── */
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const dragCountRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  /* ── Save instance ── */
  useEffect(() => {
    try { localStorage.setItem("wa-instance", instanceName); } catch {}
  }, [instanceName]);

  /* ── Notification sound ── */
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    (window as any).__waBeep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 800; osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    };
    if ("Notification" in window && Notification.permission === "default")
      Notification.requestPermission();
  }, []);

  /* ── Fetch config ── */
  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from("integracao_agente_config")
      .select("id, api_url, api_token, auth_header_type, ativo").limit(1).single();
    if (data) setConfig(data as Config);
    setLoading(false);
  };

  /* ── Realtime messages (only when connected) ── */
  useEffect(() => {
    if (!config || !connected) return;
    fetchMensagens();
    const channel = supabase.channel("whatsapp-msgs")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "integracao_agente_mensagens",
        filter: `config_id=eq.${config.id}`,
      }, payload => {
        if (payload.eventType === "INSERT") {
          const newMsg = payload.new as Mensagem;
          if (newMsg.contato_externo === "__wa_system__") return; // filter system
          setMensagens(prev => [newMsg, ...prev]);
          if (newMsg.direcao === "recebida") {
            try { (window as any).__waBeep?.(); } catch {}
            const contact = newMsg.contato_externo || "desconhecido";
            setUnreadByContact(prev => {
              const next = new Map(prev);
              if (contact !== selectedContact) next.set(contact, (next.get(contact) || 0) + 1);
              return next;
            });
            if ("Notification" in window && Notification.permission === "granted" && document.hidden)
              new Notification(`💬 ${newMsg.contato_externo || "Contato"}`, {
                body: (getMsgText(newMsg)).slice(0, 100), icon: "/favicon.png", tag: "wa-msg"
              });
            toast({ title: `💬 ${newMsg.contato_externo || "Contato"}`, description: getMsgText(newMsg).slice(0, 80) });
          }
        } else if (payload.eventType === "UPDATE") {
          setMensagens(prev => prev.map(m => m.id === (payload.new as Mensagem).id ? payload.new as Mensagem : m));
        } else if (payload.eventType === "DELETE") {
          setMensagens(prev => prev.filter(m => m.id !== (payload.old as any).id));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [config?.id, connected, selectedContact]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens, selectedContact]);

  const fetchMensagens = async () => {
    if (!config) return;
    const { data } = await supabase.from("integracao_agente_mensagens")
      .select("*").eq("config_id", config.id).eq("plataforma", "whatsapp")
      .neq("contato_externo", "__wa_system__")
      .order("created_at", { ascending: false }).limit(500);
    setMensagens((data as Mensagem[]) || []);
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("integracao_agente_mensagens").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir", variant: "destructive" }); return; }
    setMensagens(prev => prev.filter(m => m.id !== id));
    setDeleteDialog(null);
  };

  const toggleStar = (id: string) => {
    setStarredMessages(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); toast({ title: "Desmarcado ⭐" }); }
      else { next.add(id); toast({ title: "Marcado com estrela ⭐" }); }
      return next;
    });
  };

  /* ── Contacts (memoized) ── */
  const contacts = useMemo(() => {
    const map = new Map<string, { contato: string; lastMsg: Mensagem; unread: number; nome?: string }>();
    mensagens
      .filter(m => m.contato_externo !== "__wa_system__")
      .forEach(m => {
        const key = m.contato_externo || "desconhecido";
        if (!map.has(key)) {
          map.set(key, { contato: key, lastMsg: m, unread: m.direcao === "recebida" ? 1 : 0,
            nome: m.conteudo?.nome || m.conteudo?.dados?.nome });
        } else {
          const c = map.get(key)!;
          if (m.direcao === "recebida") c.unread++;
          if (!c.nome) c.nome = m.conteudo?.nome || m.conteudo?.dados?.nome;
        }
      });
    let arr = Array.from(map.values());
    if (searchTerm) arr = arr.filter(c => c.contato.includes(searchTerm) || c.nome?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (filterUnread) arr = arr.filter(c => c.unread > 0);
    return arr;
  }, [mensagens, searchTerm, filterUnread]);

  const chatMessages = useMemo(() => {
    if (!selectedContact) return [];
    let msgs = mensagens.filter(m => (m.contato_externo || "desconhecido") === selectedContact).reverse();
    if (chatSearch) msgs = msgs.filter(m => getMsgText(m).toLowerCase().includes(chatSearch.toLowerCase()));
    return msgs;
  }, [mensagens, selectedContact, chatSearch]);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Mensagem[] }[] = [];
    let curDate = "";
    chatMessages.forEach(msg => {
      const d = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (d !== curDate) { curDate = d; groups.push({ date: d, messages: [msg] }); }
      else groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [chatMessages]);

  const formatDateLabel = (ds: string) => {
    const d = new Date(ds);
    if (isToday(d)) return "HOJE";
    if (isYesterday(d)) return "ONTEM";
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  };

  /* ── Drag & Drop images ── */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault(); dragCountRef.current++;
    if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault(); dragCountRef.current--;
    if (dragCountRef.current === 0) setIsDragging(false);
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false); dragCountRef.current = 0;
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length || !selectedContact || !config || !instanceName) return;
    setUploadingImage(true);
    for (const file of files) {
      const fileName = `whatsapp-img/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("agent-uploads").upload(fileName, file, { contentType: file.type });
      if (uploadError) continue;
      const { data: urlData } = supabase.storage.from("agent-uploads").getPublicUrl(fileName);
      await supabase.functions.invoke("integracao-enviar", {
        body: { config_id: config.id, endpoint: `/message/sendMedia/${instanceName}`, method: "POST",
          body: { number: selectedContact.replace(/\D/g, ""), mediatype: "image", media: urlData.publicUrl },
          plataforma: "whatsapp", contato_externo: selectedContact },
      });
    }
    setUploadingImage(false);
    toast({ title: "📷 Imagem enviada!" });
  };

  const getMediaPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.media && (msg.tipo === "image" || c?.mediatype === "image"))
      return <img src={c.media} alt="media" className="max-w-[220px] rounded-lg mb-1" />;
    if (c?.media && (msg.tipo === "audio" || c?.mediatype === "audio"))
      return <audio controls src={c.media} className="max-w-[220px] mb-1" />;
    if (c?.media && (msg.tipo === "video" || c?.mediatype === "video"))
      return <video controls src={c.media} className="max-w-[220px] rounded-lg mb-1" />;
    return null;
  };

  /* ═══════ RENDERS ═══════ */
  if (loading) return (
    <AppLayout>
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: WA_GREEN }} />
      </div>
    </AppLayout>
  );

  if (!config) return (
    <AppLayout>
      <WhatsAppSetupScreen onConfigSaved={(cfg) => setConfig(cfg)} />
    </AppLayout>
  );

  if (!connected) return (
    <AppLayout>
      <QRScreen
        config={config}
        instanceName={instanceName}
        onInstanceChange={v => setInstanceName(v)}
        onConnected={() => setConnected(true)}
      />
    </AppLayout>
  );

  /* ─── Connected — Full WhatsApp UI ─── */
  const selectedContactData = contacts.find(c => c.contato === selectedContact);

  return (
    <AppLayout>
      <div
        className="flex h-[calc(100vh-4.5rem)] overflow-hidden rounded-xl border shadow-2xl"
        style={{ background: "#fff" }}
      >
        {/* ══════════════ SIDEBAR ══════════════ */}
        <div className="w-[360px] flex flex-col shrink-0 border-r" style={{ background: "#fff" }}>

          {/* Sidebar header */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: WA_HEADER }}>
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10 cursor-pointer">
                <AvatarFallback style={{ backgroundColor: WA_TEAL }} className="text-white text-sm font-semibold">
                  {user?.email?.slice(0, 2).toUpperCase() || "GB"}
                </AvatarFallback>
              </Avatar>
              <div className="ml-1">
                <p className="text-xs font-semibold leading-none" style={{ color: WA_DARK }}>{instanceName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                  <span className="text-[10px]" style={{ color: WA_GREY }}>Conectado</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterUnread(f => !f)}
                className={cn("p-2 rounded-full transition-colors", filterUnread ? "bg-emerald-100 text-emerald-700" : "hover:bg-gray-100 text-gray-500")}
                title="Filtrar não lidos"
              >
                <Filter className="w-4 h-4" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => fetchMensagens()}>Atualizar conversas</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowStarredPanel(true)}>
                    <Star className="w-4 h-4 mr-2" /> Mensagens favoritas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setConnected(false)} className="text-red-500">
                    <LogOut className="w-4 h-4 mr-2" /> Desconectar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Search bar */}
          <div className="px-3 py-2" style={{ backgroundColor: "#fff" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar ou começar nova conversa"
                className="w-full pl-10 pr-4 h-[35px] text-sm rounded-lg border-0 outline-none"
                style={{ backgroundColor: WA_HEADER, color: WA_DARK }}
              />
            </div>
          </div>

          {/* New conversation */}
          <div className="px-3 pb-2 border-b border-[#e9edef]">
            <div className="flex gap-2">
              <input
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Número (55929...)"
                className="flex-1 h-8 text-xs px-3 rounded-lg border border-[#e9edef] outline-none"
                style={{ backgroundColor: WA_HEADER, color: WA_DARK }}
              />
              <button
                onClick={() => { if (numero.trim()) { setSelectedContact(numero.trim()); } }}
                className="h-8 px-3 rounded-lg text-white text-xs flex items-center gap-1"
                style={{ backgroundColor: WA_GREEN }}
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Contact list */}
          <ScrollArea className="flex-1">
            {contacts.length === 0 ? (
              <div className="text-center py-16 px-4">
                <MessageSquare className="w-14 h-14 mx-auto mb-4" style={{ color: "#d1d7db" }} />
                <p className="text-sm" style={{ color: WA_GREY }}>
                  {filterUnread ? "Nenhuma mensagem não lida" : "Nenhuma conversa ainda"}
                </p>
              </div>
            ) : contacts.map(c => {
              const unread = unreadByContact.get(c.contato) ?? 0;
              const isActive = selectedContact === c.contato;
              return (
                <button
                  key={c.contato}
                  onClick={() => {
                    setSelectedContact(c.contato); setNumero(c.contato);
                    setShowChatSearch(false); setChatSearch("");
                    setUnreadByContact(prev => { const n = new Map(prev); n.delete(c.contato); return n; });
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left transition-colors"
                  style={{ backgroundColor: isActive ? WA_HEADER : "transparent" }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f6f6"; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback style={{ backgroundColor: avatarColor(c.contato) }} className="text-white text-sm font-bold">
                      {getInitials(c.nome || c.contato)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 border-b border-[#e9edef] pb-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[17px] font-normal truncate" style={{ color: WA_DARK }}>
                        {c.nome || c.contato}
                      </span>
                      <span className="text-[12px] shrink-0 ml-2" style={{ color: unread > 0 ? "#25d366" : WA_GREY }}>
                        {format(new Date(c.lastMsg.created_at), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[14px] truncate pr-2" style={{ color: WA_GREY }}>
                        {c.lastMsg.direcao === "enviada" && <CheckCheck className="w-4 h-3 inline mr-0.5" style={{ color: "#53bdeb" }} />}
                        {c.lastMsg.conteudo?.auto_reply && "🤖 "}
                        {getMsgText(c.lastMsg)}
                      </p>
                      {unread > 0 && selectedContact !== c.contato && (
                        <span className="min-w-[20px] h-[20px] rounded-full text-[11px] font-bold text-white flex items-center justify-center px-1"
                          style={{ backgroundColor: "#25d366" }}>
                          {unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </ScrollArea>
        </div>

        {/* ══════════════ CHAT AREA ══════════════ */}
        <div className="flex-1 flex flex-col" style={{ backgroundColor: WA_BG }}>
          {!selectedContact ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-4" style={{ backgroundColor: WA_HEADER }}>
              <div className="w-[240px] h-[240px] rounded-full flex items-center justify-center" style={{ backgroundColor: "#d1d7db" }}>
                <MessageSquare className="w-28 h-28 text-white" />
              </div>
              <h2 className="text-[32px] font-light" style={{ color: "#41525d" }}>Gestor WhatsApp</h2>
              <p className="text-[14px] text-center max-w-xs leading-6" style={{ color: WA_GREY }}>
                Selecione uma conversa para começar.<br />
                Envie e receba mensagens dos eleitores em tempo real.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: "#8696a0" }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#25d366" }} />
                Instância: {instanceName}
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-[10px] border-b" style={{ backgroundColor: WA_HEADER }}>
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowInfo(!showInfo)}>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback style={{ backgroundColor: avatarColor(selectedContact) }} className="text-white font-bold text-sm">
                      {getInitials(selectedContactData?.nome || selectedContact)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[16px] font-normal" style={{ color: WA_DARK }}>
                      {selectedContactData?.nome || selectedContact}
                    </p>
                    <p className="text-[13px]" style={{ color: WA_GREY }}>
                      {chatMessages.length} mensagens
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setShowChatSearch(!showChatSearch); setChatSearch(""); }}
                    className="p-2 rounded-full hover:bg-gray-200/60 transition-colors"
                    style={{ color: "#54656f" }}
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-full hover:bg-gray-200/60 transition-colors" style={{ color: "#54656f" }}>
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setShowInfo(!showInfo)}>
                        <Info className="w-4 h-4 mr-2" /> Dados do contato
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowChatSearch(true)}>
                        <Search className="w-4 h-4 mr-2" /> Pesquisar na conversa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowStarredPanel(!showStarredPanel)}>
                        <Star className="w-4 h-4 mr-2" /> Mensagens favoritas
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setSelectedContact(null)}>Fechar conversa</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Chat search */}
              {showChatSearch && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white border-b">
                  <Search className="w-4 h-4 text-gray-400 shrink-0" />
                  <input value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                    placeholder="Pesquisar mensagens..."
                    className="flex-1 h-8 text-sm border-0 outline-none bg-transparent"
                    autoFocus />
                  <button onClick={() => { setShowChatSearch(false); setChatSearch(""); }}
                    className="p-1 rounded hover:bg-gray-100">
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}

              <div className="flex flex-1 overflow-hidden">
                {/* Messages */}
                <div
                  className="flex-1 flex flex-col relative"
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleDrop}
                >
                  {isDragging && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-white/90 shadow-xl">
                        <Upload className="w-12 h-12" style={{ color: WA_GREEN }} />
                        <p className="text-lg font-medium">Solte a imagem aqui</p>
                      </div>
                    </div>
                  )}
                  {uploadingImage && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                      <div className="flex items-center gap-3 p-6 rounded-2xl bg-white/90">
                        <Loader2 className="w-6 h-6 animate-spin" style={{ color: WA_GREEN }} />
                        <span className="text-sm font-medium">Enviando imagem...</span>
                      </div>
                    </div>
                  )}

                  <ScrollArea className="flex-1" ref={scrollContainerRef}>
                    <div className="px-[7%] py-4 space-y-0.5 min-h-full"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d5dbd4' fill-opacity='0.15'%3E%3Cpath d='M20 20h1v1h-1zM40 40h1v1h-1zM60 60h1v1h-1zM10 50h1v1h-1zM50 10h1v1h-1zM30 70h1v1h-1zM70 30h1v1h-1z'/%3E%3C/g%3E%3C/svg%3E")`,
                      }}>
                      {groupedMessages.map(group => (
                        <div key={group.date}>
                          <div className="flex justify-center my-3">
                            <span className="text-[12.5px] px-3 py-[6px] rounded-[7.5px] font-normal"
                              style={{ backgroundColor: "#ffffff", color: "#54656f", boxShadow: "0 1px 0.5px rgba(11,20,26,.13)" }}>
                              {formatDateLabel(group.date)}
                            </span>
                          </div>
                          {group.messages.map(msg => {
                            const isSent = msg.direcao === "enviada";
                            const msgText = getMsgText(msg);
                            const isStarred = starredMessages.has(msg.id);
                            return (
                              <div key={msg.id}
                                className={cn("flex mb-[2px] group/msg relative", isSent ? "justify-end" : "justify-start")}>
                                <div
                                  className={cn("max-w-[65%] rounded-[7.5px] px-[9px] py-[6px] relative", isSent ? "rounded-tr-none" : "rounded-tl-none")}
                                  style={{ backgroundColor: isSent ? WA_SENT : "#ffffff", boxShadow: "0 1px 0.5px rgba(11,20,26,.13)" }}
                                >
                                  {/* Tail */}
                                  <div className={cn("absolute top-0 w-[8px] h-[13px]", isSent ? "-right-[8px]" : "-left-[8px]")}
                                    style={{ borderTop: `6px solid ${isSent ? WA_SENT : "#ffffff"}`, ...(isSent ? { borderRight: "8px solid transparent" } : { borderLeft: "8px solid transparent" }) }} />

                                  {/* Msg menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="absolute top-1 right-1 p-0.5 rounded opacity-0 group-hover/msg:opacity-100 transition-opacity hover:bg-black/5 z-10">
                                        <ChevronDown className="w-4 h-4" style={{ color: "#8696a0" }} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align={isSent ? "end" : "start"} className="w-48">
                                      <DropdownMenuItem onClick={() => setReplyingTo({ id: msg.id, text: msgText, sender: isSent ? "Você" : msg.contato_externo })}>
                                        <Reply className="w-4 h-4 mr-2" /> Responder
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(msgText); toast({ title: "Copiado 📋" }); }}>
                                        <Copy className="w-4 h-4 mr-2" /> Copiar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => toggleStar(msg.id)}>
                                        <Star className={cn("w-4 h-4 mr-2", isStarred && "fill-yellow-400 text-yellow-400")} />
                                        {isStarred ? "Desmarcar" : "Marcar com estrela"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(msgText); toast({ title: "Pronto para encaminhar 📨" }); }}>
                                        <Forward className="w-4 h-4 mr-2" /> Encaminhar
                                      </DropdownMenuItem>
                                      {isSent && (
                                        <>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => setEditingMessage({ id: msg.id, text: msgText })}>
                                            <Pencil className="w-4 h-4 mr-2" /> Editar
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialog({ id: msg.id, text: msgText })}>
                                        <Trash2 className="w-4 h-4 mr-2" /> Apagar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  {/* Reply preview */}
                                  {msg.conteudo?.quotedMsgId && (
                                    <div className="rounded px-2 py-1 mb-1 border-l-4 text-[12px]"
                                      style={{ backgroundColor: isSent ? "#c8edbf" : "#f0f0f0", borderColor: WA_GREEN }}>
                                      <p className="truncate" style={{ color: WA_GREY }}>{msg.conteudo.quotedMsgId}</p>
                                    </div>
                                  )}

                                  {msg.conteudo?.auto_reply && (
                                    <span className="text-[11px] font-semibold block mb-0.5" style={{ color: WA_GREEN }}>🤖 IA do Gestor</span>
                                  )}
                                  {!isSent && msg.conteudo?.nome && (
                                    <span className="text-[12.5px] font-medium block mb-0.5" style={{ color: avatarColor(msg.contato_externo) }}>
                                      {msg.conteudo.nome}
                                    </span>
                                  )}
                                  {isStarred && <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 inline mr-1" />}
                                  {getMediaPreview(msg)}
                                  <p className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words pr-[58px]">{msgText}</p>
                                  {msg.conteudo?.edited && (
                                    <span className="text-[11px] italic mr-1" style={{ color: WA_GREY }}>editada</span>
                                  )}
                                  {msg.erro && (
                                    <p className="text-[11px] text-destructive mt-1 truncate max-w-[250px]">
                                      ❌ {(() => {
                                        try { const p = JSON.parse(msg.erro); return p.response?.message || p.error || p.message || "Erro ao enviar"; }
                                        catch { return msg.erro.length > 60 ? msg.erro.slice(0, 60) + "…" : msg.erro; }
                                      })()}
                                    </p>
                                  )}
                                  <span className="float-right text-[11px] -mb-[5px] ml-[4px] mt-[3px] flex items-center gap-[3px]" style={{ color: WA_GREY }}>
                                    {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                                    {isSent && (
                                      msg.status === "enviada" || msg.status === "processada"
                                        ? <CheckCheck className="w-[18px] h-[13px]" style={{ color: "#53bdeb" }} />
                                        : msg.status === "erro"
                                          ? <AlertCircle className="w-[13px] h-[13px] text-destructive" />
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
                  <button
                    className="absolute bottom-4 right-6 h-10 w-10 rounded-full shadow-lg bg-white hover:bg-gray-50 flex items-center justify-center z-10"
                    onClick={() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <ArrowDown className="w-5 h-5" style={{ color: "#54656f" }} />
                  </button>
                </div>

                {showInfo && <ContactInfoPanel contato={selectedContact} onClose={() => setShowInfo(false)} />}
                {showStarredPanel && (
                  <StarredMessagesPanel
                    messages={mensagens}
                    starredIds={starredMessages}
                    onClose={() => setShowStarredPanel(false)}
                    onNavigate={(contact) => { setSelectedContact(contact); setNumero(contact); setShowStarredPanel(false); }}
                    onUnstar={toggleStar}
                  />
                )}
              </div>

              {/* Input bar */}
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

      {/* Delete dialog */}
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
              <Trash2 className="w-4 h-4 mr-1" /> Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default WhatsApp;
