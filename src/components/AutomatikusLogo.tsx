import { cn } from "@/lib/utils";

interface AutomatikusLogoProps {
  variant?: "full" | "icon";
  className?: string;
  iconSize?: number;
}

const AutomatikusLogo = ({ variant = "full", className, iconSize = 40 }: AutomatikusLogoProps) => {
  if (variant === "icon") {
    return (
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-label="Gestor Inteligente"
      >
        <defs>
          <linearGradient id="gi-bg-icon" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0EA5E9" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#gi-bg-icon)" />
        <circle cx="50" cy="50" r="2.5" fill="rgba(255,255,255,0.22)" />
        <circle cx="57" cy="43" r="1.8" fill="rgba(255,255,255,0.16)" />
        <circle cx="44" cy="56" r="1.8" fill="rgba(255,255,255,0.16)" />
        <line x1="50" y1="50" x2="57" y2="43" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <line x1="50" y1="50" x2="44" y2="56" stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <text x="32" y="44" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="34"
          fill="white" textAnchor="middle" dominantBaseline="auto">G</text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 210 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full", className)}
      aria-label="Gestor Inteligente"
    >
      <defs>
        <linearGradient id="gi-bg-full" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#0EA5E9" />
        </linearGradient>
      </defs>
      <rect width="56" height="56" rx="12" fill="url(#gi-bg-full)" />
      <circle cx="43" cy="43" r="2.5" fill="rgba(255,255,255,0.22)" />
      <circle cx="50" cy="37" r="1.8" fill="rgba(255,255,255,0.16)" />
      <circle cx="37" cy="49" r="1.8" fill="rgba(255,255,255,0.16)" />
      <line x1="43" y1="43" x2="50" y2="37" stroke="rgba(255,255,255,0.13)" strokeWidth="0.9" />
      <line x1="43" y1="43" x2="37" y2="49" stroke="rgba(255,255,255,0.13)" strokeWidth="0.9" />
      <text x="28" y="39" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="30"
        fill="white" textAnchor="middle" dominantBaseline="auto">G</text>
      <text x="68" y="26" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="20" fill="white">Gestor</text>
      <text x="69" y="44" fontFamily="Arial, Helvetica, sans-serif" fontWeight="400" fontSize="12"
        fill="rgba(255,255,255,0.65)" letterSpacing="1">Inteligente</text>
    </svg>
  );
};

export default AutomatikusLogo;
