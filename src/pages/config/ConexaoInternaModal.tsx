import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ApiError } from "../../api/client";
import { conexoesInternasApi, type ConexaoInternaApi } from "../../api/conexoesInternas";

interface ConexaoInternaModalProps {
  /** Presente = edição de uma conexão existente. Ausente = cadastro novo. */
  conexao?: ConexaoInternaApi;
  onClose: () => void;
  onSalvar: () => void;
}

export function ConexaoInternaModal({ conexao, onClose, onSalvar }: ConexaoInternaModalProps) {
  const [nome, setNome] = useState(conexao?.nome ?? "");
  const tipo = "Postgres" as const;
  const [host, setHost] = useState(conexao?.host ?? "");
  const [porta, setPorta] = useState(conexao?.porta ?? "5432");
  const [usuario, setUsuario] = useState(conexao?.usuario ?? "");
  const [senha, setSenha] = useState(conexao?.senha ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [testeOk, setTesteOk] = useState(false);

  const podeSalvar = nome.trim() && host.trim() && usuario.trim();
  const podeTestar = host.trim() && usuario.trim();

  async function testar() {
    setTestando(true);
    setResultadoTeste(null);
    try {
      const resultado = await conexoesInternasApi.testarAvulsa({ host, porta, usuario, senha });
      setTesteOk(resultado.ok);
      setResultadoTeste(
        resultado.ok
          ? `Conexão OK — ${resultado.databases?.length ?? 0} database(s) encontrado(s).`
          : (resultado.mensagem ?? "Falha ao conectar."),
      );
    } catch (e) {
      setTesteOk(false);
      setResultadoTeste(e instanceof ApiError ? e.message : "Falha ao conectar.");
    } finally {
      setTestando(false);
    }
  }

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const payload = { nome, tipo, host, porta, usuario, senha };
      if (conexao) {
        await conexoesInternasApi.atualizar(conexao.id, payload);
      } else {
        await conexoesInternasApi.criar(payload);
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={conexao ? "Editar conexão interna" : "Nova conexão interna"}
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
        <label htmlFor="ci-tipo">Tipo</label>
        <select className="input" id="ci-tipo" value={tipo} disabled>
          <option value="Postgres">Postgres</option>
        </select>
        <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
          Oracle e outros tipos de servidor: em breve.
        </div>
      </div>
      <div className="field">
        <label htmlFor="ci-nome">Nome</label>
        <input className="input" id="ci-nome" placeholder="srv_dw_02" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="ci-host">Host</label>
          <input className="input" id="ci-host" placeholder="10.0.9.11" value={host} onChange={(e) => setHost(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="ci-porta">Porta</label>
          <input className="input" id="ci-porta" placeholder="5432" value={porta} onChange={(e) => setPorta(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ci-usuario">Usuário</label>
        <input className="input" id="ci-usuario" placeholder="app_admin" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="ci-senha">Senha</label>
        <input className="input" id="ci-senha" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>

      <div className="detail-actions" style={{ marginTop: 4 }}>
        <button className="btn btn-secondary btn-block" onClick={testar} disabled={!podeTestar || testando}>
          {testando ? "Testando..." : "Testar conexão"}
        </button>
        {resultadoTeste && (
          <div className="acao-feedback" style={!testeOk ? { color: "var(--color-danger-text)" } : undefined}>
            {resultadoTeste}
          </div>
        )}
        {erro && (
          <div className="acao-feedback" style={{ color: "var(--color-danger-text)" }}>
            {erro}
          </div>
        )}
      </div>
    </Dialog>
  );
}
