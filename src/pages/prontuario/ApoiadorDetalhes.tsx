import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Pencil, Phone, Star, CheckCircle2, Clock, AlertCircle,
  Plus, CalendarIcon, MessageSquare, Building2, MapPin, User2, Briefcase,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Apoiador {
  id: string; nome: string; cidade: string; regiao: string; telefone: string;
  data_nascimento: string | null; organizacao: string; funcao: string; segmento: string;
  cargo: string; beneficios_relacionados: string; resumo: string; grau_influencia: number;
  prioridade: string; origem_contato: string; created_at: string; updated_at: string;
}

interface Historico {
  id: string; data: string; tipo: string; responsavel: string; descricao: string;
  status: string; data_prevista: string | null; created_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  concluido: { label: "Concluído", icon: CheckCircle2, color: "text-emerald-600" },
  pendente: { label: "Pendente", icon: Clock, color: "text-amber-500" },
  em_andamento: { label: "Em Andamento", icon: AlertCircle, color: "text-blue-500" },
};

const tiposHistorico = ["Reunião", "Visita", "Ligação", "Evento", "Benefício", "Promessa", "Entrega", "Emenda", "Indicação", "Outro"];

const InfluenciaStars = ({ value }: { value: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`w-4 h-4 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const prioridadeBadge: Record<string, { label: string; variant: "destructive" | "default" | "secondary" }> = {
  alta: { label: "Alta", variant: "destructive" },
  media: { label: "Média", variant: "default" },
  baixa: { label: "Baixa", variant: "secondary" },
};

const ApoiadorDetalhes = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [apoiador, setApoiador] = useState<Apoiador | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ tipo: "Reunião", responsavel: "", descricao: "", status: "pendente" });
  const [newData, setNewData] = useState<Date>(new Date());
  const [newDataPrevista, setNewDataPrevista] = useState<Date | undefined>();
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    const [aRes, hRes] = await Promise.all([
      supabase.from("apoiadores").select("*").eq("id", id).single(),
      supabase.from("historico_apoiadores").select("*").eq("apoiador_id", id).order("data", { ascending: false }),
    ]);
    if (aRes.error || !aRes.data) { toast({ title: "Apoiador não encontrado", variant: "destructive" }); navigate("/prontuario"); return; }
    setApoiador(aRes.data as Apoiador);
    setHistorico((hRes.data as Historico[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const concluidos = historico.filter((h) => h.status === "concluido");
  const pendentes = historico.filter((h) => h.status === "pendente" || h.status === "em_andamento");

  const handleAddHistorico = async () => {
    if (!user?.user_id || !id) return;
    setSaving(true);
    const { error } = await supabase.from("historico_apoiadores").insert([{
      apoiador_id: id, user_id: user.user_id,
      data: newData.toISOString(), tipo: newItem.tipo,
      responsavel: newItem.responsavel, descricao: newItem.descricao,
      status: newItem.status as "concluido" | "pendente" | "em_andamento",
      data_prevista: newDataPrevista ? newDataPrevista.toISOString() : null,
    }]);
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Registro adicionado ao histórico!" });
    setModalOpen(false);
    setNewItem({ tipo: "Reunião", responsavel: "", descricao: "", status: "pendente" });
    setNewDataPrevista(undefined);
    fetchData();
  };

  const handleStatusChange = async (historicoId: string, newStatus: string) => {
    const { error } = await supabase.from("historico_apoiadores").update({ status: newStatus as "concluido" | "pendente" | "em_andamento" }).eq("id", historicoId);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    fetchData();
  };

  const whatsappUrl = apoiador?.telefone
    ? `https://wa.me/55${apoiador.telefone.replace(/\D/g, "")}`
    : null;

  if (loading) return <AppLayout><div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Carregando...</div></AppLayout>;
  if (!apoiador) return null;

  const pb = prioridadeBadge[apoiador.prioridade] || prioridadeBadge.media;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/prontuario")}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{apoiador.nome}</h1>
            <div className="flex flex-wrap gap-2 mt-1 text-sm text-muted-foreground">
              {apoiador.cargo && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{apoiador.cargo}</span>}
              {apoiador.organizacao && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{apoiador.organizacao}</span>}
              {apoiador.cidade && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{apoiador.cidade}{apoiador.regiao ? ` — ${apoiador.regiao}` : ""}</span>}
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/prontuario/${id}/editar`)} className="gap-2"><Pencil className="w-4 h-4" />Editar</Button>
        </div>

        {/* Executive view */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Influência</p>
                <InfluenciaStars value={apoiador.grau_influencia} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Prioridade</p>
                <Badge variant={pb.variant}>{pb.label}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Segmento</p>
                <p className="text-sm font-medium">{apoiador.segmento || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Contato</p>
                {whatsappUrl ? (
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline">
                    <Phone className="w-3.5 h-3.5" />{apoiador.telefone}
                  </a>
                ) : <p className="text-sm">—</p>}
              </div>
            </div>
            {apoiador.resumo && (
              <>
                <Separator className="my-4" />
                <p className="text-sm text-muted-foreground">{apoiador.resumo}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* O que já foi feito */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> O que já foi feito ({concluidos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {concluidos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma ação concluída registrada.</p>
            ) : (
              <div className="space-y-3">
                {concluidos.map((h) => (
                  <div key={h.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{h.tipo}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(h.data), "dd/MM/yyyy", { locale: ptBR })}</span>
                        {h.responsavel && <span className="text-xs text-muted-foreground">— {h.responsavel}</span>}
                      </div>
                      <p className="text-sm mt-1">{h.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* O que está planejado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" /> O que está planejado ({pendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma ação pendente ou em andamento.</p>
            ) : (
              <div className="space-y-3">
                {pendentes.map((h) => {
                  const sc = statusConfig[h.status] || statusConfig.pendente;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={h.id} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
                      <StatusIcon className={`w-4 h-4 mt-1 shrink-0 ${sc.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{h.tipo}</Badge>
                          {h.data_prevista && <span className="text-xs text-muted-foreground">Prevista: {format(new Date(h.data_prevista), "dd/MM/yyyy", { locale: ptBR })}</span>}
                          {h.responsavel && <span className="text-xs text-muted-foreground">— {h.responsavel}</span>}
                        </div>
                        <p className="text-sm mt-1">{h.descricao}</p>
                        <div className="mt-2">
                          <Select value={h.status} onValueChange={(v) => handleStatusChange(h.id, v)}>
                            <SelectTrigger className="w-[160px] h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_andamento">Em Andamento</SelectItem>
                              <SelectItem value="concluido">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico cronológico */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5" /> Histórico Cronológico ({historico.length})
            </CardTitle>
            <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1"><Plus className="w-4 h-4" />Adicionar</Button>
          </CardHeader>
          <CardContent>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhum registro no histórico.</p>
            ) : (
              <div className="relative border-l-2 border-border ml-3 space-y-4 pl-6">
                {historico.map((h) => {
                  const sc = statusConfig[h.status] || statusConfig.pendente;
                  const StatusIcon = sc.icon;
                  return (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-background bg-primary" />
                      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{format(new Date(h.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        <Badge variant="secondary" className="text-[10px]">{h.tipo}</Badge>
                        <StatusIcon className={`w-3.5 h-3.5 ${sc.color}`} />
                        <span>{sc.label}</span>
                        {h.responsavel && <span>— {h.responsavel}</span>}
                      </div>
                      <p className="text-sm mt-1">{h.descricao}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal adicionar histórico */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Adicionar ao Histórico</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(newData, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newData} onSelect={(d) => d && setNewData(d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={newItem.tipo} onValueChange={(v) => setNewItem((p) => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposHistorico.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Responsável</Label><Input value={newItem.responsavel} onChange={(e) => setNewItem((p) => ({ ...p, responsavel: e.target.value }))} placeholder="Assessor ou parlamentar" /></div>
              <div><Label>Descrição</Label><Textarea value={newItem.descricao} onChange={(e) => setNewItem((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a ação..." rows={3} /></div>
              <div>
                <Label>Status</Label>
                <Select value={newItem.status} onValueChange={(v) => setNewItem((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Prevista (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !newDataPrevista && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newDataPrevista ? format(newDataPrevista, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={newDataPrevista} onSelect={setNewDataPrevista} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddHistorico} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default ApoiadorDetalhes;
