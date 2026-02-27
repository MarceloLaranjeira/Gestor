import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navigation, Trophy, Calendar, MapPin, Star, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Calha { id: string; nome: string; votos_validos: number; percentual_cristaos: number; potencial_votos: number; regiao: string; }
interface Coordenador { id: string; nome: string; calha_id: string | null; }
interface Assessor { id: string; nome: string; coordenador_id: string | null; }
interface Municipio { id: string; calha_id: string | null; nome: string; votos_validos: number; }
interface Visita { id: string; calha_id: string | null; data_visita: string; status: string; observacoes: string; }

const CoordPlanejamentoVisitas = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [numVisitas, setNumVisitas] = useState(2);
  const [pesoVotos, setPesoVotos] = useState(60);
  const [agendarCalha, setAgendarCalha] = useState<string | null>(null);
  const [agendarForm, setAgendarForm] = useState({ data_visita: "", observacoes: "" });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    const [ca, co, as_, mu, vi] = await Promise.all([
      supabase.from("campanha_calhas").select("*").order("nome"),
      supabase.from("campanha_coordenadores").select("id, nome, calha_id").order("nome"),
      supabase.from("campanha_assessores").select("id, nome, coordenador_id").order("nome"),
      supabase.from("campanha_municipios").select("*").order("nome"),
      supabase.from("campanha_visitas").select("*").order("data_visita", { ascending: false }),
    ]);
    setCalhas((ca.data as Calha[]) || []);
    setCoordenadores((co.data as Coordenador[]) || []);
    setAssessores((as_.data as Assessor[]) || []);
    setMunicipios((mu.data as Municipio[]) || []);
    setVisitas((vi.data as Visita[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const pesoCristao = 100 - pesoVotos;
  const getCoord = (calhaId: string) => coordenadores.find(c => c.calha_id === calhaId);
  const getAssessor = (coordId: string) => assessores.find(a => a.coordenador_id === coordId);
  const getMunicipios = (calhaId: string) => municipios.filter(m => m.calha_id === calhaId);

  const ranked = useMemo(() => {
    const maxVotos = Math.max(...calhas.map(c => c.votos_validos), 1);
    const maxCristaos = Math.max(...calhas.map(c => Number(c.percentual_cristaos)), 1);

    return calhas.map(c => {
      const normVotos = c.votos_validos / maxVotos;
      const normCristaos = Number(c.percentual_cristaos) / maxCristaos;
      const score = (normVotos * pesoVotos) + (normCristaos * pesoCristao);
      return { ...c, score };
    }).sort((a, b) => b.score - a.score);
  }, [calhas, pesoVotos, pesoCristao]);

  const recomendadas = ranked.slice(0, numVisitas);

  const handleAgendar = async () => {
    if (!agendarCalha || !agendarForm.data_visita || !user) return;
    const coord = getCoord(agendarCalha);
    await supabase.from("campanha_visitas").insert({
      calha_id: agendarCalha, coordenador_id: coord?.id || null,
      data_visita: agendarForm.data_visita, objetivo: "Visita estratégica do Comandante",
      status: "planejada", observacoes: agendarForm.observacoes, user_id: user.user_id,
    });
    setAgendarCalha(null); setAgendarForm({ data_visita: "", observacoes: "" });
    fetchData(); toast({ title: "Visita agendada com sucesso!" });
  };

  const visitasAgendadas = visitas.filter(v => v.status === "planejada");

  return (
    <CampanhaLayout title="Planejamento de Visitas do Comandante">
      {/* Parâmetros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" /> Parâmetros de Decisão</CardTitle>
          <CardDescription>Configure o número de visitas e os pesos para a recomendação estratégica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Número de visitas disponíveis: <strong>{numVisitas}</strong></Label>
            <Slider value={[numVisitas]} onValueChange={v => setNumVisitas(v[0])} min={1} max={3} step={1} className="max-w-xs" />
          </div>
          <div>
            <Label className="mb-2 block">Peso: Votos ({pesoVotos}%) vs Cristãos ({pesoCristao}%)</Label>
            <Slider value={[pesoVotos]} onValueChange={v => setPesoVotos(v[0])} min={0} max={100} step={5} className="max-w-md" />
            <div className="flex justify-between text-xs text-muted-foreground max-w-md mt-1">
              <span>Maximizar votos</span>
              <span>Maximizar cristãos</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Calhas Recomendadas</CardTitle>
          <CardDescription>Top {numVisitas} calhas com maior pontuação estratégica</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recomendadas.map((c, i) => {
              const coord = getCoord(c.id);
              const assessor = coord ? getAssessor(coord.id) : null;
              const muns = getMunicipios(c.id);
              return (
                <div key={c.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Star className={`w-4 h-4 ${i === 0 ? "text-yellow-500" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-bold">{c.nome}</p>
                        <p className="text-sm text-muted-foreground">{c.regiao}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono">Score: {c.score.toFixed(1)}</Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div><p className="text-xs text-muted-foreground">Votos Válidos</p><p className="font-bold">{c.votos_validos.toLocaleString("pt-BR")}</p></div>
                    <div><p className="text-xs text-muted-foreground">% Cristãos</p><p className="font-bold">{Number(c.percentual_cristaos).toFixed(1)}%</p></div>
                    <div><p className="text-xs text-muted-foreground">Coordenador</p><p className="text-sm font-medium">{coord?.nome || "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Assessor</p><p className="text-sm">{assessor?.nome || "—"}</p></div>
                  </div>

                  {muns.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {muns.map(m => <Badge key={m.id} variant="outline" className="text-[10px]"><MapPin className="w-3 h-3 mr-0.5" />{m.nome}</Badge>)}
                    </div>
                  )}

                  <div className="mt-3 p-2 rounded bg-muted/50 flex items-start gap-2">
                    <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      Recomendada pela combinação de {c.votos_validos.toLocaleString("pt-BR")} votos válidos
                      e {Number(c.percentual_cristaos).toFixed(1)}% de cristãos. Peso aplicado: {pesoVotos}% votos / {pesoCristao}% cristãos.
                    </p>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button size="sm" onClick={() => setAgendarCalha(c.id)}>
                      <Calendar className="w-4 h-4 mr-1" /> Agendar Visita
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visitas agendadas */}
      {visitasAgendadas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas Agendadas</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Calha</TableHead>
                  <TableHead>Coordenador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitasAgendadas.map(v => {
                  const calha = calhas.find(c => c.id === v.calha_id);
                  const coord = v.calha_id ? getCoord(v.calha_id) : null;
                  return (
                    <TableRow key={v.id}>
                      <TableCell>{format(new Date(v.data_visita + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{calha?.nome || "—"}</TableCell>
                      <TableCell>{coord?.nome || "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{v.status}</Badge></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{v.observacoes || "—"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Ranking completo */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Ranking Completo de Calhas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Calha</TableHead>
                <TableHead>Região</TableHead>
                <TableHead className="text-right">Votos</TableHead>
                <TableHead className="text-right">% Cristãos</TableHead>
                <TableHead className="text-right">Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((c, i) => (
                <TableRow key={c.id} className={i < numVisitas ? "bg-primary/5 font-medium" : ""}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>{c.nome}</TableCell>
                  <TableCell>{c.regiao}</TableCell>
                  <TableCell className="text-right">{c.votos_validos.toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-right">{Number(c.percentual_cristaos).toFixed(1)}%</TableCell>
                  <TableCell className="text-right font-mono">{c.score.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog agendar */}
      <Dialog open={!!agendarCalha} onOpenChange={o => { if (!o) setAgendarCalha(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agendar Visita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Data da Visita</Label><Input type="date" value={agendarForm.data_visita} onChange={e => setAgendarForm({ ...agendarForm, data_visita: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={agendarForm.observacoes} onChange={e => setAgendarForm({ ...agendarForm, observacoes: e.target.value })} placeholder="Municípios prioritários, pontos de atenção..." /></div>
            <Button onClick={handleAgendar} className="w-full">Confirmar Agendamento</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CampanhaLayout>
  );
};

export default CoordPlanejamentoVisitas;
