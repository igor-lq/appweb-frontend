import type { CSSProperties } from "react";
import { PauseCircle, TriangleAlert } from "lucide-react";

export type Status = "ativo" | "ativa" | "atenção" | "pausado" | "inativa";

interface BadgeConfig {
  style: CSSProperties;
  icon: typeof TriangleAlert;
  iconColor?: string;
}

/** "ativo"/"ativa" não tem entrada aqui de propósito — é o caminho feliz, não precisa de tag
    chamando atenção. Só os níveis de atenção (atenção, pausado/inativa) recebem badge. */
const BADGE: Partial<Record<Status, BadgeConfig>> = {
  "atenção": {
    style: { color: "var(--color-danger-text)", background: "color-mix(in srgb, var(--color-danger-border) 14%, transparent)" },
    icon: TriangleAlert,
    iconColor: "var(--color-warning-icon)",
  },
  pausado: {
    style: { color: "var(--color-neutral-700)", background: "var(--color-neutral-200)" },
    icon: PauseCircle,
  },
  inativa: {
    style: { color: "var(--color-neutral-700)", background: "var(--color-neutral-200)" },
    icon: PauseCircle,
  },
};

/** Badge com ícone — usar para status dentro de listas/painéis de detalhe (nunca clicável).
    Não renderiza nada para "ativo"/"ativa": só chama atenção quando há algo a notar. */
export function Tag({ status }: { status: Status }) {
  const cfg = BADGE[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <span className="tag" style={cfg.style}>
      <Icon size={11} strokeWidth={2} style={cfg.iconColor ? { color: cfg.iconColor } : undefined} />
      {status}
    </span>
  );
}
