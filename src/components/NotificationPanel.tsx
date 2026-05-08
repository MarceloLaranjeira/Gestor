import { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  buildDemandaPath,
  resolveDemandaAlert,
  type DemandaAlertRecord,
} from "@/lib/demandaAlertas";

type SystemAlert = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: "info" | "warning" | "danger" | "success";
  origem: string;
  created_at: string;
};

type NotificationItem =
  | {
      id: string;
      kind: "demanda";
      title: string;
      description: string;
      level: "info" | "warning" | "danger" | "success";
      createdAt: string;
      path: string;
      alert: DemandaAlertRecord;
    }
  | {
      id: string;
      kind: "sistema";
      title: string;
      description: string;
      level: "info" | "warning" | "danger" | "success";
      createdAt: string;
      path: "/alertas";
      alert: SystemAlert;
    };

const LEVEL_CONFIG = {
  danger: { icon: AlertTriangle, style: "text-destructive", bg: "bg-destructive/10" },
  warning: { icon: Clock, style: "text-warning", bg: "bg-warning/10" },
  info: { icon: Info, style: "text-info", bg: "bg-info/10" },
  success: { icon: CheckCircle2, style: "text-success", bg: "bg-success/10" },
} as const;

const NotificationPanel = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
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
      // Audio unavailable
    }
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("notification_sound", String(next));
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);

    const [demandaAlertsRes, systemAlertsRes] = await Promise.all([
      supabase
        .from("demanda_alertas")
        .select("*")
        .eq("ativo", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("alertas_sistema")
        .select("id, titulo, mensagem, tipo, origem, created_at")
        .eq("lido", false)
        .order("created_at", { ascending: false }),
    ]);

    const demandaAlerts = (demandaAlertsRes.data as DemandaAlertRecord[]) || [];
    const systemAlerts = (systemAlertsRes.data as SystemAlert[]) || [];

    const demandaIds = [...new Set(demandaAlerts.map((alert) => alert.demanda_id))];
    let demandaPathMap: Record<string, string> = {};

    if (demandaIds.length > 0) {
      const { data: demandRows } = await supabase
        .from("demandas")
        .select("id, setor_sac, coordenadoria_slug")
        .in("id", demandaIds);

      demandaPathMap = ((demandRows as Array<{ id: string; setor_sac: string | null; coordenadoria_slug: string | null }>) || []).reduce<Record<string, string>>(
        (acc, demanda) => {
          acc[demanda.id] = buildDemandaPath(demanda);
          return acc;
        },
        {},
      );
    }

    const items: NotificationItem[] = [
      ...demandaAlerts.map((alert) => ({
        id: alert.id,
        kind: "demanda" as const,
        title: alert.titulo,
        description: alert.mensagem,
        level: (alert.tipo === "success" ? "success" : alert.tipo) as NotificationItem["level"],
        createdAt: alert.created_at,
        path: demandaPathMap[alert.demanda_id] || "/demandas",
        alert,
      })),
      ...systemAlerts.map((alert) => ({
        id: alert.id,
        kind: "sistema" as const,
        title: alert.titulo,
        description: alert.mensagem,
        level: alert.tipo,
        createdAt: alert.created_at,
        path: "/alertas" as const,
        alert,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setNotifications(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();

    const demandaChannel = supabase
      .channel("notification-panel-demanda-alertas")
      .on("postgres_changes", { event: "*", schema: "public", table: "demanda_alertas" }, fetchNotifications)
      .subscribe();

    const systemChannel = supabase
      .channel("notification-panel-system-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "alertas_sistema" }, fetchNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(demandaChannel);
      supabase.removeChannel(systemChannel);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (notifications.length > prevCountRef.current && prevCountRef.current >= 0) {
      playNotificationSound();
    }
    prevCountRef.current = notifications.length;
  }, [notifications, playNotificationSound]);

  const dismiss = async (notification: NotificationItem) => {
    if (notification.kind === "demanda") {
      await resolveDemandaAlert(supabase, notification.alert);
    } else {
      await supabase.from("alertas_sistema").update({ lido: true }).eq("id", notification.alert.id);
    }
    await fetchNotifications();
  };

  const handleClick = async (notification: NotificationItem) => {
    navigate(notification.path);
    setOpen(false);
  };

  const count = notifications.length;

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
          <h3 className="text-sm font-semibold text-foreground">Alertas</h3>
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
                {count} ativo{count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Clock className="w-8 h-8 mb-2 animate-pulse" />
              <p className="text-sm font-medium">Carregando alertas...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mb-2 text-success" />
              <p className="text-sm font-medium">Tudo em dia!</p>
              <p className="text-xs">Nenhum alerta pendente</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const cfg = LEVEL_CONFIG[notification.level];
                const Icon = cfg.icon;

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleClick(notification)}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group cursor-pointer"
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg ${cfg.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg.style}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notification.description}</p>
                      <span className="text-[10px] text-muted-foreground/60 capitalize">
                        {notification.kind === "demanda" ? "demanda" : "sistema"}
                      </span>
                    </div>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        void dismiss(notification);
                      }}
                      className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Marcar como tratado"
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
