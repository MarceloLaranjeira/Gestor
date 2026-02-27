import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Save, ArrowLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ApoiadorForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nome: "", cidade: "", regiao: "", telefone: "", organizacao: "",
    funcao: "", segmento: "", cargo: "", beneficios_relacionados: "",
    resumo: "", grau_influencia: 3, prioridade: "media" as "alta" | "media" | "baixa",
    origem_contato: "",
  });
  const [dataNascimento, setDataNascimento] = useState<Date | undefined>();

  useEffect(() => {
    if (!isEditing) return;
    const fetch = async () => {
      const { data, error } = await supabase.from("apoiadores").select("*").eq("id", id).single();
      if (error || !data) { toast({ title: "Apoiador não encontrado", variant: "destructive" }); navigate("/prontuario"); return; }
      setForm({
        nome: data.nome, cidade: data.cidade || "", regiao: data.regiao || "",
        telefone: data.telefone || "", organizacao: data.organizacao || "",
        funcao: data.funcao || "", segmento: data.segmento || "", cargo: data.cargo || "",
        beneficios_relacionados: data.beneficios_relacionados || "", resumo: data.resumo || "",
        grau_influencia: data.grau_influencia || 3, prioridade: (data.prioridade || "media") as "alta" | "media" | "baixa",
        origem_contato: data.origem_contato || "",
      });
      if (data.data_nascimento) setDataNascimento(new Date(data.data_nascimento + "T12:00:00"));
    };
    fetch();
  }, [id]);

  const handleSave = async () => {
    if (!form.nome.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!user?.user_id) return;
    setLoading(true);

    const payload = {
      ...form,
      data_nascimento: dataNascimento ? format(dataNascimento, "yyyy-MM-dd") : null,
      user_id: user.user_id,
    };

    let error;
    if (isEditing) {
      const { user_id: _, ...updatePayload } = payload;
      ({ error } = await supabase.from("apoiadores").update(updatePayload).eq("id", id!));
    } else {
      ({ error } = await supabase.from("apoiadores").insert([payload]));
    }

    setLoading(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    toast({ title: isEditing ? "Apoiador atualizado!" : "Apoiador cadastrado!" });
    navigate("/prontuario");
  };

  const set = (field: string, value: any) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/prontuario")}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-xl font-bold text-foreground">{isEditing ? "Editar Apoiador" : "Novo Apoiador"}</h1>
        </div>

        {/* Seção 1 – Dados básicos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Básicos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => set("nome", e.target.value)} placeholder="Nome completo" />
            </div>
            <div>
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={(e) => set("cidade", e.target.value)} placeholder="Cidade" />
            </div>
            <div>
              <Label>Região</Label>
              <Select value={form.regiao || "none"} onValueChange={(v) => set("regiao", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {["Norte", "Sul", "Leste", "Oeste", "Capital", "Interior", "Metropolitana"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} placeholder="(92) 99999-9999" />
            </div>
            <div>
              <Label>Data de Nascimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataNascimento && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataNascimento ? format(dataNascimento, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataNascimento} onSelect={setDataNascimento} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2 – Representatividade */}
        <Card>
          <CardHeader><CardTitle className="text-base">Representatividade</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Organização</Label><Input value={form.organizacao} onChange={(e) => set("organizacao", e.target.value)} placeholder="Organização que representa" /></div>
            <div><Label>Função</Label><Input value={form.funcao} onChange={(e) => set("funcao", e.target.value)} placeholder="Função na organização" /></div>
            <div>
              <Label>Segmento</Label>
              <Select value={form.segmento || "none"} onValueChange={(v) => set("segmento", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecionar segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {["Evangélico", "Empresarial", "Sindical", "Comunitário", "Político", "Acadêmico", "Saúde", "Educação", "Segurança", "Agronegócio"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => set("cargo", e.target.value)} placeholder="Cargo político ou institucional" /></div>
          </CardContent>
        </Card>

        {/* Seção 3 – Relação política */}
        <Card>
          <CardHeader><CardTitle className="text-base">Relação Política</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Benefícios Relacionados</Label><Textarea value={form.beneficios_relacionados} onChange={(e) => set("beneficios_relacionados", e.target.value)} placeholder="O que já foi destinado/feito para este apoiador" rows={3} /></div>
            <div><Label>Resumo</Label><Textarea value={form.resumo} onChange={(e) => set("resumo", e.target.value)} placeholder="Visão geral da relação com este apoiador" rows={4} /></div>
          </CardContent>
        </Card>

        {/* Seção 4 – Parâmetros estratégicos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Parâmetros Estratégicos</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Grau de Influência</Label>
              <Select value={String(form.grau_influencia)} onValueChange={(v) => set("grau_influencia", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n} — {["Baixo", "Moderado", "Médio", "Alto", "Muito Alto"][n - 1]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => set("prioridade", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Origem do Contato</Label><Input value={form.origem_contato} onChange={(e) => set("origem_contato", e.target.value)} placeholder="Como conheceu" /></div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end pb-6">
          <Button variant="outline" onClick={() => navigate("/prontuario")}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2"><Save className="w-4 h-4" />{loading ? "Salvando..." : "Salvar"}</Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ApoiadorForm;
