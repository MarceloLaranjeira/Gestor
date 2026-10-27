import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { buildInscricaoLink, buildWhatsAppShareUrl, mensagemConvite, type Especialidade } from "@/lib/atendimento";

export function LinksInscricao({ especialidades }: { especialidades: Especialidade[] }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  const origin = window.location.origin;

  const copiar = async (slug: string, texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(slug);
      setTimeout(() => setCopiado((atual) => (atual === slug ? null : atual)), 2000);
    } catch {
      toast({ title: "Não foi possível copiar", description: texto });
    }
  };

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Envie o link para a família preencher a ficha do primeiro atendimento. A inscrição entra direto na lista de espera da especialidade,
        sem digitação manual. Use <strong>Enviar no WhatsApp</strong> para abrir a conversa com a mensagem pronta.
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {especialidades.map((esp) => {
          const link = buildInscricaoLink(origin, esp.slug);
          const mensagem = mensagemConvite(esp.nome, link);
          return (
            <div key={esp.slug} className="flex flex-col rounded-xl border border-border/60 bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">{esp.nome}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{esp.descricao}</p>
              <code className="mt-4 block truncate rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground" title={link}>
                {link}
              </code>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" asChild>
                  <a href={buildWhatsAppShareUrl(mensagem)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar no WhatsApp
                  </a>
                </Button>
                <Button size="sm" variant="outline" onClick={() => copiar(esp.slug, link)}>
                  {copiado === esp.slug ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                  {copiado === esp.slug ? "Copiado" : "Copiar link"}
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <a href={link} target="_blank" rel="noopener noreferrer" aria-label="Abrir formulário">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
