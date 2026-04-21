import React, { useEffect, useState } from "react";
import type { LucideProps } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, User, Phone, MapPin, Mail, Calendar, Star, FileText, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContactInfoPanelProps {
  contato: string;
  onClose: () => void;
}

const ContactInfoPanel = ({ contato, onClose }: ContactInfoPanelProps) => {
  const [pessoa, setPessoa] = useState<any>(null);
  const [apoiador, setApoiador] = useState<any>(null);
  const [demandas, setDemandas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [contato]);

  const fetchData = async () => {
    setLoading(true);
    const cleanNum = contato.replace(/\D/g, "");

    const [pessoaRes, apoiadorRes, demandasRes] = await Promise.all([
      supabase.from("pessoas").select("*").ilike("telefone", `%${cleanNum.slice(-8)}%`).limit(1).maybeSingle(),
      supabase.from("apoiadores").select("*").ilike("telefone", `%${cleanNum.slice(-8)}%`).limit(1).maybeSingle(),
      supabase.from("demandas").select("*").ilike("solicitante", `%${cleanNum.slice(-8)}%`).order("created_at", { ascending: false }).limit(5),
    ]);

    setPessoa(pessoaRes.data);
    setApoiador(apoiadorRes.data);
    setDemandas(demandasRes.data || []);
    setLoading(false);
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: React.ComponentType<LucideProps>; label: string; value: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className="text-sm">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="w-[320px] border-l bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: "#00a884" }}>
        <span className="text-sm font-semibold text-white">Dados do Contato</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white hover:bg-white/20" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center py-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: "#00a884" }}>
              <User className="w-10 h-10 text-white" />
            </div>
            <p className="text-base font-semibold mt-3">{pessoa?.nome || apoiador?.nome || contato}</p>
            <p className="text-xs text-muted-foreground">{contato}</p>
          </div>

          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando dados...</p>
          ) : (
            <>
              {/* Pessoa data */}
              {pessoa && (
                <div className="border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cadastro</p>
                  <InfoRow icon={User} label="Nome" value={pessoa.nome} />
                  <InfoRow icon={Phone} label="Telefone" value={pessoa.telefone} />
                  <InfoRow icon={Mail} label="E-mail" value={pessoa.email} />
                  <InfoRow icon={MapPin} label="Cidade" value={pessoa.cidade} />
                  <InfoRow icon={MapPin} label="Bairro" value={pessoa.bairro} />
                  <InfoRow icon={Tag} label="Tipo" value={pessoa.tipo} />
                  {pessoa.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {pessoa.tags.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Apoiador data */}
              {apoiador && (
                <div className="border rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Apoiador</p>
                  <InfoRow icon={User} label="Cargo" value={apoiador.cargo} />
                  <InfoRow icon={Star} label="Influência" value={`${apoiador.grau_influencia}/5`} />
                  <InfoRow icon={MapPin} label="Região" value={apoiador.regiao} />
                  <InfoRow icon={Tag} label="Segmento" value={apoiador.segmento} />
                  <InfoRow icon={FileText} label="Resumo" value={apoiador.resumo} />
                  <div className="pt-1">
                    <Badge
                      variant={apoiador.prioridade === "alta" ? "destructive" : apoiador.prioridade === "media" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      Prioridade: {apoiador.prioridade}
                    </Badge>
                  </div>
                </div>
              )}

              {/* Demandas */}
              {demandas.length > 0 && (
                <div className="border rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Demandas ({demandas.length})</p>
                  <div className="space-y-2">
                    {demandas.map((d) => (
                      <div key={d.id} className="border rounded p-2">
                        <p className="text-xs font-medium truncate">{d.titulo}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant="outline" className="text-[9px]">{d.status}</Badge>
                          <Badge variant="outline" className="text-[9px]">{d.prioridade}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!pessoa && !apoiador && (
                <div className="text-center py-6">
                  <p className="text-xs text-muted-foreground">Nenhum registro encontrado para este contato.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Os dados serão preenchidos automaticamente quando o n8n enviar informações via webhook.</p>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ContactInfoPanel;
