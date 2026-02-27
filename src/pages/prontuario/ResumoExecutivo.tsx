import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Star, TrendingUp, Clock, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Apoiador {
  id: string; nome: string; cidade: string; regiao: string; segmento: string;
  organizacao: string; cargo: string; grau_influencia: number; prioridade: string;
}

interface Historico {
  id: string; apoiador_id: string; data: string; tipo: string; descricao: string;
  status: string; data_prevista: string | null;
}

const ResumoExecutivo = () => {
  const navigate = useNavigate();
  const [apoiadores, setApoiadores] = useState<Apoiador[]>([]);
  const [historicos, setHistoricos] = useState<Historico[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroRegiao, setFiltroRegiao] = useState("todas");
  const [filtroSegmento, setFiltroSegmento] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  useEffect(() => {
    const fetch = async () => {
      const [aRes, hRes] = await Promise.all([
        supabase.from("apoiadores").select("id, nome, cidade, regiao, segmento, organizacao, cargo, grau_influencia, prioridade"),
        supabase.from("historico_apoiadores").select("id, apoiador_id, data, tipo, descricao, status, data_prevista").order("data", { ascending: false }),
      ]);
      setApoiadores(aRes.data || []);
      setHistoricos(hRes.data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const regioesFixas = ["Norte", "Sul", "Leste", "Oeste", "Capital", "Interior", "Metropolitana"];
  const segmentosFixos = ["Evangélico", "Empresarial", "Sindical", "Comunitário", "Político", "Acadêmico", "Saúde", "Educação", "Segurança", "Agronegócio"];
  const tiposFixos = ["Reunião", "Visita", "Ligação", "Evento", "Benefício", "Promessa", "Entrega", "Emenda", "Indicação", "Outro"];

  const regioes = useMemo(() => [...new Set([...regioesFixas, ...apoiadores.map((a) => a.regiao).filter(Boolean)])], [apoiadores]);
  const segmentos = useMemo(() => [...new Set([...segmentosFixos, ...apoiadores.map((a) => a.segmento).filter(Boolean)])], [apoiadores]);
  const tipos = useMemo(() => [...new Set([...tiposFixos, ...historicos.map((h) => h.tipo).filter(Boolean)])], [historicos]);

  const totalAlta = apoiadores.filter((a) => a.prioridade === "alta").length;
  const totalMedia = apoiadores.filter((a) => a.prioridade === "media").length;
  const totalBaixa = apoiadores.filter((a) => a.prioridade === "baixa").length;

  const apoiadoresChave = useMemo(() => {
    let list = apoiadores.filter((a) => a.prioridade === "alta" && a.grau_influencia >= 4);
    if (filtroRegiao !== "todas") list = list.filter((a) => a.regiao === filtroRegiao);
    if (filtroSegmento !== "todos") list = list.filter((a) => a.segmento === filtroSegmento);

    return list.map((a) => {
      let hList = historicos.filter((h) => h.apoiador_id === a.id);
      if (filtroTipo !== "todos") hList = hList.filter((h) => h.tipo === filtroTipo);
      const ultimaConcluida = hList.find((h) => h.status === "concluido");
      const proximaPendente = hList.find((h) => h.status === "pendente" || h.status === "em_andamento");
      return { ...a, ultimaConcluida, proximaPendente };
    });
  }, [apoiadores, historicos, filtroRegiao, filtroSegmento, filtroTipo]);

  if (loading) return <AppLayout><div className="flex items-center justify-center min-h-[400px] text-muted-foreground">Carregando...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/prontuario")}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-6 h-6 text-primary" />Resumo Executivo</h1>
            <p className="text-sm text-muted-foreground">Visão estratégica dos apoiadores-chave</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Apoiadores</p>
              <p className="text-2xl font-bold mt-1">{apoiadores.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-destructive">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Prioridade Alta</p>
              <p className="text-2xl font-bold mt-1">{totalAlta}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Prioridade Média</p>
              <p className="text-2xl font-bold mt-1">{totalMedia}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Prioridade Baixa</p>
              <p className="text-2xl font-bold mt-1">{totalBaixa}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select value={filtroRegiao} onValueChange={setFiltroRegiao}>
                <SelectTrigger><SelectValue placeholder="Região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas regiões</SelectItem>
                  {regioes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                <SelectTrigger><SelectValue placeholder="Segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos segmentos</SelectItem>
                  {segmentos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                <SelectTrigger><SelectValue placeholder="Tipo de ação" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos tipos</SelectItem>
                  {tipos.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Apoiadores-chave */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />Apoiadores-Chave ({apoiadoresChave.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apoiadoresChave.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum apoiador com prioridade Alta e influência ≥ 4.</p>
            ) : (
              <div className="space-y-4">
                {apoiadoresChave.map((a) => (
                  <div key={a.id} className="border border-border rounded-lg p-4 hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => navigate(`/prontuario/${a.id}`)}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{a.nome}</p>
                        <p className="text-xs text-muted-foreground">{[a.cargo, a.organizacao, a.segmento].filter(Boolean).join(" — ")}</p>
                        {a.regiao && <p className="text-xs text-muted-foreground">{a.cidade}{a.regiao ? ` — ${a.regiao}` : ""}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i <= a.grau_influencia ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                        <Badge variant="destructive">Alta</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Última ação concluída</p>
                          {a.ultimaConcluida ? (
                            <p className="text-xs">{format(new Date(a.ultimaConcluida.data), "dd/MM/yy", { locale: ptBR })} — {a.ultimaConcluida.descricao?.slice(0, 60)}{(a.ultimaConcluida.descricao?.length || 0) > 60 ? "…" : ""}</p>
                          ) : <p className="text-xs text-muted-foreground italic">Nenhuma</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Próxima ação</p>
                          {a.proximaPendente ? (
                            <p className="text-xs">
                              {a.proximaPendente.data_prevista ? format(new Date(a.proximaPendente.data_prevista), "dd/MM/yy", { locale: ptBR }) + " — " : ""}
                              {a.proximaPendente.descricao?.slice(0, 60)}{(a.proximaPendente.descricao?.length || 0) > 60 ? "…" : ""}
                            </p>
                          ) : <p className="text-xs text-muted-foreground italic">Nenhuma</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ResumoExecutivo;
