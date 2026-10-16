import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { conexoesInternasApi, type ConexaoInternaApi } from "../../api/conexoesInternas";
import { ConexaoInternaModal } from "./ConexaoInternaModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import "../cliente/ConexoesTab.css";
import "./ConfigPage.css";

export function ConexoesInternasTab() {
  const [conexoes, setConexoes] = useState<ConexaoInternaApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState(0);
  const [modal, setModal] = useState<"nova" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const [adicionandoBanco, setAdicionandoBanco] = useState(false);
  const [novoBanco, setNovoBanco] = useState("");
  const [erroBanco, setErroBanco] = useState<string | null>(null);

  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [testeOk, setTesteOk] = useState(false);

  const [atualizando, setAtualizando] = useState(false);

  function recarregar() {
    setCarregando(true);
    conexoesInternasApi
      .listar()
      .then(setConexoes)
      .finally(() => setCarregando(false));
  }

  useEffect(recarregar, []);

  const conn = conexoes[selecionada];

  async function testarConexaoSalva() {
    if (!conn) return;
    setTestando(true);
    setResultadoTeste(null);
    try {
      const resultado = await conexoesInternasApi.testar(conn.id);
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

  async function atualizarBancos() {
    if (!conn) return;
    setAtualizando(true);
    try {
      await conexoesInternasApi.atualizarBancos(conn.id);
      recarregar();
    } finally {
      setAtualizando(false);
    }
  }

  async function confirmarNovoBanco() {
    if (!conn) return;
    const nome = novoBanco.trim();
    if (!nome) return;
    setErroBanco(null);
    try {
      await conexoesInternasApi.criarBanco(conn.id, nome);
      setNovoBanco("");
      setAdicionandoBanco(false);
      recarregar();
    } catch (e) {
      setErroBanco(e instanceof ApiError ? e.message : "Falha ao criar banco.");
    }
  }

  async function excluirConexao() {
    if (!conn) return;
    setErroExcluir(null);
    try {
      await conexoesInternasApi.excluir(conn.id);
      setExcluindo(false);
      setSelecionada(0);
      recarregar();
    } catch (e) {
      setErroExcluir(e instanceof ApiError ? e.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  if (carregando) return null;

  return (
    <div className="conexoes-page">
      <div className="conexoes-header">
        <div>
          <div className="kicker">Administração</div>
          <div className="conexoes-title">Conexões internas</div>
        </div>
        <div className="conexoes-actions">
          <button className="btn btn-primary" onClick={() => setModal("nova")}>
            + Nova conexão interna
          </button>
        </div>
      </div>
      <div className="text-muted" style={{ fontSize: 12.5, padding: "10px 28px 0" }}>
        Cadastradas uma única vez aqui e reaproveitadas por todos os clientes como "Conexão
        Interna" — cada cliente só escolhe o banco dentro do servidor.
      </div>

      <div className="conexoes-body">
        <div className="conexoes-list scroll">
          {conexoes.map((c, idx) => (
            <div
              key={c.id}
              className={`card conexoes-item${idx === selecionada ? " is-selected" : ""}`}
              onClick={() => {
                setSelecionada(idx);
                setResultadoTeste(null);
                setAdicionandoBanco(false);
                setErroExcluir(null);
              }}
            >
              <div className="conexoes-item-nome">{c.nome}</div>
              <div className="text-muted conexoes-item-meta">
                {c.host}:{c.porta}
                <span className="meta-sep">·</span>
                {c.usuario}
              </div>
            </div>
          ))}
          {conexoes.length === 0 && <div className="text-muted">Nenhuma conexão interna cadastrada.</div>}
        </div>

        {conn && (
          <aside className="conexoes-detalhes scroll">
            <div className="card-kicker">Detalhes da conexão</div>
            <div className="conexoes-detalhes-nome">{conn.nome}</div>

            <div className="conexoes-detalhes-campos">
              {([
                ["Tipo", conn.tipo],
                ["Host", conn.host],
                ["Porta", conn.porta],
                ["Usuário", conn.usuario],
                ["Senha", conn.senha],
              ] as [string, string][]).map(([label, value]) => (
                <div className="conexoes-campo" key={label}>
                  <span className="text-muted">{label}</span>
                  <span className="conexoes-campo-valor">{value}</span>
                </div>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn btn-secondary btn-block" onClick={testarConexaoSalva} disabled={testando}>
                {testando ? "Testando..." : "Testar conexão"}
              </button>
              {resultadoTeste && (
                <div className="acao-feedback" style={!testeOk ? { color: "var(--color-danger-text)" } : undefined}>
                  {resultadoTeste}
                </div>
              )}
              <div className="detail-actions-row">
                <button className="btn btn-secondary" onClick={() => setModal("editar")} disabled={atualizando}>
                  Editar
                </button>
                <BotaoExcluir onClick={() => setExcluindo(true)} disabled={atualizando} />
              </div>
              {erroExcluir && (
                <div className="acao-feedback" style={{ color: "var(--color-danger-text)" }}>
                  {erroExcluir}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="card-kicker">Bancos</div>
              <button
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: "3px 8px" }}
                onClick={atualizarBancos}
                disabled={atualizando || excluindo}
              >
                {atualizando ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {conn.bancos.map((b) => (
                <div className="config-banco-chip" key={b.id} style={{ width: "fit-content" }}>
                  {b.nome}
                </div>
              ))}
              {conn.bancos.length === 0 && <div className="text-muted" style={{ fontSize: 12.5 }}>Nenhum banco ainda.</div>}

              {adicionandoBanco ? (
                <div className="config-banco-add">
                  <input
                    className="input"
                    placeholder="dw_novo_cliente"
                    value={novoBanco}
                    onChange={(e) => setNovoBanco(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && confirmarNovoBanco()}
                  />
                  <button className="btn btn-secondary" onClick={confirmarNovoBanco}>
                    Adicionar
                  </button>
                </div>
              ) : (
                <button
                  className="btn btn-ghost config-banco-add-btn"
                  style={{ width: "fit-content" }}
                  onClick={() => {
                    setAdicionandoBanco(true);
                    setNovoBanco("");
                  }}
                >
                  + banco
                </button>
              )}
            </div>
            {erroBanco && (
              <div className="acao-feedback" style={{ color: "var(--color-danger-text)" }}>
                {erroBanco}
              </div>
            )}
          </aside>
        )}
      </div>

      {modal && (
        <ConexaoInternaModal
          conexao={modal === "editar" ? conn : undefined}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregar();
          }}
        />
      )}

      {excluindo && conn && (
        <ConfirmarExclusaoModal
          titulo="Excluir Conexão Interna"
          mensagem={`Tem certeza que deseja excluir a conexão "${conn.nome}"? Só é possível se nenhum cliente ainda usa um banco dela.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={excluirConexao}
        />
      )}
    </div>
  );
}
