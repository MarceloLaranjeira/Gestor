import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, text, targetLang } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt = "";
    if (action === "correct") {
      systemPrompt = `Você é um corretor de texto profissional. Corrija erros de gramática, ortografia e pontuação do texto fornecido. Mantenha o tom e estilo original. Retorne APENAS o texto corrigido, sem explicações.`;
    } else if (action === "translate") {
      const langMap: Record<string, string> = {
        en: "inglês", es: "espanhol", fr: "francês", de: "alemão", it: "italiano", pt: "português", ja: "japonês", ko: "coreano", zh: "chinês", ar: "árabe", ru: "russo",
      };
      const lang = langMap[targetLang] || targetLang;
      systemPrompt = `Você é um tradutor profissional. Traduza o texto fornecido para ${lang}. Retorne APENAS o texto traduzido, sem explicações.`;
    } else {
      throw new Error("Ação inválida");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
