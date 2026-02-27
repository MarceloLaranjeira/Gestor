import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, TrendingDown, TrendingUp, Users, Vote, Church, AlertTriangle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const LogbookDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const [calha, setCalha] = useState<any>(null);
  const [municipios, setMunicipios] = useState<any[]>([]);
  const [votos, setVotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      setLoading(true);
      const [cRes, mRes, vRes] = await Promise.all([
        supabase.from("logbook_calhas").select("*").eq("id", id).single(),
        supabase.from("logbook_municipios").select("*").eq("calha_id", id).order("nome"),
        supabase.from("logbook_votos_historico").select("*"),
      ]);
      setCalha(cRes.data);
      setMunicipios(mRes.data || []);
      const munIds = (mRes.data || []).map((m: any) => m.id);
      setVotos((vRes.data || []).filter((v: any) => munIds.includes(v.municipio_id)));
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <AppLayout><div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div></AppLayout>;
  if (!calha) return <AppLayout><div className="py-20 text-center text-muted-foreground">Calha não encontrada.</div></AppLayout>;

  const anos = [2006, 2010, 2014, 2018, 2022];
  const getVotos = (ano: number, cargo: string) => votos.filter((v) => v.ano_eleicao === ano && v.cargo === cargo).reduce((s, v) => s + v.votos_validos_totais, 0);
  const getCandidato = (ano: number, cargo: string) => votos.filter((v) => v.ano_eleicao === ano && v.cargo === cargo).reduce((s, v) => s + v.votos_candidato, 0);

  const votosFed2006 = getVotos(2006, "federal");
  const votosEst2006 = getVotos(2006, "estadual");
  const votosFed2022 = getVotos(2022, "federal");
  const votosEst2022 = getVotos(2022, "estadual");
  const evasaoFed = votosFed2006 > 0 ? Math.round(((votosFed2022 - votosFed2006) / votosFed2006) * 1000) / 10 : 0;
  const evasaoEst = votosEst2006 > 0 ? Math.round(((votosEst2022 - votosEst2006) / votosEst2006) * 1000) / 10 : 0;

  const avgCristaos2010 = municipios.length ? Math.round(municipios.reduce((s, m) => s + Number(m.percentual_cristaos_2010), 0) / municipios.length * 10) / 10 : 0;
  const avgCristaos2022 = municipios.length ? Math.round(municipios.reduce((s, m) => s + Number(m.percentual_cristaos_2022), 0) / municipios.length * 10) / 10 : 0;
  const avgNaoCristaos2010 = municipios.length ? Math.round(municipios.reduce((s, m) => s + Number(m.percentual_nao_cristaos_2010), 0) / municipios.length * 10) / 10 : 0;
  const avgNaoCristaos2022 = municipios.length ? Math.round(municipios.reduce((s, m) => s + Number(m.percentual_nao_cristaos_2022), 0) / municipios.length * 10) / 10 : 0;

  const potencial = Math.min(100, Math.round(avgCristaos2022 * 0.4 + Math.max(0, 100 + evasaoFed) * 0.3 + Math.max(0, 100 + evasaoEst) * 0.3));
  const prioridade = potencial >= 70 ? "ALTA" : potencial >= 40 ? "MÉDIA" : "BAIXA";

  const lineData = anos.map((a) => ({ ano: a, federal: getVotos(a, "federal"), estadual: getVotos(a, "estadual"), candFed: getCandidato(a, "federal"), candEst: getCandidato(a, "estadual") }));
  const barData = [
    { label: "Cristãos 2010", valor: avgCristaos2010 },
    { label: "Cristãos 2022", valor: avgCristaos2022 },
    { label: "Não Cristãos 2010", valor: avgNaoCristaos2010 },
    { label: "Não Cristãos 2022", valor: avgNaoCristaos2022 },
  ];

  // Evasão por município
  const evasaoMunicipios = municipios.map((m) => {
    const mVotos = votos.filter((v) => v.municipio_id === m.id);
    const fed2006 = mVotos.filter((v) => v.ano_eleicao === 2006 && v.cargo === "federal").reduce((s: number, v: any) => s + v.votos_validos_totais, 0);
    const fed2022 = mVotos.filter((v) => v.ano_eleicao === 2022 && v.cargo === "federal").reduce((s: number, v: any) => s + v.votos_validos_totais, 0);
    const evasao = fed2006 > 0 ? Math.round(((fed2022 - fed2006) / fed2006) * 1000) / 10 : 0;
    return { nome: m.nome, evasao, fed2006, fed2022 };
  }).sort((a, b) => a.evasao - b.evasao);

  const getMunVotos = (munId: string, ano: number, cargo: string) => {
    return votos.filter((v) => v.municipio_id === munId && v.ano_eleicao === ano && v.cargo === cargo).reduce((s, v) => s + v.votos_validos_totais, 0);
  };

  const stats = [
    { label: "Municípios", value: municipios.length, icon: Users },
    { label: "Votos Fed 2006", value: votosFed2006.toLocaleString("pt-BR"), icon: Vote },
    { label: "Votos Est 2006", value: votosEst2006.toLocaleString("pt-BR"), icon: Vote },
    { label: "Votos Fed 2022", value: votosFed2022.toLocaleString("pt-BR"), icon: Vote },
    { label: "Votos Est 2022", value: votosEst2022.toLocaleString("pt-BR"), icon: Vote },
    { label: "Evasão Fed", value: `${evasaoFed}%`, icon: evasaoFed < 0 ? TrendingDown : TrendingUp },
    { label: "Evasão Est", value: `${evasaoEst}%`, icon: evasaoEst < 0 ? TrendingDown : TrendingUp },
    { label: "Potencial", value: `${potencial}/100`, icon: Church },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <Link to="/logbook"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">{calha.nome}</h1>
            {calha.descricao && <p className="text-sm text-muted-foreground">{calha.descricao}</p>}
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-3 flex items-center gap-3">
                <s.icon className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
                  <p className="text-sm font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recomendação */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Recomendação Estratégica</p>
              <p className="text-muted-foreground mt-1">
                Esta calha tem {prioridade === "ALTA" ? "alto" : prioridade === "MÉDIA" ? "médio" : "baixo"} potencial (score {potencial}/100) com {votosFed2022.toLocaleString("pt-BR")} votos federais válidos e {avgCristaos2022}% cristãos.
                {" "}Prioridade: <Badge className={prioridade === "ALTA" ? "bg-success" : prioridade === "MÉDIA" ? "bg-warning" : "bg-destructive"}>{prioridade}</Badge>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Municípios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Municípios ({municipios.length})</CardTitle>
            <Link to={`/logbook/${id}/municipio/novo`}><Button size="sm" className="gap-1"><Plus className="w-4 h-4" />Município</Button></Link>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Pop.</TableHead>
                  <TableHead className="text-right">Cristãos 22</TableHead>
                  <TableHead className="text-right">Fed 06</TableHead>
                  <TableHead className="text-right">Est 06</TableHead>
                  <TableHead className="text-right">Fed 22</TableHead>
                  <TableHead className="text-right">Est 22</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {municipios.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell className="text-right">{m.populacao_2022.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{Number(m.percentual_cristaos_2022).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">{getMunVotos(m.id, 2006, "federal").toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{getMunVotos(m.id, 2006, "estadual").toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{getMunVotos(m.id, 2022, "federal").toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{getMunVotos(m.id, 2022, "estadual").toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Link to={`/logbook/${id}/municipio/${m.id}`}><Button variant="ghost" size="sm">Editar</Button></Link></TableCell>
                  </TableRow>
                ))}
                {municipios.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum município cadastrado.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Evolução de Votos Válidos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ano" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                  <Legend />
                  <Line type="monotone" dataKey="federal" stroke="hsl(205, 70%, 45%)" name="Federal" strokeWidth={2} />
                  <Line type="monotone" dataKey="estadual" stroke="hsl(152, 55%, 24%)" name="Estadual" strokeWidth={2} />
                  <Line type="monotone" dataKey="candFed" stroke="hsl(45, 85%, 55%)" name="Candidato Fed" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Perfil Religioso</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="valor" fill="hsl(152, 55%, 24%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Evasão por município */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Evasão Federal por Município (2006→2022)</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Município</TableHead>
                  <TableHead className="text-right">Fed 2006</TableHead>
                  <TableHead className="text-right">Fed 2022</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evasaoMunicipios.map((e) => (
                  <TableRow key={e.nome}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="text-right">{e.fed2006.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">{e.fed2022.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={e.evasao < -10 ? "destructive" : e.evasao < 0 ? "secondary" : "default"} className={e.evasao >= 0 ? "bg-success text-success-foreground" : ""}>
                        {e.evasao > 0 ? "+" : ""}{e.evasao}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default LogbookDetalhes;
