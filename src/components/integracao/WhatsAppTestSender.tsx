import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Phone } from "lucide-react";

interface WhatsAppTestSenderProps {
  configId: string;
  ativo: boolean;
}

const WhatsAppTestSender = ({ configId, ativo }: WhatsAppTestSenderProps) => {
  const [sending, setSending] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [numero, setNumero] = useState("");
  const [mensagem, setMensagem] = useState("Olá! Esta é uma mensagem de teste do sistema Gestão Inteligente. 🚀");

  const sendMessage = async () => {
    if (!numero || !mensagem || !instanceName) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const res = await supabase.functions.invoke("integracao-enviar", {
        body: {
          config_id: configId,
          endpoint: `/message/sendText/${instanceName}`,
          method: "POST",
          body: {
            number: numero.replace(/\D/g, ""),
            text: mensagem,
          },
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
          Envie uma mensagem de teste via WhatsApp usando a Evolution API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!ativo ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Ative a integração para enviar mensagens.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Nome da Instância (Evolution API)</Label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: minha-instancia"
              />
              <p className="text-[11px] text-muted-foreground">
                Nome da instância configurada na Evolution API
              </p>
            </div>
            <div className="space-y-2">
              <Label>Número do WhatsApp</Label>
              <Input
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="5592999999999"
              />
              <p className="text-[11px] text-muted-foreground">
                Formato: código do país + DDD + número (sem espaços ou caracteres especiais)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={3}
              />
            </div>
            <Button
              onClick={sendMessage}
              disabled={sending || !numero || !mensagem || !instanceName}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar Mensagem
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppTestSender;
