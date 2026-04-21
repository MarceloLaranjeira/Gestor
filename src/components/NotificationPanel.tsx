import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Clock, AlertTriangle, CheckCircle2, X, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  sourceId: string;
  type: "atrasada" | "prazo_proximo" | "pendente_antiga";
  title: string;
  description: string;
  date: string;
  source: "demanda" | "tarefa";
}

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("notification_sound");
      return saved !== "false";
    } catch {
      return true;
    }
  });
  const prevCountRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("dismissed_notifications");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("notification_sound", String(next));
  };

  const fetchNotifications = async () => {
    const today = new Date().toISOString().split("T")[0];
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const results: Notification[] = [];

    const { data: demandasAtrasadas } = await supabase
      .from("demandas")
      .select("id, titulo, data_prazo, status, responsavel")
      .lt("data_prazo", today)
      .neq("status", "concluida")
      .not("data_prazo", "is", null);

    demandasAtrasadas?.forEach((d) => {
      results.push({
        id: `demanda-atrasada-${d.id}`,
        sourceId: d.id,
        type: "atrasada",
        title: d.titulo,
        description: `Prazo vencido em ${new Date(d.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}${d.responsavel ? ` • ${d.responsavel}` : ""}`,
        date: d.data_prazo!,
        source: "demanda",
      });
    });

    const { data: demandasProximas } = await supabase
      .from("demandas")
      .select("id, titulo, data_prazo, status, responsavel")
      .gte("data_prazo", today)
      .lte("data_prazo", threeDaysFromNow)
      .neq("status", "concluida")
      .not("data_prazo", "is", null);

    demandasProximas?.forEach((d) => {
      results.push({
        id: `demanda-proxima-${d.id}`,
        sourceId: d.id,
        type: "prazo_proximo",
        title: d.titulo,
        description: `Prazo em ${new Date(d.data_prazo + "T00:00:00").toLocaleDateString("pt-BR")}${d.responsavel ? ` • ${d.responsavel}` : ""}`,
        date: d.data_prazo!,
        source: "demanda",
      });
    });

    const { data: demandasAntigas } = await supabase
      .from("demandas")
      .select("id, titulo, created_at, status")
      .lt("created_at", thirtyDaysAgo + "T00:00:00Z")
      .in("status", ["pendente", "andamento"])
      .is("data_prazo", null);

    demandasAntigas?.forEach((d) => {
      results.push({
        id: `demanda-antiga-${d.id}`,
        sourceId: d.id,
        type: "pendente_antiga",
        title: d.titulo,
        description: `Pendente há ${formatDistanceToNow(new Date(d.created_at), { locale: ptBR })}`,
        date: d.created_at,
        source: "demanda",
      });
    });

    const { data: tarefasAtrasadas } = await supabase
      .from("tarefas")
      .select("id, titulo, data_fim, status, responsavel, secao_id")
      .lt("data_fim", today)
      .eq("status", false)
      .not("data_fim", "is", null);

    tarefasAtrasadas?.forEach((t) => {
      results.push({
        id: `tarefa-atrasada-${t.id}`,
        sourceId: t.secao_id,
        type: "atrasada",
        title: t.titulo,
        description: `Tarefa com prazo vencido em ${new Date(t.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}${t.responsavel ? ` • ${t.responsavel}` : ""}`,
        date: t.data_fim!,
        source: "tarefa",
      });
    });

    // Tarefas com prazo próximo (próximos 3 dias)
    const { data: tarefasProximas } = await supabase
      .from("tarefas")
      .select("id, titulo, data_fim, status, responsavel, secao_id")
      .gte("data_fim", today)
      .lte("data_fim", threeDaysFromNow)
      .eq("status", false)
      .not("data_fim", "is", null);

    tarefasProximas?.forEach((t) => {
      results.push({
        id: `tarefa-proxima-${t.id}`,
        sourceId: t.secao_id,
        type: "prazo_proximo",
        title: t.titulo,
        description: `Tarefa vence em ${new Date(t.data_fim + "T00:00:00").toLocaleDateString("pt-BR")}${t.responsavel ? ` • ${t.responsavel}` : ""}`,
        date: t.data_fim!,
        source: "tarefa",
      });
    });

    results.sort((a, b) => {
      const typeOrder = { atrasada: 0, prazo_proximo: 1, pendente_antiga: 2 };
      if (typeOrder[a.type] !== typeOrder[b.type]) return typeOrder[a.type] - typeOrder[b.type];
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    setNotifications(results);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const visibleCount = notifications.filter((n) => !dismissed.has(n.id)).length;
    if (visibleCount > prevCountRef.current && prevCountRef.current >= 0) {
      playNotificationSound();
    }
    prevCountRef.current = visibleCount;
  }, [notifications, dismissed, playNotificationSound]);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed_notifications", JSON.stringify([...next]));
  };

  const handleClick = async (n: Notification) => {
    if (n.source === "demanda") {
      navigate("/demandas");
    } else {
      // For tarefas, find the coordenação via seção
      const { data: secao } = await supabase
        .from("secoes")
        .select("coordenacao_id")
        .eq("id", n.sourceId)
        .single();

      if (secao) {
        const { data: coord } = await supabase
          .from("coordenacoes")
          .select("slug")
          .eq("id", secao.coordenacao_id)
          .single();

        if (coord) {
          navigate(`/coordenacao/${coord.slug}`);
        }
      }
    }
    setOpen(false);
  };

  const visible = notifications.filter((n) => !dismissed.has(n.id));
  const count = visible.length;

  const typeConfig = {
    atrasada: { icon: AlertTriangle, style: "text-destructive", bg: "bg-destructive/10" },
    prazo_proximo: { icon: Clock, style: "text-warning", bg: "bg-warning/10" },
    pendente_antiga: { icon: Clock, style: "text-muted-foreground", bg: "bg-muted" },
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notificações</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSound}
              className="p-1 rounded hover:bg-muted transition-colors"
              title={soundEnabled ? "Desativar som" : "Ativar som"}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </button>
            {count > 0 && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                {count} pendente{count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 text-success" />
              <p className="text-sm font-medium">Tudo em dia!</p>
              <p className="text-xs">Nenhuma notificação pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {visible.map((n) => {
                const cfg = typeConfig[n.type];
                const Icon = cfg.icon;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group cursor-pointer"
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.style}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                      <span className="text-[10px] text-muted-foreground/60 capitalize">{n.source}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Dispensar"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationPanel;
