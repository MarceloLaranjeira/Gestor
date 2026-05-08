import { useState, useEffect, useRef } from "react";
import { Search, Menu, X, Sun, Moon, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSidebarState } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import NotificationPanel from "@/components/NotificationPanel";
import { SAC_SETORES } from "@/data/sacSetores";
import { COORDENADORIA_DEMANDAS } from "@/data/coordenadoriaDemandas";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DISPONIBILIDADE_BADGE_CLASS,
  DISPONIBILIDADE_LABEL,
  normalizeDisponibilidadeMensagem,
  normalizeDisponibilidadeStatus,
  type DisponibilidadeStatus,
} from "@/lib/userAvailability";

interface SearchResult {
  type: "pessoa" | "demanda" | "evento" | "pagina" | "tarefa";
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

const baseSidebarPages: { label: string; path: string; keywords: string[] }[] = [
  { label: "Dashboard", path: "/", keywords: ["dashboard", "inicio", "home", "painel"] },
  { label: "Assessor IA", path: "/agente-ia", keywords: ["assessor", "ia", "inteligencia", "artificial", "agente", "bot"] },
  { label: "Pessoas", path: "/pessoas", keywords: ["pessoas", "contatos", "cadastro"] },
  { label: "Demandas", path: "/demandas", keywords: ["demandas", "solicitacoes", "pedidos"] },
  { label: "Eventos", path: "/eventos", keywords: ["eventos", "agenda", "calendario"] },
  { label: "Financeiro", path: "/financas", keywords: ["financeiro", "financas", "dinheiro", "receita", "despesa"] },
  { label: "Demandas SAC", path: "/movimentos", keywords: ["demandas sac", "sac", "movimentos", "setores sac"] },
  { label: "Demandas das Coordenadorias", path: "/coordenacoes", keywords: ["demandas das coordenadorias", "coordenadorias", "coordenacoes"] },
  { label: "Relatorios", path: "/relatorios", keywords: ["relatorios", "relatorio", "dados"] },
  { label: "Rel. Coordenacao", path: "/relatorio-coordenacao", keywords: ["relatorio", "coordenacao"] },
  { label: "Usuarios", path: "/usuarios", keywords: ["usuarios", "gerenciar", "membros"] },
  { label: "Permissoes", path: "/permissoes", keywords: ["permissoes", "acesso", "roles"] },
  { label: "Configuracoes", path: "/configuracoes", keywords: ["configuracoes", "perfil", "conta", "senha"] },
  { label: "Mapa", path: "/mapa", keywords: ["mapa", "pins", "territorios", "raio", "demografico", "densidade"] },
  { label: "Power BI", path: "/powerbi", keywords: ["power bi", "bi", "relatorio", "dashboard", "analytics", "powerbi"] },
];

const sidebarPages = [
  ...baseSidebarPages,
  ...COORDENADORIA_DEMANDAS.map((coordenadoria) => ({
    label: `Demandas ${coordenadoria.nome}`,
    path: coordenadoria.path,
    keywords: [
      "coordenadoria",
      "demandas",
      coordenadoria.slug,
      coordenadoria.nome.toLowerCase(),
    ],
  })),
  ...SAC_SETORES.map((setor) => ({
    label: `Setor ${setor.nome}`,
    path: setor.path,
    keywords: [
      "setor",
      "sac",
      "demanda",
      setor.slug,
      setor.nome.toLowerCase(),
      setor.coordenadoriaNome.toLowerCase(),
    ],
  })),
];

const AppHeader = () => {
  const { user, refreshProfile } = useAuth();
  const { setMobileOpen } = useSidebarState();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useTheme();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<DisponibilidadeStatus>("disponivel");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [savingAvailability, setSavingAvailability] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAvailabilityStatus(normalizeDisponibilidadeStatus(user?.disponibilidade_status));
    setAvailabilityMessage(normalizeDisponibilidadeMensagem(user?.disponibilidade_mensagem));
  }, [user?.disponibilidade_mensagem, user?.disponibilidade_status]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      const term = `%${query.trim()}%`;
      const lowerQuery = query.trim().toLowerCase();
      const items: SearchResult[] = [];

      sidebarPages.forEach((page) => {
        const matches =
          page.label.toLowerCase().includes(lowerQuery) ||
          page.keywords.some((keyword) => keyword.includes(lowerQuery));

        if (matches) {
          items.push({ type: "pagina", id: page.path, title: page.label, subtitle: page.path, path: page.path });
        }
      });

      const [pessoas, demandas, eventos, tarefas] = await Promise.all([
        supabase.from("pessoas").select("id, nome, tipo").ilike("nome", term).limit(5),
        supabase.from("demandas").select("id, titulo, status").ilike("titulo", term).limit(5),
        supabase.from("eventos").select("id, titulo, data").ilike("titulo", term).limit(5),
        supabase.from("tarefas").select("id, titulo, responsavel, secao_id").ilike("titulo", term).limit(5),
      ]);

      pessoas.data?.forEach((pessoa) => {
        items.push({ type: "pessoa", id: pessoa.id, title: pessoa.nome, subtitle: pessoa.tipo, path: "/pessoas" });
      });

