import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ─── Stateless HMAC state token (no DB table required) ───────────────────────
// State format: base64url(userId.timestamp).signature
// Validity window: 10 minutes

async function createStateToken(userId: string): Promise<string> {
  const payload = `${userId}.${Date.now()}`;
  const sig = await hmacSign(payload);
  return `${btoa(payload).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")}.${sig}`;
}

async function verifyStateToken(state: string): Promise<{ userId: string } | null> {
  try {
    const lastDot = state.lastIndexOf(".");
    if (lastDot === -1) return null;

    const encodedPayload = state.slice(0, lastDot);
    const sig = state.slice(lastDot + 1);

    // Restore base64 padding
    const pad = encodedPayload.length % 4;
    const padded = pad ? encodedPayload + "=".repeat(4 - pad) : encodedPayload;
    const payload = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));

    const expectedSig = await hmacSign(payload);
    if (sig !== expectedSig) return null;

    const [userId, tsStr] = payload.split(".");
    if (!userId || !tsStr) return null;

    const ts = parseInt(tsStr, 10);
    if (isNaN(ts) || Date.now() - ts > 10 * 60 * 1000) return null; // expired after 10 min

    return { userId };
  } catch {
    return null;
  }
}

async function hmacSign(data: string): Promise<string> {
  const secret = GOOGLE_CLIENT_SECRET || SUPABASE_SERVICE_ROLE_KEY;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  return user.id;
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function getValidToken(userId: string) {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenRow } = await admin
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!tokenRow) return null;

  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  if (expiresAt > new Date(now.getTime() + 60000)) {
    return tokenRow.access_token;
  }

  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  if (!refreshed) return null;

  const newExpiry = new Date(now.getTime() + refreshed.expires_in * 1000).toISOString();
  await admin
    .from("google_calendar_tokens")
    .update({ access_token: refreshed.access_token, expires_at: newExpiry })
    .eq("user_id", userId);

  return refreshed.access_token;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // === OAuth: generate auth URL ===
    if (action === "auth-url") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const redirectUri = url.searchParams.get("redirect_uri");
      if (!redirectUri) {
        return new Response(JSON.stringify({ error: "redirect_uri obrigatório" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate a stateless, HMAC-signed state token — no DB table required
      const stateToken = await createStateToken(userId);

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", stateToken);

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === OAuth: exchange code for tokens ===
    if (action === "callback") {
      const { code, redirect_uri, state } = await req.json();

      if (!code || !state) {
        return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify the HMAC-signed state token — this is the CSRF protection
      const verified = await verifyStateToken(state);
      if (!verified) {
        return new Response(JSON.stringify({ error: "Estado inválido ou expirado. Tente conectar novamente." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = verified.userId;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        return new Response(JSON.stringify({ error: tokenData.error_description || "Erro ao trocar código" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      await admin.from("google_calendar_tokens").upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt,
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Check connection status ===
    if (action === "status") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data } = await admin
        .from("google_calendar_tokens")
        .select("id")
        .eq("user_id", userId)
        .single();

      return new Response(JSON.stringify({ connected: !!data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Disconnect ===
    if (action === "disconnect") {
      const userId = await getAuthenticatedUser(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Não autorizado" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await admin.from("google_calendar_tokens").delete().eq("user_id", userId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === All Calendar API actions require auth ===
    const userId = await getAuthenticatedUser(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getValidToken(userId);
    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Google Calendar não conectado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calendarBase = "https://www.googleapis.com/calendar/v3/calendars/primary";

    // === List events ===
    if (action === "list") {
      const timeMin = url.searchParams.get("timeMin") || new Date().toISOString();
      const timeMax = url.searchParams.get("timeMax");

      const params = new URLSearchParams({
        timeMin,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "100",
      });
      if (timeMax) params.set("timeMax", timeMax);

      const res = await fetch(`${calendarBase}/events?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Create event ===
    if (action === "create") {
      const body = await req.json();

      const createUrl = `${calendarBase}/events?conferenceDataVersion=1`;
      const res = await fetch(createUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        status: res.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Update event ===
    if (action === "update") {
      const eventId = url.searchParams.get("eventId");
      const body = await req.json();
      const updateUrl = `${calendarBase}/events/${eventId}?conferenceDataVersion=1`;
      const res = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      return new Response(JSON.stringify(data), {
        status: res.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Delete event ===
    if (action === "delete") {
      const eventId = url.searchParams.get("eventId");
      const res = await fetch(`${calendarBase}/events/${eventId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return new Response(JSON.stringify({ success: res.ok }), {
        status: res.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Google Calendar error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
