import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, UserPlus, Phone, Mail, MapPin, Trash2, Edit2, X, Tag } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Pessoa {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  telefone: string;
  email: string;
  bairro: string;
  cidade: string;
  tags: string[];
}

const TIPOS = ["Líder Comunitário", "Apoiador", "Vereador", "Pastor", "Secretário(a)", "Empresário", "Servidor Público", "Outro"];

const emptyForm = (): Omit<Pessoa, "id" | "user_id"> => ({
  nome: "", tipo: "", telefone: "", email: "", bairro: "", cidade: "Manaus", tags: [],
});

const Pessoas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Pessoa | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Pessoa | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPessoas = async () => {
    const { data } = await supabase
      .from("pessoas")
      .select("*")
      .order("nome");
    setPessoas(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPessoas(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setTagInput("");
    setShowForm(true);
  };

  const openEdit = (p: Pessoa) => {
    setEditTarget(p);
    setForm({ nome: p.nome, tipo: p.tipo, telefone: p.telefone, email: p.email, bairro: p.bairro, cidade: p.cidade, tags: [...p.tags] });
    setTagInput("");
    setShowForm(true);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }));

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const { error } = await supabase
          .from("pessoas")
          .update({ ...form })
          .eq("id", editTarget.id);
        if (error) throw error;
        toast({ title: "Pessoa atualizada com sucesso" });
      } else {
        const { error } = await supabase
          .from("pessoas")
          .insert({ ...form, user_id: user!.user_id });
        if (error) throw error;
        toast({ title: "Pessoa cadastrada com sucesso" });
      }
      setShowForm(false);
      fetchPessoas();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("pessoas").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast({ title: "Pessoa removida" });
      setDeleteTarget(null);
      fetchPessoas();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const filtered = pessoas.filter((p) =>
    p.nome.toLowerCase().includes(search.toLowerCase()) ||
    p.tipo.toLowerCase().includes(search.toLowerCase()) ||
    p.bairro.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Pessoas</h1>
            <p className="text-sm text-muted-foreground">{pessoas.length} cadastros no sistema</p>
          </div>
          <Button onClick={openCreate} className="gradient-primary text-primary-foreground border-0">
            <UserPlus className="w-4 h-4 mr-2" />
            Nova Pessoa
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pessoas..."
            className="w-full h-9 pl-10 pr-4 text-sm rounded-lg bg-muted/50 border border-border outline-none focus:ring-2 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/60"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((pessoa) => (
              <motion.div
                key={pessoa.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-5 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary-foreground">{pessoa.nome.charAt(0)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{pessoa.nome}</p>
                    <p className="text-xs text-muted-foreground">{pessoa.tipo}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(pessoa)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(pessoa)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {pessoa.telefone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 shrink-0" /> {pessoa.telefone}</p>}
                  {pessoa.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 shrink-0" /> {pessoa.email}</p>}
                  {(pessoa.bairro || pessoa.cidade) && (
                    <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 shrink-0" /> {[pessoa.bairro, pessoa.cidade].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                {pessoa.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pessoa.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary">{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {search ? "Nenhuma pessoa encontrada" : "Nenhuma pessoa cadastrada ainda. Clique em Nova Pessoa para começar."}
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Editar Pessoa" : "Nova Pessoa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nome *</label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full h-9 px-3 text-sm rounded-md border border-input bg-background text-foreground"
                >
                  <option value="">Selecionar...</option>
                  {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Telefone</label>
                <Input value={form.telefone} onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(92) 99999-9999" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground">Email</label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Bairro</label>
                <Input value={form.bairro} onChange={(e) => setForm((f) => ({ ...f, bairro: e.target.value }))} placeholder="Bairro" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Cidade</label>
                <Input value={form.cidade} onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                    placeholder="Adicionar tag e pressionar Enter"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}><Plus className="w-4 h-4" /></Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                        {tag}
                        <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover pessoa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Pessoas;
