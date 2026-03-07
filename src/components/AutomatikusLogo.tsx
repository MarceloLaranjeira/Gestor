import { cn } from "@/lib/utils";

interface AutomatikusLogoProps {
  variant?: "full" | "icon";
  className?: string;
  iconSize?: number;
}

/**
 * Automatikus brand logo — Automações Digitais
 * Gradient: purple #5B21B6 → blue #2563EB
 */
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
        aria-label="Automatikus"
      >
        <defs>
          <linearGradient id="atk-bg-icon" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#5B21B6" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#atk-bg-icon)" />
        {/* Network dots — bottom-right accent */}
        <circle cx="48" cy="52" r="2" fill="rgba(255,255,255,0.25)" />
        <circle cx="54" cy="46" r="1.5" fill="rgba(255,255,255,0.2)" />
        <circle cx="42" cy="56" r="1.5" fill="rgba(255,255,255,0.2)" />
        <line x1="48" y1="52" x2="54" y2="46" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <line x1="48" y1="52" x2="42" y2="56" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        {/* A letter */}
        <text
          x="32"
          y="44"
          fontFamily="Arial, sans-serif"
          fontWeight="700"
          fontSize="34"
          fill="white"
          textAnchor="middle"
          dominantBaseline="auto"
        >
          A
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 320 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full", className)}
      aria-label="Automatikus — Automações Digitais"
    >
      <defs>
        <linearGradient id="atk-bg-full" x1="0" y1="0" x2="320" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B21B6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect width="320" height="100" rx="16" fill="url(#atk-bg-full)" />

      {/* Network / wave pattern — bottom right */}
      <circle cx="290" cy="85" r="3" fill="rgba(255,255,255,0.2)" />
      <circle cx="308" cy="72" r="2" fill="rgba(255,255,255,0.18)" />
      <circle cx="275" cy="90" r="2" fill="rgba(255,255,255,0.15)" />
      <circle cx="302" cy="90" r="1.5" fill="rgba(255,255,255,0.12)" />
      <circle cx="315" cy="82" r="1.5" fill="rgba(255,255,255,0.1)" />
      <line x1="290" y1="85" x2="308" y2="72" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="290" y1="85" x2="275" y2="90" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="290" y1="85" x2="302" y2="90" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line x1="308" y1="72" x2="315" y2="82" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

      {/* "Auto" — regular weight */}
      <text x="24" y="58" fontFamily="Arial, Helvetica, sans-serif" fontWeight="400" fontSize="32" fill="white">
        Auto
      </text>
      {/* "mati" — bold */}
      <text x="100" y="58" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="32" fill="white">
        mati
      </text>
      {/* "kus" — regular weight */}
      <text x="172" y="58" fontFamily="Arial, Helvetica, sans-serif" fontWeight="400" fontSize="32" fill="white">
        kus
      </text>

      {/* Subtitle */}
      <text x="24" y="76" fontFamily="Arial, Helvetica, sans-serif" fontWeight="400" fontSize="11" fill="rgba(255,255,255,0.65)" letterSpacing="3">
        AUTOMAÇÕES DIGITAIS
      </text>
    </svg>
  );
};

export default AutomatikusLogo;
