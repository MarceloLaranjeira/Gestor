import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Send, Paperclip, Smile, Mic, Loader2, Image, FileText, Video,
  CalendarClock, Languages, SpellCheck, Clock, X, StopCircle,
  Camera, Plus,
} from "lucide-react";

type MessageType = "text" | "image" | "document" | "audio" | "video";

interface ChatInputBarProps {
  config: { id: string; ativo: boolean };
  instanceName: string;
  numero: string;
  onSent: () => void;
  editingMessage?: { id: string; text: string } | null;
  onCancelEdit?: () => void;
  replyingTo?: { id: string; text: string; sender: string } | null;
  onCancelReply?: () => void;
}

const emojiCategories = [
  { name: "😊 Rostos", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🤫","🤔","🫣","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","🫤","😟","🙁","😮","😯","😲","😳","🥺","🥹","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿"] },
  { name: "👋 Gestos", emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","💪","🦾"] },
  { name: "❤️ Corações", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟"] },
  { name: "🌟 Natureza", emojis: ["🌟","⭐","✨","💫","🌈","☀️","🌤️","⛅","🌥️","🌦️","🌧️","⛈️","🌩️","🌊","🌺","🌻","🌹","🌷","🌸","💐","🌾","🍀","🌴","🌳","🐕","🐈","🦅","🐟","🦋","🐝"] },
  { name: "🎉 Objetos", emojis: ["🎉","🎊","🎈","🎁","🎗️","🏆","🥇","🥈","🥉","⚽","🏀","📱","💻","📷","🎬","🎵","🎶","📞","✉️","📊","📌","🔑","💡","🎯","📝","📎","✂️","🗑️","🔒","🔓"] },
  { name: "✅ Símbolos", emojis: ["✅","❌","⚡","💯","🚀","⚠️","🔔","💬","📢","♻️","✨","💎","🔥","💥","💢","💤","💨","🕐","🕑","🕒","🆕","🆗","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪"] },
  { name: "🍕 Comida", emojis: ["🍕","🍔","🍟","🌭","🥪","🌮","🌯","🥗","🍝","🍜","🍲","🍛","🍣","🍱","🥘","🧆","🥚","🍳","🥞","🧇","🍞","☕","🍵","🧃","🥤","🍺","🍷","🥂","🍾","🧁","🍰","🎂","🍩","🍪"] },
  { name: "🏠 Lugares", emojis: ["🏠","🏢","🏥","🏦","🏫","🏛️","⛪","🕌","🕍","🏰","🏯","🗼","🗽","🗻","🏖️","🏝️","🌋","🏕️","🚗","🚕","🚌","🚎","🚐","🚑","🚒","✈️","🚀","🛸"] },
];

const languages = [
  { code: "en", label: "🇺🇸 Inglês" },
  { code: "es", label: "🇪🇸 Espanhol" },
  { code: "fr", label: "🇫🇷 Francês" },
  { code: "de", label: "🇩🇪 Alemão" },
  { code: "it", label: "🇮🇹 Italiano" },
  { code: "pt", label: "🇧🇷 Português" },
  { code: "ja", label: "🇯🇵 Japonês" },
  { code: "zh", label: "🇨🇳 Chinês" },
  { code: "ar", label: "🇸🇦 Árabe" },
  { code: "ru", label: "🇷🇺 Russo" },
  { code: "ko", label: "🇰🇷 Coreano" },
  { code: "hi", label: "🇮🇳 Hindi" },
];

const ChatInputBar = ({ config, instanceName, numero, onSent, editingMessage, onCancelEdit, replyingTo, onCancelReply }: ChatInputBarProps) => {
  const [tipo, setTipo] = useState<MessageType>("text");
  const [mensagem, setMensagem] = useState(editingMessage?.text || "");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [fileName, setFileName] = useState("");
  const [sending, setSending] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [showTranslate, setShowTranslate] = useState(false);
  const [targetLang, setTargetLang] = useState("en");
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync editing message
  const prevEditId = useRef<string | null>(null);
  if (editingMessage && editingMessage.id !== prevEditId.current) {
    prevEditId.current = editingMessage.id;
    setMensagem(editingMessage.text);
  } else if (!editingMessage && prevEditId.current) {
    prevEditId.current = null;
  }

  const currentText = tipo === "text" ? mensagem : caption;

  const canSend = () => {
    if (!numero || !instanceName || !config.ativo) return false;
    if (tipo === "text") return !!mensagem.trim();
    return !!mediaUrl;
  };

  const sendMessage = async (scheduledFor?: string) => {
    if (!canSend()) return;
    setSending(true);
    try {
      // If editing, update existing message
      if (editingMessage) {
        await supabase
          .from("integracao_agente_mensagens")
          .update({
            conteudo: { text: mensagem, edited: true, edited_at: new Date().toISOString() },
          })
          .eq("id", editingMessage.id);
        toast({ title: "Mensagem editada ✏️" });
        setMensagem("");
        onCancelEdit?.();
        onSent();
        setSending(false);
        return;
      }

      const cleanNumber = numero.replace(/\D/g, "");
      const endpoint = tipo === "text"
        ? `/message/sendText/${instanceName}`
        : `/message/sendMedia/${instanceName}`;
      const body = tipo === "text"
        ? { number: cleanNumber, text: mensagem, ...(replyingTo && { quotedMsgId: replyingTo.id }) }
        : {
            number: cleanNumber,
            mediatype: tipo,
            media: mediaUrl,
            ...(caption && { caption }),
            ...(tipo === "document" && fileName && { fileName }),
          };

      if (scheduledFor) {
        await supabase.from("integracao_agente_mensagens").insert({
          config_id: config.id,
          direcao: "enviada",
          tipo: tipo === "text" ? "texto" : tipo,
          conteudo: { ...body, scheduled_for: scheduledFor, endpoint },
          status: "agendada",
          plataforma: "whatsapp",
          contato_externo: numero,
        });
        toast({ title: "Mensagem agendada! 📅", description: `Para ${format(new Date(scheduledFor), "dd/MM/yyyy HH:mm", { locale: ptBR })}` });
      } else {
        const res = await supabase.functions.invoke("integracao-enviar", {
          body: { config_id: config.id, endpoint, method: "POST", body, plataforma: "whatsapp", contato_externo: numero },
        });
        if (res.error) {
          toast({ title: "Erro ao enviar", description: res.error.message, variant: "destructive" });
        } else if (res.data?.success) {
          toast({ title: "Mensagem enviada! ✅" });
        } else {
          toast({ title: "Falha no envio", description: JSON.stringify(res.data?.data || {}).slice(0, 200), variant: "destructive" });
        }
      }

      setMensagem("");
      setMediaUrl("");
      setCaption("");
      setFileName("");
      setShowSchedule(false);
      setScheduleDate(undefined);
      onCancelReply?.();
      onSent();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const handleSend = () => {
    if (showSchedule && scheduleDate) {
      const [h, m] = scheduleTime.split(":");
      const dt = new Date(scheduleDate);
      dt.setHours(parseInt(h), parseInt(m), 0, 0);
      sendMessage(dt.toISOString());
    } else {
      sendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && tipo === "text" && !showSchedule) {
      e.preventDefault();
      handleSend();
    }
  };

  const correctText = async () => {
    const text = tipo === "text" ? mensagem : caption;
    if (!text.trim()) return;
    setCorrecting(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-ai-tools", {
        body: { action: "correct", text },
      });
      if (res.data?.success) {
        if (tipo === "text") setMensagem(res.data.result);
        else setCaption(res.data.result);
        toast({ title: "Texto corrigido! ✨" });
      }
    } catch {}
    setCorrecting(false);
  };

  const translateText = async () => {
    const text = tipo === "text" ? mensagem : caption;
    if (!text.trim()) return;
    setTranslating(true);
    try {
      const res = await supabase.functions.invoke("whatsapp-ai-tools", {
        body: { action: "translate", text, targetLang },
      });
      if (res.data?.success) {
        if (tipo === "text") setMensagem(res.data.result);
        else setCaption(res.data.result);
        toast({ title: "Texto traduzido! 🌐" });
        setShowTranslate(false);
      }
    } catch {}
    setTranslating(false);
  };

  const insertEmoji = (emoji: string) => {
    if (tipo === "text") setMensagem((prev) => prev + emoji);
    else setCaption((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);

        const audioFileName = `audio-${Date.now()}.webm`;
        const { error } = await supabase.storage
          .from("agent-uploads")
          .upload(`whatsapp-audio/${audioFileName}`, blob, { contentType: "audio/webm" });

        if (error) {
          toast({ title: "Erro ao salvar áudio", variant: "destructive" });
          return;
        }

        const { data: urlData } = supabase.storage
          .from("agent-uploads")
          .getPublicUrl(`whatsapp-audio/${audioFileName}`);

        setTipo("audio");
        setMediaUrl(urlData.publicUrl);
        toast({ title: "Áudio gravado! 🎙️" });
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast({ title: "Sem acesso ao microfone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current = null;
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const filteredEmojis = emojiSearch
    ? emojiCategories.flatMap((c) => c.emojis)
    : emojiCategories[selectedEmojiCategory]?.emojis || [];

  return (
    <div style={{ backgroundColor: "#f0f2f5" }}>
      {/* Reply bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 px-4 py-2 mx-4 mt-2 rounded-t-lg border-l-4" style={{ backgroundColor: "#ffffff", borderColor: "#00a884" }}>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: "#00a884" }}>{replyingTo.sender}</p>
            <p className="text-xs text-muted-foreground truncate">{replyingTo.text}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancelReply}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Edit bar */}
      {editingMessage && (
        <div className="flex items-center gap-2 px-4 py-2 mx-4 mt-2 rounded-t-lg border-l-4" style={{ backgroundColor: "#ffffff", borderColor: "#53bdeb" }}>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold" style={{ color: "#53bdeb" }}>✏️ Editando mensagem</p>
            <p className="text-xs text-muted-foreground truncate">{editingMessage.text}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onCancelEdit}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Schedule panel */}
      {showSchedule && (
        <div className="flex items-center gap-2 px-4 py-2 mx-4 mt-2 rounded-lg" style={{ backgroundColor: "#ffffff" }}>
          <Clock className="w-4 h-4 shrink-0" style={{ color: "#00a884" }} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                {scheduleDate ? format(scheduleDate, "dd/MM/yyyy", { locale: ptBR }) : "Data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                disabled={(date) => date < new Date()}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="h-8 w-28 text-xs" />
          {scheduleDate && (
            <span className="text-[10px] font-medium" style={{ color: "#00a884" }}>
              📅 {format(scheduleDate, "dd/MM", { locale: ptBR })} às {scheduleTime}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => { setShowSchedule(false); setScheduleDate(undefined); }}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Emoji panel */}
      {showEmojis && (
        <div className="mx-4 mt-2 rounded-lg overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
          {/* Category tabs */}
          <div className="flex border-b overflow-x-auto px-2 pt-2">
            {emojiCategories.map((cat, i) => (
              <button
                key={cat.name}
                onClick={() => { setSelectedEmojiCategory(i); setEmojiSearch(""); }}
                className={cn(
                  "px-2 py-1 text-lg shrink-0 rounded-t transition-colors",
                  selectedEmojiCategory === i ? "bg-muted" : "hover:bg-muted/50"
                )}
              >
                {cat.emojis[0]}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="px-3 py-2">
            <Input
              placeholder="Pesquisar emoji..."
              value={emojiSearch}
              onChange={(e) => setEmojiSearch(e.target.value)}
              className="h-8 text-xs rounded-lg border-0 bg-muted/50"
            />
          </div>
          {/* Grid */}
          <div className="px-3 pb-3 max-h-[180px] overflow-y-auto">
            {!emojiSearch && (
              <p className="text-[10px] text-muted-foreground font-medium mb-1">
                {emojiCategories[selectedEmojiCategory]?.name}
              </p>
            )}
            <div className="flex flex-wrap gap-0.5">
              {filteredEmojis.map((e, i) => (
                <button key={`${e}-${i}`} onClick={() => insertEmoji(e)} className="text-xl hover:bg-muted rounded p-1 cursor-pointer transition-colors">
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-2 px-4 py-3">
        {recording ? (
          /* Recording UI */
          <div className="flex-1 flex items-center gap-3 h-[48px] rounded-lg px-4" style={{ backgroundColor: "#ffffff" }}>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={cancelRecording}>
              <X className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 flex-1">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-sm font-mono">{formatTime(recordingTime)}</span>
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-destructive rounded-full animate-pulse" style={{ width: `${Math.min((recordingTime / 120) * 100, 100)}%` }} />
              </div>
            </div>
            <Button size="icon" className="h-10 w-10 rounded-full shrink-0" style={{ backgroundColor: "#00a884" }} onClick={stopRecording}>
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        ) : (
          <>
            {/* Emoji toggle */}
            <Button
              variant="ghost" size="icon"
              className={cn("h-[48px] w-10 shrink-0 rounded-full", showEmojis && "text-primary")}
              onClick={() => setShowEmojis(!showEmojis)}
            >
              <Smile className="w-6 h-6 text-muted-foreground" />
            </Button>

            {/* Attach menu */}
            <Popover open={showAttachMenu} onOpenChange={setShowAttachMenu}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-[48px] w-10 shrink-0 rounded-full">
                  <Plus className={cn("w-6 h-6 text-muted-foreground transition-transform", showAttachMenu && "rotate-45")} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start" side="top">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "image" as MessageType, icon: Image, label: "Foto", color: "#7c3aed" },
                    { type: "video" as MessageType, icon: Video, label: "Vídeo", color: "#e11d48" },
                    { type: "document" as MessageType, icon: FileText, label: "Documento", color: "#7c8db5" },
                    { type: "audio" as MessageType, icon: Mic, label: "Áudio", color: "#f59e0b" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      onClick={() => { setTipo(item.type); setShowAttachMenu(false); }}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-muted transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: item.color }}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px]">{item.label}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Text input */}
            <div className="flex-1 rounded-lg overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
              {tipo !== "text" && (
                <div className="flex items-center gap-2 px-3 pt-2">
                  <div className="flex-1 flex gap-2">
                    <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Cole a URL do arquivo..." className="h-8 text-xs border-0 bg-muted/30" />
                    {tipo === "document" && (
                      <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="nome.pdf" className="h-8 text-xs w-28 border-0 bg-muted/30" />
                    )}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setTipo("text"); setMediaUrl(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={tipo === "text" ? mensagem : caption}
                onChange={(e) => {
                  tipo === "text" ? setMensagem(e.target.value) : setCaption(e.target.value);
                  // Auto-resize
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                placeholder={tipo === "text" ? "Digite uma mensagem" : "Legenda (opcional)..."}
                className="w-full px-3 py-3 text-sm outline-none resize-none bg-transparent"
                style={{ minHeight: "24px", maxHeight: "120px" }}
                rows={1}
                onKeyDown={handleKeyDown}
              />
            </div>

            {/* AI tools */}
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 rounded-full"
                onClick={correctText}
                disabled={correcting || !currentText.trim()}
                title="Correção IA"
              >
                {correcting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SpellCheck className="w-3.5 h-3.5 text-muted-foreground" />}
              </Button>
              <Popover open={showTranslate} onOpenChange={setShowTranslate}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" disabled={!currentText.trim()}>
                    <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-3" align="end" side="top">
                  <p className="text-xs font-medium mb-2">Traduzir para:</p>
                  <Select value={targetLang} onValueChange={setTargetLang}>
                    <SelectTrigger className="h-8 text-xs mb-2"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {languages.map((l) => (
                        <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="w-full text-white" style={{ backgroundColor: "#00a884" }} onClick={translateText} disabled={translating}>
                    {translating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
                    Traduzir
                  </Button>
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost" size="icon"
                className={cn("h-6 w-6 rounded-full", showSchedule && "text-primary")}
                onClick={() => setShowSchedule(!showSchedule)}
                title="Agendar"
              >
                <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>

            {/* Send / Mic button */}
            {canSend() ? (
              <Button
                size="icon"
                className="h-[48px] w-[48px] rounded-full shrink-0 text-white"
                style={{ backgroundColor: "#00a884" }}
                disabled={sending}
                onClick={handleSend}
              >
                {sending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : showSchedule && scheduleDate
                    ? <CalendarClock className="w-5 h-5" />
                    : <Send className="w-5 h-5" />
                }
              </Button>
            ) : (
              <Button
                size="icon"
                className="h-[48px] w-[48px] rounded-full shrink-0"
                variant="ghost"
                onClick={startRecording}
                title="Gravar áudio"
              >
                <Mic className="w-6 h-6 text-muted-foreground" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInputBar;
