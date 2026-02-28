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

    // Processar dados recebidos - criar pessoa/apoiador se aplicável
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
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: msg?.id,
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
