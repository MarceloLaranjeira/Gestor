import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Phone, Image, FileText } from "lucide-react";

interface WhatsAppTestSenderProps {
  configId: string;
  ativo: boolean;
}

type MessageType = "text" | "image" | "document";

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
    switch (tipo) {
      case "text":
        return {
          endpoint: `/message/sendText/${instanceName}`,
          body: { number: cleanNumber, text: mensagem },
        };
      case "image":
        return {
          endpoint: `/message/sendMedia/${instanceName}`,
          body: {
            number: cleanNumber,
            mediatype: "image",
            media: mediaUrl,
            caption: caption || undefined,
          },
        };
      case "document":
        return {
          endpoint: `/message/sendMedia/${instanceName}`,
          body: {
            number: cleanNumber,
            mediatype: "document",
            media: mediaUrl,
            caption: caption || undefined,
            fileName: fileName || "documento",
          },
        };
    }
  };

  const canSend = () => {
    if (!numero || !instanceName) return false;
    if (tipo === "text" && !mensagem) return false;
    if ((tipo === "image" || tipo === "document") && !mediaUrl) return false;
    return true;
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
        body: {
          config_id: configId,
          endpoint,
          method: "POST",
          body,
          plataforma: "whatsapp",
          contato_externo: numero,
        },
      });

      if (res.error) {
        toast({ title: "Erro ao enviar", description: res.error.message, variant: "destructive" });
      } else if (res.data?.success) {
        toast({ title: "Mensagem enviada! ✅", description: `Enviada para ${numero}` });
        setNumero("");
      } else {
        toast({
          title: "Falha no envio",
          description: JSON.stringify(res.data?.data || res.data || {}).slice(0, 200),
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" /> Enviar Mensagem de Teste
        </CardTitle>
        <CardDescription>
          Envie texto, imagens ou documentos via WhatsApp usando a Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ativo ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ative a integração para enviar mensagens.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Instância (Evolution API)</Label>
                <Input
                  value={instanceName}
                  onChange={(e) => setInstanceName(e.target.value)}
                  placeholder="Ex: minha-instancia"
                />
              </div>
              <div className="space-y-2">
                <Label>Número do WhatsApp</Label>
                <Input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="5592999999999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Mensagem</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as MessageType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">
                    <span className="flex items-center gap-2"><Send className="w-3.5 h-3.5" /> Texto</span>
                  </SelectItem>
                  <SelectItem value="image">
                    <span className="flex items-center gap-2"><Image className="w-3.5 h-3.5" /> Imagem</span>
                  </SelectItem>
                  <SelectItem value="document">
                    <span className="flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> Documento</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipo === "text" && (
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  rows={3}
                />
              </div>
            )}

            {(tipo === "image" || tipo === "document") && (
              <>
                <div className="space-y-2">
                  <Label>URL do Arquivo</Label>
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={tipo === "image" ? "https://exemplo.com/imagem.jpg" : "https://exemplo.com/documento.pdf"}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    URL pública do {tipo === "image" ? "imagem (JPG, PNG, WebP)" : "documento (PDF, DOCX, etc.)"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Legenda (opcional)</Label>
                  <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Legenda da mídia..."
                  />
                </div>
                {tipo === "document" && (
                  <div className="space-y-2">
                    <Label>Nome do Arquivo (opcional)</Label>
                    <Input
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      placeholder="relatorio.pdf"
                    />
                  </div>
                )}
              </>
            )}

            <Button
              onClick={sendMessage}
              disabled={sending || !canSend()}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar {tipo === "text" ? "Mensagem" : tipo === "image" ? "Imagem" : "Documento"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppTestSender;
