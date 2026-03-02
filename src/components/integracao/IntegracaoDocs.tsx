import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy, BookOpen, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const copyJson = (obj: object) => {
  navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
  toast({ title: "JSON copiado!" });
};

interface DocAction {
  key: string;
  label: string;
  description: string;
  direction: "receber" | "enviar";
  payload: object;
}

const actions: DocAction[] = [
  {
    key: "criar_pessoa",
    label: "Criar Pessoa",
    description: "Cadastra um novo contato na base de Pessoas do sistema",
    direction: "receber",
    payload: {
      acao: "criar_pessoa",
      plataforma: "whatsapp",
      contato: "+5592999999999",
      dados: {
        nome: "João Silva",
        telefone: "+5592999999999",
        email: "joao@email.com",
        cidade: "Manaus",
        tipo: "Apoiador",
        tags: ["whatsapp", "liderança"],
      },
    },
  },
  {
    key: "criar_apoiador",
    label: "Criar Apoiador",
    description: "Cadastra no Prontuário Parlamentar com grau de influência",
    direction: "receber",
    payload: {
      acao: "criar_apoiador",
      plataforma: "whatsapp",
      contato: "+5592988887777",
      dados: {
        nome: "Carlos Souza",
        telefone: "+5592988887777",
        cidade: "Manaus",
        regiao: "Zona Norte",
        segmento: "Evangélico",
        cargo: "Pastor",
        organizacao: "Igreja Central",
        origem_contato: "whatsapp",
        prioridade: "alta",
        grau_influencia: 4,
      },
    },
  },
  {
    key: "criar_pessoa_e_apoiador",
    label: "Criar Pessoa + Apoiador",
    description: "Cadastra simultaneamente na base de Pessoas e no Prontuário Parlamentar",
    direction: "receber",
    payload: {
      acao: "criar_pessoa_e_apoiador",
      plataforma: "whatsapp",
      contato: "+5592977776666",
      dados: {
        nome: "Ana Lima",
        telefone: "+5592977776666",
        email: "ana@email.com",
        cidade: "Manaus",
        tipo: "Liderança",
        tags: ["whatsapp", "liderança", "zona-leste"],
        regiao: "Zona Leste",
        segmento: "Comunitário",
        cargo: "Presidente de Associação",
        organizacao: "Associação de Moradores",
        origem_contato: "whatsapp",
        prioridade: "alta",
        grau_influencia: 5,
      },
    },
  },
  {
    key: "criar_demanda",
    label: "Criar Demanda",
    description: "Registra uma nova demanda/solicitação da população",
    direction: "receber",
    payload: {
      acao: "criar_demanda",
      plataforma: "whatsapp",
      contato: "+5592999999999",
      dados: {
        titulo: "Pavimentação Rua X",
        descricao: "Moradores solicitam asfalto na rua X",
        solicitante: "Maria Santos",
        prioridade: "alta",
      },
    },
  },
  {
    key: "criar_evento",
    label: "Criar Evento",
    description: "Agenda um novo evento na agenda parlamentar",
    direction: "receber",
    payload: {
      acao: "criar_evento",
      plataforma: "instagram",
      contato: "@usuario",
      dados: {
        titulo: "Reunião Comunitária",
        descricao: "Encontro com lideranças do bairro",
        data: "2026-03-15",
        hora: "14:00",
        local: "Centro Comunitário",
        tipo: "Externo",
        participantes: 30,
      },
    },
  },
  {
    key: "criar_coordenador",
    label: "Criar Coordenador de Campanha",
    description: "Cadastra um novo coordenador de campanha no sistema",
    direction: "receber" as const,
    payload: {
      acao: "criar_coordenador",
      plataforma: "whatsapp",
      contato: "+5592999999999",
      dados: {
        nome: "Pedro Oliveira",
        telefone: "+5592966665555",
        email: "pedro@email.com",
        status: "ativo",
        calha_id: "<calha_id_opcional>",
      },
    },
  },
  {
    key: "criar_assessor",
    label: "Criar Assessor de Campanha",
    description: "Cadastra um novo assessor vinculado a um coordenador de campanha",
    direction: "receber" as const,
    payload: {
      acao: "criar_assessor",
      plataforma: "whatsapp",
      contato: "+5592999999999",
      dados: {
        nome: "Maria Assessora",
        telefone: "+5592955554444",
        email: "maria@email.com",
        funcao: "Articulação",
        coordenador_id: "<coordenador_id_opcional>",
      },
    },
  },
  {
    key: "criar_movimento_financeiro",
    label: "Criar Movimento Financeiro",
    description: "Registra receita ou despesa no módulo financeiro",
    direction: "receber",
    payload: {
      acao: "criar_movimento_financeiro",
      plataforma: "sistema",
      contato: "",
      dados: {
        descricao: "Doação campanha",
        valor: 5000,
        tipo: "receita",
        categoria: "Doações",
        data: "2026-03-01",
        observacao: "Transferência bancária",
      },
    },
  },
  {
    key: "sendText",
    label: "Enviar Texto (WhatsApp)",
    description: "Envia mensagem de texto via Evolution API",
    direction: "enviar",
    payload: {
      config_id: "<config_id>",
      endpoint: "/message/sendText/<instancia>",
      method: "POST",
      body: { number: "5592999999999", text: "Olá! Mensagem enviada pelo sistema." },
      plataforma: "whatsapp",
      contato_externo: "5592999999999",
    },
  },
  {
    key: "sendMedia",
    label: "Enviar Mídia (WhatsApp)",
    description: "Envia imagem, documento, áudio ou vídeo via Evolution API",
    direction: "enviar",
    payload: {
      config_id: "<config_id>",
      endpoint: "/message/sendMedia/<instancia>",
      method: "POST",
      body: {
        number: "5592999999999",
        mediatype: "image",
        media: "https://exemplo.com/imagem.jpg",
        caption: "Legenda opcional",
      },
      plataforma: "whatsapp",
      contato_externo: "5592999999999",
    },
  },
];

