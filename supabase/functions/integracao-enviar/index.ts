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

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const userId = user.id;

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

    // Remove trailing slashes and common base paths for proper URL construction
    const baseUrl = config.api_url.replace(/\/+$/, "").replace(/\/manager$/, "");
    const targetUrl = `${baseUrl}${endpoint || ""}`;

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

    // Montar headers de autenticação baseado no tipo configurado
    const authType = config.auth_header_type || "apikey";
    const externalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };
    switch (authType) {
      case "bearer":
        externalHeaders["Authorization"] = `Bearer ${config.api_token}`;
        break;
      case "apikey":
        externalHeaders["apikey"] = config.api_token;
        break;
      case "x-api-key":
        externalHeaders["x-api-key"] = config.api_token;
        break;
      default:
        externalHeaders["apikey"] = config.api_token;
    }
    const requestMethod = (method || "POST").toUpperCase();
    const fetchOptions: RequestInit = {
      method: requestMethod,
      headers: externalHeaders,
    };
    if (requestMethod !== "GET" && body) {
      fetchOptions.body = JSON.stringify(body);
    }
    const externalRes = await fetch(targetUrl, fetchOptions);

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
