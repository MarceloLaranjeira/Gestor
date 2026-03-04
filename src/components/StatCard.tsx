import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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
}

const StatCard = ({ title, value, subtitle, icon, trend, className, href, accentColor }: StatCardProps) => {
  const navigate = useNavigate();

  return (
    <div
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={() => href && navigate(href)}
      onKeyDown={(e) => e.key === "Enter" && href && navigate(href)}
      className={cn(
        "glass-card rounded-xl p-5 animate-fade-in transition-all duration-200 relative overflow-hidden",
        href && "cursor-pointer hover:shadow-card-hover hover:scale-[1.02] active:scale-[0.99]",
        className
      )}
    >
      {accentColor && (
        <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{ background: accentColor }} />
      )}
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className="mt-2 text-3xl font-bold font-display text-foreground leading-none">{value}</p>
          {subtitle && <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn("mt-2 text-xs font-medium", trend.positive ? "text-success" : "text-destructive")}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% vs mês anterior
            </p>
          )}
        </div>
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 ml-3">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
