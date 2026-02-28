import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Autenticar via webhook_secret no header ou query param
    const url = new URL(req.url);
    const secret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret");

    if (!secret) {
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar config pelo webhook_secret
    const { data: config, error: configError } = await adminClient
      .from("integracao_agente_config")
      .select("*")
      .eq("webhook_secret", secret)
      .eq("ativo", true)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "Invalid or inactive webhook secret" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Registrar mensagem recebida
    const { data: msg, error: msgError } = await adminClient
      .from("integracao_agente_mensagens")
      .insert({
        config_id: config.id,
        direcao: "recebida",
        tipo: body.tipo || "texto",
        conteudo: body,
        status: "processada",
        plataforma: body.plataforma || "",
        contato_externo: body.contato || body.from || "",
      })
      .select()
      .single();

    // Processar ações automáticas
    let acaoResultado = "nenhuma_acao";

    if (body.acao === "criar_pessoa" && body.dados) {
      const { dados } = body;
      await adminClient.from("pessoas").insert({
        nome: dados.nome || "Contato WhatsApp",
        telefone: dados.telefone || "",
        email: dados.email || "",
        cidade: dados.cidade || "Manaus",
        tipo: dados.tipo || "Apoiador",
        tags: dados.tags || ["whatsapp"],
        user_id: config.user_id,
      });
      acaoResultado = "pessoa_criada";
    }

    if (body.acao === "criar_demanda" && body.dados) {
      const { dados } = body;
      await adminClient.from("demandas").insert({
        titulo: dados.titulo || "Demanda via WhatsApp",
        descricao: dados.descricao || "",
        solicitante: dados.solicitante || "",
        prioridade: dados.prioridade || "media",
        user_id: config.user_id,
      });
      acaoResultado = "demanda_criada";
    }

    if (body.acao === "criar_evento" && body.dados) {
      const { dados } = body;
      await adminClient.from("eventos").insert({
        titulo: dados.titulo || "Evento via integração",
        descricao: dados.descricao || "",
        data: dados.data || new Date().toISOString().split("T")[0],
        hora: dados.hora || "08:00",
        local: dados.local || "",
        tipo: dados.tipo || "Externo",
        participantes: dados.participantes || 0,
        user_id: config.user_id,
      });
      acaoResultado = "evento_criado";
    }

    if (body.acao === "criar_apoiador" && body.dados) {
      const { dados } = body;
      await adminClient.from("apoiadores").insert({
        nome: dados.nome || "Apoiador via integração",
        telefone: dados.telefone || "",
        cidade: dados.cidade || "",
        regiao: dados.regiao || "",
        segmento: dados.segmento || "",
        cargo: dados.cargo || "",
        organizacao: dados.organizacao || "",
        funcao: dados.funcao || "",
        origem_contato: dados.origem_contato || "whatsapp",
        resumo: dados.resumo || "",
        prioridade: dados.prioridade || "media",
        grau_influencia: dados.grau_influencia || 3,
        user_id: config.user_id,
      });
      acaoResultado = "apoiador_criado";
    }

    if (body.acao === "criar_movimento_financeiro" && body.dados) {
      const { dados } = body;
      const tipo = dados.tipo === "despesa" ? "despesa" : "receita";
      await adminClient.from("movimentos_financeiros").insert({
        descricao: dados.descricao || `${tipo === "receita" ? "Receita" : "Despesa"} via integração`,
        valor: Number(dados.valor) || 0,
        tipo,
        categoria: dados.categoria || "",
        data: dados.data || new Date().toISOString().split("T")[0],
        observacao: dados.observacao || "Registrado via integração externa",
        user_id: config.user_id,
      });
      acaoResultado = "movimento_financeiro_criado";
    }

    if (body.acao === "criar_pessoa_e_apoiador" && body.dados) {
      const { dados } = body;
      const { error: pessoaError } = await adminClient.from("pessoas").insert({
        nome: dados.nome || "Contato via integração",
        telefone: dados.telefone || "",
        email: dados.email || "",
        cidade: dados.cidade || "Manaus",
        tipo: dados.tipo || "Apoiador",
        tags: dados.tags || ["whatsapp"],
        user_id: config.user_id,
      });
      const { error: apoiadorError } = await adminClient.from("apoiadores").insert({
        nome: dados.nome || "Apoiador via integração",
        telefone: dados.telefone || "",
        cidade: dados.cidade || "",
        regiao: dados.regiao || "",
        segmento: dados.segmento || "",
        cargo: dados.cargo || "",
        organizacao: dados.organizacao || "",
        funcao: dados.funcao || "",
        origem_contato: dados.origem_contato || "whatsapp",
        resumo: dados.resumo || "",
        prioridade: dados.prioridade || "media",
        grau_influencia: dados.grau_influencia || 3,
        beneficios_relacionados: dados.beneficios_relacionados || "",
        user_id: config.user_id,
      });
      if (pessoaError || apoiadorError) {
        console.error("Erros ao criar pessoa+apoiador:", pessoaError, apoiadorError);
      }
      acaoResultado = "pessoa_e_apoiador_criados";
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: msg?.id,
      acao: acaoResultado,
      message: "Dados recebidos com sucesso",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro no webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
