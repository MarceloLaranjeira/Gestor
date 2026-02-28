import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub;

    const { config_id, endpoint, method, body, plataforma, contato_externo } = await req.json();

    // Buscar configuração
    const { data: config, error: configError } = await supabase
      .from("integracao_agente_config")
      .select("*")
      .eq("id", config_id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: "Configuração não encontrada" }), { status: 404, headers: corsHeaders });
    }

    if (!config.ativo) {
      return new Response(JSON.stringify({ error: "Integração desativada" }), { status: 400, headers: corsHeaders });
    }

    const targetUrl = `${config.api_url}${endpoint || ""}`;

    // Registrar mensagem como pendente
    const { data: msg, error: msgError } = await supabase
      .from("integracao_agente_mensagens")
      .insert({
        config_id,
        direcao: "enviada",
        tipo: body?.tipo || "texto",
        conteudo: body || {},
        status: "pendente",
        plataforma: plataforma || "",
        contato_externo: contato_externo || "",
      })
      .select()
      .single();

    // Fazer request para API externa
    const externalRes = await fetch(targetUrl, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.api_token}`,
      },
      body: JSON.stringify(body),
    });

    const responseData = await externalRes.json().catch(() => ({}));

    // Atualizar status
    if (msg) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient
        .from("integracao_agente_mensagens")
        .update({
          status: externalRes.ok ? "enviada" : "erro",
          erro: externalRes.ok ? null : JSON.stringify(responseData),
        })
        .eq("id", msg.id);
    }

    return new Response(JSON.stringify({
      success: externalRes.ok,
      data: responseData,
      message_id: msg?.id,
    }), {
      status: externalRes.ok ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro ao enviar:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
