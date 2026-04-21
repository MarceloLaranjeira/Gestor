import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Phone, Image, FileText, Mic, Video } from "lucide-react";

interface WhatsAppTestSenderProps {
  configId: string;
  ativo: boolean;
}

type MessageType = "text" | "image" | "document" | "audio" | "video";

const typeConfig: Record<MessageType, { label: string; icon: typeof Send; placeholder: string; extensions: string }> = {
  text: { label: "Texto", icon: Send, placeholder: "", extensions: "" },
  image: { label: "Imagem", icon: Image, placeholder: "https://exemplo.com/imagem.jpg", extensions: "JPG, PNG, WebP" },
  document: { label: "Documento", icon: FileText, placeholder: "https://exemplo.com/documento.pdf", extensions: "PDF, DOCX, etc." },
  audio: { label: "Áudio", icon: Mic, placeholder: "https://exemplo.com/audio.mp3", extensions: "MP3, OGG, AAC" },
  video: { label: "Vídeo", icon: Video, placeholder: "https://exemplo.com/video.mp4", extensions: "MP4, 3GP" },
};

const WhatsAppTestSender = ({ configId, ativo }: WhatsAppTestSenderProps) => {
  const [sending, setSending] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState<MessageType>("text");
  const [mensagem, setMensagem] = useState("Olá! Esta é uma mensagem de teste do sistema Gestão Inteligente. 🚀");
  const [mediaUrl, setMediaUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [fileName, setFileName] = useState("");

  const getEndpointAndBody = () => {
    const cleanNumber = numero.replace(/\D/g, "");
    if (tipo === "text") {
      return { endpoint: `/message/sendText/${instanceName}`, body: { number: cleanNumber, text: mensagem } };
    }
    return {
      endpoint: `/message/sendMedia/${instanceName}`,
      body: {
        number: cleanNumber,
        mediatype: tipo,
        media: mediaUrl,
        ...(caption && { caption }),
        ...(tipo === "document" && fileName && { fileName }),
      },
    };
  };

  const canSend = () => {
    if (!numero || !instanceName) return false;
    if (tipo === "text") return !!mensagem;
    return !!mediaUrl;
  };

  const sendMessage = async () => {
    if (!canSend()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { endpoint, body } = getEndpointAndBody();
      const res = await supabase.functions.invoke("integracao-enviar", {
        body: { config_id: configId, endpoint, method: "POST", body, plataforma: "whatsapp", contato_externo: numero },
      });
      if (res.error) {
        toast({ title: "Erro ao enviar", description: res.error.message, variant: "destructive" });
      } else if (res.data?.success) {
        toast({ title: "Mensagem enviada! ✅", description: `${typeConfig[tipo].label} enviado para ${numero}` });
        setNumero("");
      } else {
        toast({ title: "Falha no envio", description: JSON.stringify(res.data?.data || res.data || {}).slice(0, 200), variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  const tc = typeConfig[tipo];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" /> Enviar Mensagem de Teste
        </CardTitle>
        <CardDescription>Envie texto, imagens, documentos, áudios ou vídeos via WhatsApp</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ativo ? (
          <p className="text-sm text-muted-foreground text-center py-4">Ative a integração para enviar mensagens.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Instância</Label>
                <Input value={instanceName} onChange={(e) => setInstanceName(e.target.value)} placeholder="Ex: minha-instancia" />
              </div>
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="5592999999999" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Mensagem</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as MessageType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(typeConfig) as [MessageType, typeof tc][]).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2"><cfg.icon className="w-3.5 h-3.5" /> {cfg.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tipo === "text" ? (
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Digite sua mensagem..." rows={3} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>URL do Arquivo</Label>
                  <Input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder={tc.placeholder} />
                  <p className="text-[11px] text-muted-foreground">URL pública ({tc.extensions})</p>
                </div>
                {(tipo !== "audio") && (
                  <div className="space-y-2">
                    <Label>Legenda (opcional)</Label>
                    <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda da mídia..." />
                  </div>
                )}
                {tipo === "document" && (
                  <div className="space-y-2">
                    <Label>Nome do Arquivo (opcional)</Label>
                    <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="relatorio.pdf" />
                  </div>
                )}
              </>
            )}

            <Button onClick={sendMessage} disabled={sending || !canSend()} className="w-full">
              {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Enviar {tc.label}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppTestSender;
