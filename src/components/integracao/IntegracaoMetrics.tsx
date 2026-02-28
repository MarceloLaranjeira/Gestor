import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ArrowUpRight, ArrowDownLeft, CheckCircle, XCircle, TrendingUp, Users } from "lucide-react";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Mensagem {
  id: string;
  config_id: string;
  direcao: string;
  tipo: string;
  conteudo: any;
  status: string;
  plataforma: string;
  contato_externo: string;
  erro: string | null;
  created_at: string;
}

interface IntegracaoMetricsProps {
  mensagens: Mensagem[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const IntegracaoMetrics = ({ mensagens }: IntegracaoMetricsProps) => {
  const stats = useMemo(() => {
    const total = mensagens.length;
    const enviadas = mensagens.filter((m) => m.direcao === "enviada").length;
    const recebidas = mensagens.filter((m) => m.direcao === "recebida").length;
    const sucesso = mensagens.filter((m) => m.status === "enviada" || m.status === "processada").length;
    const erros = mensagens.filter((m) => m.status === "erro").length;
    const taxaSucesso = total > 0 ? Math.round((sucesso / total) * 100) : 0;

    return { total, enviadas, recebidas, sucesso, erros, taxaSucesso };
  }, [mensagens]);

  const dailyData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dayStart = startOfDay(date);
      const enviadas = mensagens.filter((m) => m.direcao === "enviada" && isSameDay(new Date(m.created_at), dayStart)).length;
      const recebidas = mensagens.filter((m) => m.direcao === "recebida" && isSameDay(new Date(m.created_at), dayStart)).length;
      return {
        dia: format(date, "dd/MM", { locale: ptBR }),
        Enviadas: enviadas,
        Recebidas: recebidas,
      };
    });
    return days;
  }, [mensagens]);

  const statusData = useMemo(() => {
    const sucesso = mensagens.filter((m) => m.status === "enviada" || m.status === "processada").length;
    const erro = mensagens.filter((m) => m.status === "erro").length;
    const pendente = mensagens.filter((m) => m.status === "pendente").length;
    return [
      { name: "Sucesso", value: sucesso },
      { name: "Erro", value: erro },
      { name: "Pendente", value: pendente },
    ].filter((d) => d.value > 0);
  }, [mensagens]);

  const topContatos = useMemo(() => {
    const map = new Map<string, number>();
    mensagens.forEach((m) => {
      if (m.contato_externo) {
        map.set(m.contato_externo, (map.get(m.contato_externo) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([contato, count]) => ({ contato, count }));
  }, [mensagens]);

  if (mensagens.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma métrica disponível — envie ou receba mensagens para visualizar os dados.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enviadas</span>
              <ArrowUpRight className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold font-display">{stats.enviadas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recebidas</span>
              <ArrowDownLeft className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold font-display">{stats.recebidas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa Sucesso</span>
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-display">{stats.taxaSucesso}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Erros</span>
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold font-display">{stats.erros}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - Messages per Day */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Mensagens por Dia (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Bar dataKey="Enviadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Recebidas" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status das Mensagens</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex gap-3 mt-2">
                  {statusData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-8">Sem dados</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Contacts */}
      {topContatos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Contatos Mais Ativos
            </CardTitle>
            <CardDescription>Os 5 contatos com mais mensagens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topContatos.map((c, i) => (
                <div key={c.contato} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <span className="text-sm font-medium">{c.contato}</span>
                  </div>
                  <Badge variant="secondary">{c.count} msg</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default IntegracaoMetrics;
