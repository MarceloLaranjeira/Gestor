import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  Database,
  Download,
  Edit2,
  Flag,
  Gavel,
  Hash,
  Headphones,
  Loader2,
  Lock,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Shield,
  Trash2,
  Users,
  UsersRound,
  Wallet,
  X,
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
import {
  DISPONIBILIDADE_BADGE_CLASS,
  DISPONIBILIDADE_LABEL,
  normalizeDisponibilidadeMensagem,
  normalizeDisponibilidadeStatus,
  type DisponibilidadeStatus,
} from "@/lib/userAvailability";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ChatSala {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  grupo: string;
  icone: string;
  cor: string;
  participantes: string[] | null;
  slug: string | null;
  coordenadoria_slug: string | null;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface ChatMensagem {
  id: string;
  sala_id: string;
  user_id: string;
  conteudo: string;
  tipo: string;
  created_at: string;
  updated_at: string;
  editada: boolean;
  editada_em: string | null;
  excluida: boolean;
  excluida_em: string | null;
  profile?: { nome: string } | null;
}

interface ChatMensagemAnexo {
  id: string;
  mensagem_id: string;
  nome_arquivo: string;
  tipo_arquivo: string;
  storage_bucket: string;
  storage_path: string;
  tamanho_bytes: number | null;
  created_at: string;
  user_id: string;
}

interface Membro {
  user_id: string;
  nome: string;
  cargo?: string | null;
  disponibilidade_mensagem: string;
  disponibilidade_status: DisponibilidadeStatus;
}

const CHAT_ACCEPTED_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".xlsx",
  ".xls",
  ".csv",
  ".xml",
  ".html",
  ".htm",
  ".doc",
  ".docx",
  ".txt",
  ".zip",
];

const CHAT_ACCEPT = CHAT_ACCEPTED_EXTENSIONS.join(",");

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageSquare,
  Users,
  Flag,
  AlertTriangle,
  Wallet,
  Hash,
  MessageCircle,
  Shield,
  Building2,
  Database,
  UsersRound,
  Gavel,
  Headphones,
};

const GROUP_LABELS: Record<string, string> = {
  geral: "Canais Gerais",
  extra: "Canais Extras",
  coordenadoria: "Coordenadorias",
  privado: "Mensagens Diretas",
};

const formatBytes = (bytes?: number | null) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");

