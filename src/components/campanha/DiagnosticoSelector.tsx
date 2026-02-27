import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles } from "lucide-react";
import CampanhaAIDialog from "./CampanhaAIDialog";

interface KpiOption {
  id: string;
  label: string;
  context: string;
  checked?: boolean;
}

interface Props {
  kpis: KpiOption[];
}

export default function DiagnosticoSelector({ kpis }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(kpis.map(k => k.id)));
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContext, setAiContext] = useState("");

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(kpis.map(k => k.id)));
  const selectNone = () => setSelected(new Set());

  const runAnalysis = () => {
    const selectedKpis = kpis.filter(k => selected.has(k.id));
    const ctx = selectedKpis.map(k => `- ${k.label}: ${k.context}`).join("\n");
    setAiContext(`O gestor selecionou os seguintes ${selectedKpis.length} KPIs para análise integrada:\n\n${ctx}\n\nFaça uma análise cruzada desses indicadores, identifique correlações, riscos e oportunidades, e gere um plano de ação priorizado.`);
    setOpen(false);
    setAiOpen(true);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm" className="gap-2">
        <Sparkles className="w-4 h-4" />
        Diagnóstico Completo
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-5 h-5 text-primary" />
              Selecione os KPIs para Diagnóstico
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-2">
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>Selecionar todos</Button>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectNone}>Limpar</Button>
            <span className="text-xs text-muted-foreground ml-auto self-center">{selected.size} de {kpis.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {kpis.map((k) => (
              <label key={k.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selected.has(k.id) ? "bg-primary/5 border-primary/30" : "bg-muted/20 border-border hover:bg-muted/40"
                }`}
              >
                <Checkbox
                  checked={selected.has(k.id)}
                  onCheckedChange={() => toggle(k.id)}
                />
                <span className="text-sm flex-1">{k.label}</span>
              </label>
            ))}
          </div>

          <Button onClick={runAnalysis} disabled={selected.size === 0} className="w-full gap-2 mt-2">
            <Sparkles className="w-4 h-4" />
            Analisar {selected.size} KPIs com Horus
          </Button>
        </DialogContent>
      </Dialog>

      <CampanhaAIDialog context={aiContext} open={aiOpen} onOpenChange={setAiOpen} />
    </>
  );
}