const IntegracaoDocs = () => {
  const receber = actions.filter((a) => a.direction === "receber");
  const enviar = actions.filter((a) => a.direction === "enviar");

  const renderSection = (title: string, IconComp: typeof ArrowDownLeft, items: DocAction[]) => (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <IconComp className="w-4 h-4 text-primary" /> {title}
      </h3>
      <Accordion type="single" collapsible className="w-full">
        {items.map((action) => (
          <AccordionItem key={action.key} value={action.key}>
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <Badge variant="outline" className="font-mono text-[10px]">{action.key}</Badge>
                <span>{action.label}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <p className="text-xs text-muted-foreground">{action.description}</p>
              <div className="relative">
                <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6" onClick={() => copyJson(action.payload)}>
                  <Copy className="w-3 h-3" />
                </Button>
                <pre className="bg-muted rounded-lg p-3 pr-8 overflow-x-auto text-[11px] font-mono">
                  {JSON.stringify(action.payload, null, 2)}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" /> Documentação da API
        </CardTitle>
        <CardDescription>
          Exemplos de payload para todas as ações disponíveis no webhook e na API de envio
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-muted/50 p-4 text-xs text-muted-foreground space-y-1">
          <p><strong className="text-foreground">Webhook (receber):</strong> Envie um <code className="bg-muted px-1 rounded">POST</code> para a URL do webhook com o JSON no body.</p>
          <p><strong className="text-foreground">API (enviar):</strong> Use a Edge Function <code className="bg-muted px-1 rounded">integracao-enviar</code> via SDK do Supabase.</p>
        </div>
        {renderSection("📥 Receber Dados (Webhook)", ArrowDownLeft, receber)}
        {renderSection("📤 Enviar Mensagens (API)", ArrowUpRight, enviar)}
      </CardContent>
    </Card>
  );
};

export default IntegracaoDocs;
