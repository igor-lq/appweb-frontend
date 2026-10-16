import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { analysisServerApi, type InstanciaASApi } from "../../api/analysisServer";
import { InstanciaAsModal } from "./InstanciaAsModal";
import "../cliente/ConexoesTab.css";
import "./ConfigPage.css";

export function InstanciasAsTab() {
  const [instancias, setInstancias] = useState<InstanciaASApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionada, setSelecionada] = useState(0);
  const [modalNova, setModalNova] = useState(false);

  const [adicionandoBanco, setAdicionandoBanco] = useState(false);
  const [novoBanco, setNovoBanco] = useState("");
  const [erroBanco, setErroBanco] = useState<string | null>(null);
  const [criandoBanco, setCriandoBanco] = useState(false);

  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [testeOk, setTesteOk] = useState(false);

  function recarregar() {
    setCarregando(true);
    analysisServerApi
      .listarInstancias()
      .then(setInstancias)
      .finally(() => setCarregando(false));
  }

  useEffect(recarregar, []);

  const instancia = instancias[selecionada];

  async function testarInstancia() {
    if (!instancia) return;
    setTestando(true);
    setResultadoTeste(null);
    try {
      const resultado = await analysisServerApi.testarInstancia(instancia.id);
      setTesteOk(resultado.ok);
      setResultadoTeste(
        resultado.ok
          ? `Conexão OK — ${resultado.databases?.length ?? 0} database(s) encontrada(s).`
          : (resultado.mensagem ?? "Falha ao conectar."),
      );
      if (resultado.ok) recarregar();
    } catch (e) {
      setTesteOk(false);
      setResultadoTeste(e instanceof ApiError ? e.message : "Falha ao conectar.");
    } finally {
      setTestando(false);
    }
  }

  async function confirmarNovoBanco() {
    if (!instancia) return;
    const nome = novoBanco.trim();
    if (!nome) return;
    setErroBanco(null);
    setCriandoBanco(true);
    try {
      await analysisServerApi.criarBanco(instancia.id, nome);
      setNovoBanco("");
      setAdicionandoBanco(false);
      recarregar();
    } catch (e) {
      setErroBanco(e instanceof ApiError ? e.message : "Falha ao criar banco.");
    } finally {
      setCriandoBanco(false);
    }
  }

  if (carregando) return null;

  return (
    <div className="conexoes-page">
      <div className="conexoes-header">
        <div>
          <div className="kicker">Administração</div>
          <div className="conexoes-title">Instâncias Analysis Services</div>
        </div>
        <div className="conexoes-actions">
          <button className="btn btn-primary" onClick={() => setModalNova(true)}>
            + Nova instância
          </button>
        </div>
      </div>
      <div className="text-muted" style={{ fontSize: 12.5, padding: "10px 28px 0" }}>
        Cada instância aponta pra um Windows Agent (host/porta/token) — cadastradas uma única vez
        aqui, os clientes só escolhem a instância + a database dentro dela na aba Conexões.
      </div>

      <div className="conexoes-body">
        <div className="conexoes-list scroll">
          {instancias.map((i, idx) => (
            <div
              key={i.id}
              className={`card conexoes-item${idx === selecionada ? " is-selected" : ""}`}
              onClick={() => {
                setSelecionada(idx);
                setResultadoTeste(null);
                setAdicionandoBanco(false);
                setErroBanco(null);
              }}
            >
              <div className="conexoes-item-nome">{i.nome}</div>
              <div className="text-muted conexoes-item-meta">
                {i.host}:{i.porta}
              </div>
            </div>
          ))}
          {instancias.length === 0 && <div className="text-muted">Nenhuma instância cadastrada.</div>}
        </div>

        {instancia && (
          <aside className="conexoes-detalhes scroll">
            <div className="card-kicker">Detalhes da instância</div>
            <div className="conexoes-detalhes-nome">{instancia.nome}</div>

            <div className="conexoes-detalhes-campos">
              {([
                ["Host", instancia.host],
                ["Porta", instancia.porta],
                ["Token", instancia.token],
              ] as [string, string][]).map(([label, value]) => (
                <div className="conexoes-campo" key={label}>
                  <span className="text-muted">{label}</span>
                  <span className="conexoes-campo-valor">{value}</span>
                </div>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn btn-secondary btn-block" onClick={testarInstancia} disabled={testando}>
                {testando ? "Testando..." : "Testar instância"}
              </button>
              {resultadoTeste && (
                <div className="acao-feedback" style={!testeOk ? { color: "var(--color-danger-text)" } : undefined}>
                  {resultadoTeste}
                </div>
              )}
            </div>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="card-kicker">Bancos (databases)</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {instancia.databases.map((b) => (
                <div className="config-banco-chip" key={b.id} style={{ width: "fit-content" }}>
                  {b.nome}
                </div>
              ))}
              {instancia.databases.length === 0 && (
                <div className="text-muted" style={{ fontSize: 12.5 }}>Nenhum banco ainda.</div>
              )}

              {adicionandoBanco ? (
                <div className="config-banco-add">
                  <input
                    className="input"
                    placeholder="ModeloVendas"
                    value={novoBanco}
                    onChange={(e) => setNovoBanco(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && confirmarNovoBanco()}
                  />
                  <button className="btn btn-secondary" onClick={confirmarNovoBanco} disabled={criandoBanco}>
                    {criandoBanco ? "Criando..." : "Criar"}
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

      {modalNova && (
        <InstanciaAsModal
          onClose={() => setModalNova(false)}
          onSalvar={() => {
            setModalNova(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
