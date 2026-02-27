import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CoordenacaoModuloLayout from "@/components/coordenacao/CoordenacaoModuloLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Eye, ChevronLeft, MapPin, Users, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format } from "date-fns";

interface Calha {
  id: string; nome: string; municipios: number; votos_validos: number;
  percentual_cristaos: number; potencial_votos: number; regiao: string;
}
interface Coordenador { id: string; nome: string; calha_id: string | null; ultimo_contato: string | null; }
interface Assessor { id: string; nome: string; coordenador_id: string | null; }
interface Municipio { id: string; calha_id: string | null; nome: string; votos_validos: number; percentual_cristaos: number; apoiadores_estimados: number; }

const CoordCalhasMunicipios = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [selectedCalha, setSelectedCalha] = useState<Calha | null>(null);
  const [munForm, setMunForm] = useState({ nome: "", votos_validos: 0, percentual_cristaos: 0, apoiadores_estimados: 0 });
  const [munOpen, setMunOpen] = useState(false);
  const [editMunId, setEditMunId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isGestor = user?.role === "Gestor";

  const fetchData = async () => {
    const [ca, co, as_, mu] = await Promise.all([
      supabase.from("campanha_calhas").select("*").order("nome"),
      supabase.from("campanha_coordenadores").select("id, nome, calha_id, ultimo_contato").order("nome"),
      supabase.from("campanha_assessores").select("id, nome, coordenador_id").order("nome"),
      supabase.from("campanha_municipios").select("*").order("nome"),
    ]);
    setCalhas((ca.data as Calha[]) || []);
    setCoordenadores((co.data as Coordenador[]) || []);
    setAssessores((as_.data as Assessor[]) || []);
    setMunicipios((mu.data as Municipio[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const getCoordForCalha = (calhaId: string) => coordenadores.find(c => c.calha_id === calhaId);
  const getAssessorForCoord = (coordId: string) => assessores.find(a => a.coordenador_id === coordId);
  const getMunicipiosForCalha = (calhaId: string) => municipios.filter(m => m.calha_id === calhaId);

  const contatoStatus = (uc: string | null) => {
    if (!uc) return { label: "Nunca", color: "bg-destructive text-destructive-foreground", days: 999 };
    const d = differenceInDays(new Date(), new Date(uc));
    if (d <= 7) return { label: `${d}d`, color: "bg-green-500 text-white", days: d };
    if (d <= 14) return { label: `${d}d`, color: "bg-yellow-500 text-white", days: d };
    return { label: `${d}d`, color: "bg-destructive text-destructive-foreground", days: d };
  };

  const handleSaveMun = async () => {
    if (!munForm.nome.trim() || !selectedCalha) return;
    const payload = { ...munForm, calha_id: selectedCalha.id };
    if (editMunId) {
      await supabase.from("campanha_municipios").update(payload).eq("id", editMunId);
    } else {
      await supabase.from("campanha_municipios").insert(payload);
    }
    setMunOpen(false); setMunForm({ nome: "", votos_validos: 0, percentual_cristaos: 0, apoiadores_estimados: 0 }); setEditMunId(null);
    fetchData(); toast({ title: editMunId ? "Município atualizado" : "Município adicionado" });
  };

  if (selectedCalha) {
    const coord = getCoordForCalha(selectedCalha.id);
    const assessor = coord ? getAssessorForCoord(coord.id) : null;
    const muns = getMunicipiosForCalha(selectedCalha.id);
    const totalVotos = muns.reduce((s, m) => s + m.votos_validos, 0) || selectedCalha.votos_validos;
    const avgCristaos = muns.length > 0 ? muns.reduce((s, m) => s + Number(m.percentual_cristaos), 0) / muns.length : Number(selectedCalha.percentual_cristaos);

    return (
      <CoordenacaoModuloLayout title="Detalhes da Calha">
        <Button variant="ghost" size="sm" onClick={() => setSelectedCalha(null)} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Calha</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{selectedCalha.nome}</p>
              <p className="text-sm text-muted-foreground">{selectedCalha.regiao}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Votos Válidos</CardTitle></CardHeader>
            <CardContent><p className="text-xl font-bold">{totalVotos.toLocaleString("pt-BR")}</p><p className="text-sm text-muted-foreground">{avgCristaos.toFixed(1)}% cristãos</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Responsáveis</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground" /><span className="text-sm font-medium">{coord?.nome || "Sem coordenador"}</span></div>
              <div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{assessor?.nome || "Sem assessor"}</span></div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Municípios da Calha</CardTitle>
              <CardDescription>{muns.length} município(s)</CardDescription>
            </div>
            {isGestor && (
              <Dialog open={munOpen} onOpenChange={(o) => { setMunOpen(o); if (!o) { setMunForm({ nome: "", votos_validos: 0, percentual_cristaos: 0, apoiadores_estimados: 0 }); setEditMunId(null); } }}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Município</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editMunId ? "Editar" : "Novo"} Município</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nome</Label><Input value={munForm.nome} onChange={e => setMunForm({ ...munForm, nome: e.target.value })} /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Votos Válidos</Label><Input type="number" value={munForm.votos_validos} onChange={e => setMunForm({ ...munForm, votos_validos: +e.target.value })} /></div>
                      <div><Label>% Cristãos</Label><Input type="number" step="0.1" value={munForm.percentual_cristaos} onChange={e => setMunForm({ ...munForm, percentual_cristaos: +e.target.value })} /></div>
                      <div><Label>Apoiadores Est.</Label><Input type="number" value={munForm.apoiadores_estimados} onChange={e => setMunForm({ ...munForm, apoiadores_estimados: +e.target.value })} /></div>
                    </div>
                    <Button onClick={handleSaveMun} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Município</TableHead>
                  <TableHead className="text-right">Votos Válidos</TableHead>
                  <TableHead className="text-right">% Cristãos</TableHead>
                  <TableHead className="text-right">Apoiadores Est.</TableHead>
                  {isGestor && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {muns.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum município cadastrado para esta calha.</TableCell></TableRow>
                ) : muns.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium"><MapPin className="w-3.5 h-3.5 inline mr-1 text-muted-foreground" />{m.nome}</TableCell>
                    <TableCell className="text-right">{m.votos_validos.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{Number(m.percentual_cristaos).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{m.apoiadores_estimados}</TableCell>
                    {isGestor && (
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => { setMunForm({ nome: m.nome, votos_validos: m.votos_validos, percentual_cristaos: Number(m.percentual_cristaos), apoiadores_estimados: m.apoiadores_estimados }); setEditMunId(m.id); setMunOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CoordenacaoModuloLayout>
    );
  }

  return (
    <CoordenacaoModuloLayout title="Calhas e Municípios">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calhas Eleitorais</CardTitle>
          <CardDescription>Visão completa das calhas com coordenadores e status de contato</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Calha</TableHead>
                <TableHead>Municípios</TableHead>
                <TableHead className="text-right">Votos</TableHead>
                <TableHead className="text-right">% Cristãos</TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {calhas.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma calha cadastrada.</TableCell></TableRow>
              ) : calhas.map(c => {
                const coord = getCoordForCalha(c.id);
                const muns = getMunicipiosForCalha(c.id);
                const status = contatoStatus(coord?.ultimo_contato || null);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedCalha(c)}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {muns.length > 0 ? muns.map(m => (
                          <Badge key={m.id} variant="outline" className="text-[10px]">{m.nome}</Badge>
                        )) : (
                          <span className="text-xs text-muted-foreground">{c.municipios} mun.</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{c.votos_validos.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{Number(c.percentual_cristaos).toFixed(1)}%</TableCell>
                    <TableCell>{coord?.nome || <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell>
                      {coord?.ultimo_contato ? format(new Date(coord.ultimo_contato), "dd/MM") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} text-[10px]`}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedCalha(c); }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CoordenacaoModuloLayout>
  );
};

export default CoordCalhasMunicipios;
