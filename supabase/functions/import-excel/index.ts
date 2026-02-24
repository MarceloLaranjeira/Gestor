import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalizeStr(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_\s]+/g, " ").trim();
}

function findCol(headers: string[], names: string[]): number {
  const nh = headers.map(h => h ? normalizeStr(String(h)) : "");
  const nn = names.map(normalizeStr);
  for (const n of nn) { const i = nh.indexOf(n); if (i !== -1) return i; }
  for (const n of nn) { const i = nh.findIndex(h => h.startsWith(n)); if (i !== -1) return i; }
  for (const n of nn) { const i = nh.findIndex(h => h.includes(n)); if (i !== -1) return i; }
  return -1;
}

function slugify(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    return null;
  }
  const s = String(val).trim();
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth
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

    const { storagePath } = await req.json();
    if (!storagePath) {
      return new Response(JSON.stringify({ error: "storagePath é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Download Excel
    const { data: fileData, error: dlError } = await supabase.storage
      .from("agent-uploads").download(storagePath);
    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: `Falha ao baixar arquivo: ${dlError?.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array", cellDates: true });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rawData.length < 2) {
      return new Response(JSON.stringify({ error: "Planilha vazia ou sem dados suficientes." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headers = rawData[0].map((h: any) => String(h));

    // Detect columns - Tarefas
    const colCoord = findCol(headers, ["coordenadoria", "coordenacao", "coord", "area", "setor"]);
    const colSecao = findCol(headers, ["secao", "secção", "submenu", "grupo"]);
    const colTarefa = findCol(headers, ["tarefa", "atividade", "acao", "task"]);
    const colResponsavel = findCol(headers, ["responsavel", "responsável", "encarregado", "assignee"]);
    const colCanal = findCol(headers, ["canal", "meio", "channel"]);
    const colStatus = findCol(headers, ["status", "situacao", "situação", "concluido", "concluída"]);
    const colDataInicio = findCol(headers, ["data inicio", "data_inicio", "inicio", "início", "start"]);
    const colDataFim = findCol(headers, ["data fim", "data_fim", "prazo", "deadline", "fim", "end"]);
    const colMotivo = findCol(headers, ["motivo", "observacao", "observação", "nota", "note"]);

    // Detect columns - Demandas
    const colDemanda = findCol(headers, ["demanda", "solicitacao", "solicitação", "pedido", "requerimento"]);
    const colDemandaDesc = findCol(headers, ["descricao demanda", "descricao_demanda", "detalhe demanda", "detalhe"]);
    const colSolicitante = findCol(headers, ["solicitante", "requerente", "quem pediu", "origem"]);
    const colPrioridade = findCol(headers, ["prioridade", "urgencia", "urgência", "priority"]);
    const colCategoria = findCol(headers, ["categoria", "tipo demanda", "tipo_demanda", "classificacao"]);
    const colDataPrazo = findCol(headers, ["data prazo", "data_prazo", "vencimento", "due date"]);

    // Use colResponsavel and colStatus for demandas too (shared columns)

    if (colTarefa === -1 && colCoord === -1 && colDemanda === -1) {
      return new Response(JSON.stringify({
        error: "Não foi possível identificar as colunas da planilha.",
        detected_headers: headers,
        hint: "A planilha deve ter pelo menos uma coluna de 'Coordenadoria', 'Tarefa' ou 'Demanda'.",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get existing coordenações
    const { data: existingCoords } = await supabase.from("coordenacoes").select("id, nome, slug");
    const coordMap = new Map<string, string>();
    for (const c of (existingCoords || [])) {
      coordMap.set(normalizeStr(c.nome), c.id);
    }

    // Get existing seções
    const { data: existingSecoes } = await supabase.from("secoes").select("id, titulo, coordenacao_id");
    const secaoMap = new Map<string, string>();
    for (const s of (existingSecoes || [])) {
      secaoMap.set(`${s.coordenacao_id}|${normalizeStr(s.titulo)}`, s.id);
    }

    const stats = {
      coordsCreated: 0, secoesCreated: 0, tarefasCreated: 0,
      demandasCreated: 0, rowsProcessed: 0, errors: [] as string[],
    };

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every((c: any) => !c && c !== 0)) continue;

      stats.rowsProcessed++;

      const coordNome = colCoord !== -1 ? String(row[colCoord]).trim() : "";
      const secaoTitulo = colSecao !== -1 ? String(row[colSecao]).trim() : "";
      const tarefaTitulo = colTarefa !== -1 ? String(row[colTarefa]).trim() : "";
      const demandaTitulo = colDemanda !== -1 ? String(row[colDemanda]).trim() : "";

      if (!coordNome && !tarefaTitulo && !demandaTitulo) continue;

      // --- Resolve or create coordenação (for tarefas) ---
      let coordId = "";
      if (coordNome) {
        const normCoord = normalizeStr(coordNome);
        if (coordMap.has(normCoord)) {
          coordId = coordMap.get(normCoord)!;
        } else {
          const slug = slugify(coordNome);
          const { data: newCoord, error: coordErr } = await supabase
            .from("coordenacoes")
            .insert({ nome: coordNome, slug, descricao: "" })
            .select("id")
            .single();
          if (coordErr) {
            stats.errors.push(`Linha ${i + 1}: Erro ao criar coordenação "${coordNome}": ${coordErr.message}`);
            continue;
          }
          coordId = newCoord.id;
          coordMap.set(normCoord, coordId);
          stats.coordsCreated++;
        }
      }

      // --- Create tarefa if applicable ---
      if (tarefaTitulo && coordId) {
        let secaoId = "";
        const effectiveSecao = secaoTitulo || "Geral";
        const secaoKey = `${coordId}|${normalizeStr(effectiveSecao)}`;
        if (secaoMap.has(secaoKey)) {
          secaoId = secaoMap.get(secaoKey)!;
        } else {
          const { data: newSecao, error: secErr } = await supabase
            .from("secoes")
            .insert({ titulo: effectiveSecao, coordenacao_id: coordId })
            .select("id")
            .single();
          if (secErr) {
            stats.errors.push(`Linha ${i + 1}: Erro ao criar seção "${effectiveSecao}": ${secErr.message}`);
          } else {
            secaoId = newSecao.id;
            secaoMap.set(secaoKey, secaoId);
            stats.secoesCreated++;
          }
        }

        if (secaoId) {
          const statusVal = colStatus !== -1 ? String(row[colStatus]).trim().toLowerCase() : "";
          const isCompleted = ["concluido", "concluída", "concluida", "done", "sim", "yes", "true", "1", "x"].includes(statusVal);

          const tarefaData: any = { titulo: tarefaTitulo, secao_id: secaoId, status: isCompleted };
          if (colResponsavel !== -1 && row[colResponsavel]) tarefaData.responsavel = String(row[colResponsavel]).trim();
          if (colCanal !== -1 && row[colCanal]) tarefaData.canal = String(row[colCanal]).trim();
          if (colMotivo !== -1 && row[colMotivo]) tarefaData.motivo = String(row[colMotivo]).trim();
          const di = colDataInicio !== -1 ? parseDate(row[colDataInicio]) : null;
          const df = colDataFim !== -1 ? parseDate(row[colDataFim]) : null;
          if (di) tarefaData.data_inicio = di;
          if (df) tarefaData.data_fim = df;

          const { error: tarefaErr } = await supabase.from("tarefas").insert(tarefaData);
          if (tarefaErr) {
            stats.errors.push(`Linha ${i + 1}: Erro ao criar tarefa "${tarefaTitulo}": ${tarefaErr.message}`);
          } else {
            stats.tarefasCreated++;
          }
        }
      } else if (tarefaTitulo && !coordId) {
        stats.errors.push(`Linha ${i + 1}: Tarefa "${tarefaTitulo}" sem coordenadoria definida.`);
      }

      // --- Create demanda if applicable ---
      if (demandaTitulo) {
        const statusVal = colStatus !== -1 ? String(row[colStatus]).trim().toLowerCase() : "";
        const demandaStatus = ["concluido", "concluída", "concluida", "done"].includes(statusVal) ? "concluida"
          : ["andamento", "em andamento", "in progress", "em curso"].includes(statusVal) ? "andamento"
          : ["atrasada", "atrasado", "late", "overdue"].includes(statusVal) ? "atrasada"
          : "pendente";

        const prioridadeVal = colPrioridade !== -1 ? String(row[colPrioridade]).trim().toLowerCase() : "";
        const prioridade = ["alta", "high", "urgente"].includes(prioridadeVal) ? "alta"
          : ["baixa", "low"].includes(prioridadeVal) ? "baixa"
          : "media";

        const demandaData: any = {
          titulo: demandaTitulo,
          user_id: user.id,
          status: demandaStatus,
          prioridade,
        };

        if (colDemandaDesc !== -1 && row[colDemandaDesc]) {
          demandaData.descricao = String(row[colDemandaDesc]).trim();
        }
        if (colResponsavel !== -1 && row[colResponsavel]) {
          demandaData.responsavel = String(row[colResponsavel]).trim();
        }
        if (colSolicitante !== -1 && row[colSolicitante]) {
          demandaData.solicitante = String(row[colSolicitante]).trim();
        }
        if (colCategoria !== -1 && row[colCategoria]) {
          demandaData.categoria = String(row[colCategoria]).trim();
        }
        const dprazo = colDataPrazo !== -1 ? parseDate(row[colDataPrazo]) : (colDataFim !== -1 ? parseDate(row[colDataFim]) : null);
        if (dprazo) demandaData.data_prazo = dprazo;

        const { error: demandaErr } = await supabase.from("demandas").insert(demandaData);
        if (demandaErr) {
          stats.errors.push(`Linha ${i + 1}: Erro ao criar demanda "${demandaTitulo}": ${demandaErr.message}`);
        } else {
          stats.demandasCreated++;
        }
      }
    }

    // Build summary
    const detectedCols = [];
    if (colCoord !== -1) detectedCols.push(`Coordenadoria: "${headers[colCoord]}"`);
    if (colSecao !== -1) detectedCols.push(`Seção: "${headers[colSecao]}"`);
    if (colTarefa !== -1) detectedCols.push(`Tarefa: "${headers[colTarefa]}"`);
    if (colDemanda !== -1) detectedCols.push(`Demanda: "${headers[colDemanda]}"`);
    if (colResponsavel !== -1) detectedCols.push(`Responsável: "${headers[colResponsavel]}"`);
    if (colSolicitante !== -1) detectedCols.push(`Solicitante: "${headers[colSolicitante]}"`);
    if (colCategoria !== -1) detectedCols.push(`Categoria: "${headers[colCategoria]}"`);
    if (colPrioridade !== -1) detectedCols.push(`Prioridade: "${headers[colPrioridade]}"`);
    if (colCanal !== -1) detectedCols.push(`Canal: "${headers[colCanal]}"`);
    if (colStatus !== -1) detectedCols.push(`Status: "${headers[colStatus]}"`);
    if (colDataInicio !== -1) detectedCols.push(`Data Início: "${headers[colDataInicio]}"`);
    if (colDataFim !== -1) detectedCols.push(`Data Fim: "${headers[colDataFim]}"`);
    if (colDataPrazo !== -1) detectedCols.push(`Data Prazo: "${headers[colDataPrazo]}"`);
    if (colMotivo !== -1) detectedCols.push(`Motivo: "${headers[colMotivo]}"`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        sheet: sheetName,
        totalRows: rawData.length - 1,
        rowsProcessed: stats.rowsProcessed,
        coordsCreated: stats.coordsCreated,
        secoesCreated: stats.secoesCreated,
        tarefasCreated: stats.tarefasCreated,
        demandasCreated: stats.demandasCreated,
        errors: stats.errors.slice(0, 20),
        detectedColumns: detectedCols,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-excel error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
