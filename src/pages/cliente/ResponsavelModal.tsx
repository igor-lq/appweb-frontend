import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ApiError } from "../../api/client";
import { responsaveisApi, type ResponsavelApi } from "../../api/responsaveis";

interface ResponsavelModalProps {
  titulo: string;
  clienteId: string;
  responsavel?: ResponsavelApi;
  onClose: () => void;
  onSalvar: () => void;
}

export function ResponsavelModal({ titulo, clienteId, responsavel, onClose, onSalvar }: ResponsavelModalProps) {
  const [nome, setNome] = useState(responsavel?.nome ?? "");
  const [email, setEmail] = useState(responsavel?.email ?? "");
  const [celular, setCelular] = useState(responsavel?.celular ?? "");
  const [cargo, setCargo] = useState(responsavel?.cargo ?? "");
  const [principal, setPrincipal] = useState(responsavel?.principal ?? false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim() && email.trim();

  async function salvar() {
    setErro(null);
    setEnviando(true);
    const payload = { nome: nome.trim(), email: email.trim(), celular: celular.trim() || null, cargo: cargo.trim() || null, principal };
    try {
      if (responsavel) {
        await responsaveisApi.atualizar(clienteId, responsavel.id, payload);
      } else {
        await responsaveisApi.criar(clienteId, payload);
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar responsável.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={!podeSalvar || enviando}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="resp-nome">Nome</label>
        <input className="input" id="resp-nome" placeholder="Ana Ferreira" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label htmlFor="resp-email">E-mail</label>
        <input className="input" id="resp-email" type="email" placeholder="ana.ferreira@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="resp-celular">Celular</label>
          <input className="input" id="resp-celular" placeholder="(00) 90000-0000" value={celular} onChange={(e) => setCelular(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="resp-cargo">Cargo</label>
          <input className="input" id="resp-cargo" placeholder="Analista de BI" value={cargo} onChange={(e) => setCargo(e.target.value)} />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
        <input type="checkbox" checked={principal} onChange={(e) => setPrincipal(e.target.checked)} />
        Responsável principal
      </label>
      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
