import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

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
        setErrorMsg("Autorização negada pelo Google.");
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setErrorMsg("Parâmetros inválidos.");
        return;
      }

      try {
        const origin = window.location.origin.includes('lovableproject.com')
          ? window.location.origin.replace('lovableproject.com', 'lovable.app').replace(/^(https?:\/\/)/, '$1id-preview--')
          : window.location.origin;
        const redirectUri = `${origin}/auth/google-calendar/callback`;
        const { data: session } = await supabase.auth.getSession();

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar?action=callback`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.session?.access_token}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ code, redirect_uri: redirectUri, user_id: state }),
          }
        );

        const result = await res.json();
        if (result.success) {
          setStatus("success");
          setTimeout(() => navigate("/eventos"), 2000);
        } else {
          setStatus("error");
          setErrorMsg(result.error || "Erro ao conectar.");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Erro ao processar callback.");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Conectando ao Google Calendar...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="w-10 h-10 text-success mx-auto" />
            <p className="text-foreground font-medium">Google Calendar conectado com sucesso!</p>
            <p className="text-sm text-muted-foreground">Redirecionando...</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-10 h-10 text-destructive mx-auto" />
            <p className="text-foreground font-medium">Erro na conexão</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => navigate("/eventos")}
              className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm"
            >
              Voltar para Eventos
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;
