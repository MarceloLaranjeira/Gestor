import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, X, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Mensagem {
  id: string;
  direcao: string;
  conteudo: any;
  contato_externo: string;
  created_at: string;
}

interface StarredMessagesPanelProps {
  messages: Mensagem[];
  starredIds: Set<string>;
  onClose: () => void;
  onNavigate: (contacto: string, messageId: string) => void;
  onUnstar: (id: string) => void;
}

const StarredMessagesPanel = ({ messages, starredIds, onClose, onNavigate, onUnstar }: StarredMessagesPanelProps) => {
  const starredMessages = messages
    .filter((m) => starredIds.has(m.id))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getPreview = (msg: Mensagem) => {
    const c = msg.conteudo;
    if (c?.text) return c.text;
    if (c?.message) return c.message;
    if (c?.caption) return `📎 ${c.caption}`;
    if (c?.media) return "📎 Mídia";
    return JSON.stringify(c).slice(0, 60);
  };

  return (
    <div className="w-[340px] border-l flex flex-col bg-white shrink-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ backgroundColor: "#f0f2f5" }}>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
          <X className="w-5 h-5 text-[#54656f]" />
        </Button>
        <span className="font-medium text-[16px] text-[#111b21]">Mensagens com estrela</span>
      </div>

      <ScrollArea className="flex-1">
        {starredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <Star className="w-16 h-16 text-[#d1d7db] mb-4" />
            <p className="text-[#667781] text-sm">Nenhuma mensagem marcada</p>
            <p className="text-[#667781] text-xs mt-1">
              Toque e segure uma mensagem e depois toque em ⭐ para marcar
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {starredMessages.map((msg) => {
              const isSent = msg.direcao === "enviada";
              return (
                <button
                  key={msg.id}
                  onClick={() => onNavigate(msg.contato_externo, msg.id)}
                  className="w-full text-left px-4 py-3 hover:bg-[#f5f6f6] transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400 shrink-0" />
                        <span className="text-[13px] font-medium text-[#111b21] truncate">
                          {isSent ? "Você" : msg.contato_externo}
                        </span>
                        <span className="text-[11px] text-[#667781] shrink-0">
                          {format(new Date(msg.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-[13px] text-[#667781] line-clamp-2">{getPreview(msg)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); onUnstar(msg.id); }}
                        title="Desmarcar"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <ArrowRight className="w-4 h-4 text-[#667781]" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {starredMessages.length > 0 && (
        <div className="px-4 py-2 border-t text-center">
          <span className="text-[12px] text-[#667781]">{starredMessages.length} mensage{starredMessages.length === 1 ? "m" : "ns"}</span>
        </div>
      )}
    </div>
  );
};

export default StarredMessagesPanel;
