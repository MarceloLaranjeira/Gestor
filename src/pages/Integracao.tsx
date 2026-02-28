import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send, Webhook, Copy, Eye, EyeOff, RefreshCw, Plug, MessageSquare, ArrowDownLeft, ArrowUpRight, AlertCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import IntegracaoMetrics from "@/components/integracao/IntegracaoMetrics";

interface Config {
  id: string;
  user_id: string;
  nome: string;
  api_url: string;
  api_token: string;
  webhook_secret: string;
  ativo: boolean;
  created_at: string;
}

interface Mensagem {
  id: string;
  config_id: string;
  direcao: string;
  tipo: string;
  conteudo: any;
  status: string;
  plataforma: string;
  contato_externo: string;
  erro: string | null;
  created_at: string;
}

const Integracao = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState<Config | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [form, setForm] = useState({ nome: "Agente WhatsApp/Instagram", api_url: "", api_token: "" });

  const webhookUrl = config
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integracao-webhook?secret=${config.webhook_secret}`
    : "";

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!config) return;
    fetchMensagens();
    const channel = supabase
      .channel("integracao-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "integracao_agente_mensagens", filter: `config_id=eq.${config.id}` }, (payload) => {
        setMensagens((prev) => [payload.new as Mensagem, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [config?.id]);

  const fetchConfig = async () => {
    const { data } = await supabase.from("integracao_agente_config").select("*").limit(1).single();
    if (data) {
      setConfig(data as Config);
      setForm({ nome: data.nome, api_url: data.api_url, api_token: data.api_token });
    }
    setLoading(false);
  };

  const fetchMensagens = async () => {
    if (!config) return;
    const { data } = await supabase
      .from("integracao_agente_mensagens")
      .select("*")
      .eq("config_id", config.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setMensagens((data as Mensagem[]) || []);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (config) {
        await supabase.from("integracao_agente_config").update({
          nome: form.nome,
          api_url: form.api_url,
          api_token: form.api_token,
        }).eq("id", config.id);
        setConfig({ ...config, ...form });
      } else {
        const { data } = await supabase.from("integracao_agente_config").insert({
          user_id: user?.user_id || "",
          nome: form.nome,
          api_url: form.api_url,
          api_token: form.api_token,
          ativo: false,
        }).select().single();
        if (data) setConfig(data as Config);
      }
      toast({ title: "Configuração salva!" });
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleAtivo = async () => {
    if (!config) return;
    const newAtivo = !config.ativo;
    await supabase.from("integracao_agente_config").update({ ativo: newAtivo }).eq("id", config.id);
    setConfig({ ...config, ativo: newAtivo });
    toast({ title: newAtivo ? "Integração ativada" : "Integração desativada" });
  };

  const testConnection = async () => {
    if (!config) return;
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sem sessão");
      const res = await supabase.functions.invoke("integracao-enviar", {
        body: {
          config_id: config.id,
          endpoint: "/ping",
          method: "POST",
          body: { test: true, timestamp: new Date().toISOString() },
          plataforma: "teste",
        },
      });
      if (res.error) throw res.error;
      toast({ title: res.data?.success ? "Conexão OK!" : "Falha na conexão", description: JSON.stringify(res.data?.data || {}).slice(0, 200) });
    } catch (e: any) {
      toast({ title: "Erro no teste", description: e.message, variant: "destructive" });
    }
    setTesting(false);
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada!" });
  };

  if (loading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div></AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <Plug className="w-6 h-6 text-primary" /> Integração com Agente Externo
            </h1>
            <p className="text-sm text-muted-foreground">Conecte seu sistema com plataformas de IA via WhatsApp e Instagram</p>
          </div>
          {config && (
            <div className="flex items-center gap-3">
              <Label className="text-sm">Ativo</Label>
              <Switch checked={config.ativo} onCheckedChange={toggleAtivo} />
              <Badge variant={config.ativo ? "default" : "secondary"}>{config.ativo ? "Online" : "Offline"}</Badge>
            </div>
          )}
        </div>

        <Tabs defaultValue="config" className="w-full">
          <TabsList>
            <TabsTrigger value="config"><Plug className="w-3.5 h-3.5 mr-1.5" /> Configuração</TabsTrigger>
            <TabsTrigger value="metrics"><BarChart3 className="w-3.5 h-3.5 mr-1.5" /> Métricas</TabsTrigger>
            <TabsTrigger value="log"><MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Log</TabsTrigger>
          </TabsList>

          <TabsContent value="config">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Config */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Configuração da API</CardTitle>
                  <CardDescription>Configure a URL e token da sua plataforma de IA externa</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Integração</Label>
                    <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Agente WhatsApp" />
                  </div>
                  <div className="space-y-2">
                    <Label>URL da API</Label>
                    <Input value={form.api_url} onChange={(e) => setForm({ ...form, api_url: e.target.value })} placeholder="https://api.minha-plataforma.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Token de Autenticação</Label>
                    <div className="relative">
                      <Input
                        type={showToken ? "text" : "password"}
                        value={form.api_token}
                        onChange={(e) => setForm({ ...form, api_token: e.target.value })}
                        placeholder="Bearer token ou API key"
                        className="pr-9"
                      />
                      <button onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveConfig} disabled={saving} className="flex-1">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
                    </Button>
                    {config && (
                      <Button variant="outline" onClick={testConnection} disabled={testing || !config.ativo}>
                        {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} Testar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Webhook */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" /> Webhook (Receber Dados)</CardTitle>
                  <CardDescription>Configure este URL na sua plataforma externa para enviar dados ao sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {config ? (
                    <>
                      <div className="space-y-2">
                        <Label>URL do Webhook</Label>
                        <div className="flex gap-2">
                          <Input value={webhookUrl} readOnly className="text-xs font-mono" />
                          <Button size="icon" variant="outline" onClick={copyWebhook}><Copy className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-xs text-muted-foreground">
                        <p className="font-semibold text-foreground text-sm">Formato de envio (JSON):</p>
                        <pre className="bg-background rounded p-3 overflow-x-auto text-[11px]">{JSON.stringify({
                          acao: "criar_pessoa",
                          plataforma: "whatsapp",
                          contato: "+5592999999999",
                          dados: { nome: "João Silva", telefone: "+5592999999999", cidade: "Manaus", tipo: "Apoiador" },
                        }, null, 2)}</pre>
                        <p className="mt-2">Ações suportadas: <code>criar_pessoa</code>, <code>criar_demanda</code></p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="w-4 h-4" /> Salve a configuração primeiro para gerar a URL do webhook
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="metrics">
            <IntegracaoMetrics mensagens={mensagens} />
          </TabsContent>

          <TabsContent value="log">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-4 h-4 text-primary" /> Log de Mensagens</CardTitle>
                    <CardDescription>Histórico de dados enviados e recebidos</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" onClick={fetchMensagens}><RefreshCw className="w-3.5 h-3.5 mr-1" /> Atualizar</Button>
                </div>
              </CardHeader>
              <CardContent>
                {mensagens.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma mensagem registrada ainda</p>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {mensagens.map((msg) => (
                      <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                        <div className={`p-1.5 rounded-full ${msg.direcao === "enviada" ? "bg-primary/10 text-primary" : "bg-green-500/10 text-green-500"}`}>
                          {msg.direcao === "enviada" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.direcao === "enviada" ? "Enviada" : "Recebida"}</span>
                            {msg.plataforma && <Badge variant="outline" className="text-[10px]">{msg.plataforma}</Badge>}
                            <Badge variant={msg.status === "erro" ? "destructive" : msg.status === "enviada" || msg.status === "processada" ? "default" : "secondary"} className="text-[10px]">
                              {msg.status}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {format(new Date(msg.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {msg.contato_externo && <p className="text-[11px] text-muted-foreground">Contato: {msg.contato_externo}</p>}
                          <pre className="text-[10px] text-muted-foreground bg-muted/50 rounded p-2 mt-1 overflow-x-auto max-h-20">
                            {JSON.stringify(msg.conteudo, null, 2)}
                          </pre>
                          {msg.erro && <p className="text-[10px] text-destructive mt-1">Erro: {msg.erro}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Integracao;
