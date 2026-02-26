import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Map, Building2, Vote, Church, AlertTriangle, Phone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";

interface Calha {
  id: string;
  nome: string;
  municipios: number;
  votos_validos: number;
  percentual_cristaos: number;
  potencial_votos: number;
}

interface Coordenador {
  id: string;
  nome: string;
  telefone: string;
  ultimo_contato: string | null;
  calha_id: string | null;
}

interface Contato {
  id: string;
  data_contato: string;
  tipo: string;
  observacoes: string;
  coordenador_id: string;
}

const CampanhaDashboard = () => {
  const [calhas, setCalhas] = useState<Calha[]>([]);
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [c, co, ct] = await Promise.all([
        supabase.from("campanha_calhas").select("*").order("potencial_votos", { ascending: false }),
        supabase.from("campanha_coordenadores").select("*"),
        supabase.from("campanha_contatos").select("*").order("data_contato", { ascending: false }).limit(5),
      ]);
      setCalhas((c.data as Calha[]) || []);
      setCoordenadores((co.data as Coordenador[]) || []);
      setContatos((ct.data as Contato[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const totalMunicipios = calhas.reduce((s, c) => s + c.municipios, 0);
  const totalVotos = calhas.reduce((s, c) => s + c.votos_validos, 0);
  const avgCristaos = calhas.length ? (calhas.reduce((s, c) => s + Number(c.percentual_cristaos), 0) / calhas.length).toFixed(1) : "0";

  const top10 = calhas.slice(0, 10).map((c) => ({ nome: c.nome.length > 15 ? c.nome.slice(0, 15) + "…" : c.nome, votos: c.potencial_votos }));

  const alertas = coordenadores.filter((c) => {
    if (!c.ultimo_contato) return true;
    return differenceInDays(new Date(), new Date(c.ultimo_contato)) > 7;
  });

  const coordMap = Object.fromEntries(coordenadores.map((c) => [c.id, c.nome]));

  const stats = [
    { title: "Total de Calhas", value: calhas.length, icon: <Map className="w-5 h-5 text-[hsl(var(--primary))]" /> },
    { title: "Municípios", value: totalMunicipios, icon: <Building2 className="w-5 h-5 text-[hsl(var(--primary))]" /> },
    { title: "Votos Válidos", value: totalVotos.toLocaleString("pt-BR"), icon: <Vote className="w-5 h-5 text-[hsl(var(--primary))]" /> },
    { title: "% Cristãos (média)", value: `${avgCristaos}%`, icon: <Church className="w-5 h-5 text-[hsl(var(--primary))]" /> },
  ];

  return (
    <CampanhaLayout title="Dashboard Campanha">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <Card key={s.title} className="border-l-4 border-l-primary">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.title}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">{s.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Top 10 Calhas por Potencial de Votos</CardTitle></CardHeader>
          <CardContent>
            {top10.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma calha cadastrada ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v: number) => v.toLocaleString("pt-BR")} />
                  <YAxis dataKey="nome" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR")} />
                  <Bar dataKey="votos" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Últimos contatos */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4" /> Últimos Contatos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {contatos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum contato registrado.</p>
              ) : contatos.map((ct) => (
                <div key={ct.id} className="flex items-start justify-between border-b border-border/50 pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{coordMap[ct.coordenador_id] || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">{ct.observacoes || ct.tipo}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {format(new Date(ct.data_contato), "dd/MM", { locale: ptBR })}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alertas */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-4 h-4" /> Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos os coordenadores estão em dia.</p>
              ) : alertas.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <p className="text-sm">{a.nome}</p>
                  <Badge variant="destructive" className="text-[10px]">
                    {a.ultimo_contato ? `${differenceInDays(new Date(), new Date(a.ultimo_contato))}d sem contato` : "Nunca contatado"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </CampanhaLayout>
  );
};

export default CampanhaDashboard;