      demandas.data?.forEach((demanda) => {
        items.push({ type: "demanda", id: demanda.id, title: demanda.titulo, subtitle: demanda.status, path: "/demandas" });
      });

      eventos.data?.forEach((evento) => {
        items.push({ type: "evento", id: evento.id, title: evento.titulo, subtitle: evento.data, path: "/eventos" });
      });

      tarefas.data?.forEach((tarefa) => {
        items.push({
          type: "tarefa",
          id: tarefa.id,
          title: tarefa.titulo,
          subtitle: tarefa.responsavel || "Sem responsavel",
          path: "/relatorio-coordenacao",
        });
      });

      setResults(items);
      setShowResults(true);
      setSearching(false);
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setShowResults(false);
    navigate(result.path);
  };

  const typeLabel: Record<SearchResult["type"], string> = {
    pessoa: "Pessoa",
    demanda: "Demanda",
    evento: "Evento",
    pagina: "Pagina",
    tarefa: "Tarefa",
  };

  const typeColor: Record<SearchResult["type"], string> = {
    pessoa: "bg-primary/10 text-primary",
    demanda: "bg-accent/10 text-accent-foreground",
    evento: "bg-secondary/10 text-secondary",
    pagina: "bg-muted text-foreground",
    tarefa: "bg-info/10 text-info",
  };

  const displayAvatar = user?.avatar_url;
  const currentAvailability = normalizeDisponibilidadeStatus(user?.disponibilidade_status);

  const handleSaveAvailability = async () => {
    if (!user?.user_id) return;
    setSavingAvailability(true);
    try {
      const payload = {
        disponibilidade_status: availabilityStatus,
        disponibilidade_mensagem: availabilityStatus === "indisponivel" ? availabilityMessage.trim() : "",
        disponibilidade_atualizada_em: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", user.user_id);

      if (error) throw error;

      await refreshProfile();
      setStatusDialogOpen(false);
      toast({ title: "Disponibilidade atualizada" });
    } catch {
      toast({ title: "Erro ao atualizar disponibilidade", variant: "destructive" });
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-30 min-h-14 sm:h-16 bg-card/95 backdrop-blur-md border-b border-border/80 flex flex-wrap sm:flex-nowrap items-center justify-between px-3 sm:px-6 py-2 sm:py-0 gap-2 shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0 w-full sm:w-auto">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        )}

        <div className="relative flex-1 min-w-0 sm:max-w-md" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={isMobile ? "Buscar..." : "Buscar demandas, pessoas, eventos..."}
            className="w-full h-9 pl-10 pr-8 text-sm rounded-lg bg-muted/60 border border-border/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 placeholder:text-muted-foreground/50 text-foreground transition-all"
          />

          {query && (
            <button
              onClick={() => {
                setQuery("");
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {showResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              {searching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
              ) : results.length === 0 ? (
                <div className="p-5 text-center text-sm text-muted-foreground">Nenhum resultado encontrado</div>
              ) : (
                <div className="py-1">
                  {results.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      onClick={() => handleSelect(result)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${typeColor[result.type]}`}>
                        {typeLabel[result.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{result.title}</p>
                        {result.subtitle && <p className="text-[11px] text-muted-foreground truncate">{result.subtitle}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1 sm:gap-3 shrink-0 w-full sm:w-auto">
        <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5 gap-0">
          {([
            { scheme: "light" as const, Icon: Sun, title: "Tema claro" },
            { scheme: "dark" as const, Icon: Moon, title: "Tema escuro" },
            { scheme: "system" as const, Icon: Monitor, title: "Tema do sistema" },
          ] as const).map(({ scheme, Icon, title }) => (
            <button
              key={scheme}
              onClick={() => setColorScheme(scheme)}
              title={title}
              className={`p-1.5 rounded-md transition-colors ${
                colorScheme === scheme ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <NotificationPanel />

        <button
          type="button"
          onClick={() => setStatusDialogOpen(true)}
          className="flex min-w-0 items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-border text-left"
        >
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-primary/10 shrink-0">
            {displayAvatar ? (
              <img src={displayAvatar} alt={user?.name || "Avatar"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">{user?.name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{user?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[10px] text-muted-foreground">{user?.role}</p>
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${DISPONIBILIDADE_BADGE_CLASS[currentAvailability]}`}>
                {DISPONIBILIDADE_LABEL[currentAvailability]}
              </span>
            </div>
          </div>
        </button>
      </div>
    </header>
    <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-md">
        <DialogHeader>
          <DialogTitle>Minha disponibilidade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={availabilityStatus} onValueChange={(value) => setAvailabilityStatus(value as DisponibilidadeStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disponivel">Disponível</SelectItem>
                <SelectItem value="indisponivel">Indisponível</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Mensagem de ausência</label>
            <Textarea
              value={availabilityMessage}
              onChange={(event) => setAvailabilityMessage(event.target.value)}
              rows={4}
              placeholder="Explique por que você está ausente ou indisponível"
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              Essa mensagem aparece para os demais quando você estiver indisponível.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancelar</Button>
          <Button onClick={() => void handleSaveAvailability()} disabled={savingAvailability}>
            {savingAvailability ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AppHeader;
