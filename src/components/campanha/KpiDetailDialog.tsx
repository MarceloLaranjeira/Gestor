import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Pencil, Check, X } from "lucide-react";
import CampanhaAIDialog from "./CampanhaAIDialog";

interface KpiDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  details?: { label: string; value: string | number }[];
  notes?: string;
  onNotesChange?: (notes: string) => void;
  aiContext: string;
  route?: string;
}

export default function KpiDetailDialog({
  open, onOpenChange, icon: Icon, label, value, sub, color = "text-primary",
  details, notes: initialNotes, onNotesChange, aiContext, route,
}: KpiDetailProps) {
  const [editing, setEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(initialNotes || "");
  const [aiOpen, setAiOpen] = useState(false);

  const handleSaveNotes = () => {
    onNotesChange?.(localNotes);
    setEditing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Icon className={`w-5 h-5 ${color}`} />
              {label}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Main value */}
            <div className="text-center py-4 bg-muted/30 rounded-lg border">
              <p className="text-3xl font-bold">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </div>

            {/* Detail breakdown */}
            {details && details.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalhamento</p>
                <div className="divide-y rounded-lg border overflow-hidden">
                  {details.map((d, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{d.label}</span>
                      <span className="font-semibold">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* User notes / editable */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Observações</p>
                {!editing ? (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={() => setEditing(true)}>
                    <Pencil className="w-3 h-3" /> Editar
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleSaveNotes}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => { setEditing(false); setLocalNotes(initialNotes || ""); }}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
              {editing ? (
                <Textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  placeholder="Adicione observações, metas ou comentários sobre este indicador..."
                  rows={3}
                  className="text-sm"
                />
              ) : (
                <div className="rounded-lg border bg-muted/20 px-3 py-2 min-h-[48px]">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {localNotes || "Nenhuma observação. Clique em Editar para adicionar."}
                  </p>
                </div>
              )}
            </div>

            {/* Horus analysis button */}
            <Button onClick={() => setAiOpen(true)} className="w-full gap-2" variant="default">
              <Sparkles className="w-4 h-4" />
              Analisar com Horus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CampanhaAIDialog
        context={`${aiContext}${localNotes ? `\n\nObservações do gestor: ${localNotes}` : ""}`}
        open={aiOpen}
        onOpenChange={setAiOpen}
      />
    </>
  );
}
