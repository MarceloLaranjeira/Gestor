import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: { value: number; positive: boolean };
  className?: string;
  href?: string;
  accentColor?: string;
  iconBg?: string;
  onEdit?: () => void;
}

const StatCard = ({ title, value, subtitle, icon, trend, className, href, accentColor, iconBg, onEdit }: StatCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={() => href && navigate(href)}
      onKeyDown={(e) => e.key === "Enter" && href && navigate(href)}
      className={cn(
        "glass-card rounded-xl p-5 animate-fade-in relative overflow-hidden group",
        href && "cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
        "transition-all duration-200",
        className
      )}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-xl opacity-80"
        style={{ background: accentColor ?? "hsl(var(--primary))" }}
      />

      {/* Quick-insert button */}
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-primary/15 hover:bg-primary/30 text-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
          title="Inserir dado"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}

      {/* Subtle radial glow on hover */}
      {(href || onEdit) && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
          style={{ background: `radial-gradient(ellipse at top left, ${accentColor ?? "hsl(var(--primary))"} 0%, transparent 60%)`, opacity: 0 }}
        />
      )}

      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest truncate">
            {title}
          </p>
          <p className="mt-2 text-[2rem] font-bold font-display text-foreground leading-none tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-success" : "text-destructive"
            )}>
              {trend.positive
                ? <TrendingUp className="w-3.5 h-3.5" />
                : <TrendingDown className="w-3.5 h-3.5" />}
              {Math.abs(trend.value)}% vs mês anterior
            </div>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ml-3"
          style={{ background: iconBg ?? `${accentColor ?? "hsl(var(--primary))"}1a` }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
