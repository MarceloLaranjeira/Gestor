import { useState, useEffect } from "react";
import { Settings2, Plus, Trash2, ExternalLink, BarChart3, RefreshCw } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface PBIReport {
  id: string;
  name: string;
  url: string;
}

const STORAGE_KEY = "pbi-reports";

const loadReports = (): PBIReport[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PBIReport[];
  } catch {}
  return [];
};

const saveReports = (reports: PBIReport[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(reports)); } catch {}
};

const emptyForm = { name: "", url: "" };

const PowerBI = () => {
  const [reports, setReports]         = useState<PBIReport[]>(loadReports);
  const [activeId, setActiveId]       = useState<string | null>(null);
  const [configOpen, setConfigOpen]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [form, setForm]               = useState(emptyForm);
  const [editId, setEditId]           = useState<string | null>(null);
  const [iframeKey, setIframeKey]     = useState(0);

  useEffect(() => {
    if (reports.length > 0 && !activeId) setActiveId(reports[0].id);
  }, [reports, activeId]);

  const activeReport = reports.find(r => r.id === activeId);

  const handleSave = () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("Nome e URL são obrigatórios");
      return;
    }
    let url = form.url.trim();
    // Accept Power BI URL or shortlink and normalize to embed format
    if (url.includes("app.powerbi.com/view") || url.includes("app.powerbi.com/reportEmbed")) {
      // already embed URL
    } else if (url.includes("app.powerbi.com/groups") || url.includes("app.powerbi.com/reports")) {
      // try to convert to embed format - user should ideally provide the embed URL from Power BI
    }

    if (editId) {
      const updated = reports.map(r => r.id === editId ? { ...r, name: form.name, url } : r);
      setReports(updated);
      saveReports(updated);
      toast.success("Relatório atualizado!");
    } else {
      const newReport: PBIReport = { id: crypto.randomUUID(), name: form.name, url };
      const updated = [...reports, newReport];
      setReports(updated);
      saveReports(updated);
      setActiveId(newReport.id);
      toast.success("Relatório adicionado!");
    }
    setForm(emptyForm);
    setEditId(null);
  };

  const handleEdit = (r: PBIReport) => {
    setForm({ name: r.name, url: r.url });
    setEditId(r.id);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const updated = reports.filter(r => r.id !== deleteTarget);
    setReports(updated);
    saveReports(updated);
    if (activeId === deleteTarget) setActiveId(updated[0]?.id ?? null);
    setDeleteTarget(null);
    toast.success("Relatório removido");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold font-display text-foreground">Power BI</h1>
          </div>
          <div className="flex items-center gap-2">
            {activeReport && (
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Recarregar relatório"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setEditId(null); setConfigOpen(true); }}>
              <Settings2 className="w-3.5 h-3.5 mr-1.5" />Configurar
            </Button>
          </div>
        </div>

        {/* Tab bar */}
        {reports.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {reports.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                  activeId === r.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {r.name}
              </button>
            ))}
          </div>
        )}

        {/* Iframe */}
        {activeReport ? (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <iframe
              key={iframeKey}
              src={activeReport.url}
              className="w-full"
              style={{ height: "calc(100vh - 220px)", minHeight: 500, border: "none" }}
              allowFullScreen
              title={activeReport.name}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-card border border-border rounded-xl py-24 text-center space-y-4">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-semibold text-foreground">Nenhum relatório configurado</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Configurar" para adicionar um relatório Power BI</p>
            </div>
            <Button size="sm" onClick={() => { setForm(emptyForm); setEditId(null); setConfigOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />Adicionar Relatório
            </Button>
          </div>
        )}
      </div>

      {/* Config dialog */}
      <Dialog open={configOpen} onOpenChange={o => { setConfigOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Configurar Relatórios Power BI
            </DialogTitle>
          </DialogHeader>

          {/* Add / edit form */}
          <div className="space-y-3 border border-border/60 rounded-lg p-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{editId ? "Editar Relatório" : "Novo Relatório"}</p>
            <div>
              <Label className="text-xs">Nome do relatório *</Label>
              <Input className="mt-1" placeholder="ex: Dashboard Eleitoral" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">URL de incorporação (embed URL) *</Label>
              <Input className="mt-1 font-mono text-xs" placeholder="https://app.powerbi.com/reportEmbed?reportId=..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground mt-1">
                No Power BI, acesse o relatório → Arquivo → Publicar na Web → cole a URL de iframe aqui.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={!form.name.trim() || !form.url.trim()}>
                {editId ? "Atualizar" : "Adicionar"}
              </Button>
              {editId && (
                <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setEditId(null); }}>Cancelar edição</Button>
              )}
            </div>
          </div>

          {/* List */}
          {reports.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Relatórios salvos</p>
              {reports.map(r => (
                <div key={r.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card">
                  <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{r.url}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => handleEdit(r)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" title="Abrir em nova aba">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => setDeleteTarget(r.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive" title="Remover">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfigOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover relatório?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove a configuração. O relatório no Power BI não será afetado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default PowerBI;
