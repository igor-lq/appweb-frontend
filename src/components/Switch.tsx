import { Check, X } from "lucide-react";
import "./Switch.css";

interface SwitchProps {
  /** true = estado "ligado" (verde, marca d'água de check). false = "desligado" (vermelho, X). */
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}

export function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`switch${checked ? " switch--on" : " switch--off"}`}
      onClick={onChange}
    >
      <span className="switch-watermark">
        {checked ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
      </span>
      <span className="switch-thumb" />
    </button>
  );
}
