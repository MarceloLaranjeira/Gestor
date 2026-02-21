import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch financial data
    const { data: movimentos } = await supabase
      .from("movimentos_financeiros")
      .select("*")
      .order("data", { ascending: false });

    const records = movimentos || [];
    const receitas = records.filter((m: any) => m.tipo === "receita");
    const despesas = records.filter((m: any) => m.tipo === "despesa");
    const totalReceitas = receitas.reduce((s: number, m: any) => s + Number(m.valor), 0);
    const totalDespesas = despesas.reduce((s: number, m: any) => s + Number(m.valor), 0);
    const saldo = totalReceitas - totalDespesas;

    // Monthly breakdown
    const monthlyMap: Record<string, { receitas: number; despesas: number }> = {};
    records.forEach((m: any) => {
      const key = m.data?.slice(0, 7); // YYYY-MM
      if (!key) return;
      if (!monthlyMap[key]) monthlyMap[key] = { receitas: 0, despesas: 0 };
      monthlyMap[key][m.tipo === "receita" ? "receitas" : "despesas"] += Number(m.valor);
    });

    const monthlyBreakdown = Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, vals]) => `${mes}: Receitas R$${vals.receitas.toFixed(2)} | Despesas R$${vals.despesas.toFixed(2)} | Saldo R$${(vals.receitas - vals.despesas).toFixed(2)}`);

    // Category breakdown
    const catMap: Record<string, number> = {};
    despesas.forEach((m: any) => {
      const cat = m.categoria || "Sem categoria";
      catMap[cat] = (catMap[cat] || 0) + Number(m.valor);
    });
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, val]) => `• ${cat}: R$${val.toFixed(2)}`);

    // Recent transactions
    const recentTransactions = records.slice(0, 20).map((m: any) =>
      `[${m.tipo.toUpperCase()}] ${m.data} — ${m.descricao} — R$${Number(m.valor).toFixed(2)}${m.categoria ? ` (${m.categoria})` : ""}`
    );

    const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const systemPrompt = `Você é um Analista Financeiro Especializado do gabinete do Deputado Estadual Comandante Dan.

## DADOS FINANCEIROS EM TEMPO REAL

### RESUMO GERAL
- Total de Receitas: R$${totalReceitas.toFixed(2)}
- Total de Despesas: R$${totalDespesas.toFixed(2)}
- Saldo Atual: R$${saldo.toFixed(2)}
- Total de Lançamentos: ${records.length}

### EVOLUÇÃO MENSAL
${monthlyBreakdown.join("\n") || "Sem dados mensais"}

### DESPESAS POR CATEGORIA
${categoryBreakdown.join("\n") || "Sem dados por categoria"}

### ÚLTIMOS LANÇAMENTOS
${recentTransactions.join("\n") || "Nenhum lançamento registrado"}

## INSTRUÇÕES
Com base nos dados acima, gere um diagnóstico completo de saúde financeira com:

1. **Score de Saúde Financeira** (0-100) com justificativa
2. **Análise de Tendências**: Receitas e despesas estão crescendo ou diminuindo?
3. **Burn Rate e Runway**: Quanto tempo o saldo atual sustenta no ritmo de gastos?
4. **Concentração de Gastos**: Categorias que mais consomem recursos
5. **Alertas e Riscos**: Pontos críticos que precisam de atenção imediata
6. **Projeção Preditiva**: Estimativa para os próximos 3 meses baseada em tendências
7. **Recomendações Estratégicas**: Ações concretas para otimizar a saúde financeira

Use markdown com formatação rica (títulos, listas, tabelas, emojis). Seja objetivo e prático.
Data de hoje: ${today}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere o diagnóstico completo de saúde financeira do gabinete." },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde e tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analise-financeira error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
