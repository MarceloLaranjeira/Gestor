import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ANOS = [2006, 2010, 2014, 2018, 2022];
const CARGOS: Array<"federal" | "estadual"> = ["federal", "estadual"];

interface VotoEntry {
  ano: number;
  cargo: "federal" | "estadual";
  votos_validos_totais: number;
  votos_candidato: number;
  existingId?: string;
}

const LogbookMunicipioForm = () => {
  const { calhaId, munId } = useParams<{ calhaId: string; munId: string }>();
  const navigate = useNavigate();
  const isEdit = munId && munId !== "novo";

  const [calhas, setCalhas] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [selectedCalha, setSelectedCalha] = useState(calhaId || "");
  const [populacao, setPopulacao] = useState(0);
  const [cristaos2010, setCristaos2010] = useState(0);
  const [cristaos2022, setCristaos2022] = useState(0);
  const [naoCristaos2010, setNaoCristaos2010] = useState(0);
  const [naoCristaos2022, setNaoCristaos2022] = useState(0);
  const [votosMap, setVotosMap] = useState<VotoEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: cs } = await supabase.from("logbook_calhas").select("id, nome").order("nome");
      setCalhas(cs || []);

      // Initialize empty votos
      const initial: VotoEntry[] = [];
      ANOS.forEach((ano) => CARGOS.forEach((cargo) => initial.push({ ano, cargo, votos_validos_totais: 0, votos_candidato: 0 })));

      if (isEdit) {
        const { data: mun } = await supabase.from("logbook_municipios").select("*").eq("id", munId).single();
        if (mun) {
          setNome(mun.nome);
          setSelectedCalha(mun.calha_id);
          setPopulacao(mun.populacao_2022);
          setCristaos2010(Number(mun.percentual_cristaos_2010));
          setCristaos2022(Number(mun.percentual_cristaos_2022));
          setNaoCristaos2010(Number(mun.percentual_nao_cristaos_2010));
          setNaoCristaos2022(Number(mun.percentual_nao_cristaos_2022));
        }
        const { data: vd } = await supabase.from("logbook_votos_historico").select("*").eq("municipio_id", munId);
        if (vd) {
          const merged = initial.map((entry) => {
            const existing = vd.find((v: any) => v.ano_eleicao === entry.ano && v.cargo === entry.cargo);
            return existing ? { ...entry, votos_validos_totais: existing.votos_validos_totais, votos_candidato: existing.votos_candidato, existingId: existing.id } : entry;
          });
          setVotosMap(merged);
        } else {
          setVotosMap(initial);
        }
      } else {
        setVotosMap(initial);
      }
    };
    init();
  }, [munId, calhaId, isEdit]);

  const updateVoto = (ano: number, cargo: string, field: "votos_validos_totais" | "votos_candidato", val: number) => {
    setVotosMap((prev) => prev.map((v) => v.ano === ano && v.cargo === cargo ? { ...v, [field]: val } : v));
  };

  const handleSave = async () => {
    if (!nome.trim() || !selectedCalha) { toast({ title: "Preencha nome e calha", variant: "destructive" }); return; }

    // Validate percentages
    if (Math.abs((cristaos2010 + naoCristaos2010) - 100) > 1) { toast({ title: "Cristãos + Não Cristãos 2010 deve somar 100%", variant: "destructive" }); return; }
    if (Math.abs((cristaos2022 + naoCristaos2022) - 100) > 1) { toast({ title: "Cristãos + Não Cristãos 2022 deve somar 100%", variant: "destructive" }); return; }

    // Validate votos
    const invalid = votosMap.find((v) => v.votos_candidato > v.votos_validos_totais && v.votos_validos_totais > 0);
    if (invalid) { toast({ title: `Votos candidato > totais em ${invalid.ano} ${invalid.cargo}`, variant: "destructive" }); return; }

    setSaving(true);
    try {
      const munData = {
        nome: nome.trim(),
        calha_id: selectedCalha,
        populacao_2022: populacao,
        percentual_cristaos_2010: cristaos2010,
        percentual_cristaos_2022: cristaos2022,
        percentual_nao_cristaos_2010: naoCristaos2010,
        percentual_nao_cristaos_2022: naoCristaos2022,
      };

      let municipioId = munId;
      if (isEdit) {
        const { error } = await supabase.from("logbook_municipios").update(munData).eq("id", munId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("logbook_municipios").insert(munData).select("id").single();
        if (error) throw error;
        municipioId = data.id;
      }

      // Upsert votos
      for (const v of votosMap) {
        if (v.votos_validos_totais === 0 && v.votos_candidato === 0) continue;
        const payload = { municipio_id: municipioId!, ano_eleicao: v.ano, cargo: v.cargo, votos_validos_totais: v.votos_validos_totais, votos_candidato: v.votos_candidato };
        if (v.existingId) {
          await supabase.from("logbook_votos_historico").update({ votos_validos_totais: v.votos_validos_totais, votos_candidato: v.votos_candidato }).eq("id", v.existingId);
        } else {
          await supabase.from("logbook_votos_historico").insert(payload);
        }
      }

      toast({ title: isEdit ? "Município atualizado!" : "Município criado!" });
      navigate(`/logbook/${selectedCalha}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <Link to={calhaId ? `/logbook/${calhaId}` : "/logbook"}><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-2xl font-bold">{isEdit ? "Editar Município" : "Novo Município"}</h1>
        </div>

        {/* Dados básicos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Básicos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>Nome *</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Manaus" /></div>
            <div>
              <Label>Calha *</Label>
              <Select value={selectedCalha} onValueChange={setSelectedCalha}>
                <SelectTrigger><SelectValue placeholder="Selecione a calha" /></SelectTrigger>
                <SelectContent>{calhas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Perfil religioso */}
        <Card>
          <CardHeader><CardTitle className="text-base">Perfil Religioso e Demográfico</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><Label>População 2022</Label><Input type="number" value={populacao} onChange={(e) => setPopulacao(Number(e.target.value))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>% Cristãos 2010</Label><Input type="number" step="0.1" value={cristaos2010} onChange={(e) => { setCristaos2010(Number(e.target.value)); setNaoCristaos2010(Math.round((100 - Number(e.target.value)) * 10) / 10); }} /></div>
              <div><Label>% Não Cristãos 2010</Label><Input type="number" step="0.1" value={naoCristaos2010} onChange={(e) => { setNaoCristaos2010(Number(e.target.value)); setCristaos2010(Math.round((100 - Number(e.target.value)) * 10) / 10); }} /></div>
              <div><Label>% Cristãos 2022</Label><Input type="number" step="0.1" value={cristaos2022} onChange={(e) => { setCristaos2022(Number(e.target.value)); setNaoCristaos2022(Math.round((100 - Number(e.target.value)) * 10) / 10); }} /></div>
              <div><Label>% Não Cristãos 2022</Label><Input type="number" step="0.1" value={naoCristaos2022} onChange={(e) => { setNaoCristaos2022(Number(e.target.value)); setCristaos2022(Math.round((100 - Number(e.target.value)) * 10) / 10); }} /></div>
            </div>
          </CardContent>
        </Card>

        {/* Dados eleitorais */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Eleitorais</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {ANOS.map((ano) => (
              <div key={ano}>
                <p className="text-sm font-semibold text-primary mb-2">Eleição {ano}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {CARGOS.map((cargo) => {
                    const entry = votosMap.find((v) => v.ano === ano && v.cargo === cargo);
                    return (
                      <div key={`${ano}-${cargo}`} className="space-y-2 p-3 rounded-lg bg-muted/50">
                        <p className="text-xs font-medium capitalize">{cargo}</p>
                        <div><Label className="text-[10px]">Votos totais</Label><Input type="number" value={entry?.votos_validos_totais || 0} onChange={(e) => updateVoto(ano, cargo, "votos_validos_totais", Number(e.target.value))} /></div>
                        <div><Label className="text-[10px]">Votos candidato</Label><Input type="number" value={entry?.votos_candidato || 0} onChange={(e) => updateVoto(ano, cargo, "votos_candidato", Number(e.target.value))} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />{saving ? "Salvando..." : "Salvar Município"}
        </Button>
      </div>
    </AppLayout>
  );
};

export default LogbookMunicipioForm;
