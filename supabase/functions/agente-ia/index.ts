import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Validate file content by checking magic bytes
function validateMagicBytes(bytes: Uint8Array, ext: string): boolean {
  if (bytes.length < 4) return false;
  switch (ext) {
    case "pdf": return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    case "png": return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    case "jpg": case "jpeg": return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    case "webp": return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
    case "gif": return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38;
    case "bmp": return bytes[0] === 0x42 && bytes[1] === 0x4D;
    case "tiff": return (bytes[0] === 0x49 && bytes[1] === 0x49) || (bytes[0] === 0x4D && bytes[1] === 0x4D);
    default: return false;
  }
}

async function getFileAsBase64(supabase: any, storagePath: string): Promise<{ data: string; mimeType: string }> {
  const { data: fileData, error } = await supabase.storage.from("agent-uploads").download(storagePath);
  if (error || !fileData) throw new Error(`Failed to download file: ${error?.message}`);
  const arrayBuffer = await fileData.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const ext = storagePath.split(".").pop()?.toLowerCase();
  if (!validateMagicBytes(bytes, ext || "")) throw new Error(`Invalid file content for extension .${ext}`);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const mimeTypes: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", bmp: "image/bmp", tiff: "image/tiff" };
  return { data: base64, mimeType: mimeTypes[ext || ""] || "application/octet-stream" };
}

