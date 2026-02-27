import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CoordenacaoModuloLayout from "@/components/coordenacao/CoordenacaoModuloLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, AlertTriangle, CheckCircle2, User } from "lucide-react";
import { differenceInDays } from "date-fns";

interface Assessor { id: string; nome: string; coordenador_id: string | null; funcao: string; }
interface Coordenador { id: string; nome: string; calha_id: string | null; ultimo_contato: string | null; status: string; }
interface Calha { id: string; nome: string; }
interface Contato { id: string; coordenador_id: string | null; data_contato: string; user_id: string; }
interface Tarefa { id: string; coordenador_id: string | null; assessor_id: string | null; status: string; }

const META_SEMANAL = 4;

const CoordAssessores = () => {
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchData = async () => {
    const [a, co, ca, ct, tf] = await Promise.all([
      supabase.from("campanha_assessores").select("*").order("nome"),
      supabase.from("campanha_coordenadores").select("*").order("nome"),
      supabase.from("campanha_calhas").select("id, nome").order("nome"),
      supabase.from("campanha_contatos").select("id, coordenador_id, data_contato, user_id").order("data_contato", { ascending: false }),
      supabase.from("tarefas_coordenacao").select("id, coordenador_id, assessor_id, status"),
    ]);
    setAssessores((a.data as Assessor[]) || []);
    setCoordenadores((co.data as Coordenador[]) || []);
    setCalhas((ca.data as Calha[]) || []);
    setContatos((ct.data as Contato[]) || []);
    setTarefas((tf.data as Tarefa[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const calhaMap = Object.fromEntries(calhas.map(c => [c.id, c.nome]));

  // Each assessor is linked to one coordinator, but may cover multiple via the coord's calha
  // We consider an assessor responsible for their directly linked coordinator
  const getCoordsForAssessor = (assessorId: string) => {
    return coordenadores.filter(c => {
      const a = assessores.find(a => a.id === assessorId);
      return a && a.coordenador_id === c.id;
    });
  };

  // Get all coords where this assessor is referenced in assessores table
  const getAllCoordsForAssessor = (assessorId: string) => {
    const assessor = assessores.find(a => a.id === assessorId);
    if (!assessor?.coordenador_id) return [];
    // Also find coords who have this assessor via tarefas_coordenacao
    const directCoord = coordenadores.find(c => c.id === assessor.coordenador_id);
    const tarefaCoordIds = [...new Set(tarefas.filter(t => t.assessor_id === assessorId).map(t => t.coordenador_id))];
    const allIds = new Set([assessor.coordenador_id, ...tarefaCoordIds].filter(Boolean));
    return coordenadores.filter(c => allIds.has(c.id));
  };

  const getCalhasForAssessor = (assessorId: string) => {
    const coords = getAllCoordsForAssessor(assessorId);
    const calhaIds = [...new Set(coords.map(c => c.calha_id).filter(Boolean))];
    return calhaIds.length;
  };

  const contatosInDays = (assessorId: string, days: number) => {
    const coords = getAllCoordsForAssessor(assessorId);
    const coordIds = coords.map(c => c.id);
    return contatos.filter(c => coordIds.includes(c.coordenador_id || "") && differenceInDays(new Date(), new Date(c.data_contato)) <= days).length;
  };

  const alertCoords = (assessorId: string) => {
    const coords = getAllCoordsForAssessor(assessorId);
    return coords.filter(c => {
      if (!c.ultimo_contato) return true;
      return differenceInDays(new Date(), new Date(c.ultimo_contato)) > 7;
    });
  };

  const selected = selectedId ? assessores.find(a => a.id === selectedId) : null;

  if (selected) {
    const coords = getAllCoordsForAssessor(selected.id);
    const c7 = contatosInDays(selected.id, 7);
    const weekProgress = Math.min((c7 / META_SEMANAL) * 100, 100);
    const pendentes = tarefas.filter(t => t.assessor_id === selected.id && t.status !== "concluido").length;

    return (
      <CoordenacaoModuloLayout title="Detalhes do Assessor">
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                <div><p className="font-bold">{selected.nome}</p><p className="text-xs text-muted-foreground">{selected.funcao || "Assessor"}</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Meta Semanal</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-bold mb-1">{c7}/{META_SEMANAL} contatos</p>
              <Progress value={weekProgress} className="h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Tarefas Pendentes</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{pendentes}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Coordenadores sob Responsabilidade</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coordenador</TableHead>
                  <TableHead>Calha</TableHead>
                  <TableHead>Status de Contato</TableHead>
                  <TableHead>Tarefas Pendentes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coords.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum coordenador vinculado.</TableCell></TableRow>
                ) : coords.map(c => {
                  const d = c.ultimo_contato ? differenceInDays(new Date(), new Date(c.ultimo_contato)) : 999;
                  const tPend = tarefas.filter(t => t.coordenador_id === c.id && t.status !== "concluido").length;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nome}</TableCell>
                      <TableCell>{calhaMap[c.calha_id || ""] || "—"}</TableCell>
                      <TableCell>
                        {d <= 7 ? <Badge className="bg-green-500 text-white text-[10px]">{d}d</Badge>
                          : d <= 14 ? <Badge className="bg-yellow-500 text-white text-[10px]">{d}d</Badge>
                          : <Badge variant="destructive" className="text-[10px]">{d === 999 ? "Nunca" : `${d}d`}</Badge>}
                      </TableCell>
                      <TableCell>{tPend > 0 ? <Badge variant="outline">{tPend}</Badge> : <CheckCircle2 className="w-4 h-4 text-green-500" />}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </CoordenacaoModuloLayout>
    );
  }

  return (
    <CoordenacaoModuloLayout title="Assessores de Coordenação">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assessores</CardTitle>
          <CardDescription>Performance e cobertura de contato com coordenadores</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessor</TableHead>
                <TableHead className="text-center">Calhas</TableHead>
                <TableHead className="text-center">Coordenadores</TableHead>
                <TableHead className="text-center">Contatos 7d</TableHead>
                <TableHead className="text-center">Contatos 30d</TableHead>
                <TableHead className="text-center">Em Alerta</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessores.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum assessor.</TableCell></TableRow>
              ) : assessores.map(a => {
                const nCalhas = getCalhasForAssessor(a.id);
                const nCoords = getAllCoordsForAssessor(a.id).length;
                const c7 = contatosInDays(a.id, 7);
                const c30 = contatosInDays(a.id, 30);
                const alerts = alertCoords(a.id);
                return (
                  <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(a.id)}>
                    <TableCell className="font-medium">{a.nome}</TableCell>
                    <TableCell className="text-center">{nCalhas}</TableCell>
                    <TableCell className="text-center">{nCoords}</TableCell>
                    <TableCell className="text-center">{c7}</TableCell>
                    <TableCell className="text-center">{c30}</TableCell>
                    <TableCell className="text-center">
                      {alerts.length > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-sm text-destructive font-medium">{alerts.length}</span>
                        </div>
                      ) : <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />}
                    </TableCell>
                    <TableCell><Button size="sm" variant="ghost">Ver</Button></TableCell>
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

export default CoordAssessores;
