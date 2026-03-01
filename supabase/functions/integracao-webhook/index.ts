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

    const url = new URL(req.url);
    const secret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret");

    if (!secret) {
      return new Response(JSON.stringify({ error: "Missing webhook secret" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Support n8n payloads: normalize fields
    // n8n can send: { from, text, nome, telefone, plataforma, ... }
    // or Evolution API format: { data: { key: { remoteJid }, message: { conversation } } }
    const normalizedContato = body.contato || body.from || body.telefone || 
      body.data?.key?.remoteJid?.replace(/@.*/, "") || "";
    const normalizedText = body.text || body.message || body.mensagem || 
      body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
    const normalizedPlataforma = body.plataforma || "whatsapp";
    const normalizedNome = body.nome || body.name || body.dados?.nome || "";

    // Enrich body with normalized data for downstream processing
    const enrichedBody = {
      ...body,
      text: normalizedText,
      contato: normalizedContato,
      nome: normalizedNome,
      plataforma: normalizedPlataforma,
    };

    // Registrar mensagem recebida
    const { data: msg } = await adminClient
      .from("integracao_agente_mensagens")
      .insert({
        config_id: config.id,
        direcao: "recebida",
        tipo: body.tipo || "texto",
        conteudo: enrichedBody,
        status: "processada",
        plataforma: normalizedPlataforma,
        contato_externo: normalizedContato,
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

    // ========== AUTO-REPLY VIA IA ==========
    // Only auto-reply for plain messages (no special action) that have text content
    let autoReply: string | null = null;
    const incomingText = normalizedText;
    const contato = normalizedContato;
    const shouldAutoReply = !body.acao && incomingText.trim() && contato;

    if (shouldAutoReply) {
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          // Fetch recent conversation history for context (last 10 messages)
          const { data: recentMsgs } = await adminClient
            .from("integracao_agente_mensagens")
            .select("direcao, conteudo, created_at")
            .eq("config_id", config.id)
            .eq("contato_externo", contato)
            .order("created_at", { ascending: false })
            .limit(10);

          const historyMessages = (recentMsgs || []).reverse().map((m: any) => ({
            role: m.direcao === "recebida" ? "user" : "assistant",
            content: m.conteudo?.text || m.conteudo?.message || JSON.stringify(m.conteudo).slice(0, 200),
          }));

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content: `Você é um assistente parlamentar virtual cordial e eficiente. Responda de forma breve e objetiva (máximo 3 frases). Você representa o gabinete de um parlamentar. Seja educado, prestativo e profissional. Se a pessoa fizer uma solicitação ou demanda, confirme que será encaminhada. Responda sempre em português brasileiro.`,
                },
                ...historyMessages,
                { role: "user", content: incomingText },
              ],
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            autoReply = aiData.choices?.[0]?.message?.content || null;
          } else {
            console.error("AI auto-reply error:", aiResponse.status, await aiResponse.text());
          }
        }
      } catch (aiErr) {
        console.error("AI auto-reply exception:", aiErr);
      }

      // Send auto-reply back via external API and save to DB
      if (autoReply && config.api_url && config.api_token) {
        try {
          const baseUrl = config.api_url.replace(/\/+$/, "").replace(/\/manager$/, "");
          // Try to determine instance name from the incoming body or use default
          const instance = body.instance || body.instanceName || config.nome || "default";
          const replyEndpoint = `${baseUrl}/message/sendText/${instance}`;

          const authType = config.auth_header_type || "apikey";
          const externalHeaders: Record<string, string> = { "Content-Type": "application/json" };
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

          const sendResult = await fetch(replyEndpoint, {
            method: "POST",
            headers: externalHeaders,
            body: JSON.stringify({
              number: contato.replace(/\D/g, ""),
              text: autoReply,
            }),
          });

          const sendStatus = sendResult.ok ? "enviada" : "erro";
          const sendError = sendResult.ok ? null : await sendResult.text().catch(() => "Erro desconhecido");

          // Save reply message to DB
          await adminClient.from("integracao_agente_mensagens").insert({
            config_id: config.id,
            direcao: "enviada",
            tipo: "texto",
            conteudo: { text: autoReply, auto_reply: true },
            status: sendStatus,
            plataforma: body.plataforma || "whatsapp",
            contato_externo: contato,
            erro: sendError,
          });
        } catch (sendErr) {
          console.error("Auto-reply send error:", sendErr);
          // Still save the reply even if sending failed
          await adminClient.from("integracao_agente_mensagens").insert({
            config_id: config.id,
            direcao: "enviada",
            tipo: "texto",
            conteudo: { text: autoReply, auto_reply: true },
            status: "erro",
            plataforma: body.plataforma || "whatsapp",
            contato_externo: contato,
            erro: String(sendErr),
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message_id: msg?.id,
      acao: acaoResultado,
      auto_reply: autoReply ? true : false,
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
