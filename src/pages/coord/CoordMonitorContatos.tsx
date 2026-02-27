import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Clock, Phone, MessageSquare, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format } from "date-fns";

interface Coordenador { id: string; nome: string; telefone: string; calha_id: string | null; ultimo_contato: string | null; status: string; }
interface Calha { id: string; nome: string; }
interface Assessor { id: string; nome: string; coordenador_id: string | null; }
interface Contato { id: string; coordenador_id: string | null; data_contato: string; user_id: string; }

const CoordMonitorContatos = () => {
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [filterAssessor, setFilterAssessor] = useState("all");
  const [filterCalha, setFilterCalha] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [contatoDialog, setContatoDialog] = useState<string | null>(null);
  const [contatoForm, setContatoForm] = useState({ tipo: "mensagem", resumo: "", observacoes: "" });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    const [co, ca, as_, ct] = await Promise.all([
      supabase.from("campanha_coordenadores").select("*").order("nome"),
      supabase.from("campanha_calhas").select("id, nome").order("nome"),
      supabase.from("campanha_assessores").select("id, nome, coordenador_id").order("nome"),
      supabase.from("campanha_contatos").select("id, coordenador_id, data_contato, user_id").order("data_contato", { ascending: false }),
    ]);
    setCoordenadores((co.data as Coordenador[]) || []);
    setCalhas((ca.data as Calha[]) || []);
    setAssessores((as_.data as Assessor[]) || []);
    setContatos((ct.data as Contato[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const calhaMap = Object.fromEntries(calhas.map(c => [c.id, c.nome]));
  const getAssessor = (coordId: string) => assessores.find(a => a.coordenador_id === coordId);

  const getDays = (uc: string | null) => {
    if (!uc) return 999;
    return differenceInDays(new Date(), new Date(uc));
  };

  const getStatusLabel = (days: number) => {
    if (days <= 7) return "verde";
    if (days <= 14) return "amarelo";
    return "vermelho";
  };

  const filtered = coordenadores
    .map(c => ({ ...c, days: getDays(c.ultimo_contato), assessor: getAssessor(c.id) }))
    .filter(c => {
      if (filterAssessor !== "all" && c.assessor?.id !== filterAssessor) return false;
      if (filterCalha !== "all" && c.calha_id !== filterCalha) return false;
      if (filterStatus !== "all" && getStatusLabel(c.days) !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => b.days - a.days);

  const emDia = coordenadores.filter(c => getDays(c.ultimo_contato) <= 7).length;
  const atencao = coordenadores.filter(c => { const d = getDays(c.ultimo_contato); return d > 7 && d <= 14; }).length;
  const alerta = coordenadores.filter(c => getDays(c.ultimo_contato) > 14).length;

  // Top assessores
  const assessorStats = assessores.map(a => {
    const coords = coordenadores.filter(c => getAssessor(c.id)?.id === a.id);
    const coordIds = coords.map(c => c.id);
    const c7 = contatos.filter(c => coordIds.includes(c.coordenador_id || "") && differenceInDays(new Date(), new Date(c.data_contato)) <= 7).length;
    return { ...a, contatos7d: c7, coordCount: coords.length };
  }).sort((a, b) => b.contatos7d - a.contatos7d);

  const handleRegistrar = async () => {
    if (!contatoDialog || !user) return;
    await supabase.from("campanha_contatos").insert({
      coordenador_id: contatoDialog, tipo: contatoForm.tipo,
      observacoes: contatoForm.observacoes, resumo: contatoForm.resumo, user_id: user.user_id,
    });
    await supabase.from("campanha_coordenadores").update({ ultimo_contato: new Date().toISOString() }).eq("id", contatoDialog);
    setContatoDialog(null); setContatoForm({ tipo: "mensagem", resumo: "", observacoes: "" });
    fetchData(); toast({ title: "Contato registrado" });
  };

  const handleCobrar = async (coordId: string) => {
    if (!user) return;
    const assessor = getAssessor(coordId);
    const coord = coordenadores.find(c => c.id === coordId);
    await supabase.from("tarefas_coordenacao").insert({
      coordenador_id: coordId, assessor_id: assessor?.id || null,
      titulo: `Entrar em contato com ${coord?.nome || "coordenador"}`,
      descricao: "Tarefa gerada automaticamente pelo Monitor de Contatos.", status: "pendente", user_id: user.user_id,
    });
    toast({ title: "Cobrança enviada", description: `Tarefa criada para ${assessor?.nome || "assessor"}` });
  };

  const whatsappLink = (tel: string) => `https://wa.me/55${tel.replace(/\D/g, "")}`;

  return (
    <CampanhaLayout title="Monitor de Contatos">
      {/* Indicadores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{emDia}</p><p className="text-sm text-muted-foreground">Em dia (&lt;7d)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold">{atencao}</p><p className="text-sm text-muted-foreground">Atenção (7-14d)</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6 text-center">
          <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-2xl font-bold">{alerta}</p><p className="text-sm text-muted-foreground">Alerta (&gt;14d)</p>
        </CardContent></Card>
      </div>

      {/* Ranking assessores */}
      {assessorStats.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Ranking de Assessores (contatos 7d)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {assessorStats.slice(0, 5).map((a, i) => (
                <div key={a.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/30">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  <span className="text-sm font-medium">{a.nome}</span>
                  <Badge variant="outline" className="text-[10px]">{a.contatos7d} contatos</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={filterAssessor} onValueChange={setFilterAssessor}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Assessor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos assessores</SelectItem>
            {assessores.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCalha} onValueChange={setFilterCalha}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Calha" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas calhas</SelectItem>
            {calhas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="verde">Verde (&lt;7d)</SelectItem>
            <SelectItem value="amarelo">Amarelo (7-14d)</SelectItem>
            <SelectItem value="vermelho">Vermelho (&gt;14d)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coordenador</TableHead>
                <TableHead>Calha</TableHead>
                <TableHead>Assessor</TableHead>
                <TableHead>Dias sem contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum coordenador encontrado.</TableCell></TableRow>
              ) : filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{calhaMap[c.calha_id || ""] || "—"}</TableCell>
                  <TableCell className="text-sm">{c.assessor?.nome || "—"}</TableCell>
                  <TableCell className="font-mono text-sm">{c.days === 999 ? "Nunca" : `${c.days}d`}</TableCell>
                  <TableCell>
                    {c.days <= 7 ? <Badge className="bg-green-500 text-white text-[10px]">Em dia</Badge>
                      : c.days <= 14 ? <Badge className="bg-yellow-500 text-white text-[10px]">Atenção</Badge>
                      : <Badge variant="destructive" className="text-[10px]">Alerta</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => setContatoDialog(c.id)} title="Registrar contato agora">
                        <Phone className="w-3.5 h-3.5" />
                      </Button>
                      {c.telefone && (
                        <Button size="sm" variant="outline" asChild title="WhatsApp">
                          <a href={whatsappLink(c.telefone)} target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                          </a>
                        </Button>
                      )}
                      {c.days > 7 && (
                        <Button size="sm" variant="outline" onClick={() => handleCobrar(c.id)} title="Cobrar assessor">
                          <Bell className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog registrar contato */}
      <Dialog open={!!contatoDialog} onOpenChange={o => { if (!o) setContatoDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Contato</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tipo</Label>
              <Select value={contatoForm.tipo} onValueChange={v => setContatoForm({ ...contatoForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensagem">Mensagem</SelectItem>
                  <SelectItem value="ligacao">Ligação</SelectItem>
                  <SelectItem value="reuniao">Reunião</SelectItem>
                  <SelectItem value="visita">Visita</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Resumo</Label><Input value={contatoForm.resumo} onChange={e => setContatoForm({ ...contatoForm, resumo: e.target.value })} /></div>
            <div><Label>Observações</Label><Textarea value={contatoForm.observacoes} onChange={e => setContatoForm({ ...contatoForm, observacoes: e.target.value })} /></div>
            <Button onClick={handleRegistrar} className="w-full">Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </CampanhaLayout>
  );
};

export default CoordMonitorContatos;
