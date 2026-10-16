import { Dialog } from "./Dialog";

interface ConfirmarExclusaoModalProps {
  titulo: string;
  mensagem: string;
  onClose: () => void;
  onConfirmar: () => void;
}

/** Popup de confirmação antes de excluir uma Task/Fluxo (pedido explícito do usuário — diferente
    do padrão "clique duas vezes" de `ConfirmDeleteButton`, usado noutras listas do app). Excluir
    um NÓ do canvas de Fluxo continua sem confirmação nenhuma (nunca precisou); excluir Cliente
    (Opções do Cliente) também continua com o padrão próprio já validado — nenhum dos dois usa
    este componente. */
export function ConfirmarExclusaoModal({ titulo, mensagem, onClose, onConfirmar }: ConfirmarExclusaoModalProps) {
  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirmar}>
            Excluir
          </button>
        </div>
      }
    >
      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{mensagem}</p>
    </Dialog>
  );
}
