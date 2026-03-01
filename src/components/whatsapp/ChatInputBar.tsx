import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  CalendarClock, Languages, SpellCheck, Clock,
} from "lucide-react";

type MessageType = "text" | "image" | "document" | "audio" | "video";

interface ChatInputBarProps {
  config: { id: string; ativo: boolean };
  instanceName: string;
  numero: string;
  onSent: () => void;
}

const typeConfig: Record<MessageType, { label: string; icon: typeof Send }> = {
  text: { label: "Texto", icon: Send },
  image: { label: "Imagem", icon: Image },
  document: { label: "Documento", icon: FileText },
  audio: { label: "Áudio", icon: Mic },
  video: { label: "Vídeo", icon: Video },
};

const emojiCategories = [
  { name: "Pessoas", emojis: ["😀","😂","😍","🥰","😎","🤔","😢","😡","👍","👎","👏","🙏","💪","🤝","❤️","🔥"] },
  { name: "Natureza", emojis: ["🌟","⭐","🌈","☀️","🌙","🌊","🌺","🌻","🍀","🌴","🐕","🦅","🐟","🦋"] },
  { name: "Objetos", emojis: ["📱","💻","📷","🎬","🎵","📞","✉️","📊","📌","🔑","💡","🎯","🏆","🎁"] },
  { name: "Símbolos", emojis: ["✅","❌","⚡","💯","🚀","⚠️","🔔","💬","📢","🔒","♻️","🏳️","✨","💎"] },
];

const languages = [
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
  { code: "it", label: "Italiano" },
  { code: "pt", label: "Português" },
  { code: "ja", label: "Japonês" },
  { code: "zh", label: "Chinês" },
  { code: "ar", label: "Árabe" },
  { code: "ru", label: "Russo" },
];

