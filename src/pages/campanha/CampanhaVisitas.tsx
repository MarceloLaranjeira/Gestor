import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Visita { id: string; calha_id: string | null; coordenador_id: string | null; user_id: string; data_visita: string; objetivo: string; status: string; observacoes: string; }
interface Ref { id: string; nome: string; }

const emptyForm = { calha_id: "", coordenador_id: "", data_visita: "", objetivo: "", status: "planejada", observacoes: "" };

const statusColors: Record<string, "default" | "secondary" | "destructive"> = { planejada: "secondary", realizada: "default", cancelada: "destructive" };

const CampanhaVisitas = () => {
  const [items, setItems] = useState<Visita[]>([]);
  const [calhas, setCalhas] = useState<Ref[]>([]);
  const [coordenadores, setCoordenadores] = useState<Ref[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    const [v, ca, co] = await Promise.all([
      supabase.from("campanha_visitas").select("*").order("data_visita", { ascending: false }),
      supabase.from("campanha_calhas").select("id, nome").order("nome"),
      supabase.from("campanha_coordenadores").select("id, nome").order("nome"),
    ]);
    setItems((v.data as Visita[]) || []);
    setCalhas((ca.data as Ref[]) || []);
    setCoordenadores((co.data as Ref[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const calhaMap = Object.fromEntries(calhas.map((c) => [c.id, c.nome]));
  const coordMap = Object.fromEntries(coordenadores.map((c) => [c.id, c.nome]));

  const handleSave = async () => {
    if (!form.data_visita) { toast({ title: "Data obrigatória", variant: "destructive" }); return; }
    const payload = { ...form, calha_id: form.calha_id || null, coordenador_id: form.coordenador_id || null, user_id: user!.user_id };
    if (editId) {
      const { user_id, ...upd } = payload;
      await supabase.from("campanha_visitas").update(upd).eq("id", editId);
    } else {
      await supabase.from("campanha_visitas").insert(payload);
    }
    setOpen(false); setForm(emptyForm); setEditId(null); fetchData();
    toast({ title: editId ? "Atualizada" : "Criada" });
  };

  const handleEdit = (v: Visita) => {
    setForm({ calha_id: v.calha_id || "", coordenador_id: v.coordenador_id || "", data_visita: v.data_visita, objetivo: v.objetivo, status: v.status, observacoes: v.observacoes });
    setEditId(v.id); setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase.from("campanha_visitas").delete().eq("id", deleteTarget);
    setDeleteTarget(null);
    fetchData(); toast({ title: "Removida" });
  };

  return (
    <CampanhaLayout title="Planejamento de Visitas">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Visitas</CardTitle>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Visita</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} Visita</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Data</Label><Input type="date" value={form.data_visita} onChange={(e) => setForm({ ...form, data_visita: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Calha</Label>
                    <Select value={form.calha_id} onValueChange={(v) => setForm({ ...form, calha_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{calhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Coordenador</Label>
                    <Select value={form.coordenador_id} onValueChange={(v) => setForm({ ...form, coordenador_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{coordenadores.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Objetivo</Label><Input value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planejada">Planejada</SelectItem>
                      <SelectItem value="realizada">Realizada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Calha</TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma visita.</TableCell></TableRow>
              ) : items.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>{format(new Date(v.data_visita + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{calhaMap[v.calha_id || ""] || "—"}</TableCell>
                  <TableCell>{coordMap[v.coordenador_id || ""] || "—"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{v.objetivo}</TableCell>
                  <TableCell><Badge variant={statusColors[v.status] || "secondary"}>{v.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(v)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
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
            <AlertDialogDescription>Tem certeza que deseja remover esta visita? Esta ação não pode ser desfeita.</AlertDialogDescription>
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

export default CampanhaVisitas;
