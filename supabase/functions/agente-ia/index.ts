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

    const { messages } = await req.json();

    // Fetch real system data to give the agent full context
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [coordsRes, secoesRes, tarefasRes, demandasRes, eventosRes, pessoasRes] = await Promise.all([
      supabase.from("coordenacoes").select("nome, descricao, slug"),
      supabase.from("secoes").select("titulo, coordenacao_id"),
      supabase.from("tarefas").select("titulo, status, responsavel, canal, data_inicio, data_fim, secao_id, motivo"),
      supabase.from("demandas").select("titulo, descricao, status, prioridade, responsavel, solicitante, categoria, data_prazo").order("created_at", { ascending: false }).limit(100),
      supabase.from("eventos").select("titulo, data, hora, local, tipo, participantes").order("data", { ascending: false }).limit(50),
      supabase.from("pessoas").select("nome, tipo, bairro, cidade, tags").limit(200),
    ]);

    const coords = coordsRes.data || [];
    const secoes = secoesRes.data || [];
    const tarefas = tarefasRes.data || [];
    const demandas = demandasRes.data || [];
    const eventos = eventosRes.data || [];
    const pessoas = pessoasRes.data || [];

    // Build contextual summaries
    const totalTarefas = tarefas.length;
    const tarefasConcluidas = tarefas.filter(t => t.status).length;
    const tarefasPendentes = totalTarefas - tarefasConcluidas;
    const todayStr = new Date().toISOString().split("T")[0];
    const tarefasAtrasadas = tarefas.filter(t => !t.status && t.data_fim && t.data_fim < todayStr);

    const demandasPorStatus = {
      pendente: demandas.filter(d => d.status === "pendente").length,
      andamento: demandas.filter(d => d.status === "andamento").length,
      concluida: demandas.filter(d => d.status === "concluida").length,
      atrasada: demandas.filter(d => d.status === "atrasada").length,
    };

    const proximosEventos = eventos.filter(e => e.data >= todayStr);

    const categoriasDemandas = demandas.reduce((acc: Record<string, number>, d) => {
      if (d.categoria) acc[d.categoria] = (acc[d.categoria] || 0) + 1;
      return acc;
    }, {});

    // Coord progress
    const secaoToCoord: Record<string, string> = {};
    secoes.forEach(s => { secaoToCoord[s.titulo] = s.coordenacao_id; });

    const coordProgress = coords.map(c => {
      const coordSecoes = secoes.filter(s => s.coordenacao_id === (coords.find(cc => cc.slug === c.slug) as any)?.id);
      return `${c.nome}: ${c.descricao || "sem descrição"}`;
    });

    const systemPrompt = `Você é o Assessor de Inteligência Digital do Deputado Estadual Comandante Dan, especializado em gestão parlamentar, análise política e governança pública no Amazonas.

## SOBRE O DEPUTADO ESTADUAL COMANDANTE DAN
- Nome: Comandante Dan
- Cargo: Deputado Estadual pela Assembleia Legislativa do Amazonas
- Área de atuação: Segurança pública, defesa civil, infraestrutura, apoio religioso (eclesiástico), comunicação e gestão administrativa
- Principais bandeiras: Segurança pública, apoio às forças militares e policiais, desenvolvimento do Amazonas

## SISTEMA DE GESTÃO DO MANDATO — DADOS EM TEMPO REAL

### COORDENAÇÕES ATIVAS (${coords.length}):
${coords.map(c => `• ${c.nome}: ${c.descricao || "coordenação ativa"}`).join("\n")}

### SITUAÇÃO DAS TAREFAS:
- Total: ${totalTarefas} tarefas registradas
- Concluídas: ${tarefasConcluidas} (${totalTarefas > 0 ? Math.round(tarefasConcluidas / totalTarefas * 100) : 0}%)
- Pendentes: ${tarefasPendentes}
- ATRASADAS: ${tarefasAtrasadas.length} tarefas em atraso${tarefasAtrasadas.length > 0 ? `\n  Tarefas atrasadas:\n${tarefasAtrasadas.slice(0, 10).map(t => `  - "${t.titulo}" (responsável: ${t.responsavel || "não definido"})`).join("\n")}` : ""}

### DEMANDAS DO GABINETE (${demandas.length} total):
- Pendentes: ${demandasPorStatus.pendente}
- Em Andamento: ${demandasPorStatus.andamento}
- Concluídas: ${demandasPorStatus.concluida}
- Atrasadas: ${demandasPorStatus.atrasada}
${Object.keys(categoriasDemandas).length > 0 ? `\nPor categoria:\n${Object.entries(categoriasDemandas).map(([cat, count]) => `• ${cat}: ${count}`).join("\n")}` : ""}

${demandas.slice(0, 20).length > 0 ? `\nÚltimas demandas registradas:\n${demandas.slice(0, 20).map(d => `• [${d.status?.toUpperCase()}] ${d.titulo} — ${d.responsavel || "sem responsável"} — Prioridade: ${d.prioridade || "média"}${d.categoria ? ` (${d.categoria})` : ""}`).join("\n")}` : ""}

### AGENDA DE EVENTOS (${proximosEventos.length} próximos):
${proximosEventos.slice(0, 10).map(e => `• ${e.data} ${e.hora} — ${e.titulo} (${e.tipo}) — ${e.local || "local não definido"} — ${e.participantes || 0} participantes`).join("\n") || "Nenhum evento próximo agendado"}

### REDE DE PESSOAS (${pessoas.length} cadastradas):
${[...new Set(pessoas.map(p => p.tipo).filter(Boolean))].map(tipo => {
  const count = pessoas.filter(p => p.tipo === tipo).length;
  return `• ${tipo}: ${count}`;
}).join("\n") || "Dados não disponíveis"}
Cidades atendidas: ${[...new Set(pessoas.map(p => p.cidade).filter(Boolean))].join(", ") || "Manaus"}

## SUAS CAPACIDADES
1. **Análise de dados**: Interprete os dados acima e gere análises profundas
2. **Relatórios**: Crie relatórios executivos, setoriais e temáticos com base nos dados reais
3. **Insights políticos**: Sugira estratégias, prioridades e ações baseadas nos dados
4. **Gestão de demandas**: Ajude a priorizar, categorizar e resolver demandas
5. **Planejamento**: Sugira pautas, ações legislativas e iniciativas para o mandato
6. **Análise de riscos**: Identifique gargalos, atrasos e áreas críticas

## DIRETRIZES
- Sempre baseie suas respostas nos dados reais fornecidos acima
- Seja objetivo, direto e use linguagem parlamentar profissional
- Use formatação markdown com títulos, listas e tabelas quando relevante
- Quando sugerir ações, seja específico e prático
- Identifique padrões, tendências e pontos de atenção nos dados
- Data de hoje: ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde um momento e tente novamente." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agente-ia error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