const ChatInputBar = ({ config, instanceName, numero, onSent }: ChatInputBarProps) => {
  const [tipo, setTipo] = useState<MessageType>("text");
  const [mensagem, setMensagem] = useState("");
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentText = tipo === "text" ? mensagem : caption;

  const canSend = () => {
    if (!numero || !instanceName || !config.ativo) return false;
    if (tipo === "text") return !!mensagem;
    return !!mediaUrl;
  };

  const sendMessage = async (scheduledFor?: string) => {
    if (!canSend()) return;
    setSending(true);
    try {
      const cleanNumber = numero.replace(/\D/g, "");
      const endpoint = tipo === "text"
        ? `/message/sendText/${instanceName}`
        : `/message/sendMedia/${instanceName}`;
      const body = tipo === "text"
        ? { number: cleanNumber, text: mensagem }
        : {
            number: cleanNumber,
            mediatype: tipo,
            media: mediaUrl,
            ...(caption && { caption }),
            ...(tipo === "document" && fileName && { fileName }),
          };

      if (scheduledFor) {
        // Save scheduled message to DB
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
      } else {
        toast({ title: "Erro na correção", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro na correção", variant: "destructive" });
    }
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
      } else {
        toast({ title: "Erro na tradução", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro na tradução", variant: "destructive" });
    }
    setTranslating(false);
  };

  const insertEmoji = (emoji: string) => {
    if (tipo === "text") setMensagem((prev) => prev + emoji);
    else setCaption((prev) => prev + emoji);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        
        // Upload to storage
        const fileName = `audio-${Date.now()}.webm`;
        const { data, error } = await supabase.storage
          .from("agent-uploads")
          .upload(`whatsapp-audio/${fileName}`, blob, { contentType: "audio/webm" });
        
        if (error) {
          toast({ title: "Erro ao salvar áudio", variant: "destructive" });
          return;
        }

        const { data: urlData } = supabase.storage
          .from("agent-uploads")
          .getPublicUrl(`whatsapp-audio/${fileName}`);

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
    }
  };

  return (
    <div className="border-t bg-card">
      {/* Tools bar */}
      <div className="flex items-center gap-1 px-3 pt-2 max-w-3xl mx-auto">
        {/* Emoji */}
        <Popover open={showEmojis} onOpenChange={setShowEmojis}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Smile className="w-4 h-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {emojiCategories.map((cat) => (
                <div key={cat.name}>
                  <p className="text-[10px] text-muted-foreground font-medium mb-1">{cat.name}</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.emojis.map((e) => (
                      <button key={e} onClick={() => insertEmoji(e)} className="text-lg hover:bg-muted rounded p-0.5 cursor-pointer">{e}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* AI Correct */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={correctText}
          disabled={correcting || !currentText.trim()}
          title="Correção IA"
        >
          {correcting ? <Loader2 className="w-4 h-4 animate-spin" /> : <SpellCheck className="w-4 h-4 text-muted-foreground" />}
        </Button>

        {/* Translate */}
        <Popover open={showTranslate} onOpenChange={setShowTranslate}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Traduzir" disabled={!currentText.trim()}>
              <Languages className="w-4 h-4 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3" align="start">
            <p className="text-xs font-medium mb-2">Traduzir para:</p>
            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="h-8 text-xs mb-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="w-full" onClick={translateText} disabled={translating}>
              {translating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Languages className="w-3 h-3 mr-1" />}
              Traduzir
            </Button>
          </PopoverContent>
        </Popover>

        {/* Schedule */}
        <Button
          variant={showSchedule ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setShowSchedule(!showSchedule)}
          title="Agendar mensagem"
        >
          <CalendarClock className="w-4 h-4 text-muted-foreground" />
        </Button>

        {/* Audio record */}
        <Button
          variant={recording ? "destructive" : "ghost"}
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={recording ? stopRecording : startRecording}
          title={recording ? "Parar gravação" : "Gravar áudio"}
        >
          <Mic className={cn("w-4 h-4", recording ? "animate-pulse" : "text-muted-foreground")} />
        </Button>
      </div>

      {/* Schedule panel */}
      {showSchedule && (
        <div className="flex items-center gap-2 px-3 py-2 max-w-3xl mx-auto">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                {scheduleDate ? format(scheduleDate, "dd/MM/yyyy", { locale: ptBR }) : "Escolher data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={scheduleDate}
                onSelect={setScheduleDate}
                disabled={(date) => date < new Date()}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Input
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="h-8 w-28 text-xs"
          />
          {scheduleDate && (
            <span className="text-[10px] text-primary font-medium">
              📅 {format(scheduleDate, "dd/MM", { locale: ptBR })} às {scheduleTime}
            </span>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-2 px-3 pb-3 pt-1 max-w-3xl mx-auto">
        {/* Attachment type selector */}
        <Select value={tipo} onValueChange={(v) => setTipo(v as MessageType)}>
          <SelectTrigger className="w-10 h-10 p-0 justify-center border-0 bg-transparent shrink-0">
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(typeConfig) as [MessageType, { label: string; icon: typeof Send }][]).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                <span className="flex items-center gap-2"><cfg.icon className="w-3.5 h-3.5" /> {cfg.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 space-y-2">
          {tipo !== "text" && (
            <div className="flex gap-2">
              <Input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="URL do arquivo..."
                className="h-9 text-sm"
              />
              {tipo === "document" && (
                <Input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="nome.pdf"
                  className="h-9 text-sm w-32"
                />
              )}
            </div>
          )}
          <Textarea
            value={tipo === "text" ? mensagem : caption}
            onChange={(e) => tipo === "text" ? setMensagem(e.target.value) : setCaption(e.target.value)}
            placeholder={tipo === "text" ? "Digite uma mensagem..." : "Legenda (opcional)..."}
            rows={1}
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            onKeyDown={handleKeyDown}
          />
        </div>

        <Button
          size="icon"
          className="h-10 w-10 rounded-full shrink-0"
          disabled={!canSend() || sending}
          onClick={handleSend}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : showSchedule && scheduleDate ? <CalendarClock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export default ChatInputBar;
