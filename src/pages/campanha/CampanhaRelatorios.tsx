import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CampanhaLayout from "@/components/campanha/CampanhaLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--destructive))", "#6366f1", "#14b8a6", "#f97316"];

const CampanhaRelatorios = () => {
  const [visitasPorStatus, setVisitasPorStatus] = useState<{ name: string; value: number }[]>([]);
  const [coordPorCalha, setCoordPorCalha] = useState<{ nome: string; total: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [v, co, ca] = await Promise.all([
        supabase.from("campanha_visitas").select("status"),
        supabase.from("campanha_coordenadores").select("calha_id"),
        supabase.from("campanha_calhas").select("id, nome"),
      ]);

      // Visitas por status
      const statusCount: Record<string, number> = {};
      (v.data || []).forEach((r: any) => { statusCount[r.status] = (statusCount[r.status] || 0) + 1; });
      setVisitasPorStatus(Object.entries(statusCount).map(([name, value]) => ({ name, value })));

      // Coordenadores por calha
      const calhaMap = Object.fromEntries((ca.data || []).map((c: any) => [c.id, c.nome]));
      const calhaCount: Record<string, number> = {};
      (co.data || []).forEach((r: any) => {
        const nome = calhaMap[r.calha_id] || "Sem calha";
        calhaCount[nome] = (calhaCount[nome] || 0) + 1;
      });
      setCoordPorCalha(Object.entries(calhaCount).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total));
    };
    fetch();
  }, []);

  return (
    <CampanhaLayout title="Relatórios">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas por Status</CardTitle></CardHeader>
          <CardContent>
            {visitasPorStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={visitasPorStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {visitasPorStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Coordenadores por Calha</CardTitle></CardHeader>
          <CardContent>
            {coordPorCalha.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={coordPorCalha}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </CampanhaLayout>
  );
};

export default CampanhaRelatorios;
