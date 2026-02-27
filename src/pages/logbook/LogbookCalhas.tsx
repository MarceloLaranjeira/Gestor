import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Eye, MapPin, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CalhaWithStats {
  id: string;
  nome: string;
  descricao: string;
  totalMunicipios: number;
  cristãos2022: number;
  votosFed2006: number;
  votosEst2006: number;
  votosFedRecente: number;
  votosEstRecente: number;
  evasaoFederal: number;
  evasaoEstadual: number;
  potencial: number;
}

const LogbookCalhas = () => {
  const [calhas, setCalhas] = useState<CalhaWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("potencial");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const { data: calhasData } = await supabase.from("logbook_calhas").select("*").order("nome");
    const { data: munsData } = await supabase.from("logbook_municipios").select("*");
    const { data: votosData } = await supabase.from("logbook_votos_historico").select("*");

    const result: CalhaWithStats[] = (calhasData || []).map((c: any) => {
      const muns = (munsData || []).filter((m: any) => m.calha_id === c.id);
      const munIds = muns.map((m: any) => m.id);
      const votos = (votosData || []).filter((v: any) => munIds.includes(v.municipio_id));

      const votosFed2006 = votos.filter((v: any) => v.ano_eleicao === 2006 && v.cargo === "federal").reduce((s: number, v: any) => s + v.votos_validos_totais, 0);
      const votosEst2006 = votos.filter((v: any) => v.ano_eleicao === 2006 && v.cargo === "estadual").reduce((s: number, v: any) => s + v.votos_validos_totais, 0);

      const anosFed = [...new Set(votos.filter((v: any) => v.cargo === "federal").map((v: any) => v.ano_eleicao))].sort();
      const anosEst = [...new Set(votos.filter((v: any) => v.cargo === "estadual").map((v: any) => v.ano_eleicao))].sort();
      const anoRecenteFed = anosFed.length ? anosFed[anosFed.length - 1] : 2006;
      const anoRecenteEst = anosEst.length ? anosEst[anosEst.length - 1] : 2006;

      const votosFedRecente = votos.filter((v: any) => v.ano_eleicao === anoRecenteFed && v.cargo === "federal").reduce((s: number, v: any) => s + v.votos_validos_totais, 0);
      const votosEstRecente = votos.filter((v: any) => v.ano_eleicao === anoRecenteEst && v.cargo === "estadual").reduce((s: number, v: any) => s + v.votos_validos_totais, 0);

      const evasaoFederal = votosFed2006 > 0 ? ((votosFedRecente - votosFed2006) / votosFed2006) * 100 : 0;
      const evasaoEstadual = votosEst2006 > 0 ? ((votosEstRecente - votosEst2006) / votosEst2006) * 100 : 0;

      const avgCristaos = muns.length > 0 ? muns.reduce((s: number, m: any) => s + Number(m.percentual_cristaos_2022), 0) / muns.length : 0;

      const potencial = Math.min(100, Math.round(avgCristaos * 0.4 + Math.max(0, 100 + evasaoFederal) * 0.3 + Math.max(0, 100 + evasaoEstadual) * 0.3));

      return {
        id: c.id,
        nome: c.nome,
        descricao: c.descricao || "",
        totalMunicipios: muns.length,
        cristãos2022: Math.round(avgCristaos * 10) / 10,
        votosFed2006,
        votosEst2006,
        votosFedRecente,
        votosEstRecente,
        evasaoFederal: Math.round(evasaoFederal * 10) / 10,
        evasaoEstadual: Math.round(evasaoEstadual * 10) / 10,
        potencial,
      };
    });

    setCalhas(result);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    const { error } = await supabase.from("logbook_calhas").insert({ nome: newNome.trim(), descricao: newDesc.trim() });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Calha criada com sucesso!" });
    setNewNome(""); setNewDesc(""); setDialogOpen(false);
    fetchData();
  };

  const filtered = calhas
    .filter((c) => c.nome.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "potencial") return b.potencial - a.potencial;
      if (sortBy === "votos2006") return (b.votosFed2006 + b.votosEst2006) - (a.votosFed2006 + a.votosEst2006);
      if (sortBy === "cristaos") return b.cristãos2022 - a.cristãos2022;
      return 0;
    });

  const getEvasaoBadge = (val: number) => {
    if (val < -10) return <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" />{val}%</Badge>;
    if (val < 0) return <Badge className="gap-1 bg-warning text-warning-foreground"><Minus className="w-3 h-3" />{val}%</Badge>;
    return <Badge className="gap-1 bg-success text-success-foreground"><TrendingUp className="w-3 h-3" />+{val}%</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logbook de Calhas</h1>
            <p className="text-sm text-muted-foreground">Análise eleitoral e demográfica por calha</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Nova Calha</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Calha</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Ex: Calha Alto Solimões" /></div>
                <div><Label>Descrição</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descrição opcional" /></div>
                <Button onClick={handleCreate} className="w-full">Criar Calha</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar calha..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="potencial">Potencial Eleitoral</SelectItem>
              <SelectItem value="votos2006">Votos 2006</SelectItem>
              <SelectItem value="cristaos">% Cristãos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Nenhuma calha encontrada.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />{c.nome}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{c.totalMunicipios} municípios</p>
                    </div>
                    <Badge variant="outline" className="text-xs">Score: {c.potencial}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-md bg-muted/50">
                      <p className="text-muted-foreground">Votos 2006</p>
                      <p className="font-semibold">Fed: {c.votosFed2006.toLocaleString("pt-BR")}</p>
                      <p className="font-semibold">Est: {c.votosEst2006.toLocaleString("pt-BR")}</p>
                    </div>
                    <div className="p-2 rounded-md bg-muted/50">
                      <p className="text-muted-foreground">Mais recente</p>
                      <p className="font-semibold">Fed: {c.votosFedRecente.toLocaleString("pt-BR")}</p>
                      <p className="font-semibold">Est: {c.votosEstRecente.toLocaleString("pt-BR")}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Cristãos 2022</span>
                      <span className="font-medium">{c.cristãos2022}%</span>
                    </div>
                    <Progress value={c.cristãos2022} className="h-2" />
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Evasão Fed:</span>{getEvasaoBadge(c.evasaoFederal)}
                    <span className="text-muted-foreground ml-2">Est:</span>{getEvasaoBadge(c.evasaoEstadual)}
                  </div>

                  <Link to={`/logbook/${c.id}`}>
                    <Button variant="outline" size="sm" className="w-full gap-2 mt-2"><Eye className="w-4 h-4" />Ver detalhes</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LogbookCalhas;
