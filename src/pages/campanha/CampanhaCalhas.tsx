import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Calha {
  id: string;
  nome: string;
  municipios: number;
  votos_validos: number;
  percentual_cristaos: number;
  potencial_votos: number;
  regiao: string;
  latitude: number | null;
  longitude: number | null;
}

const emptyForm = { nome: "", municipios: 0, votos_validos: 0, percentual_cristaos: 0, potencial_votos: 0, regiao: "", latitude: "" as string, longitude: "" as string };

const CampanhaCalhas = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();
  const isGestor = user?.role === "Gestor";

  const fetchData = async () => {
    const { data } = await supabase.from("campanha_calhas").select("*").order("nome");
    setCalhas((data as Calha[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return; }
    const payload = { ...form, latitude: form.latitude ? +form.latitude : null, longitude: form.longitude ? +form.longitude : null };
    if (editId) {
      await supabase.from("campanha_calhas").update(payload).eq("id", editId);
    } else {
      await supabase.from("campanha_calhas").insert(payload);
    }
    setOpen(false);
    setForm(emptyForm);
    setEditId(null);
    fetchData();
    toast({ title: editId ? "Calha atualizada" : "Calha criada" });
  };

  const handleEdit = (c: Calha) => {
    setForm({ nome: c.nome, municipios: c.municipios, votos_validos: c.votos_validos, percentual_cristaos: Number(c.percentual_cristaos), potencial_votos: c.potencial_votos, regiao: c.regiao, latitude: c.latitude != null ? String(c.latitude) : "", longitude: c.longitude != null ? String(c.longitude) : "" });
    setEditId(c.id);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("campanha_calhas").delete().eq("id", id);
    fetchData();
    toast({ title: "Calha removida" });
  };

  return (
    <CampanhaLayout title="Calhas Eleitorais">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Calhas</CardTitle>
          {isGestor && (
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setForm(emptyForm); setEditId(null); } }}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Calha</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} Calha</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Municípios</Label><Input type="number" value={form.municipios} onChange={(e) => setForm({ ...form, municipios: +e.target.value })} /></div>
                    <div><Label>Votos Válidos</Label><Input type="number" value={form.votos_validos} onChange={(e) => setForm({ ...form, votos_validos: +e.target.value })} /></div>
                    <div><Label>% Cristãos</Label><Input type="number" step="0.1" value={form.percentual_cristaos} onChange={(e) => setForm({ ...form, percentual_cristaos: +e.target.value })} /></div>
                    <div><Label>Potencial Votos</Label><Input type="number" value={form.potencial_votos} onChange={(e) => setForm({ ...form, potencial_votos: +e.target.value })} /></div>
                  </div>
                  <div><Label>Região</Label><Input value={form.regiao} onChange={(e) => setForm({ ...form, regiao: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Latitude</Label><Input type="number" step="any" placeholder="-3.1190" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></div>
                    <div><Label>Longitude</Label><Input type="number" step="any" placeholder="-60.0217" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
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
                <TableHead>Região</TableHead>
                <TableHead className="text-right">Municípios</TableHead>
                <TableHead className="text-right">Votos</TableHead>
                <TableHead className="text-right">% Cristãos</TableHead>
                <TableHead className="text-right">Potencial</TableHead>
                {isGestor && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {calhas.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma calha cadastrada.</TableCell></TableRow>
              ) : calhas.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.regiao}</TableCell>
                  <TableCell className="text-right">{c.municipios}</TableCell>
                  <TableCell className="text-right">{c.votos_validos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(c.percentual_cristaos).toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{c.potencial_votos.toLocaleString("pt-BR")}</TableCell>
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

export default CampanhaCalhas;
