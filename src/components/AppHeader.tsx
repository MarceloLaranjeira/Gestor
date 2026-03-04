import { useState, useEffect, useRef } from "react";
import { Search, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import NotificationPanel from "@/components/NotificationPanel";
import { useSidebarState } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  type: "pessoa" | "demanda" | "evento" | "pagina" | "tarefa";
  id: string;
  title: string;
  subtitle?: string;
  path: string;
}

const sidebarPages: { label: string; path: string; keywords: string[] }[] = [
  { label: "Dashboard", path: "/", keywords: ["dashboard", "início", "home", "painel"] },
  { label: "Assessor IA", path: "/agente-ia", keywords: ["assessor", "ia", "inteligência", "artificial", "agente", "bot"] },
  { label: "Pessoas", path: "/pessoas", keywords: ["pessoas", "contatos", "cadastro"] },
  { label: "Demandas", path: "/demandas", keywords: ["demandas", "solicitações", "pedidos"] },
  { label: "Eventos", path: "/eventos", keywords: ["eventos", "agenda", "calendário"] },
  { label: "Financeiro", path: "/financas", keywords: ["financeiro", "finanças", "dinheiro", "receita", "despesa"] },
  { label: "Movimentos", path: "/movimentos", keywords: ["movimentos", "ações"] },
  { label: "Relatórios", path: "/relatorios", keywords: ["relatórios", "relatório", "dados"] },
  { label: "Rel. Coordenação", path: "/relatorio-coordenacao", keywords: ["relatório", "coordenação"] },
  { label: "Usuários", path: "/usuarios", keywords: ["usuários", "gerenciar", "membros"] },
  { label: "Permissões", path: "/permissoes", keywords: ["permissões", "acesso", "roles"] },
  { label: "Configurações", path: "/configuracoes", keywords: ["configurações", "perfil", "conta", "senha"] },
  { label: "Coord. Eclesiástica", path: "/coordenacao/eclesiastica", keywords: ["eclesiástica", "igreja", "coordenação"] },
  { label: "Coord. Comunicação", path: "/coordenacao/comunicacao", keywords: ["comunicação", "mídia", "coordenação"] },
  { label: "Coord. Inteligência de Dados", path: "/coordenacao/inteligencia", keywords: ["inteligência", "dados", "coordenação"] },
  { label: "Coord. CSPJD", path: "/coordenacao/cspjd", keywords: ["cspjd", "segurança", "coordenação"] },
  { label: "Coord. Gabinete", path: "/coordenacao/gabinete", keywords: ["gabinete", "coordenação"] },
  { label: "Coord. Equipe CMT Dan", path: "/coordenacao/equipe", keywords: ["equipe", "cmt", "dan", "coordenação"] },
];

const AppHeader = () => {
  const { user } = useAuth();
  const { setMobileOpen } = useSidebarState();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
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

      // Search sidebar pages first
      sidebarPages.forEach((page) => {
        const matches = page.label.toLowerCase().includes(lowerQuery) ||
          page.keywords.some((k) => k.includes(lowerQuery));
        if (matches) {
          items.push({ type: "pagina", id: page.path, title: page.label, subtitle: page.path, path: page.path });
        }
      });

      // Then search database
      const [pessoas, demandas, eventos, tarefas] = await Promise.all([
        supabase.from("pessoas").select("id, nome, tipo").ilike("nome", term).limit(5),
        supabase.from("demandas").select("id, titulo, status").ilike("titulo", term).limit(5),
        supabase.from("eventos").select("id, titulo, data").ilike("titulo", term).limit(5),
        supabase.from("tarefas").select("id, titulo, responsavel, secao_id").ilike("titulo", term).limit(5),
      ]);

      pessoas.data?.forEach((p) =>
        items.push({ type: "pessoa", id: p.id, title: p.nome, subtitle: p.tipo, path: "/pessoas" })
      );
      demandas.data?.forEach((d) =>
        items.push({ type: "demanda", id: d.id, title: d.titulo, subtitle: d.status, path: "/demandas" })
      );
      eventos.data?.forEach((e) =>
        items.push({ type: "evento", id: e.id, title: e.titulo, subtitle: e.data, path: "/eventos" })
      );
      tarefas.data?.forEach((t) =>
        items.push({ type: "tarefa", id: t.id, title: t.titulo, subtitle: t.responsavel || "Sem responsável", path: "/relatorio-coordenacao" })
      );

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

  const typeLabel: Record<string, string> = {
    pessoa: "Pessoa",
    demanda: "Demanda",
    evento: "Evento",
    pagina: "Página",
    tarefa: "Tarefa",
  };

  const typeColor: Record<string, string> = {
    pessoa: "bg-primary/10 text-primary",
    demanda: "bg-accent/10 text-accent-foreground",
    evento: "bg-secondary/10 text-secondary",
    pagina: "bg-muted text-foreground",
    tarefa: "bg-info/10 text-info",
  };

  const displayAvatar = user?.avatar_url;

  return (
    <header className="sticky top-0 z-30 h-14 sm:h-16 bg-card/95 backdrop-blur-md border-b border-border/80 flex items-center justify-between px-3 sm:px-6 gap-2 shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isMobile && (
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
        )}
        <div className="relative flex-1 max-w-md" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isMobile ? "Buscar..." : "Buscar demandas, pessoas, eventos..."}
            className="w-full h-9 pl-10 pr-8 text-sm rounded-lg bg-muted/60 border border-border/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 placeholder:text-muted-foreground/50 text-foreground transition-all"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setShowResults(false); }}
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
                  {results.map((r) => (
                    <button
                      key={`${r.type}-${r.id}`}
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${typeColor[r.type]}`}>
                        {typeLabel[r.type]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{r.title}</p>
                        {r.subtitle && <p className="text-[11px] text-muted-foreground truncate">{r.subtitle}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        <NotificationPanel />

        <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3 border-l border-border">
          <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 flex items-center justify-center bg-primary/10 shrink-0">
            {displayAvatar ? (
              <img src={displayAvatar} alt={user?.name || "Avatar"} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-primary">
                {user?.name?.charAt(0) || "U"}
              </span>
            )}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-foreground leading-tight">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
