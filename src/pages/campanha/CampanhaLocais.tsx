import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Local {
  id: string;
  nome: string;
  endereco: string;
  latitude: number;
  longitude: number;
  tipo: string;
  descricao: string;
  calha_id: string | null;
  created_at: string;
}

interface Calha {
  id: string;
  nome: string;
}

const TIPOS = [
  { value: "ponto_de_apoio", label: "Ponto de Apoio" },
  { value: "igreja", label: "Igreja" },
  { value: "comite", label: "Comitê" },
  { value: "evento", label: "Local de Evento" },
  { value: "lideranca", label: "Liderança" },
  { value: "outro", label: "Outro" },
];

const CampanhaLocais = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [locais, setLocais] = useState<Local[]>([]);
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    latitude: "",
    longitude: "",
    tipo: "ponto_de_apoio",
    descricao: "",
    calha_id: "",
  });

  const fetchData = async () => {
    const [l, c] = await Promise.all([
      supabase.from("campanha_locais").select("*").order("created_at", { ascending: false }),
      supabase.from("campanha_calhas").select("id, nome").order("nome"),
    ]);
    setLocais((l.data as Local[]) || []);
    setCalhas((c.data as Calha[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=br&limit=5`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      toast.error("Erro ao buscar endereço");
    }
    setSearching(false);
  };

  const selectSearchResult = (result: any) => {
    setForm((f) => ({
      ...f,
      endereco: result.display_name,
      latitude: result.lat,
      longitude: result.lon,
      nome: f.nome || result.display_name.split(",")[0],
    }));
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleSave = async () => {
    if (!form.nome || !form.latitude || !form.longitude) {
      toast.error("Preencha nome e coordenadas (use a busca de endereço)");
      return;
    }
    const { error } = await supabase.from("campanha_locais").insert({
      nome: form.nome,
      endereco: form.endereco,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      tipo: form.tipo,
      descricao: form.descricao,
      calha_id: form.calha_id || null,
      user_id: user!.user_id,
    });
    if (error) {
      toast.error("Erro ao salvar local");
      return;
    }
    toast.success("Local adicionado!");
    setForm({ nome: "", endereco: "", latitude: "", longitude: "", tipo: "ponto_de_apoio", descricao: "", calha_id: "" });
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("campanha_locais").delete().eq("id", id);
    toast.success("Local removido");
    fetchData();
  };

  const tipoLabel = (t: string) => TIPOS.find((x) => x.value === t)?.label || t;
  const calhaMap = Object.fromEntries(calhas.map((c) => [c.id, c.nome]));
  const filteredLocais = locais;

  return (
    <CampanhaLayout title="Locais Mapeados">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{locais.length} locais cadastrados</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo Local</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Adicionar Local</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {/* Address search */}
              <div>
                <Label>Buscar endereço</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: Av. Eduardo Ribeiro, Manaus"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button size="icon" variant="outline" onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-2 border rounded-md divide-y max-h-40 overflow-y-auto">
                    {searchResults.map((r: any, i: number) => (
                      <button
                        key={i}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors"
                        onClick={() => selectSearchResult(r)}
                      >
                        <MapPin className="w-3 h-3 inline mr-1 text-primary" />
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label>Nome do local</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
              </div>
              <div>
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Latitude</Label>
                  <Input value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Calha (opcional)</Label>
                <Select value={form.calha_id} onValueChange={(v) => setForm((f) => ({ ...f, calha_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    {calhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} />
              </div>
              <Button onClick={handleSave} className="w-full">Salvar Local</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredLocais.map((l) => (
          <Card key={l.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/campanha/mapa?lat=${l.latitude}&lng=${l.longitude}&nome=${encodeURIComponent(l.nome)}`)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {l.nome}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{l.endereco}</p>
                  <div className="flex gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px]">{tipoLabel(l.tipo)}</Badge>
                    {l.calha_id && calhaMap[l.calha_id] && (
                      <Badge variant="outline" className="text-[10px]">{calhaMap[l.calha_id]}</Badge>
                    )}
                  </div>
                  {l.descricao && <p className="text-xs text-muted-foreground mt-1">{l.descricao}</p>}
                </div>
                <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDelete(l.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && locais.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-full text-center py-8">Nenhum local cadastrado ainda.</p>
        )}
      </div>
    </CampanhaLayout>
  );
};

export default CampanhaLocais;
