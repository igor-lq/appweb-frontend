import { useState } from "react";
import { Trash2 } from "lucide-react";
import "./ConfirmDeleteButton.css";

interface ConfirmDeleteButtonProps {
  onConfirm: () => void;
  title?: string;
}

/** Clique 1: arma a confirmação (ícone/tooltip mudam pra vermelho). Clique 2: confirma.
    Perde o foco (onBlur): cancela. Mesmo padrão de exclusão inline usado em listas na V1. */
export function ConfirmDeleteButton({ onConfirm, title = "Excluir" }: ConfirmDeleteButtonProps) {
  const [armado, setArmado] = useState(false);

  return (
    <button
      type="button"
      className={`btn btn-icon confirm-delete${armado ? " confirm-delete--armed" : ""}`}
      title={armado ? "Clique de novo pra confirmar" : title}
      onClick={() => (armado ? onConfirm() : setArmado(true))}
      onBlur={() => setArmado(false)}
    >
      <Trash2 size={14} strokeWidth={1.5} />
    </button>
  );
}
