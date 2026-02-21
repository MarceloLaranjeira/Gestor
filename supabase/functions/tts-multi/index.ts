import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateWithElevenLabs(text: string, voiceId: string, stability: number, speed: number): Promise<ArrayBuffer> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY não configurada");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: stability ?? 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
          speed: speed ?? 1.0,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("ElevenLabs TTS error:", response.status, errText);
    throw new Error(`ElevenLabs erro: ${response.status}`);
  }

  return response.arrayBuffer();
}

async function generateWithGoogle(text: string, apiKey: string, speed: number): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "pt-BR",
          name: "pt-BR-Neural2-B",
          ssmlGender: "MALE",
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: speed ?? 1.0,
          sampleRateHertz: 24000,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google TTS error:", response.status, errText);
    throw new Error(`Google TTS erro: ${response.status}`);
  }

  const data = await response.json();
  // Google returns base64 audioContent
  const binaryString = atob(data.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function generateWithOpenAI(text: string, apiKey: string, speed: number): Promise<ArrayBuffer> {
  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: "onyx",
      response_format: "mp3",
      speed: Math.min(Math.max(speed ?? 1.0, 0.25), 4.0),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenAI TTS error:", response.status, errText);
    throw new Error(`OpenAI TTS erro: ${response.status}`);
  }

  return response.arrayBuffer();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, provider, voiceId, stability, speed, googleApiKey, openaiApiKey } = await req.json();

    if (!text) {
      return new Response(JSON.stringify({ error: "text é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let audioBuffer: ArrayBuffer;

    switch (provider) {
      case "google":
        if (!googleApiKey) throw new Error("Chave de API do Google não fornecida");
        audioBuffer = await generateWithGoogle(text, googleApiKey, speed);
        break;
      case "openai":
        if (!openaiApiKey) throw new Error("Chave de API da OpenAI não fornecida");
        audioBuffer = await generateWithOpenAI(text, openaiApiKey, speed);
        break;
      case "elevenlabs":
      default:
        audioBuffer = await generateWithElevenLabs(text, voiceId || "nPczCjzI2devNBz1zQrb", stability, speed);
        break;
    }

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (e) {
    console.error("tts-multi error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
