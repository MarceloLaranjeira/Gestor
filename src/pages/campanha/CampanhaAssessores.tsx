import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Assessor { id: string; nome: string; telefone: string; email: string; coordenador_id: string | null; funcao: string; }
interface Coordenador { id: string; nome: string; }

const emptyForm = { nome: "", telefone: "", email: "", coordenador_id: "" as string, funcao: "" };

const CampanhaAssessores = () => {
  const [items, setItems] = useState<Assessor[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isGestor = user?.role === "Gestor";

  const fetchData = async () => {
    const [a, c] = await Promise.all([
      supabase.from("campanha_assessores").select("*").order("nome"),
      supabase.from("campanha_coordenadores").select("id, nome").order("nome"),
    ]);
    setItems((a.data as Assessor[]) || []);
    setCoordenadores((c.data as Coordenador[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const coordMap = Object.fromEntries(coordenadores.map((c) => [c.id, c.nome]));

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const payload = { ...form, coordenador_id: form.coordenador_id || null };
    if (editId) {
      await supabase.from("campanha_assessores").update(payload).eq("id", editId);
    } else {
      await supabase.from("campanha_assessores").insert(payload);
    }
    setOpen(false); setForm(emptyForm); setEditId(null); fetchData();
    toast({ title: editId ? "Atualizado" : "Criado" });
  };

  const handleEdit = (a: Assessor) => {
    setForm({ nome: a.nome, telefone: a.telefone, email: a.email, coordenador_id: a.coordenador_id || "", funcao: a.funcao });
    setEditId(a.id); setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("campanha_assessores").delete().eq("id", deleteTarget);
    setDeleteTarget(null);
    fetchData(); toast({ title: "Removido" });
  };

  return (
    <CampanhaLayout title="Assessores">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Assessores de Campanha</CardTitle>
          {isGestor && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Assessor</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                    <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  </div>
                  <div><Label>Função</Label><Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} /></div>
                  <div><Label>Coordenador</Label>
                    <Select value={form.coordenador_id} onValueChange={(v) => setForm({ ...form, coordenador_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{coordenadores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSave} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead>Telefone</TableHead>
                {isGestor && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum assessor.</TableCell></TableRow>
              ) : items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nome}</TableCell>
                  <TableCell>{a.funcao || "—"}</TableCell>
                  <TableCell>{coordMap[a.coordenador_id || ""] || "—"}</TableCell>
                  <TableCell>{a.telefone}</TableCell>
                  {isGestor && (
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(a)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este assessor? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CampanhaLayout>
  );
};

export default CampanhaAssessores;
