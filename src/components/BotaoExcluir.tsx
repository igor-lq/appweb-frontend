import { Trash2 } from "lucide-react";

interface BotaoExcluirProps {
  onClick: () => void;
  /** Default "Excluir" — trocar só quando o rótulo precisa dizer o quê (ex.: "Excluir pacote"). */
  texto?: string;
  /** Classes extras (ex.: "btn-block" nos painéis largos, mesmo padrão de outros botões). */
  className?: string;
  disabled?: boolean;
}

/** Botão padrão de exclusão do projeto — texto "Excluir" + ícone de lixeira, sempre abrindo um
    popup de confirmação (nunca excluindo direto, nunca só com o padrão "clique duas vezes").
    Único gatilho; a confirmação em si é `ConfirmarExclusaoModal`, que cada tela abre com seu
    próprio título/mensagem. Duas exceções ao padrão, deliberadas — NÃO usar este componente
    nelas: excluir um nó do canvas de Fluxo (só o "x", sem confirmação nenhuma) e Excluir Cliente
    (fluxo próprio, já validado, em Opções do Cliente). */
export function BotaoExcluir({ onClick, texto = "Excluir", className, disabled }: BotaoExcluirProps) {
  return (
    <button
      type="button"
      className={`btn btn-danger${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Trash2 size={14} strokeWidth={1.5} />
      {texto}
    </button>
  );
}
