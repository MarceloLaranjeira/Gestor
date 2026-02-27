import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Pencil, Trash2, Star, Users, ArrowUpDown, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Apoiador {
  id: string;
  nome: string;
  cidade: string;
  regiao: string;
  segmento: string;
  organizacao: string;
  cargo: string;
  grau_influencia: number;
  prioridade: string;
  updated_at: string;
}

const prioridadeBadge: Record<string, { label: string; variant: "destructive" | "default" | "secondary" }> = {
  alta: { label: "Alta", variant: "destructive" },
  media: { label: "Média", variant: "default" },
  baixa: { label: "Baixa", variant: "secondary" },
};

const InfluenciaStars = ({ value }: { value: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </div>
);

const ApoiadoresList = () => {
  const navigate = useNavigate();
  const [apoiadores, setApoiadores] = useState<Apoiador[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroRegiao, setFiltroRegiao] = useState("todas");
  const [filtroSegmento, setFiltroSegmento] = useState("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroGrau, setFiltroGrau] = useState("todos");
  const [ordenacao, setOrdenacao] = useState("grau_desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchApoiadores = async () => {
    const { data, error } = await supabase
      .from("apoiadores")
      .select("id, nome, cidade, regiao, segmento, organizacao, cargo, grau_influencia, prioridade, updated_at")
      .order("grau_influencia", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar apoiadores", description: error.message, variant: "destructive" });
    } else {
      setApoiadores(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApoiadores(); }, []);

  const regioesFixas = ["Norte", "Sul", "Leste", "Oeste", "Capital", "Interior", "Metropolitana"];
  const segmentosFixos = ["Evangélico", "Empresarial", "Sindical", "Comunitário", "Político", "Acadêmico", "Saúde", "Educação", "Segurança", "Agronegócio"];

  const regioes = useMemo(() => [...new Set([...regioesFixas, ...apoiadores.map((a) => a.regiao).filter(Boolean)])], [apoiadores]);
  const segmentos = useMemo(() => [...new Set([...segmentosFixos, ...apoiadores.map((a) => a.segmento).filter(Boolean)])], [apoiadores]);

  const filtered = useMemo(() => {
    let list = apoiadores;
    if (busca) {
      const q = busca.toLowerCase();
      list = list.filter(
        (a) =>
          a.nome.toLowerCase().includes(q) ||
          a.cidade.toLowerCase().includes(q) ||
          a.organizacao.toLowerCase().includes(q) ||
          a.segmento.toLowerCase().includes(q)
      );
    }
    if (filtroRegiao !== "todas") list = list.filter((a) => a.regiao === filtroRegiao);
    if (filtroSegmento !== "todos") list = list.filter((a) => a.segmento === filtroSegmento);
    if (filtroPrioridade !== "todas") list = list.filter((a) => a.prioridade === filtroPrioridade);
    if (filtroGrau !== "todos") list = list.filter((a) => a.grau_influencia === Number(filtroGrau));

    const sorted = [...list];
    switch (ordenacao) {
      case "grau_desc": sorted.sort((a, b) => b.grau_influencia - a.grau_influencia); break;
      case "grau_asc": sorted.sort((a, b) => a.grau_influencia - b.grau_influencia); break;
      case "nome_asc": sorted.sort((a, b) => a.nome.localeCompare(b.nome)); break;
      case "prioridade": {
        const order = { alta: 0, media: 1, baixa: 2 };
        sorted.sort((a, b) => (order[a.prioridade as keyof typeof order] ?? 1) - (order[b.prioridade as keyof typeof order] ?? 1));
        break;
      }
    }
    return sorted;
  }, [apoiadores, busca, filtroRegiao, filtroSegmento, filtroPrioridade, filtroGrau, ordenacao]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("apoiadores").delete().eq("id", deleteId);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Apoiador excluído" });
      fetchApoiadores();
    }
    setDeleteId(null);
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Prontuário Parlamentar
            </h1>
            <p className="text-sm text-muted-foreground">Gestão completa de apoiadores e relações políticas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/prontuario/resumo")} className="gap-2">
              <TrendingUp className="w-4 h-4" /> Resumo Executivo
            </Button>
            <Button onClick={() => navigate("/prontuario/novo")} className="gap-2">
              <Plus className="w-4 h-4" /> Novo Apoiador
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome, cidade, organização..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
              </div>
              <Select value={filtroRegiao} onValueChange={setFiltroRegiao}>
                <SelectTrigger><SelectValue placeholder="Região" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas regiões</SelectItem>
                  {regioes.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                <SelectTrigger><SelectValue placeholder="Segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos segmentos</SelectItem>
                  {segmentos.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroPrioridade} onValueChange={setFiltroPrioridade}>
                <SelectTrigger><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger><SelectValue placeholder="Ordenar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grau_desc">Influência ↓</SelectItem>
                  <SelectItem value="grau_asc">Influência ↑</SelectItem>
                  <SelectItem value="prioridade">Prioridade</SelectItem>
                  <SelectItem value="nome_asc">Nome A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Cidade</TableHead>
                    <TableHead className="hidden lg:table-cell">Região</TableHead>
                    <TableHead className="hidden lg:table-cell">Segmento</TableHead>
                    <TableHead className="hidden xl:table-cell">Organização</TableHead>
                    <TableHead className="hidden xl:table-cell">Cargo</TableHead>
                    <TableHead>Influência</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead className="hidden md:table-cell">Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Nenhum apoiador encontrado.</TableCell></TableRow>
                  ) : (
                    filtered.map((a) => {
                      const pBadge = prioridadeBadge[a.prioridade] || prioridadeBadge.media;
                      return (
                        <TableRow key={a.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/prontuario/${a.id}`)}>
                          <TableCell className="font-medium">{a.nome}</TableCell>
                          <TableCell className="hidden md:table-cell">{a.cidade || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{a.regiao || "—"}</TableCell>
                          <TableCell className="hidden lg:table-cell">{a.segmento || "—"}</TableCell>
                          <TableCell className="hidden xl:table-cell">{a.organizacao || "—"}</TableCell>
                          <TableCell className="hidden xl:table-cell">{a.cargo || "—"}</TableCell>
                          <TableCell><InfluenciaStars value={a.grau_influencia} /></TableCell>
                          <TableCell><Badge variant={pBadge.variant}>{pBadge.label}</Badge></TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {format(new Date(a.updated_at), "dd/MM/yy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" onClick={() => navigate(`/prontuario/${a.id}`)}><Eye className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => navigate(`/prontuario/${a.id}/editar`)}><Pencil className="w-4 h-4" /></Button>
                              <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(a.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>Essa ação é irreversível. O apoiador e todo seu histórico serão removidos.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default ApoiadoresList;
