import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GoogleCalendarCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setErrorMsg(
          error === "access_denied"
            ? "Acesso negado. Você cancelou a autorização do Google Calendar."
            : `Erro do Google: ${error}`
        );
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setErrorMsg("Parâmetros inválidos na URL de retorno. Tente conectar novamente.");
        return;
      }

      try {
        const origin = window.location.origin.includes('lovableproject.com')
          ? window.location.origin.replace('lovableproject.com', 'lovable.app').replace(/^(https?:\/\/)/, '$1id-preview--')
          : window.location.origin;
        const redirectUri = `${origin}/auth/google-calendar/callback`;

        // Get the user's current session JWT so the edge function can authenticate
        // the request. Falls back to the anon key if no session is present.
        const { data: sessionData } = await supabase.auth.getSession();
        const bearerToken = sessionData?.session?.access_token
          ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${bearerToken}`,
              apikey: anonKey,
            },
            body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
          }
        );

        let result: { success?: boolean; error?: string } = {};
        try {
          result = await res.json();
        } catch {
          setStatus("error");
          setErrorMsg(`Resposta inválida do servidor (HTTP ${res.status}). Tente novamente.`);
          return;
        }

        if (result.success) {
          setStatus("success");
          setTimeout(() => navigate("/calendario"), 2000);
        } else {
          setStatus("error");
          setErrorMsg(result.error || `Erro ao conectar (HTTP ${res.status}).`);
        }
      } catch (err) {
        setStatus("error");
        setErrorMsg(
          err instanceof Error
            ? `Erro de rede: ${err.message}`
            : "Erro ao processar o retorno do Google Calendar."
        );
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 animate-fade-in max-w-sm px-6">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">Conectando ao Google Calendar...</p>
            <p className="text-sm text-muted-foreground">Aguarde enquanto processamos sua autorização.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <p className="text-base font-semibold text-foreground">Google Calendar conectado!</p>
            <p className="text-sm text-muted-foreground">Redirecionando para o Calendário...</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-base font-semibold text-foreground">Erro na conexão</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => navigate("/calendario")}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
              <button
                onClick={() => navigate("/eventos")}
                className="w-full px-4 py-2 rounded-xl bg-muted text-foreground text-sm hover:bg-muted/80 transition-all"
              >
                Voltar para Eventos
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
