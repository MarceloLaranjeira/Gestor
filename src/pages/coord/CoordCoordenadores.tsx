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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, ChevronLeft, Phone, MessageSquare, Calendar, User, ClipboardList } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, format } from "date-fns";

interface Coordenador { id: string; nome: string; telefone: string; email: string; calha_id: string | null; ultimo_contato: string | null; status: string; }
interface Calha { id: string; nome: string; }
interface Assessor { id: string; nome: string; coordenador_id: string | null; }
interface Contato { id: string; coordenador_id: string | null; tipo: string; observacoes: string; resumo: string; data_contato: string; user_id: string; }
interface Tarefa { id: string; coordenador_id: string | null; titulo: string; descricao: string; status: string; data_limite: string | null; }

const CoordCoordenadores = () => {
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [assessores, setAssessores] = useState<Assessor[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [selected, setSelected] = useState<Coordenador | null>(null);
  const [contatoOpen, setContatoOpen] = useState(false);
  const [contatoForm, setContatoForm] = useState({ tipo: "mensagem", observacoes: "", resumo: "" });
  const [tarefaOpen, setTarefaOpen] = useState(false);
  const [tarefaForm, setTarefaForm] = useState({ titulo: "", descricao: "", data_limite: "", status: "pendente" });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = async () => {
    const [co, ca, as_, ct, tf] = await Promise.all([
      supabase.from("campanha_coordenadores").select("*").order("nome"),
      supabase.from("campanha_calhas").select("id, nome").order("nome"),
      supabase.from("campanha_assessores").select("id, nome, coordenador_id").order("nome"),
      supabase.from("campanha_contatos").select("*").order("data_contato", { ascending: false }),
      supabase.from("tarefas_coordenacao").select("*").order("created_at", { ascending: false }),
    ]);
    setCoordenadores((co.data as Coordenador[]) || []);
    setCalhas((ca.data as Calha[]) || []);
    setAssessores((as_.data as Assessor[]) || []);
    setContatos((ct.data as Contato[]) || []);
    setTarefas((tf.data as Tarefa[]) || []);
  };

  useEffect(() => { fetchData(); }, []);

  const calhaMap = Object.fromEntries(calhas.map(c => [c.id, c.nome]));
  const getAssessor = (coordId: string) => assessores.find(a => a.coordenador_id === coordId);

  const contatoStatus = (uc: string | null) => {
    if (!uc) return { label: "Nunca", variant: "destructive" as const, days: 999 };
    const d = differenceInDays(new Date(), new Date(uc));
    if (d <= 7) return { label: `${d}d`, variant: "default" as const, days: d };
    if (d <= 14) return { label: `${d}d`, variant: "secondary" as const, days: d };
    return { label: `${d}d`, variant: "destructive" as const, days: d };
  };

  const engajamento = (coordId: string) => {
    const c30 = contatos.filter(c => c.coordenador_id === coordId && differenceInDays(new Date(), new Date(c.data_contato)) <= 30).length;
    if (c30 >= 8) return 5;
    if (c30 >= 6) return 4;
    if (c30 >= 4) return 3;
    if (c30 >= 2) return 2;
    return 1;
  };

  const handleRegistrarContato = async () => {
    if (!selected || !user) return;
    await supabase.from("campanha_contatos").insert({
      coordenador_id: selected.id, tipo: contatoForm.tipo, observacoes: contatoForm.observacoes,
      resumo: contatoForm.resumo, user_id: user.user_id,
    });
    await supabase.from("campanha_coordenadores").update({ ultimo_contato: new Date().toISOString() }).eq("id", selected.id);
    setContatoOpen(false); setContatoForm({ tipo: "mensagem", observacoes: "", resumo: "" });
    fetchData(); toast({ title: "Contato registrado" });
  };

  const handleCriarTarefa = async () => {
    if (!selected || !user || !tarefaForm.titulo.trim()) return;
    const assessor = getAssessor(selected.id);
    await supabase.from("tarefas_coordenacao").insert({
      coordenador_id: selected.id, assessor_id: assessor?.id || null,
      titulo: tarefaForm.titulo, descricao: tarefaForm.descricao,
      data_limite: tarefaForm.data_limite || null, status: tarefaForm.status, user_id: user.user_id,
    });
    setTarefaOpen(false); setTarefaForm({ titulo: "", descricao: "", data_limite: "", status: "pendente" });
    fetchData(); toast({ title: "Tarefa criada" });
  };

  const toggleTarefaStatus = async (t: Tarefa) => {
    const next = t.status === "pendente" ? "em_andamento" : t.status === "em_andamento" ? "concluido" : "pendente";
    await supabase.from("tarefas_coordenacao").update({ status: next }).eq("id", t.id);
    fetchData();
  };

  const whatsappLink = (tel: string) => `https://wa.me/55${tel.replace(/\D/g, "")}`;

  if (selected) {
    const coord = selected;
    const calha = calhaMap[coord.calha_id || ""] || "—";
    const assessor = getAssessor(coord.id);
    const coordContatos = contatos.filter(c => c.coordenador_id === coord.id);
    const coordTarefas = tarefas.filter(t => t.coordenador_id === coord.id);

    return (
      <CampanhaLayout title="Prontuário do Coordenador">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{coord.nome}</h2>
                <p className="text-sm text-muted-foreground">Calha: {calha}</p>
                <p className="text-sm text-muted-foreground">Assessor: {assessor?.nome || "Não definido"}</p>
              </div>
              <div className="flex gap-2">
                {coord.telefone && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={whatsappLink(coord.telefone)} target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="w-4 h-4 mr-1 text-green-600" /> WhatsApp
                    </a>
                  </Button>
                )}
                <Dialog open={contatoOpen} onOpenChange={setContatoOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Registrar Contato</Button></DialogTrigger>
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
                            <SelectItem value="visita">Visita presencial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Resumo</Label><Input value={contatoForm.resumo} onChange={e => setContatoForm({ ...contatoForm, resumo: e.target.value })} placeholder="Breve resumo do contato" /></div>
                      <div><Label>Observações</Label><Textarea value={contatoForm.observacoes} onChange={e => setContatoForm({ ...contatoForm, observacoes: e.target.value })} /></div>
                      <Button onClick={handleRegistrarContato} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="contatos">
          <TabsList>
            <TabsTrigger value="contatos"><Phone className="w-4 h-4 mr-1" /> Histórico de Contatos</TabsTrigger>
            <TabsTrigger value="tarefas"><ClipboardList className="w-4 h-4 mr-1" /> Tarefas</TabsTrigger>
          </TabsList>
          <TabsContent value="contatos">
            <Card>
              <CardContent className="pt-6">
                {coordContatos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum contato registrado.</p>
                ) : (
                  <div className="space-y-4">
                    {coordContatos.map(c => {
                      const icon = c.tipo === "ligacao" ? Phone : c.tipo === "reuniao" ? Calendar : c.tipo === "visita" ? User : MessageSquare;
                      const Icon = icon;
                      return (
                        <div key={c.id} className="flex gap-3 border-l-2 border-primary/30 pl-4">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">{c.tipo}</Badge>
                              <span className="text-xs text-muted-foreground">{format(new Date(c.data_contato), "dd/MM/yyyy HH:mm")}</span>
                            </div>
                            {c.resumo && <p className="text-sm font-medium mt-1">{c.resumo}</p>}
                            {c.observacoes && <p className="text-sm text-muted-foreground mt-0.5">{c.observacoes}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="tarefas">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Tarefas do Coordenador</CardTitle>
                <Dialog open={tarefaOpen} onOpenChange={setTarefaOpen}>
                  <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Nova Tarefa</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <div><Label>Título</Label><Input value={tarefaForm.titulo} onChange={e => setTarefaForm({ ...tarefaForm, titulo: e.target.value })} /></div>
                      <div><Label>Descrição</Label><Textarea value={tarefaForm.descricao} onChange={e => setTarefaForm({ ...tarefaForm, descricao: e.target.value })} /></div>
                      <div><Label>Data Limite</Label><Input type="date" value={tarefaForm.data_limite} onChange={e => setTarefaForm({ ...tarefaForm, data_limite: e.target.value })} /></div>
                      <Button onClick={handleCriarTarefa} className="w-full">Salvar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {coordTarefas.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma tarefa.</p>
                ) : (
                  <div className="space-y-2">
                    {coordTarefas.map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 cursor-pointer" onClick={() => toggleTarefaStatus(t)}>
                        <div className={`w-3 h-3 rounded-full ${t.status === "concluido" ? "bg-green-500" : t.status === "em_andamento" ? "bg-yellow-500" : "bg-muted-foreground/30"}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${t.status === "concluido" ? "line-through text-muted-foreground" : ""}`}>{t.titulo}</p>
                          {t.descricao && <p className="text-xs text-muted-foreground">{t.descricao}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={t.status === "concluido" ? "default" : t.status === "em_andamento" ? "secondary" : "outline"} className="text-[10px]">{t.status}</Badge>
                          {t.data_limite && <span className="text-xs text-muted-foreground">{format(new Date(t.data_limite + "T12:00:00"), "dd/MM")}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CampanhaLayout>
    );
  }

  return (
    <CampanhaLayout title="Coordenadores">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">CRM de Coordenadores</CardTitle>
          <CardDescription>Acompanhe contatos, cobranças e engajamento</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Calha</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Assessor</TableHead>
                <TableHead>Último Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Engajamento</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coordenadores.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum coordenador.</TableCell></TableRow>
              ) : coordenadores.map(c => {
                const status = contatoStatus(c.ultimo_contato);
                const eng = engajamento(c.id);
                const assessor = getAssessor(c.id);
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(c)}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{calhaMap[c.calha_id || ""] || "—"}</TableCell>
                    <TableCell>
                      {c.telefone ? (
                        <a href={whatsappLink(c.telefone)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-green-600 hover:underline text-sm flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> {c.telefone}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{assessor?.nome || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                    </TableCell>
                    <TableCell><Badge variant={c.status === "ativo" ? "default" : "secondary"} className="text-[10px]">{c.status}</Badge></TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-2 h-4 rounded-sm ${i <= eng ? "bg-primary" : "bg-muted"}`} />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelected(c); }}>Ver</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </CampanhaLayout>
  );
};

export default CoordCoordenadores;
