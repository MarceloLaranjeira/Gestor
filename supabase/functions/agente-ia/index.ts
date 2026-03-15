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
  // ── DEMANDAS ──
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
  // ── EVENTOS ──
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
          titulo: { type: "string" }, data: { type: "string" }, hora: { type: "string" },
          local: { type: "string" }, tipo: { type: "string" }, descricao: { type: "string" },
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
  // ── PESSOAS ──
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
          telefone: { type: "string" }, email: { type: "string" },
          bairro: { type: "string" }, cidade: { type: "string" },
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
          nome: { type: "string" }, tipo: { type: "string" },
          telefone: { type: "string" }, email: { type: "string" },
          bairro: { type: "string" }, cidade: { type: "string" },
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
  // ── LISTAR ──
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
          tipo: { type: "string" }, cidade: { type: "string" },
          busca_nome: { type: "string" }, limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ══════════════════════════════════════════════
  // ── MODO CAMPANHA — CALHAS ──
  // ══════════════════════════════════════════════
  {
    type: "function",
    function: {
      name: "criar_calha",
      description: "Cria uma nova calha (região eleitoral) no modo campanha",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome da calha" },
          regiao: { type: "string", description: "Região geográfica" },
          municipios: { type: "number", description: "Número de municípios" },
          votos_validos: { type: "number", description: "Total de votos válidos" },
          potencial_votos: { type: "number", description: "Potencial de votos" },
          percentual_cristaos: { type: "number", description: "Percentual de cristãos (0-100)" },
          latitude: { type: "number" }, longitude: { type: "number" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_calha",
      description: "Edita uma calha existente pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string" }, id: { type: "string" },
          nome: { type: "string" }, regiao: { type: "string" },
          municipios: { type: "number" }, votos_validos: { type: "number" },
          potencial_votos: { type: "number" }, percentual_cristaos: { type: "number" },
          latitude: { type: "number" }, longitude: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_calha",
      description: "Exclui uma calha pelo nome ou ID",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string" }, id: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_calhas",
      description: "Lista calhas do modo campanha com filtros opcionais",
      parameters: {
        type: "object",
        properties: {
          regiao: { type: "string" }, limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── MODO CAMPANHA — COORDENADORES ──
  {
    type: "function",
    function: {
      name: "criar_coordenador_campanha",
      description: "Cadastra um novo coordenador no modo campanha",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome do coordenador" },
          telefone: { type: "string" }, email: { type: "string" },
          status: { type: "string", enum: ["ativo", "inativo"], description: "Status do coordenador" },
          calha_id: { type: "string", description: "ID da calha vinculada" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_coordenador_campanha",
      description: "Edita um coordenador do modo campanha",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string" }, id: { type: "string" },
          nome: { type: "string" }, telefone: { type: "string" }, email: { type: "string" },
          status: { type: "string", enum: ["ativo", "inativo"] },
          calha_id: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_coordenador_campanha",
      description: "Exclui um coordenador do modo campanha",
      parameters: {
        type: "object",
        properties: { busca_nome: { type: "string" }, id: { type: "string" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_coordenadores_campanha",
      description: "Lista coordenadores do modo campanha",
      parameters: {
        type: "object",
        properties: { status: { type: "string" }, limite: { type: "number" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── MODO CAMPANHA — ASSESSORES ──
  {
    type: "function",
    function: {
      name: "criar_assessor_campanha",
      description: "Cadastra um novo assessor no modo campanha",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string" }, funcao: { type: "string" },
          telefone: { type: "string" }, email: { type: "string" },
          coordenador_id: { type: "string", description: "ID do coordenador vinculado" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_assessor_campanha",
      description: "Edita um assessor do modo campanha",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string" }, id: { type: "string" },
          nome: { type: "string" }, funcao: { type: "string" },
          telefone: { type: "string" }, email: { type: "string" },
          coordenador_id: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_assessor_campanha",
      description: "Exclui um assessor do modo campanha",
      parameters: {
        type: "object",
        properties: { busca_nome: { type: "string" }, id: { type: "string" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_assessores_campanha",
      description: "Lista assessores do modo campanha",
      parameters: {
        type: "object",
        properties: { limite: { type: "number" } },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── MODO CAMPANHA — VISITAS ──
  {
    type: "function",
    function: {
      name: "criar_visita",
      description: "Cria uma nova visita de campanha",
      parameters: {
        type: "object",
        properties: {
          data_visita: { type: "string", description: "Data no formato YYYY-MM-DD" },
          objetivo: { type: "string" }, observacoes: { type: "string" },
          status: { type: "string", enum: ["planejada", "realizada", "cancelada"] },
          calha_id: { type: "string" }, coordenador_id: { type: "string" },
        },
        required: ["data_visita"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_visita",
      description: "Edita uma visita de campanha",
      parameters: {
        type: "object",
        properties: {
          id: { type: "string" },
          data_visita: { type: "string" }, objetivo: { type: "string" },
          observacoes: { type: "string" },
          status: { type: "string", enum: ["planejada", "realizada", "cancelada"] },
          calha_id: { type: "string" }, coordenador_id: { type: "string" },
        },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_visita",
      description: "Exclui uma visita de campanha pelo ID",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_visitas",
      description: "Lista visitas de campanha com filtros",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["planejada", "realizada", "cancelada"] },
          data_inicio: { type: "string" }, data_fim: { type: "string" },
          limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── MODO CAMPANHA — LOCAIS ──
  {
    type: "function",
    function: {
      name: "listar_locais",
      description: "Lista locais mapeados do modo campanha",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string" }, limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ══════════════════════════════════════════════
  // ── PRONTUÁRIO PARLAMENTAR — APOIADORES ──
  // ══════════════════════════════════════════════
  {
    type: "function",
    function: {
      name: "criar_apoiador",
      description: "Cadastra um novo apoiador no Prontuário Parlamentar",
      parameters: {
        type: "object",
        properties: {
          nome: { type: "string", description: "Nome completo do apoiador" },
          cidade: { type: "string" }, regiao: { type: "string" },
          telefone: { type: "string" }, organizacao: { type: "string", description: "Organização que representa" },
          funcao: { type: "string" }, segmento: { type: "string", description: "Ex: Evangélico, Empresarial, Sindical" },
          cargo: { type: "string" }, beneficios_relacionados: { type: "string", description: "O que já foi destinado/feito" },
          resumo: { type: "string", description: "Visão geral da relação" },
          grau_influencia: { type: "number", description: "1 a 5" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          origem_contato: { type: "string" },
        },
        required: ["nome"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "editar_apoiador",
      description: "Edita um apoiador existente no Prontuário Parlamentar",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string", description: "Nome (ou parte) do apoiador" },
          id: { type: "string", description: "ID UUID do apoiador" },
          nome: { type: "string" }, cidade: { type: "string" }, regiao: { type: "string" },
          telefone: { type: "string" }, organizacao: { type: "string" },
          funcao: { type: "string" }, segmento: { type: "string" },
          cargo: { type: "string" }, beneficios_relacionados: { type: "string" },
          resumo: { type: "string" }, grau_influencia: { type: "number" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          origem_contato: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "excluir_apoiador",
      description: "Exclui um apoiador do Prontuário Parlamentar",
      parameters: {
        type: "object",
        properties: {
          busca_nome: { type: "string" }, id: { type: "string" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_apoiadores",
      description: "Lista apoiadores do Prontuário Parlamentar com filtros",
      parameters: {
        type: "object",
        properties: {
          regiao: { type: "string" }, segmento: { type: "string" },
          prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          grau_influencia: { type: "number" },
          busca_nome: { type: "string" }, limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ── PRONTUÁRIO — HISTÓRICO DE APOIADORES ──
  {
    type: "function",
    function: {
      name: "adicionar_historico_apoiador",
      description: "Adiciona um registro ao histórico de um apoiador (reunião, visita, benefício, etc.)",
      parameters: {
        type: "object",
        properties: {
          apoiador_nome: { type: "string", description: "Nome (ou parte) do apoiador" },
          apoiador_id: { type: "string", description: "ID do apoiador" },
          tipo: { type: "string", description: "Tipo: Reunião, Visita, Ligação, Evento, Benefício, Promessa, Entrega" },
          descricao: { type: "string", description: "Descrição da ação" },
          responsavel: { type: "string", description: "Assessor ou parlamentar responsável" },
          status: { type: "string", enum: ["concluido", "pendente", "em_andamento"] },
          data_prevista: { type: "string", description: "Data prevista para ações futuras (ISO)" },
        },
        required: ["tipo", "descricao"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_historico_apoiador",
      description: "Lista o histórico de ações de um apoiador",
      parameters: {
        type: "object",
        properties: {
          apoiador_nome: { type: "string" }, apoiador_id: { type: "string" },
          status: { type: "string", enum: ["concluido", "pendente", "em_andamento"] },
          limite: { type: "number" },
        },
        required: [],
        additionalProperties: false,
      },
    },
  },
  // ══════════════════════════════════════════════
  // ── INTEGRAÇÃO COM AGENTE EXTERNO (WhatsApp/Instagram) ──
  // ══════════════════════════════════════════════
  {
    type: "function",
    function: {
      name: "enviar_mensagem_whatsapp",
      description: "Envia uma mensagem para um contato via WhatsApp/Instagram através da plataforma de IA externa integrada. Use quando o usuário pedir para enviar mensagem, notificação ou comunicação por WhatsApp ou Instagram.",
      parameters: {
        type: "object",
        properties: {
          contato: { type: "string", description: "Número do contato ou identificador (ex: +5592999999999)" },
          mensagem: { type: "string", description: "Texto da mensagem a ser enviada" },
          plataforma: { type: "string", enum: ["whatsapp", "instagram"], description: "Plataforma de envio" },
        },
        required: ["contato", "mensagem"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_dados_agente_externo",
      description: "Envia dados estruturados para o agente externo de IA (WhatsApp/Instagram). Use para sincronizar informações como listas de contatos, demandas, eventos, etc.",
      parameters: {
        type: "object",
        properties: {
          tipo_dados: { type: "string", description: "Tipo dos dados: contatos, demandas, eventos, apoiadores, relatorio" },
          dados: { type: "object", description: "Objeto com os dados a enviar" },
          endpoint: { type: "string", description: "Endpoint específico da API (opcional, default /sync)" },
        },
        required: ["tipo_dados", "dados"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_agente_externo",
      description: "Consulta o agente externo para obter informações como mensagens recebidas, status de conversas, métricas de engajamento, etc.",
      parameters: {
        type: "object",
        properties: {
          consulta: { type: "string", description: "Tipo da consulta: mensagens_recentes, status_conversas, metricas, contatos_ativos" },
          filtros: { type: "object", description: "Filtros opcionais (data, plataforma, contato)" },
        },
        required: ["consulta"],
        additionalProperties: false,
      },
    },
  },
];

// ─── Generic search helper ───
async function findByNameOrId(supabase: any, table: string, nameField: string, searchName?: string, id?: string) {
  if (id) return id;
  if (!searchName) return null;
  const { data } = await supabase.from(table).select("id").ilike(nameField, `%${searchName}%`).limit(1).single();
  return data?.id || null;
}

// ─── Execute CRUD tool calls ───
async function executeTool(supabase: any, userId: string, name: string, args: any): Promise<string> {
  try {
    switch (name) {
      // ── DEMANDAS ──
      case "criar_demanda": {
        const { data, error } = await supabase.from("demandas").insert({
          titulo: args.titulo, descricao: args.descricao || "", prioridade: args.prioridade || "media",
          status: args.status || "pendente", responsavel: args.responsavel || "",
          solicitante: args.solicitante || "", categoria: args.categoria || "",
          data_prazo: args.data_prazo || null, user_id: userId,
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
          titulo: args.titulo, data: args.data, hora: args.hora || "08:00",
          local: args.local || "", tipo: args.tipo || "Interno",
          descricao: args.descricao || "", participantes: args.participantes || 0, user_id: userId,
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
          nome: args.nome, tipo: args.tipo || "", telefone: args.telefone || "",
          email: args.email || "", bairro: args.bairro || "", cidade: args.cidade || "Manaus",
          tags: args.tags || [], user_id: userId,
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

      // ── LISTAR (mandato) ──
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

      // ══════════════════════════════════════════════
      // ── MODO CAMPANHA — CALHAS ──
      // ══════════════════════════════════════════════
      case "criar_calha": {
        const { data, error } = await supabase.from("campanha_calhas").insert({
          nome: args.nome, regiao: args.regiao || "", municipios: args.municipios || 0,
          votos_validos: args.votos_validos || 0, potencial_votos: args.potencial_votos || 0,
          percentual_cristaos: args.percentual_cristaos || 0,
          latitude: args.latitude || null, longitude: args.longitude || null,
        }).select().single();
        if (error) return `❌ Erro ao criar calha: ${error.message}`;
        return `✅ Calha "${data.nome}" criada! Região: ${data.regiao || "não definida"} | Potencial: ${data.potencial_votos} votos (ID: ${data.id})`;
      }
      case "editar_calha": {
        const targetId = await findByNameOrId(supabase, "campanha_calhas", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Calha não encontrada. Forneça o nome ou ID.";
        const updates: any = {};
        for (const key of ["nome", "regiao", "municipios", "votos_validos", "potencial_votos", "percentual_cristaos", "latitude", "longitude"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("campanha_calhas").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro ao editar calha: ${error.message}`;
        return `✅ Calha "${data.nome}" atualizada com sucesso!`;
      }
      case "excluir_calha": {
        const targetId = await findByNameOrId(supabase, "campanha_calhas", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Calha não encontrada.";
        const { error } = await supabase.from("campanha_calhas").delete().eq("id", targetId);
        if (error) return `❌ Erro ao excluir calha: ${error.message}`;
        return `✅ Calha excluída com sucesso!`;
      }
      case "listar_calhas": {
        let query = supabase.from("campanha_calhas").select("id, nome, regiao, municipios, votos_validos, potencial_votos, percentual_cristaos").order("nome");
        if (args.regiao) query = query.ilike("regiao", `%${args.regiao}%`);
        query = query.limit(args.limite || 50);
        const { data, error } = await query;
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "🗺️ Nenhuma calha encontrada.";
        const lines = data.map((c: any) => `• ${c.nome} — ${c.regiao || "sem região"} — ${c.municipios} municípios — Potencial: ${c.potencial_votos} votos (ID: ${c.id})`);
        return `🗺️ **${data.length} calha(s):**\n${lines.join("\n")}`;
      }

      // ── COORDENADORES CAMPANHA ──
      case "criar_coordenador_campanha": {
        const { data, error } = await supabase.from("campanha_coordenadores").insert({
          nome: args.nome, telefone: args.telefone || "", email: args.email || "",
          status: args.status || "ativo", calha_id: args.calha_id || null,
        }).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Coordenador "${data.nome}" cadastrado! Status: ${data.status} (ID: ${data.id})`;
      }
      case "editar_coordenador_campanha": {
        const targetId = await findByNameOrId(supabase, "campanha_coordenadores", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Coordenador não encontrado.";
        const updates: any = {};
        for (const key of ["nome", "telefone", "email", "status", "calha_id"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("campanha_coordenadores").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Coordenador "${data.nome}" atualizado!`;
      }
      case "excluir_coordenador_campanha": {
        const targetId = await findByNameOrId(supabase, "campanha_coordenadores", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Coordenador não encontrado.";
        const { error } = await supabase.from("campanha_coordenadores").delete().eq("id", targetId);
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Coordenador excluído!`;
      }
      case "listar_coordenadores_campanha": {
        let query = supabase.from("campanha_coordenadores").select("id, nome, telefone, email, status, calha_id").order("nome");
        if (args.status) query = query.eq("status", args.status);
        query = query.limit(args.limite || 50);
        const { data, error } = await query;
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "👤 Nenhum coordenador encontrado.";
        const lines = data.map((c: any) => `• ${c.nome} — ${c.status} — ${c.telefone || "sem telefone"} (ID: ${c.id})`);
        return `👤 **${data.length} coordenador(es):**\n${lines.join("\n")}`;
      }

      // ── ASSESSORES CAMPANHA ──
      case "criar_assessor_campanha": {
        const { data, error } = await supabase.from("campanha_assessores").insert({
          nome: args.nome, funcao: args.funcao || "", telefone: args.telefone || "",
          email: args.email || "", coordenador_id: args.coordenador_id || null,
        }).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Assessor "${data.nome}" cadastrado! Função: ${data.funcao || "não definida"} (ID: ${data.id})`;
      }
      case "editar_assessor_campanha": {
        const targetId = await findByNameOrId(supabase, "campanha_assessores", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Assessor não encontrado.";
        const updates: any = {};
        for (const key of ["nome", "funcao", "telefone", "email", "coordenador_id"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("campanha_assessores").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Assessor "${data.nome}" atualizado!`;
      }
      case "excluir_assessor_campanha": {
        const targetId = await findByNameOrId(supabase, "campanha_assessores", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Assessor não encontrado.";
        const { error } = await supabase.from("campanha_assessores").delete().eq("id", targetId);
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Assessor excluído!`;
      }
      case "listar_assessores_campanha": {
        const { data, error } = await supabase.from("campanha_assessores").select("id, nome, funcao, telefone, email, coordenador_id").order("nome").limit(args.limite || 50);
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "👥 Nenhum assessor de campanha encontrado.";
        const lines = data.map((a: any) => `• ${a.nome} — ${a.funcao || "sem função"} — ${a.telefone || ""} (ID: ${a.id})`);
        return `👥 **${data.length} assessor(es):**\n${lines.join("\n")}`;
      }

      // ── VISITAS ──
      case "criar_visita": {
        const { data, error } = await supabase.from("campanha_visitas").insert({
          data_visita: args.data_visita, objetivo: args.objetivo || "",
          observacoes: args.observacoes || "", status: args.status || "planejada",
          calha_id: args.calha_id || null, coordenador_id: args.coordenador_id || null,
          user_id: userId,
        }).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Visita criada para ${data.data_visita}! Status: ${data.status} (ID: ${data.id})`;
      }
      case "editar_visita": {
        if (!args.id) return "❌ Forneça o ID da visita.";
        const updates: any = {};
        for (const key of ["data_visita", "objetivo", "observacoes", "status", "calha_id", "coordenador_id"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("campanha_visitas").update(updates).eq("id", args.id).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Visita atualizada! Data: ${data.data_visita} | Status: ${data.status}`;
      }
      case "excluir_visita": {
        if (!args.id) return "❌ Forneça o ID da visita.";
        const { error } = await supabase.from("campanha_visitas").delete().eq("id", args.id);
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Visita excluída!`;
      }
      case "listar_visitas": {
        let query = supabase.from("campanha_visitas").select("id, data_visita, objetivo, status, observacoes, calha_id, coordenador_id").order("data_visita", { ascending: false });
        if (args.status) query = query.eq("status", args.status);
        if (args.data_inicio) query = query.gte("data_visita", args.data_inicio);
        if (args.data_fim) query = query.lte("data_visita", args.data_fim);
        query = query.limit(args.limite || 20);
        const { data, error } = await query;
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "📍 Nenhuma visita encontrada.";
        const lines = data.map((v: any) => `• ${v.data_visita} — [${v.status?.toUpperCase()}] ${v.objetivo || "sem objetivo"} (ID: ${v.id})`);
        return `📍 **${data.length} visita(s):**\n${lines.join("\n")}`;
      }

      // ── LOCAIS ──
      case "criar_local": {
        const { data, error } = await supabase.from("campanha_locais").insert({
          nome: args.nome, endereco: args.endereco || "",
          latitude: args.latitude, longitude: args.longitude,
          tipo: args.tipo || "ponto_de_apoio", descricao: args.descricao || "",
          calha_id: args.calha_id || null, user_id: userId,
        }).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Local "${data.nome}" mapeado! Tipo: ${data.tipo} | Coords: ${data.latitude}, ${data.longitude} (ID: ${data.id})`;
      }
      case "editar_local": {
        const targetId = await findByNameOrId(supabase, "campanha_locais", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Local não encontrado.";
        const updates: any = {};
        for (const key of ["nome", "endereco", "latitude", "longitude", "tipo", "descricao", "calha_id"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("campanha_locais").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Local "${data.nome}" atualizado!`;
      }
      case "excluir_local": {
        const targetId = await findByNameOrId(supabase, "campanha_locais", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Local não encontrado.";
        const { error } = await supabase.from("campanha_locais").delete().eq("id", targetId);
        if (error) return `❌ Erro: ${error.message}`;
        return `✅ Local excluído!`;
      }
      case "listar_locais": {
        let query = supabase.from("campanha_locais").select("id, nome, endereco, tipo, latitude, longitude, calha_id").order("nome");
        if (args.tipo) query = query.eq("tipo", args.tipo);
        query = query.limit(args.limite || 50);
        const { data, error } = await query;
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "📌 Nenhum local encontrado.";
        const lines = data.map((l: any) => `• ${l.nome} — ${l.tipo} — ${l.endereco || "sem endereço"} (ID: ${l.id})`);
        return `📌 **${data.length} local(is):**\n${lines.join("\n")}`;
      }

      // ══════════════════════════════════════════════
      // ── PRONTUÁRIO PARLAMENTAR — APOIADORES ──
      // ══════════════════════════════════════════════
      case "criar_apoiador": {
        const { data, error } = await supabase.from("apoiadores").insert({
          nome: args.nome, cidade: args.cidade || "", regiao: args.regiao || "",
          telefone: args.telefone || "", organizacao: args.organizacao || "",
          funcao: args.funcao || "", segmento: args.segmento || "",
          cargo: args.cargo || "", beneficios_relacionados: args.beneficios_relacionados || "",
          resumo: args.resumo || "", grau_influencia: args.grau_influencia || 3,
          prioridade: args.prioridade || "media", origem_contato: args.origem_contato || "",
          user_id: userId,
        }).select().single();
        if (error) return `❌ Erro ao cadastrar apoiador: ${error.message}`;
        return `✅ Apoiador "${data.nome}" cadastrado no Prontuário! Influência: ${data.grau_influencia}/5 | Prioridade: ${data.prioridade} | Segmento: ${data.segmento || "não definido"} (ID: ${data.id})`;
      }
      case "editar_apoiador": {
        const targetId = await findByNameOrId(supabase, "apoiadores", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Apoiador não encontrado. Forneça o nome ou ID.";
        const updates: any = {};
        for (const key of ["nome", "cidade", "regiao", "telefone", "organizacao", "funcao", "segmento", "cargo", "beneficios_relacionados", "resumo", "grau_influencia", "prioridade", "origem_contato"]) {
          if (args[key] !== undefined) updates[key] = args[key];
        }
        const { data, error } = await supabase.from("apoiadores").update(updates).eq("id", targetId).select().single();
        if (error) return `❌ Erro ao editar apoiador: ${error.message}`;
        return `✅ Apoiador "${data.nome}" atualizado no Prontuário!`;
      }
      case "excluir_apoiador": {
        const targetId = await findByNameOrId(supabase, "apoiadores", "nome", args.busca_nome, args.id);
        if (!targetId) return "❌ Apoiador não encontrado.";
        const { error } = await supabase.from("apoiadores").delete().eq("id", targetId);
        if (error) return `❌ Erro ao excluir apoiador: ${error.message}`;
        return `✅ Apoiador excluído do Prontuário!`;
      }
      case "listar_apoiadores": {
        let query = supabase.from("apoiadores").select("id, nome, cidade, regiao, segmento, organizacao, cargo, grau_influencia, prioridade, telefone").order("grau_influencia", { ascending: false });
        if (args.regiao) query = query.ilike("regiao", `%${args.regiao}%`);
        if (args.segmento) query = query.ilike("segmento", `%${args.segmento}%`);
        if (args.prioridade) query = query.eq("prioridade", args.prioridade);
        if (args.grau_influencia) query = query.eq("grau_influencia", args.grau_influencia);
        if (args.busca_nome) query = query.ilike("nome", `%${args.busca_nome}%`);
        query = query.limit(args.limite || 50);
        const { data, error } = await query;
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "📋 Nenhum apoiador encontrado no Prontuário.";
        const lines = data.map((a: any) => `• ${a.nome} — ${a.segmento || "sem segmento"} — ${a.organizacao || ""} — ${a.cargo || ""} — Influência: ${"⭐".repeat(a.grau_influencia)} — Prioridade: ${a.prioridade?.toUpperCase()} — ${a.cidade || ""} ${a.regiao || ""} (ID: ${a.id})`);
        return `📋 **${data.length} apoiador(es) no Prontuário:**\n${lines.join("\n")}`;
      }

      // ── HISTÓRICO DE APOIADORES ──
      case "adicionar_historico_apoiador": {
        let apoiadorId = args.apoiador_id;
        if (!apoiadorId && args.apoiador_nome) {
          apoiadorId = await findByNameOrId(supabase, "apoiadores", "nome", args.apoiador_nome);
        }
        if (!apoiadorId) return "❌ Apoiador não encontrado. Forneça o nome ou ID.";
        const { data, error } = await supabase.from("historico_apoiadores").insert({
          apoiador_id: apoiadorId, tipo: args.tipo || "",
          descricao: args.descricao || "", responsavel: args.responsavel || "",
          status: args.status || "pendente",
          data_prevista: args.data_prevista || null,
          user_id: userId,
        }).select().single();
        if (error) return `❌ Erro ao adicionar histórico: ${error.message}`;
        return `✅ Histórico adicionado ao apoiador! Tipo: ${data.tipo} | Status: ${data.status} (ID: ${data.id})`;
      }
      case "listar_historico_apoiador": {
        let apoiadorId = args.apoiador_id;
        if (!apoiadorId && args.apoiador_nome) {
          apoiadorId = await findByNameOrId(supabase, "apoiadores", "nome", args.apoiador_nome);
        }
        if (!apoiadorId) return "❌ Apoiador não encontrado.";
        let query = supabase.from("historico_apoiadores").select("id, tipo, descricao, responsavel, status, data, data_prevista").eq("apoiador_id", apoiadorId).order("data", { ascending: false });
        if (args.status) query = query.eq("status", args.status);
        query = query.limit(args.limite || 30);
        const { data, error } = await query;
        if (error) return `❌ Erro: ${error.message}`;
        if (!data?.length) return "📜 Nenhum registro no histórico deste apoiador.";
        const lines = data.map((h: any) => `• ${new Date(h.data).toLocaleDateString("pt-BR")} — [${h.status?.toUpperCase()}] ${h.tipo} — ${h.descricao?.substring(0, 80) || ""} — Resp: ${h.responsavel || "não definido"}`);
        return `📜 **${data.length} registro(s) no histórico:**\n${lines.join("\n")}`;
      }

      // ══════════════════════════════════════════════
      // ── INTEGRAÇÃO COM AGENTE EXTERNO (WhatsApp/Instagram) ──
      // ══════════════════════════════════════════════
      case "enviar_mensagem_whatsapp": {
        // Buscar config ativa
        const { data: configs } = await supabase.from("integracao_agente_config").select("*").eq("ativo", true).limit(1);
        if (!configs?.length) return "❌ Nenhuma integração ativa. Configure a integração em /integracao primeiro.";
        const config = configs[0];
        if (!config.api_url) return "❌ URL da API externa não configurada. Acesse /integracao para configurar.";

        try {
          const res = await fetch(`${config.api_url}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.api_token}` },
            body: JSON.stringify({
              to: args.contato,
              text: args.mensagem,
              platform: args.plataforma || "whatsapp",
            }),
          });
          const responseData = await res.json().catch(() => ({}));

          // Registrar no log
          await supabase.from("integracao_agente_mensagens").insert({
            config_id: config.id, direcao: "enviada", tipo: "texto",
            conteudo: { to: args.contato, text: args.mensagem, platform: args.plataforma || "whatsapp" },
            status: res.ok ? "enviada" : "erro", plataforma: args.plataforma || "whatsapp",
            contato_externo: args.contato, erro: res.ok ? null : JSON.stringify(responseData),
          });

          if (!res.ok) return `❌ Falha ao enviar mensagem para ${args.contato}: ${JSON.stringify(responseData)}`;
          return `✅ Mensagem enviada via ${args.plataforma || "whatsapp"} para ${args.contato}!\n📝 "${args.mensagem.substring(0, 100)}${args.mensagem.length > 100 ? "..." : ""}"`;
        } catch (e: any) {
          return `❌ Erro de conexão com a plataforma externa: ${e.message}. Verifique a URL em /integracao.`;
        }
      }

      case "enviar_dados_agente_externo": {
        const { data: configs } = await supabase.from("integracao_agente_config").select("*").eq("ativo", true).limit(1);
        if (!configs?.length) return "❌ Nenhuma integração ativa. Configure em /integracao.";
        const config = configs[0];

        try {
          const endpoint = args.endpoint || "/sync";
          const res = await fetch(`${config.api_url}${endpoint}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${config.api_token}` },
            body: JSON.stringify({ tipo: args.tipo_dados, dados: args.dados, timestamp: new Date().toISOString() }),
          });
          const responseData = await res.json().catch(() => ({}));

          await supabase.from("integracao_agente_mensagens").insert({
            config_id: config.id, direcao: "enviada", tipo: args.tipo_dados,
            conteudo: { tipo: args.tipo_dados, dados: args.dados },
            status: res.ok ? "enviada" : "erro", plataforma: "api",
            erro: res.ok ? null : JSON.stringify(responseData),
          });

          if (!res.ok) return `❌ Falha ao sincronizar dados: ${JSON.stringify(responseData)}`;
          return `✅ Dados de "${args.tipo_dados}" enviados com sucesso para o agente externo! ${JSON.stringify(responseData).substring(0, 200)}`;
        } catch (e: any) {
          return `❌ Erro de conexão: ${e.message}`;
        }
      }

      case "consultar_agente_externo": {
        const { data: configs } = await supabase.from("integracao_agente_config").select("*").eq("ativo", true).limit(1);
        if (!configs?.length) return "❌ Nenhuma integração ativa. Configure em /integracao.";
        const config = configs[0];

        try {
          const params = new URLSearchParams({ consulta: args.consulta, ...(args.filtros || {}) });
          const res = await fetch(`${config.api_url}/query?${params.toString()}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${config.api_token}` },
          });
          const responseData = await res.json().catch(() => ({}));

          await supabase.from("integracao_agente_mensagens").insert({
            config_id: config.id, direcao: "enviada", tipo: "consulta",
            conteudo: { consulta: args.consulta, filtros: args.filtros },
            status: res.ok ? "enviada" : "erro", plataforma: "api",
            erro: res.ok ? null : JSON.stringify(responseData),
          });

          if (!res.ok) return `❌ Falha na consulta: ${JSON.stringify(responseData)}`;
          return `📊 Resultado da consulta "${args.consulta}":\n${JSON.stringify(responseData, null, 2).substring(0, 1000)}`;
        } catch (e: any) {
          return `❌ Erro de conexão: ${e.message}`;
        }
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
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

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

    // Fetch system data (mandato + campanha + prontuário)
    const [coordsRes, secoesRes, tarefasRes, demandasRes, eventosRes, pessoasRes, calhasRes, coordCampRes, assessCampRes, visitasRes, locaisRes, apoiadoresRes, municipiosRes] = await Promise.all([
      supabase.from("coordenacoes").select("nome, descricao, slug"),
      supabase.from("secoes").select("titulo, coordenacao_id"),
      supabase.from("tarefas").select("titulo, status, responsavel, canal, data_inicio, data_fim, secao_id, motivo"),
      supabase.from("demandas").select("titulo, descricao, status, prioridade, responsavel, solicitante, categoria, data_prazo").order("created_at", { ascending: false }).limit(100),
      supabase.from("eventos").select("titulo, data, hora, local, tipo, participantes").order("data", { ascending: false }).limit(50),
      supabase.from("pessoas").select("nome, tipo, bairro, cidade, tags").limit(200),
      supabase.from("campanha_calhas").select("id, nome, regiao, municipios, votos_validos, potencial_votos, percentual_cristaos, latitude, longitude"),
      supabase.from("campanha_coordenadores").select("id, nome, telefone, email, status, calha_id, ultimo_contato"),
      supabase.from("campanha_assessores").select("id, nome, funcao, telefone, email, coordenador_id"),
      supabase.from("campanha_visitas").select("id, data_visita, objetivo, status, observacoes, calha_id, coordenador_id").order("data_visita", { ascending: false }).limit(50),
      supabase.from("campanha_locais").select("id, nome, endereco, tipo, latitude, longitude, calha_id").limit(100),
      supabase.from("apoiadores").select("id, nome, cidade, regiao, segmento, organizacao, cargo, grau_influencia, prioridade, telefone").order("grau_influencia", { ascending: false }).limit(100),
      supabase.from("campanha_municipios").select("id, nome, calha_id, votos_validos, percentual_cristaos, apoiadores_estimados"),
    ]);

    const coords = coordsRes.data || [];
    const secoes = secoesRes.data || [];
    const tarefas = tarefasRes.data || [];
    const demandas = demandasRes.data || [];
    const eventos = eventosRes.data || [];
    const pessoas = pessoasRes.data || [];
    const calhas = calhasRes.data || [];
    const coordCamp = coordCampRes.data || [];
    const assessCamp = assessCampRes.data || [];
    const visitas = visitasRes.data || [];
    const locais = locaisRes.data || [];
    const apoiadores = apoiadoresRes.data || [];
    const municipiosCamp = municipiosRes.data || [];

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

    // Campanha stats
    const totalPotencial = calhas.reduce((s, c) => s + (c.potencial_votos || 0), 0);
    const coordAtivos = coordCamp.filter(c => c.status === "ativo").length;
    const visitasPlanejadas = visitas.filter(v => v.status === "planejada").length;
    const visitasRealizadas = visitas.filter(v => v.status === "realizada").length;

    // Prontuário stats
    const apoiadoresAlta = apoiadores.filter((a: any) => a.prioridade === "alta").length;
    const apoiadoresChave = apoiadores.filter((a: any) => a.prioridade === "alta" && a.grau_influencia >= 4);

    const systemPrompt = `Você é HORUS 🦅 — o Assessor de Inteligência Digital do Deputado Estadual Comandante Dan. Você é o responsável absoluto por tudo dentro do sistema: gestão do mandato E modo campanha.

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

## ══════════════════════════════════════════════
## MODO CAMPANHA — DADOS ESTRATÉGICOS EM TEMPO REAL
## ══════════════════════════════════════════════

### CALHAS ELEITORAIS (${calhas.length}):
${calhas.map(c => `• ${c.nome} — ${c.regiao || "sem região"} — ${c.municipios} municípios — Votos válidos: ${c.votos_validos} — Potencial: ${c.potencial_votos} — Cristãos: ${c.percentual_cristaos}%`).join("\n") || "Nenhuma calha cadastrada"}
**Potencial total de votos: ${totalPotencial.toLocaleString("pt-BR")}**

### MUNICÍPIOS POR CALHA (${municipiosCamp.length} cadastrados):
${calhas.map(c => {
  const muns = municipiosCamp.filter((m: any) => m.calha_id === c.id);
  if (muns.length === 0) return null;
  return `📍 ${c.nome} (${c.regiao}):\n${muns.map((m: any) => `   - ${m.nome}: ${m.votos_validos} votos válidos, ${m.percentual_cristaos}% cristãos, ~${m.apoiadores_estimados} apoiadores est.`).join("\n")}`;
}).filter(Boolean).join("\n") || "Nenhum município detalhado"}

### COORDENADORES DE CAMPANHA (${coordCamp.length} — ${coordAtivos} ativos):
${coordCamp.map(c => `• ${c.nome} — ${c.status} — Tel: ${c.telefone || "não informado"} — Último contato: ${c.ultimo_contato || "nunca"}`).join("\n") || "Nenhum coordenador cadastrado"}

### ASSESSORES DE CAMPANHA (${assessCamp.length}):
${assessCamp.map(a => `• ${a.nome} — ${a.funcao || "sem função"} — Tel: ${a.telefone || ""}`).join("\n") || "Nenhum assessor cadastrado"}

### VISITAS (${visitas.length} — ${visitasPlanejadas} planejadas, ${visitasRealizadas} realizadas):
${visitas.slice(0, 15).map(v => `• ${v.data_visita} — [${v.status?.toUpperCase()}] ${v.objetivo || "sem objetivo"}`).join("\n") || "Nenhuma visita registrada"}

### LOCAIS MAPEADOS (${locais.length}):
${locais.slice(0, 20).map(l => `• ${l.nome} — ${l.tipo} — ${l.endereco || "sem endereço"}`).join("\n") || "Nenhum local mapeado"}

## ══════════════════════════════════════════════
## PRONTUÁRIO PARLAMENTAR — APOIADORES
## ══════════════════════════════════════════════

### APOIADORES (${apoiadores.length} total — ${apoiadoresAlta} prioridade alta — ${apoiadoresChave.length} apoiadores-chave):
${apoiadores.slice(0, 30).map((a: any) => `• ${a.nome} — ${a.segmento || "sem segmento"} — ${a.organizacao || ""} — ${a.cargo || ""} — Influência: ${a.grau_influencia}/5 — Prioridade: ${a.prioridade?.toUpperCase()} — ${a.cidade || ""} ${a.regiao || ""} (ID: ${a.id})`).join("\n") || "Nenhum apoiador cadastrado"}

## SUAS CAPACIDADES (PODERES TOTAIS)
1. **Análise de dados**: Interprete TODOS os dados do mandato, campanha e prontuário
2. **Relatórios**: Crie relatórios executivos, setoriais e temáticos
3. **CRUD COMPLETO**: Você pode CRIAR, EDITAR e EXCLUIR:
   - Demandas, eventos e pessoas (mandato)
   - Calhas, coordenadores, assessores, visitas e locais (campanha)
   - Apoiadores e histórico de apoiadores (prontuário parlamentar)
4. **Insights políticos**: Sugira estratégias baseadas nos dados
5. **Gestão de demandas**: Priorize, categorize e resolva demandas
6. **Análise de documentos**: Analise PDFs e imagens enviados
7. **Gestão de campanha**: Crie e gerencie toda a estrutura de campanha
8. **Prontuário Parlamentar**: Gerencie apoiadores, registre histórico de ações feitas e planejadas
9. **📱 INTEGRAÇÃO WhatsApp/Instagram**: Você pode enviar mensagens e dados pela plataforma externa integrada:
   - Use \`enviar_mensagem_whatsapp\` para enviar mensagens de texto para contatos via WhatsApp ou Instagram
   - Use \`enviar_dados_agente_externo\` para sincronizar dados (contatos, demandas, eventos) com o agente externo
   - Use \`consultar_agente_externo\` para buscar mensagens recebidas, métricas e status de conversas
   - A integração precisa estar configurada e ativa em /integracao para funcionar

## DIRETRIZES PARA CRUD
- Quando o usuário pedir para criar, editar ou excluir dados, USE AS FERRAMENTAS disponíveis
- Sempre confirme a ação realizada mostrando os dados alterados
- Para edições, busque o registro pelo título/nome antes de editar
- Seja proativo: se o usuário mencionar algo que pode ser uma demanda/evento/pessoa/visita/apoiador, sugira criar
- Ao criar demandas, defina prioridade e status adequados automaticamente
- Para campanha: vincule calhas, coordenadores e locais quando possível
- Para prontuário: ao cadastrar apoiador, sugira grau de influência e prioridade adequados

## DIRETRIZES PARA WhatsApp/Instagram
- Quando o usuário pedir para enviar mensagem por WhatsApp ou Instagram, use a ferramenta \`enviar_mensagem_whatsapp\`
- Se o número do contato não for fornecido, busque nas tabelas de pessoas, apoiadores ou coordenadores
- Sempre confirme o envio com detalhes do destinatário e mensagem
- Se a integração não estiver ativa, informe o usuário para configurá-la em /integracao

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

    const selectedModel = model || "gemini-2.5-flash";

    // ─── Iterative tool-calling loop (up to 5 rounds) ───
    let currentMessages = [...aiMessages];
    const MAX_TOOL_ROUNDS = 5;

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GOOGLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedModel,
          messages: currentMessages,
          tools: crudTools,
          temperature: temperature !== undefined ? temperature : 0.7,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Limite de requisições atingido." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "Créditos insuficientes." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await aiResponse.text();
        console.error("AI gateway error:", aiResponse.status, t);
        return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];

      // No tool calls → stream final response
      if (!choice?.message?.tool_calls || choice.message.tool_calls.length === 0) {
        const streamResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${GOOGLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: selectedModel,
            messages: currentMessages,
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

      // Execute tool calls and add results to conversation
      const toolCalls = choice.message.tool_calls;
      currentMessages.push(choice.message);

      for (const tc of toolCalls) {
        const args = typeof tc.function.arguments === "string" ? JSON.parse(tc.function.arguments) : tc.function.arguments;
        const result = await executeTool(supabase, user.id, tc.function.name, args);
        currentMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      // Loop continues — AI will see tool results and may issue more tool calls
    }

    // If we exhausted all rounds, stream final response
    const finalResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GOOGLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: currentMessages,
        stream: true,
        temperature: temperature !== undefined ? temperature : 0.7,
      }),
    });

    if (!finalResponse.ok) {
      const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content: "Operações concluídas." } }] })}\n\ndata: [DONE]\n\n`;
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
