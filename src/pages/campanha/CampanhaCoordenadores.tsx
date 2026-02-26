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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";

interface Coordenador {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  calha_id: string | null;
  ultimo_contato: string | null;
  status: string;
}

interface Calha { id: string; nome: string; }

const emptyForm = { nome: "", telefone: "", email: "", calha_id: "" as string, status: "ativo" };

const CampanhaCoordenadores = () => {
  const [items, setItems] = useState<Coordenador[]>([]);
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isGestor = user?.role === "Gestor";

  const fetchData = async () => {
    const [c, ca] = await Promise.all([
      supabase.from("campanha_coordenadores").select("*").order("nome"),
      supabase.from("campanha_calhas").select("id, nome").order("nome"),
    ]);
    setItems((c.data as Coordenador[]) || []);
    setCalhas((ca.data as Calha[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const calhaMap = Object.fromEntries(calhas.map((c) => [c.id, c.nome]));

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const payload = { ...form, calha_id: form.calha_id || null };
    if (editId) {
      await supabase.from("campanha_coordenadores").update(payload).eq("id", editId);
    } else {
      await supabase.from("campanha_coordenadores").insert(payload);
    }
    setOpen(false); setForm(emptyForm); setEditId(null); fetchData();
    toast({ title: editId ? "Atualizado" : "Criado" });
  };

  const handleEdit = (c: Coordenador) => {
    setForm({ nome: c.nome, telefone: c.telefone, email: c.email, calha_id: c.calha_id || "", status: c.status });
    setEditId(c.id); setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("campanha_coordenadores").delete().eq("id", id);
    fetchData(); toast({ title: "Removido" });
  };

  const contatoBadge = (uc: string | null) => {
    if (!uc) return <Badge variant="destructive" className="text-[10px]">Nunca</Badge>;
    const d = differenceInDays(new Date(), new Date(uc));
    if (d > 7) return <Badge variant="destructive" className="text-[10px]">{d}d</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{format(new Date(uc), "dd/MM")}</Badge>;
  };

  return (
    <CampanhaLayout title="Coordenadores">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Coordenadores de Campanha</CardTitle>
          {isGestor && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Coordenador</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                    <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  </div>
                  <div><Label>Calha</Label>
                    <Select value={form.calha_id} onValueChange={(v) => setForm({ ...form, calha_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{calhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
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
                <TableHead>Calha</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead>Status</TableHead>
                {isGestor && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum coordenador.</TableCell></TableRow>
              ) : items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{calhaMap[c.calha_id || ""] || "—"}</TableCell>
                  <TableCell>{c.telefone}</TableCell>
                  <TableCell>{contatoBadge(c.ultimo_contato)}</TableCell>
                  <TableCell><Badge variant={c.status === "ativo" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  {isGestor && (
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(c)}><Pencil className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CampanhaLayout>
  );
};

export default CampanhaCoordenadores;
