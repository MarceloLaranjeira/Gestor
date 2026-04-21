import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpRight, ArrowDownLeft, Image, FileText, Mic, Video, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Mensagem {
  id: string;
  direcao: string;
  tipo: string;
  conteudo: any;
  status: string;
  plataforma: string;
  contato_externo: string;
  erro: string | null;
  created_at: string;
}

const tipoIcons: Record<string, typeof Send> = {
  texto: Send,
  text: Send,
  image: Image,
  imagem: Image,
  document: FileText,
  documento: FileText,
  audio: Mic,
  video: Video,
};

const WhatsAppMessageHistory = ({ mensagens }: { mensagens: Mensagem[] }) => {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroDirecao, setFiltroDirecao] = useState("todas");

  const whatsappMsgs = useMemo(() => {
    let list = mensagens.filter((m) => m.plataforma === "whatsapp");
    if (filtroTipo !== "todos") list = list.filter((m) => m.tipo === filtroTipo || m.conteudo?.mediatype === filtroTipo);
    if (filtroDirecao !== "todas") list = list.filter((m) => m.direcao === filtroDirecao);
    return list;
  }, [mensagens, filtroTipo, filtroDirecao]);

  const getPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.text) return c.text;
    if (c?.media) return c.media;
    if (c?.caption) return c.caption;
    if (c?.dados?.nome) return `Contato: ${c.dados.nome}`;
    return JSON.stringify(c).slice(0, 120);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Histórico WhatsApp
            </CardTitle>
            <CardDescription>{whatsappMsgs.length} mensagens</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos tipos</SelectItem>
                <SelectItem value="texto">Texto</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
                <SelectItem value="audio">Áudio</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroDirecao} onValueChange={setFiltroDirecao}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="enviada">Enviadas</SelectItem>
                <SelectItem value="recebida">Recebidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {whatsappMsgs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem WhatsApp encontrada</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {whatsappMsgs.map((msg) => {
              const Icon = tipoIcons[msg.tipo] || tipoIcons[msg.conteudo?.mediatype] || Send;
              return (
                <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                  <div className={`p-1.5 rounded-full shrink-0 ${msg.direcao === "enviada" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"}`}>
                    {msg.direcao === "enviada" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Icon className="w-3 h-3" />
                        {msg.tipo || "texto"}
                      </Badge>
                      <Badge variant={msg.status === "erro" ? "destructive" : msg.status === "enviada" || msg.status === "processada" ? "default" : "secondary"} className="text-[10px]">
                        {msg.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    {msg.contato_externo && <p className="text-[11px] text-muted-foreground">📱 {msg.contato_externo}</p>}
                    <p className="text-xs mt-1 text-muted-foreground truncate">{getPreview(msg)}</p>
                    {msg.erro && <p className="text-[10px] text-destructive mt-1">❌ {msg.erro}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppMessageHistory;
