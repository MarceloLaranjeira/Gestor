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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { context } = await req.json().catch(() => ({ context: "" }));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [calhasRes, coordRes, visitasRes, assessoresRes, locaisRes, contatosRes] = await Promise.all([
      supabase.from("campanha_calhas").select("*"),
      supabase.from("campanha_coordenadores").select("*"),
      supabase.from("campanha_visitas").select("*"),
      supabase.from("campanha_assessores").select("*"),
      supabase.from("campanha_locais").select("*"),
      supabase.from("campanha_contatos").select("*"),
    ]);

    const calhas = calhasRes.data || [];
    const coordenadores = coordRes.data || [];
    const visitas = visitasRes.data || [];
    const assessores = assessoresRes.data || [];
    const locais = locaisRes.data || [];
    const contatos = contatosRes.data || [];

    const totalVotos = calhas.reduce((s: number, c: any) => s + (c.votos_validos || 0), 0);
    const totalPotencial = calhas.reduce((s: number, c: any) => s + (c.potencial_votos || 0), 0);
    const calhasComCoord = new Set(coordenadores.filter((c: any) => c.calha_id).map((c: any) => c.calha_id));
    const calhasSemCoord = calhas.filter((c: any) => !calhasComCoord.has(c.id));
    const coordAtivos = coordenadores.filter((c: any) => c.status === "ativo");
    const visitasRealizadas = visitas.filter((v: any) => v.status === "realizada");
    const visitasPlanejadas = visitas.filter((v: any) => v.status === "planejada");
    const visitasCanceladas = visitas.filter((v: any) => v.status === "cancelada");

    const now = new Date();
    const coordSemContato = coordenadores.filter((c: any) => {
      if (!c.ultimo_contato) return true;
      const diff = (now.getTime() - new Date(c.ultimo_contato).getTime()) / (1000 * 60 * 60 * 24);
      return diff > 30;
    });

    // Per-region
    const regioes: Record<string, any> = {};
    calhas.forEach((c: any) => {
      const r = c.regiao || "Sem região";
      if (!regioes[r]) regioes[r] = { calhas: 0, votos: 0, potencial: 0, coords: 0 };
      regioes[r].calhas++;
      regioes[r].votos += c.votos_validos || 0;
      regioes[r].potencial += c.potencial_votos || 0;
    });
    coordenadores.forEach((c: any) => {
      const calha = calhas.find((ca: any) => ca.id === c.calha_id);
      const r = calha?.regiao || "Sem região";
      if (regioes[r]) regioes[r].coords++;
    });

    const locaisPorTipo: Record<string, number> = {};
    locais.forEach((l: any) => { locaisPorTipo[l.tipo] = (locaisPorTipo[l.tipo] || 0) + 1; });

    const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const systemPrompt = `Você é o HORUS, Assessor Estratégico de Inteligência Eleitoral do gabinete do Deputado Estadual Comandante Dan.

## DADOS DA CAMPANHA EM TEMPO REAL (${today})

### VISÃO GERAL
- Total de Calhas: ${calhas.length}
- Calhas com Coordenador: ${calhasComCoord.size} (${calhas.length > 0 ? ((calhasComCoord.size / calhas.length) * 100).toFixed(0) : 0}%)
- Calhas SEM Coordenador: ${calhasSemCoord.length} → ${calhasSemCoord.map((c: any) => `${c.nome} (${c.potencial_votos} votos pot.)`).join(", ") || "Nenhuma"}
- Total Votos Válidos: ${totalVotos.toLocaleString("pt-BR")}
- Potencial Total de Votos: ${totalPotencial.toLocaleString("pt-BR")}

### EQUIPE
- Coordenadores: ${coordenadores.length} (${coordAtivos.length} ativos, ${coordenadores.length - coordAtivos.length} inativos)
- Assessores: ${assessores.length} (média: ${coordenadores.length > 0 ? (assessores.length / coordenadores.length).toFixed(1) : 0} por coordenador)
- Coordenadores SEM CONTATO há +30 dias: ${coordSemContato.length} → ${coordSemContato.map((c: any) => c.nome).join(", ") || "Nenhum"}

### VISITAS
- Total: ${visitas.length}
- Realizadas: ${visitasRealizadas.length} (${visitas.length > 0 ? ((visitasRealizadas.length / visitas.length) * 100).toFixed(0) : 0}%)
- Planejadas: ${visitasPlanejadas.length}
- Canceladas: ${visitasCanceladas.length}
- Contatos registrados: ${contatos.length}

### LOCAIS MAPEADOS
- Total: ${locais.length}
- Por tipo: ${Object.entries(locaisPorTipo).map(([k, v]) => `${k}: ${v}`).join(", ") || "Nenhum"}

### ANÁLISE REGIONAL
${Object.entries(regioes).map(([nome, d]: any) => `- ${nome}: ${d.calhas} calhas, ${d.coords} coords, ${d.potencial.toLocaleString("pt-BR")} votos pot.`).join("\n") || "Sem dados regionais"}

### TOP 10 CALHAS POR POTENCIAL
${[...calhas].sort((a: any, b: any) => b.potencial_votos - a.potencial_votos).slice(0, 10).map((c: any, i: number) => `${i + 1}. ${c.nome} — ${c.potencial_votos.toLocaleString("pt-BR")} votos (${c.percentual_cristaos}% cristãos, ${c.municipios} municípios)`).join("\n")}

${context ? `\n### CONTEXTO DO CARD CLICADO\n${context}\n` : ""}

## INSTRUÇÕES
Gere uma análise estratégica completa e detalhada com:

1. **Score Geral da Campanha** (0-100) com justificativa
2. **Diagnóstico de Cobertura Territorial**: Quais regiões estão bem cobertas e quais precisam de atenção
3. **Análise da Equipe**: Eficiência dos coordenadores, distribuição de assessores, gaps de comunicação
4. **Performance de Visitas**: Taxa de conversão, calhas sem visitas, recomendações de priorização
5. **Mapeamento Estratégico**: Análise dos locais mapeados e sugestões de expansão
6. **Alertas Críticos**: Problemas urgentes que precisam de ação imediata
7. **Plano de Ação (próximos 30 dias)**: 5 ações prioritárias com impacto esperado
8. **Projeção de Potencial**: Estimativa de captação de votos baseada no cenário atual

Use markdown rico (títulos, tabelas, emojis, listas). Seja direto, prático e estratégico.`;

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
          { role: "user", content: context 
            ? `Analise especificamente este KPI/indicador clicado: ${context}. Dê recomendações práticas e acionáveis para melhorar este indicador.`
            : "Gere o diagnóstico estratégico completo da campanha." },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
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
    console.error("analise-campanha error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