// ─── CRUD Tool definitions ───
const crudTools = [
  {
    type: "function",
    function: {
      name: "criar_demanda",
      description: "Cria uma nova demanda no sistema do gabinete",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título da demanda" },
          descricao: { type: "string", description: "Descrição detalhada" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"], description: "Nível de prioridade" },
          status: { type: "string", enum: ["pendente", "andamento", "concluida", "atrasada"], description: "Status atual" },
          responsavel: { type: "string", description: "Nome do responsável" },
          solicitante: { type: "string", description: "Nome do solicitante" },
          categoria: { type: "string", description: "Categoria da demanda" },
          data_prazo: { type: "string", description: "Data prazo no formato YYYY-MM-DD" },
        },
        required: ["titulo"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_demanda",
      description: "Edita uma demanda existente. Busca pelo título ou ID.",
      parameters: {
        type: "object",
        properties: {
          busca_titulo: { type: "string", description: "Título (ou parte) da demanda a editar" },
          id: { type: "string", description: "ID UUID da demanda (se conhecido)" },
          titulo: { type: "string", description: "Novo título" },
          descricao: { type: "string", description: "Nova descrição" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          status: { type: "string", enum: ["pendente", "andamento", "concluida", "atrasada"] },
          responsavel: { type: "string" },
          solicitante: { type: "string" },
          categoria: { type: "string" },
          data_prazo: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_demanda",
      description: "Exclui uma demanda pelo título ou ID",
      parameters: {
        type: "object",
        properties: {
          busca_titulo: { type: "string", description: "Título (ou parte) da demanda a excluir" },
          id: { type: "string", description: "ID UUID da demanda" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_evento",
      description: "Cria um novo evento na agenda do gabinete",
      parameters: {
        type: "object",
        properties: {
          titulo: { type: "string", description: "Título do evento" },
          data: { type: "string", description: "Data no formato YYYY-MM-DD" },
          hora: { type: "string", description: "Hora no formato HH:MM" },
          local: { type: "string", description: "Local do evento" },
          tipo: { type: "string", description: "Tipo do evento (Interno, Externo, Audiência, etc.)" },
          descricao: { type: "string", description: "Descrição do evento" },
          participantes: { type: "number", description: "Número estimado de participantes" },
        },
        required: ["titulo", "data"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_evento",
      description: "Edita um evento existente",
      parameters: {
        type: "object",
        properties: {
          busca_titulo: { type: "string", description: "Título (ou parte) do evento a editar" },
          id: { type: "string", description: "ID UUID do evento" },
          titulo: { type: "string" },
          data: { type: "string" },
          hora: { type: "string" },
          local: { type: "string" },
          tipo: { type: "string" },
          descricao: { type: "string" },
          participantes: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_evento",
      description: "Exclui um evento pelo título ou ID",
      parameters: {
        type: "object",
        properties: {
          busca_titulo: { type: "string", description: "Título (ou parte) do evento" },
          id: { type: "string", description: "ID UUID do evento" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_pessoa",
      description: "Cadastra uma nova pessoa no sistema",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo" },
          tipo: { type: "string", description: "Tipo: Liderança, Apoiador, Contato, etc." },
          telefone: { type: "string" },
          email: { type: "string" },
          bairro: { type: "string" },
          cidade: { type: "string" },
          tags: { type: "array", items: { type: "string" }, description: "Tags/etiquetas" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_pessoa",
      description: "Edita uma pessoa existente",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string", description: "Nome (ou parte) da pessoa a editar" },
          id: { type: "string", description: "ID UUID da pessoa" },
          nome: { type: "string" },
          tipo: { type: "string" },
          telefone: { type: "string" },
          email: { type: "string" },
          bairro: { type: "string" },
          cidade: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_pessoa",
      description: "Exclui uma pessoa pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string", description: "Nome (ou parte) da pessoa" },
          id: { type: "string", description: "ID UUID da pessoa" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_demandas",
      description: "Lista demandas com filtros opcionais",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pendente", "andamento", "concluida", "atrasada"] },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          limite: { type: "number", description: "Quantidade máxima de resultados" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_eventos",
      description: "Lista eventos com filtros opcionais",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string" },
          data_inicio: { type: "string", description: "Data mínima YYYY-MM-DD" },
          data_fim: { type: "string", description: "Data máxima YYYY-MM-DD" },
          limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_pessoas",
      description: "Lista pessoas cadastradas com filtros",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string" },
          cidade: { type: "string" },
          busca_nome: { type: "string" },
          limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
];

// ─── Execute CRUD tool calls ───
async function executeTool(supabase: any, userId: string, name: string, args: any): Promise<string> {
  try {
    switch (name) {
      // ── DEMANDAS ──
      case "criar_demanda": {
        const { data, error } = await supabase.from("demandas").insert({
          titulo: args.titulo,
          descricao: args.descricao || "",
          prioridade: args.prioridade || "media",
          status: args.status || "pendente",
          responsavel: args.responsavel || "",
          solicitante: args.solicitante || "",
          categoria: args.categoria || "",
          data_prazo: args.data_prazo || null,
          user_id: userId,
        }).select().single();
        if (error) return `❌ Erro ao criar demanda: ${error.message}`;
        return `✅ Demanda "${data.titulo}" criada com sucesso! (ID: ${data.id}) | Status: ${data.status} | Prioridade: ${data.prioridade}`;
      }
      case "editar_demanda": {
        let targetId = args.id;
        if (!targetId && args.busca_titulo) {
          const { data: found } = await supabase.from("demandas").select("id, titulo").ilike("titulo", `%${args.busca_titulo}%`).limit(1).single();
          if (!found) return `❌ Demanda com título "${args.busca_titulo}" não encontrada.`;
          targetId = found.id;
        }
        if (!targetId) return "❌ Forneça o título ou ID da demanda para editar.";
        const updates: any = {};
        for (const key of ["titulo", "descricao", "prioridade", "status", "responsavel", "solicitante", "categoria", "data_prazo"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("demandas").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro ao editar demanda: ${error.message}`;
        return `✅ Demanda "${data.titulo}" atualizada com sucesso!`;
      }
      case "excluir_demanda": {
        let targetId = args.id;
        if (!targetId && args.busca_titulo) {
          const { data: found } = await supabase.from("demandas").select("id, titulo").ilike("titulo", `%${args.busca_titulo}%`).limit(1).single();
          if (!found) return `❌ Demanda com título "${args.busca_titulo}" não encontrada.`;
          targetId = found.id;
        }
        if (!targetId) return "❌ Forneça o título ou ID da demanda para excluir.";
        const { error } = await supabase.from("demandas").delete().eq("id", targetId);
        if (error) return `❌ Erro ao excluir demanda: ${error.message}`;
        return `✅ Demanda excluída com sucesso!`;
      }

      // ── EVENTOS ──
      case "criar_evento": {
        const { data, error } = await supabase.from("eventos").insert({
          titulo: args.titulo,
          data: args.data,
          hora: args.hora || "08:00",
          local: args.local || "",
          tipo: args.tipo || "Interno",
          descricao: args.descricao || "",
          participantes: args.participantes || 0,
          user_id: userId,
        }).select().single();
        if (error) return `❌ Erro ao criar evento: ${error.message}`;
        return `✅ Evento "${data.titulo}" criado para ${data.data} às ${data.hora}! (ID: ${data.id})`;
      }
      case "editar_evento": {
        let targetId = args.id;
        if (!targetId && args.busca_titulo) {
          const { data: found } = await supabase.from("eventos").select("id, titulo").ilike("titulo", `%${args.busca_titulo}%`).limit(1).single();
          if (!found) return `❌ Evento com título "${args.busca_titulo}" não encontrado.`;
          targetId = found.id;
        }
        if (!targetId) return "❌ Forneça o título ou ID do evento para editar.";
        const updates: any = {};
        for (const key of ["titulo", "data", "hora", "local", "tipo", "descricao", "participantes"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("eventos").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro ao editar evento: ${error.message}`;
        return `✅ Evento "${data.titulo}" atualizado com sucesso!`;
      }
      case "excluir_evento": {
        let targetId = args.id;
        if (!targetId && args.busca_titulo) {
          const { data: found } = await supabase.from("eventos").select("id, titulo").ilike("titulo", `%${args.busca_titulo}%`).limit(1).single();
          if (!found) return `❌ Evento com título "${args.busca_titulo}" não encontrado.`;
          targetId = found.id;
        }
        if (!targetId) return "❌ Forneça o título ou ID do evento para excluir.";
        const { error } = await supabase.from("eventos").delete().eq("id", targetId);
        if (error) return `❌ Erro ao excluir evento: ${error.message}`;
        return `✅ Evento excluído com sucesso!`;
      }

      // ── PESSOAS ──
      case "criar_pessoa": {
        const { data, error } = await supabase.from("pessoas").insert({
          nome: args.nome,
          tipo: args.tipo || "",
          telefone: args.telefone || "",
          email: args.email || "",
          bairro: args.bairro || "",
          cidade: args.cidade || "Manaus",
          tags: args.tags || [],
          user_id: userId,
        }).select().single();
        if (error) return `❌ Erro ao cadastrar pessoa: ${error.message}`;
        return `✅ Pessoa "${data.nome}" cadastrada com sucesso! (ID: ${data.id}) | Tipo: ${data.tipo || "não definido"}`;
      }
      case "editar_pessoa": {
        let targetId = args.id;
        if (!targetId && args.busca_nome) {
          const { data: found } = await supabase.from("pessoas").select("id, nome").ilike("nome", `%${args.busca_nome}%`).limit(1).single();
          if (!found) return `❌ Pessoa com nome "${args.busca_nome}" não encontrada.`;
          targetId = found.id;
        }
        if (!targetId) return "❌ Forneça o nome ou ID da pessoa para editar.";
        const updates: any = {};
        for (const key of ["nome", "tipo", "telefone", "email", "bairro", "cidade", "tags"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("pessoas").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro ao editar pessoa: ${error.message}`;
        return `✅ Pessoa "${data.nome}" atualizada com sucesso!`;
      }
      case "excluir_pessoa": {
        let targetId = args.id;
        if (!targetId && args.busca_nome) {
          const { data: found } = await supabase.from("pessoas").select("id, nome").ilike("nome", `%${args.busca_nome}%`).limit(1).single();
          if (!found) return `❌ Pessoa com nome "${args.busca_nome}" não encontrada.`;
          targetId = found.id;
        }
        if (!targetId) return "❌ Forneça o nome ou ID da pessoa para excluir.";
        const { error } = await supabase.from("pessoas").delete().eq("id", targetId);
        if (error) return `❌ Erro ao excluir pessoa: ${error.message}`;
        return `✅ Pessoa excluída com sucesso!`;
      }

      // ── LISTAR ──
      case "listar_demandas": {
        let query = supabase.from("demandas").select("id, titulo, status, prioridade, responsavel, categoria, data_prazo").order("created_at", { ascending: false });
        if (args.status) query = query.eq("status", args.status);
        if (args.prioridade) query = query.eq("prioridade", args.prioridade);
        query = query.limit(args.limite || 20);
        const { data, error } = await query;
        if (error) return `❌ Erro ao listar demandas: ${error.message}`;
        if (!data || data.length === 0) return "📋 Nenhuma demanda encontrada com os filtros aplicados.";
        const lines = data.map((d: any) => `• [${d.status?.toUpperCase()}] ${d.titulo} — ${d.responsavel || "sem responsável"} — Prioridade: ${d.prioridade} (ID: ${d.id})`);
        return `📋 **${data.length} demanda(s) encontrada(s):**\n${lines.join("\n")}`;
      }
      case "listar_eventos": {
        let query = supabase.from("eventos").select("id, titulo, data, hora, local, tipo, participantes").order("data", { ascending: true });
        if (args.tipo) query = query.eq("tipo", args.tipo);
        if (args.data_inicio) query = query.gte("data", args.data_inicio);
        if (args.data_fim) query = query.lte("data", args.data_fim);
        query = query.limit(args.limite || 20);
        const { data, error } = await query;
        if (error) return `❌ Erro ao listar eventos: ${error.message}`;
        if (!data || data.length === 0) return "📅 Nenhum evento encontrado com os filtros aplicados.";
        const lines = data.map((e: any) => `• ${e.data} ${e.hora} — ${e.titulo} (${e.tipo}) — ${e.local || "local não definido"} (ID: ${e.id})`);
        return `📅 **${data.length} evento(s) encontrado(s):**\n${lines.join("\n")}`;
      }
      case "listar_pessoas": {
        let query = supabase.from("pessoas").select("id, nome, tipo, telefone, email, cidade, bairro").order("nome");
        if (args.tipo) query = query.eq("tipo", args.tipo);
        if (args.cidade) query = query.ilike("cidade", `%${args.cidade}%`);
        if (args.busca_nome) query = query.ilike("nome", `%${args.busca_nome}%`);
        query = query.limit(args.limite || 20);
        const { data, error } = await query;
        if (error) return `❌ Erro ao listar pessoas: ${error.message}`;
        if (!data || data.length === 0) return "👥 Nenhuma pessoa encontrada com os filtros aplicados.";
        const lines = data.map((p: any) => `• ${p.nome} — ${p.tipo || "sem tipo"} — ${p.cidade || ""} ${p.bairro || ""} (ID: ${p.id})`);
        return `👥 **${data.length} pessoa(s) encontrada(s):**\n${lines.join("\n")}`;
      }

      default:
        return `❌ Ferramenta "${name}" não reconhecida.`;
    }
  } catch (e: any) {
    return `❌ Erro ao executar ${name}: ${e.message || "Erro desconhecido"}`;
  }
}

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

    const { messages, model, attachments, customInstructions, temperature, assertiveness, formality } = await req.json();

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch system data
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

    const systemPrompt = `Você é o Assessor de Inteligência Digital do Deputado Estadual Comandante Dan, especializado em gestão parlamentar, análise política e governança pública no Amazonas.

## SOBRE O DEPUTADO ESTADUAL COMANDANTE DAN
- Nome: Comandante Dan
- Cargo: Deputado Estadual pela Assembleia Legislativa do Amazonas
- Área de atuação: Segurança pública, defesa civil, infraestrutura, apoio religioso (eclesiástico), comunicação e gestão administrativa

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
2. **Relatórios**: Crie relatórios executivos, setoriais e temáticos
3. **CRUD de dados**: Você pode CRIAR, EDITAR e EXCLUIR demandas, eventos e pessoas usando as ferramentas disponíveis
4. **Insights políticos**: Sugira estratégias baseadas nos dados
5. **Gestão de demandas**: Priorize, categorize e resolva demandas
6. **Análise de documentos**: Analise PDFs e imagens enviados

## DIRETRIZES PARA CRUD
- Quando o usuário pedir para criar, editar ou excluir dados, USE AS FERRAMENTAS disponíveis
- Sempre confirme a ação realizada mostrando os dados alterados
- Para edições, busque o registro pelo título antes de editar
- Seja proativo: se o usuário mencionar algo que pode ser uma demanda/evento/pessoa, sugira criar
- Ao criar demandas, defina prioridade e status adequados automaticamente

## ESTILO DE COMUNICAÇÃO
- Assertividade: ${assertiveness !== undefined ? Math.round(assertiveness * 100) : 50}%
- Formalidade: ${formality || "neutral"}
- Data de hoje: ${new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
${customInstructions ? `\n## INSTRUÇÕES ADICIONAIS DO USUÁRIO\n${customInstructions}` : ""}`;

    // Process attachments
    const processedAttachments: Array<{ data: string; mimeType: string; fileName: string }> = [];
    if (attachments && Array.isArray(attachments)) {
      for (const att of attachments) {
        try {
          const result = await getFileAsBase64(supabase, att.storagePath);
          processedAttachments.push({ ...result, fileName: att.fileName || att.storagePath });
        } catch (e) {
          console.error("Error processing attachment:", att.storagePath, e);
        }
      }
    }

    // Build messages for the AI
    const aiMessages: any[] = [{ role: "system", content: systemPrompt }];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (i === messages.length - 1 && msg.role === "user" && processedAttachments.length > 0) {
        const contentParts: any[] = [{ type: "text", text: msg.content || "Analise este(s) documento(s) em detalhes." }];
        for (const att of processedAttachments) {
          contentParts.push({ type: "image_url", image_url: { url: `data:${att.mimeType};base64,${att.data}` } });
        }
        aiMessages.push({ role: "user", content: contentParts });
      } else {
        aiMessages.push(msg);
      }
    }

    const selectedModel = model || "google/gemini-2.5-flash";

    // ─── First AI call (may return tool calls) ───
    const firstResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: aiMessages,
        tools: crudTools,
        temperature: temperature !== undefined ? temperature : 0.7,
      }),
    });

    if (!firstResponse.ok) {
      if (firstResponse.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (firstResponse.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await firstResponse.text();
      console.error("AI gateway error:", firstResponse.status, t);
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const firstData = await firstResponse.json();
    const choice = firstData.choices?.[0];

    // If no tool calls, stream the response normally
    if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
      // Re-call with streaming for normal text responses
      const streamResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: aiMessages,
          tools: crudTools,
          stream: true,
          temperature: temperature !== undefined ? temperature : 0.7,
        }),
      });

      if (!streamResponse.ok) {
        const t = await streamResponse.text();
        console.error("Stream error:", streamResponse.status, t);
        return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(streamResponse.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // ─── Execute tool calls ───
    const toolCalls = choice.message.tool_calls;
    const toolResults: string[] = [];

    for (const tc of toolCalls) {
      const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
      const result = await executeTool(supabase, user.id, tc.function.name, args);
      toolResults.push(result);
    }

    // Build messages with tool results and get final response
    const toolMessages = [...aiMessages, choice.message];
    for (let i = 0; i < toolCalls.length; i++) {
      toolMessages.push({
        role: "tool",
        tool_call_id: toolCalls[i].id,
        content: toolResults[i],
      });
    }

    // Get final streamed response after tool execution
    const finalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: toolMessages,
        stream: true,
        temperature: temperature !== undefined ? temperature : 0.7,
      }),
    });

    if (!finalResponse.ok) {
      // If streaming fails after tools, return tool results directly
      const resultText = toolResults.join("\n\n");
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: resultText } }] })}\n\ndata: [DONE]\n\n`;
      return new Response(sseData, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    return new Response(finalResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("agente-ia error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
