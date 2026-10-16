import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ApiError } from "../../api/client";
import { analysisServerApi } from "../../api/analysisServer";

interface InstanciaAsModalProps {
  onClose: () => void;
  onSalvar: () => void;
}

/** Cadastro de uma nova Instância Analysis Services (Windows Agent) — sem edição depois de
    criada (backend não tem PATCH pra isso, mesmo limite de hoje pra InstanciaAS). "Testar" só
    existe depois de salva (painel de detalhes), já que o teste bate no `/instancias-as/{id}/
    testar-conexao`, que precisa de um id real. */
export function InstanciaAsModal({ onClose, onSalvar }: InstanciaAsModalProps) {
  const [nome, setNome] = useState("");
  const [host, setHost] = useState("");
  const [porta, setPorta] = useState("8500");
  const [token, setToken] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim() && host.trim() && porta.trim() && token.trim();

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      await analysisServerApi.criarInstancia({ nome, host, porta, token });
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar instância.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title="Nova instância Analysis Services"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!podeSalvar || enviando} onClick={salvar}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="ias-nome">Nome</label>
        <input
          className="input"
          id="ias-nome"
          placeholder="Servidor Analysis 01"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="ias-host">Host</label>
          <input
            className="input"
            id="ias-host"
            placeholder="100.x.x.x (IP Tailscale do PC)"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="ias-porta">Porta</label>
          <input className="input" id="ias-porta" placeholder="8500" value={porta} onChange={(e) => setPorta(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ias-token">Token</label>
        <input className="input" id="ias-token" value={token} onChange={(e) => setToken(e.target.value)} />
        <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
          Mesmo token configurado em <span className="opcoes-mono">windows-agent/config.json</span> dessa máquina.
        </div>
      </div>

      {erro && (
        <div className="acao-feedback" style={{ color: "var(--color-danger-text)" }}>
          {erro}
        </div>
      )}
    </Dialog>
  );
}