const isAllowedFile = (file: File) => {
  const lower = file.name.toLowerCase();
  return CHAT_ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

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

const RoomIcon = ({ icone, className }: { icone: string; className?: string }) => {
  const Icon = ICON_MAP[icone] || Hash;
  return <Icon className={className} />;
};

const Avatar = ({ name, isOwn }: { name: string; isOwn: boolean }) => (
  <div
    className={cn(
      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
      isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
    )}
  >
    {name?.charAt(0)?.toUpperCase() || "?"}
  </div>
);

const SalaItem = ({
  sala,
  isActive,
  unread,
  onClick,
  isPrivate,
  otherName,
  availabilityMessage,
  availabilityStatus,
}: {
  sala: ChatSala;
  isActive: boolean;
  unread: number;
  onClick: () => void;
  isPrivate?: boolean;
  otherName?: string;
  availabilityMessage?: string;
  availabilityStatus?: DisponibilidadeStatus;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150",
      isActive ? "bg-primary/10 text-primary font-semibold" : "text-foreground/70 hover:bg-muted/60 hover:text-foreground",
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
      {isPrivate && availabilityStatus ? (
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${DISPONIBILIDADE_BADGE_CLASS[availabilityStatus]}`}>
            {DISPONIBILIDADE_LABEL[availabilityStatus]}
          </span>
          {availabilityStatus === "indisponivel" && availabilityMessage ? (
            <p className="text-[10px] text-muted-foreground truncate">{availabilityMessage}</p>
          ) : null}
        </div>
      ) : null}
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

const MemberSearchModal = ({
  membros,
  currentUserId,
  onSelect,
  onClose,
}: {
  membros: Membro[];
  currentUserId: string;
  onSelect: (membro: Membro) => void;
  onClose: () => void;
}) => {
  const [search, setSearch] = useState("");
  const filtered = membros.filter(
    (membro) =>
      membro.user_id !== currentUserId &&
      membro.nome.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-border max-h-[85vh]"
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar membro..."
              className="pl-9 text-sm"
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhum membro encontrado</p>
          ) : (
            filtered.map((membro) => (
              <button
                key={membro.user_id}
                onClick={() => onSelect(membro)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {membro.nome.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{membro.nome}</p>
                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${DISPONIBILIDADE_BADGE_CLASS[membro.disponibilidade_status]}`}>
                      {DISPONIBILIDADE_LABEL[membro.disponibilidade_status]}
                    </span>
                  </div>
                  {membro.cargo && <p className="text-xs text-muted-foreground">{membro.cargo}</p>}
                  {membro.disponibilidade_status === "indisponivel" && membro.disponibilidade_mensagem ? (
                    <p className="text-[11px] text-muted-foreground">{membro.disponibilidade_mensagem}</p>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

const MessageSkeleton = () => (
  <div className="space-y-4 p-4">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className={cn("flex gap-2", item % 2 === 0 ? "flex-row-reverse" : "flex-row")}>
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="space-y-1 max-w-[60%]">
          <div className="h-4 bg-muted animate-pulse rounded w-20" />
          <div className={cn("h-10 bg-muted animate-pulse rounded-2xl", item % 2 === 0 ? "w-48" : "w-64")} />
        </div>
      </div>
    ))}
  </div>
);

const WebChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isGestor = user?.role === "Gestor";

  const [salas, setSalas] = useState<ChatSala[]>([]);
  const [salasLoading, setSalasLoading] = useState(true);
  const [selectedSala, setSelectedSala] = useState<ChatSala | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const [mensagens, setMensagens] = useState<ChatMensagem[]>([]);
  const [mensagensLoading, setMensagensLoading] = useState(false);
  const [attachmentsByMessage, setAttachmentsByMessage] = useState<Record<string, ChatMensagemAnexo[]>>({});

  const [texto, setTexto] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState<Record<string, number>>({});

  const [membros, setMembros] = useState<Membro[]>([]);
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [profileCache, setProfileCache] = useState<Record<string, string>>({});

  const [editingMessage, setEditingMessage] = useState<ChatMensagem | null>(null);
  const [editingText, setEditingText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChatMensagem | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, []);

  const fetchProfiles = useCallback(async (userIds: string[]) => {
    const missing = userIds.filter((id) => !profileCache[id]);
    if (missing.length === 0) return profileCache;

    const { data } = await supabase
      .from("profiles")
      .select("user_id, nome")
      .in("user_id", missing);

    const next = { ...profileCache };
    ((data as Array<{ user_id: string; nome: string }>) || []).forEach((profile) => {
      next[profile.user_id] = profile.nome;
    });
    setProfileCache(next);
    return next;
  }, [profileCache]);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("user_id, nome, cargo, disponibilidade_status, disponibilidade_mensagem")
      .order("nome");
    setMembros(((data as Array<Membro & { disponibilidade_status?: string | null; disponibilidade_mensagem?: string | null }>) || []).map((member) => ({
      ...member,
      disponibilidade_status: normalizeDisponibilidadeStatus(member.disponibilidade_status),
      disponibilidade_mensagem: normalizeDisponibilidadeMensagem(member.disponibilidade_mensagem),
    })));
  }, []);

  const loadSalas = useCallback(async () => {
    if (!user?.user_id) return;
    setSalasLoading(true);
    const { data, error } = await supabase
      .from("chat_salas")
      .select("*")
      .eq("ativo", true)
      .order("grupo", { ascending: true })
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (!error && data) {
      const visible = (data as ChatSala[]).filter(
        (sala) => sala.tipo !== "privado" || (sala.participantes && sala.participantes.includes(user.user_id)),
      );
      setSalas(visible);
      setSelectedSala((current) => visible.find((sala) => sala.id === current?.id) || visible[0] || null);
    }
    setSalasLoading(false);
  }, [user?.user_id]);

  const loadMensagens = useCallback(async (salaId: string) => {
    setMensagensLoading(true);
    setMensagens([]);

    const { data: msgRows, error } = await supabase
      .from("chat_mensagens")
      .select("*")
      .eq("sala_id", salaId)
      .eq("excluida", false)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error || !msgRows) {
      setMensagensLoading(false);
      return;
    }

    const messages = (msgRows as ChatMensagem[]) || [];
    const names = await fetchProfiles([...new Set(messages.map((message) => message.user_id))]);
    const enriched = messages.map((message) => ({
      ...message,
      profile: { nome: names[message.user_id] || "Usuário" },
    }));

    const ids = enriched.map((message) => message.id);
    let attachmentsMap: Record<string, ChatMensagemAnexo[]> = {};
    if (ids.length > 0) {
      const { data: attachmentRows } = await supabase
        .from("chat_mensagem_anexos")
        .select("*")
        .in("mensagem_id", ids)
        .order("created_at", { ascending: true });

      attachmentsMap = ((attachmentRows as ChatMensagemAnexo[]) || []).reduce<Record<string, ChatMensagemAnexo[]>>((acc, attachment) => {
        if (!acc[attachment.mensagem_id]) acc[attachment.mensagem_id] = [];
        acc[attachment.mensagem_id].push(attachment);
        return acc;
      }, {});
    }

    setMensagens(enriched);
    setAttachmentsByMessage(attachmentsMap);
    setUnread((current) => ({ ...current, [salaId]: 0 }));
    setMensagensLoading(false);
  }, [fetchProfiles]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    void loadSalas();
  }, [loadSalas]);

  useEffect(() => {
    if (selectedSala?.id) {
      void loadMensagens(selectedSala.id);
    }
  }, [loadMensagens, selectedSala?.id]);

  useEffect(() => {
    if (!mensagensLoading) setTimeout(() => scrollToBottom(false), 50);
  }, [mensagensLoading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [mensagens.length, scrollToBottom]);

  useEffect(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel("webchat-expanded")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_mensagens" }, (payload) => {
        const message = (payload.new || payload.old) as ChatMensagem | undefined;
        if (!message) return;

        if (selectedSala?.id && message.sala_id === selectedSala.id) {
          void loadMensagens(selectedSala.id);
        } else if (payload.eventType === "INSERT" && message.user_id !== user?.user_id) {
          setUnread((current) => ({ ...current, [message.sala_id]: (current[message.sala_id] || 0) + 1 }));
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_salas" }, () => {
        void loadSalas();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_mensagem_anexos" }, () => {
        if (selectedSala?.id) void loadMensagens(selectedSala.id);
      })
      .subscribe();

    subscriptionRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadMensagens, loadSalas, selectedSala?.id, user?.user_id]);

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const invalid = files.find((file) => !isAllowedFile(file));

    if (invalid) {
      toast({
        title: "Arquivo não permitido",
        description: `Use formatos como ${CHAT_ACCEPTED_EXTENSIONS.join(", ")}`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setPendingFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const removePendingFile = (name: string) => {
    setPendingFiles((current) => current.filter((file) => file.name !== name));
  };

  const uploadAttachments = useCallback(async (messageId: string, files: File[]) => {
    if (!user?.user_id || !selectedSala) return;

    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const storagePath = `chat/${selectedSala.id}/${messageId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("chat-anexos")
        .upload(storagePath, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("chat_mensagem_anexos").insert({
        mensagem_id: messageId,
        user_id: user.user_id,
        nome_arquivo: file.name,
        tipo_arquivo: file.type || "application/octet-stream",
        storage_bucket: "chat-anexos",
        storage_path: storagePath,
        tamanho_bytes: file.size,
      });
      if (insertError) throw insertError;
    }
  }, [selectedSala, user?.user_id]);

  const handleSend = useCallback(async () => {
    const content = texto.trim();
    if ((!content && pendingFiles.length === 0) || !selectedSala || !user || sending) return;

    setSending(true);
    const queuedFiles = [...pendingFiles];
    setTexto("");
    setPendingFiles([]);

    try {
      const { data, error } = await supabase
        .from("chat_mensagens")
        .insert({
          sala_id: selectedSala.id,
          user_id: user.user_id,
          conteudo: content,
          tipo: "texto",
        })
        .select("id")
        .single();

      if (error || !data) throw error || new Error("Não foi possível criar a mensagem.");
      await uploadAttachments((data as { id: string }).id, queuedFiles);
      textareaRef.current?.focus();
      await loadMensagens(selectedSala.id);
    } catch (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
      setTexto(content);
      setPendingFiles(queuedFiles);
    } finally {
      setSending(false);
    }
  }, [loadMensagens, pendingFiles, selectedSala, sending, texto, toast, uploadAttachments, user]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const getDMName = useCallback((sala: ChatSala) => {
    if (!user || !sala.participantes) return sala.nome;
    const otherId = sala.participantes.find((id) => id !== user.user_id);
    if (!otherId) return sala.nome;
    return membros.find((member) => member.user_id === otherId)?.nome || profileCache[otherId] || "Usuário";
  }, [membros, profileCache, user]);

  const membrosById = useMemo(
    () => membros.reduce<Record<string, Membro>>((acc, membro) => {
      acc[membro.user_id] = membro;
      return acc;
    }, {}),
    [membros],
  );

  const getDMMember = useCallback((sala: ChatSala) => {
    if (!user || !sala.participantes) return null;
    const otherId = sala.participantes.find((id) => id !== user.user_id);
    if (!otherId) return null;
    return membrosById[otherId] || null;
  }, [membrosById, user]);

  const handleOpenDM = async (membro: Membro) => {
    setShowMemberSearch(false);
    if (!user) return;

    const participants = [user.user_id, membro.user_id].sort();
    const existing = salas.find(
      (sala) =>
        sala.tipo === "privado" &&
        JSON.stringify([...(sala.participantes || [])].sort()) === JSON.stringify(participants),
    );

    if (existing) {
      setSelectedSala(existing);
      if (isMobile) setShowSidebar(false);
      return;
    }

    const slug = `dm-${participants.map((id) => id.slice(0, 8)).join("-")}`;
    const { data, error } = await supabase
      .from("chat_salas")
      .insert({
        nome: `DM: ${membro.nome}`,
        descricao: "",
        tipo: "privado",
        grupo: "privado",
        slug,
        icone: "MessageCircle",
        cor: "bg-primary/10 text-primary",
        created_by: user.user_id,
        participantes: participants,
        ordem: 1000,
      })
      .select("*")
      .single();

    if (error || !data) {
      toast({ title: "Erro ao abrir conversa", description: error?.message, variant: "destructive" });
      return;
    }

    const room = data as ChatSala;
    setSalas((current) => [...current, room]);
    setSelectedSala(room);
    if (isMobile) setShowSidebar(false);
  };

  const canManageMessage = (message: ChatMensagem) => {
    if (!user || message.tipo === "sistema") return { edit: false, remove: false };
    const own = message.user_id === user.user_id;
    return {
      edit: own,
      remove: own || isGestor,
    };
  };

  const handleDownloadAttachment = async (attachment: ChatMensagemAnexo) => {
    const { data, error } = await supabase.storage
      .from(attachment.storage_bucket || "chat-anexos")
      .download(attachment.storage_path);

    if (error || !data) {
      toast({ title: "Erro ao baixar anexo", variant: "destructive" });
      return;
    }

    const url = URL.createObjectURL(data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = attachment.nome_arquivo;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const openEditDialog = (message: ChatMensagem) => {
    setEditingMessage(message);
    setEditingText(message.conteudo);
  };

  const saveEdition = async () => {
    if (!editingMessage || !selectedSala) return;
    const hasAttachments = (attachmentsByMessage[editingMessage.id] || []).length > 0;
    if (!editingText.trim() && !hasAttachments) {
      toast({ title: "Adicione texto ou mantenha um anexo", variant: "destructive" });
      return;
    }

    setSavingEdit(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("chat_mensagens")
        .update({
          conteudo: editingText.trim(),
          editada: true,
          editada_em: now,
          updated_at: now,
        })
        .eq("id", editingMessage.id);

      if (error) throw error;
      setEditingMessage(null);
      setEditingText("");
      await loadMensagens(selectedSala.id);
    } catch (error) {
      toast({
        title: "Erro ao editar mensagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteMessage = async () => {
    if (!deleteTarget || !selectedSala) return;
    setDeletingMessage(true);
    try {
      const attachments = attachmentsByMessage[deleteTarget.id] || [];
      if (attachments.length > 0) {
        await supabase.storage
          .from("chat-anexos")
          .remove(attachments.map((attachment) => attachment.storage_path));
        await supabase.from("chat_mensagem_anexos").delete().eq("mensagem_id", deleteTarget.id);
      }

      const now = new Date().toISOString();
      const { error } = await supabase
        .from("chat_mensagens")
        .update({
          conteudo: "",
          excluida: true,
          excluida_em: now,
          updated_at: now,
        })
        .eq("id", deleteTarget.id);

      if (error) throw error;
      setDeleteTarget(null);
      toast({ title: "Mensagem removida" });
      await loadMensagens(selectedSala.id);
    } catch (error) {
      toast({
        title: "Erro ao remover mensagem",
        description: error instanceof Error ? error.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setDeletingMessage(false);
    }
  };

  const groupedRooms = useMemo(() => ({
    geral: salas.filter((sala) => sala.grupo === "geral"),
    extra: salas.filter((sala) => sala.grupo === "extra"),
    coordenadoria: salas.filter((sala) => sala.grupo === "coordenadoria"),
    privado: salas.filter((sala) => sala.grupo === "privado" || sala.tipo === "privado"),
  }), [salas]);

  return (
    <AppLayout>
      <div className="flex h-[calc(100dvh-5rem)] sm:h-[calc(100vh-5rem)] overflow-hidden rounded-xl">
        <div
          className={cn(
            "shrink-0 border-r border-border flex flex-col glass-card overflow-hidden transition-all duration-200",
            isMobile ? (showSidebar ? "w-full rounded-xl" : "w-0 hidden") : "w-[280px] rounded-l-xl",
          )}
        >
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-bold text-foreground">WebChat</h2>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Canais, coordenadorias e mensagens diretas</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setShowMemberSearch(true)}>
                <Plus className="w-3.5 h-3.5" />
                DM
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
            {salasLoading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-10 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              (Object.entries(groupedRooms) as Array<[keyof typeof groupedRooms, ChatSala[]]>).map(([group, rooms]) => {
                if (rooms.length === 0) return null;
                return (
                  <div key={group} className="space-y-1">
                    <div className="flex items-center justify-between px-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 select-none">
                        {GROUP_LABELS[group]}
                      </p>
                      {group === "privado" && (
                        <button
                          onClick={() => setShowMemberSearch(true)}
                          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          title="Nova mensagem direta"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {rooms.map((sala) => (
                      <SalaItem
                        key={sala.id}
                        sala={sala}
                        isActive={selectedSala?.id === sala.id}
                        unread={unread[sala.id] || 0}
                        isPrivate={group === "privado"}
                        otherName={group === "privado" ? getDMName(sala) : undefined}
                        availabilityStatus={group === "privado" ? getDMMember(sala)?.disponibilidade_status : undefined}
                        availabilityMessage={group === "privado" ? getDMMember(sala)?.disponibilidade_mensagem : undefined}
                        onClick={() => {
                          setSelectedSala(sala);
                          setUnread((current) => ({ ...current, [sala.id]: 0 }));
                          if (isMobile) setShowSidebar(false);
                        }}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex-1 flex flex-col overflow-hidden glass-card",
            isMobile ? (showSidebar ? "hidden" : "w-full rounded-xl") : "rounded-r-xl",
          )}
        >
          {selectedSala ? (
            <>
              {(() => {
                const dmMember = selectedSala.tipo === "privado" ? getDMMember(selectedSala) : null;
                return (
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
                    {selectedSala.tipo === "privado" && <Lock className="w-3 h-3 text-muted-foreground" />}
                    {dmMember && (
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${DISPONIBILIDADE_BADGE_CLASS[dmMember.disponibilidade_status]}`}>
                        {DISPONIBILIDADE_LABEL[dmMember.disponibilidade_status]}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedSala.tipo === "privado"
                      ? "Conversa direta"
                      : selectedSala.descricao || "Canal interno do gabinete"}
                  </p>
                  {dmMember?.disponibilidade_status === "indisponivel" && dmMember.disponibilidade_mensagem ? (
                    <p className="text-[11px] text-muted-foreground mt-1">{dmMember.disponibilidade_mensagem}</p>
                  ) : null}
                </div>
              </div>
                );
              })()}

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
                            <p className="text-sm font-semibold text-foreground">Bem-vindo ao {selectedSala.nome}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {selectedSala.descricao || "Nenhuma mensagem ainda. Seja o primeiro a enviar."}
                            </p>
                          </div>
                        </>
                      )}
                    </motion.div>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    <AnimatePresence initial={false}>
                      {mensagens.map((message, index) => {
                        const isOwn = message.user_id === user?.user_id;
                        const prev = index > 0 ? mensagens[index - 1] : null;
                        const showName = !prev || prev.user_id !== message.user_id;
                        const can = canManageMessage(message);
                        const attachments = attachmentsByMessage[message.id] || [];
                        const author = message.profile?.nome || "Usuário";
                        const authorMember = membrosById[message.user_id];

                        if (message.tipo === "sistema") {
                          return (
                            <div key={message.id} className="flex justify-center my-2">
                              <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{message.conteudo}</span>
                            </div>
                          );
                        }

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn("flex gap-2 group", isOwn ? "flex-row-reverse" : "flex-row")}
                          >
                            {!isOwn && <Avatar name={author} isOwn={false} />}
                            <div className={cn("flex flex-col max-w-[88%] sm:max-w-[78%]", isOwn ? "items-end" : "items-start")}>
                              {showName && !isOwn && (
                                <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                  <span className="text-[11px] font-semibold text-muted-foreground">{author}</span>
                                  {authorMember ? (
                                    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${DISPONIBILIDADE_BADGE_CLASS[authorMember.disponibilidade_status]}`}>
                                      {DISPONIBILIDADE_LABEL[authorMember.disponibilidade_status]}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              <div
                                className={cn(
                                  "rounded-2xl px-3 py-2 shadow-sm",
                                  isOwn ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm",
                                )}
                              >
                                {message.conteudo && (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.conteudo}</p>
                                )}
                                {attachments.length > 0 && (
                                  <div className={cn("space-y-1.5", message.conteudo ? "mt-2" : "")}>
                                    {attachments.map((attachment) => (
                                      <button
                                        key={attachment.id}
                                        onClick={() => void handleDownloadAttachment(attachment)}
                                        className={cn(
                                          "w-full text-left rounded-lg px-2.5 py-2 border text-xs transition-colors",
                                          isOwn
                                            ? "border-primary-foreground/20 bg-primary-foreground/10 hover:bg-primary-foreground/15 text-primary-foreground"
                                            : "border-border/50 bg-background/70 hover:bg-background text-foreground",
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                          <div className="min-w-0">
                                            <p className="truncate font-medium">{attachment.nome_arquivo}</p>
                                            <p className={cn("text-[10px]", isOwn ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                              {formatBytes(attachment.tamanho_bytes)}
                                            </p>
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-1 px-1 mt-1">
                                <span className="text-[10px] text-muted-foreground">{relativeTime(message.created_at)}</span>
                                {message.editada && (
                                  <span className="text-[10px] text-muted-foreground/80">· editada</span>
                                )}
                              </div>
                            </div>
                            {isOwn && <Avatar name={author} isOwn />}
                            {(can.edit || can.remove) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="self-start mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted">
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isOwn ? "end" : "start"}>
                                  {can.edit && (
                                    <DropdownMenuItem onClick={() => openEditDialog(message)}>
                                      <Edit2 className="w-3.5 h-3.5 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                  )}
                                  {can.remove && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(message)}>
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-border shrink-0 space-y-2">
                {pendingFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pendingFiles.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs">
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[180px] truncate">{file.name}</span>
                        <button onClick={() => removePendingFile(file.name)} className="text-muted-foreground hover:text-foreground">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={CHAT_ACCEPT}
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-[42px] w-[42px] shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 relative">
                    <Textarea
                      ref={textareaRef}
                      value={texto}
                      onChange={(event) => setTexto(event.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedSala.tipo === "privado"
                          ? `Mensagem para ${getDMName(selectedSala)}...`
                          : `Mensagem para #${selectedSala.nome}...`
                      }
                      className="resize-none min-h-[42px] max-h-[120px] pr-2 text-sm"
                      rows={1}
                      disabled={sending}
                    />
                  </div>
                  <Button
                    onClick={() => void handleSend()}
                    disabled={(!texto.trim() && pendingFiles.length === 0) || sending}
                    size="sm"
                    className="gradient-primary h-[42px] px-4 shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground px-1">
                  Shift+Enter para nova linha · Enter para enviar · Anexos: {CHAT_ACCEPTED_EXTENSIONS.join(", ")}
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Selecione uma sala</p>
                <p className="text-xs text-muted-foreground mt-1">Escolha um canal ou inicie uma conversa privada</p>
              </div>
            </div>
          )}
        </div>
      </div>

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

      <Dialog open={!!editingMessage} onOpenChange={(open) => !open && setEditingMessage(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar mensagem</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editingText}
            onChange={(event) => setEditingText(event.target.value)}
            rows={5}
            className="text-sm resize-none"
            placeholder="Atualize sua mensagem"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMessage(null)}>Cancelar</Button>
            <Button onClick={() => void saveEdition()} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir mensagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove a mensagem da conversa e apaga os anexos vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteMessage()}
              disabled={deletingMessage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingMessage ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default WebChat;
