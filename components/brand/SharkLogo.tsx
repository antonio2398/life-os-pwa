// Logo Shark Life: dos aletas que forman una S; el espacio entre ellas es la línea del agua.
// Fuente maestra: branding/logo/shark-life-symbol-on-dark.svg

const FIN_TOP = "M0 88C22 44 84 8 178 0C147 28 139 60 153 88Z";
const FIN_BOTTOM = "M184 102C162 146 100 182 6 190C37 162 45 130 31 102Z";

export function SharkSymbol({ size = 32, className = "", tone = "dark" }: {
  size?: number;
  className?: string;
  /** "dark" para fondos oscuros (por defecto), "light" para fondos claros */
  tone?: "dark" | "light";
}) {
  const [top, bottom] = tone === "dark" ? ["#2CC7D5", "#0B7F8F"] : ["#0B7F8F", "#2CC7D5"];
  return (
    <svg viewBox="0 0 184 190" width={size} height={size * (190 / 184)} className={className} role="img" aria-label="Shark Life">
      <path fill={top} d={FIN_TOP} />
      <path fill={bottom} d={FIN_BOTTOM} />
    </svg>
  );
}

export function SharkLogo({ size = 28, subtitle, className = "" }: {
  size?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SharkSymbol size={size} />
      <div className="leading-tight">
        <div className="font-bold text-white tracking-tight" style={{ fontSize: size * 0.62 }}>Shark Life</div>
        {subtitle && <div className="text-[11px] text-ocean-400 tracking-wide">{subtitle}</div>}
      </div>
    </div>
  );
}
