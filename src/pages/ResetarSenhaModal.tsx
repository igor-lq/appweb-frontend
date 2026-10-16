import { useState } from "react";
import { Dialog } from "../components/Dialog";
import { ApiError } from "../api/client";
import { usuariosApi } from "../api/usuarios";

interface ResetarSenhaModalProps {
  usuarioId: string;
  nomeUsuario: string;
  onClose: () => void;
  onConfirmar: () => void;
}

export function ResetarSenhaModal({ usuarioId, nomeUsuario, onClose, onConfirmar }: ResetarSenhaModalProps) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const preenchidas = novaSenha.length > 0 && confirmarSenha.length > 0;
  const divergentes = preenchidas && novaSenha !== confirmarSenha;

  async function confirmar() {
    setErro(null);
    setEnviando(true);
    try {
      await usuariosApi.resetarSenha(usuarioId, novaSenha);
      onConfirmar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao resetar senha.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={`Resetar senha de ${nomeUsuario}`}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!preenchidas || divergentes || enviando} onClick={confirmar}>
            {enviando ? "Alterando..." : "Alterar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="rs-nova">Nova senha</label>
        <input
          className="input"
          id="rs-nova"
          type="password"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      <div className="field">
        <label htmlFor="rs-confirmar">Confirmar nova senha</label>
        <input
          className="input"
          id="rs-confirmar"
          type="password"
          value={confirmarSenha}
          onChange={(e) => setConfirmarSenha(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      {divergentes && (
        <div className="text-muted" style={{ color: "var(--color-danger-text)", fontSize: 12.5 }}>
          As senhas não coincidem.
        </div>
      )}
      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
      <div className="text-muted" style={{ fontSize: 12 }}>
        O Administrador escolhe a senha e a repassa ao usuário — o usuário é obrigado a trocá-la
        no próximo login.
      </div>
    </Dialog>
  );
}
