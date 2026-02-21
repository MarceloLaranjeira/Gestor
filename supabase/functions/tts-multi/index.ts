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

async function generateWithGoogle(text: string, apiKey: string, speed: number, voiceName = "Kore"): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Google AI Studio TTS error:", response.status, errText);
    throw new Error(`Google AI Studio TTS erro: ${response.status}`);
  }

  const data = await response.json();
  const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioData) {
    throw new Error("Google AI Studio TTS: nenhum áudio retornado");
  }

  // Decode base64 PCM and convert to WAV
  const binaryString = atob(audioData);
  const pcmBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i);
  }

  // Wrap PCM in WAV header (24000Hz, 16-bit, mono)
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = pcmBytes.length;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  view.setUint16(32, numChannels * bitsPerSample / 8, true);
  view.setUint16(34, bitsPerSample, true);
  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  const wavBytes = new Uint8Array(44 + dataSize);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(pcmBytes, 44);
  return wavBytes.buffer;
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

    const { text, provider, voiceId, stability, speed, googleApiKey, openaiApiKey, googleVoiceName } = await req.json();

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
        audioBuffer = await generateWithGoogle(text, googleApiKey, speed, googleVoiceName || "Kore");
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

    const contentType = provider === "google" ? "audio/wav" : "audio/mpeg";
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
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
