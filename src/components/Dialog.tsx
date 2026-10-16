import type { ReactNode } from "react";
import "./Dialog.css";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
  /** Modal mais largo — usar só quando o conteúdo precisa (ex.: editor de SQL). */
  wide?: boolean;
  /** Classe extra no elemento `.dialog` — usar quando UM modal específico precisa de um
      ajuste próprio (largura diferente, estilo de campo) sem afetar `.dialog--wide` global. */
  className?: string;
}

export function Dialog({ title, onClose, children, actions, wide, className }: DialogProps) {
  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className={`dialog${wide ? " dialog--wide" : ""}${className ? ` ${className}` : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title">{title}</div>
        <div className="dialog-body scroll">{children}</div>
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}
