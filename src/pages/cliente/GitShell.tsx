import { useEffect, useState } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { ApiError } from "../../api/client";
import { BRANCH_ETL, gitApi, nomeBranchModeloTabular, type RepositorioInfoApi } from "../../api/git";
import { conexoesApi, type ConexaoApi } from "../../api/conexoes";
import "./GitShell.css";

interface ClienteContext {
  cliente?: Cliente;
}

export function GitShell() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [vinculando, setVinculando] = useState(false);
  const [urlVinculo, setUrlVinculo] = useState("");
  const [repositorio, setRepositorio] = useState<RepositorioInfoApi | null>(null);
  const [conexoesAs, setConexoesAs] = useState<ConexaoApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendenciaPorBranch, setPendenciaPorBranch] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!cliente) return;
    setCarregando(true);
    gitApi
      .obterRepositorio(cliente.id)
      .then(setRepositorio)
      .catch(() => setRepositorio({ vinculado: false, url: null }))
      .finally(() => setCarregando(false));
    conexoesApi.listar(cliente.id).then((lista) => setConexoesAs(lista.filter((c) => c.tipo === "Analysis Services")));
    gitApi
      .pendencias(cliente.id)
      .then((lista) => setPendenciaPorBranch(Object.fromEntries(lista.map((p) => [p.branch, p.pendente]))))
      .catch(() => setPendenciaPorBranch({}));
  }, [cliente]);

  if (!cliente || carregando) return null;

  async function criarRepositorio() {
    setErro(null);
    setEnviando(true);
    try {
      const resultado = await gitApi.criarRepositorio(cliente!.id);
      setRepositorio({ vinculado: true, url: resultado.url });
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar repositório.");
    } finally {
      setEnviando(false);
    }
  }

  async function vincularRepositorio() {
    setErro(null);
    setEnviando(true);
    try {
      const resultado = await gitApi.vincularRepositorio(cliente!.id, urlVinculo.trim());
      setRepositorio({ vinculado: true, url: resultado.url });
      setVinculando(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao vincular repositório.");
    } finally {
      setEnviando(false);
    }
  }

  if (!repositorio?.vinculado) {
    return (
      <div className="tab-shell-page">
        <div className="tab-shell-header">
          <div className="kicker">{cliente.nome}</div>
          <h2>Versionamento</h2>
        </div>
        <div className="git-nao-vinculado">
          {!vinculando ? (
            <div className="card git-nao-vinculado-card">
              <div className="card-kicker">Repositório não vinculado</div>
              <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.55 }}>
                Este cliente ainda não tem um repositório Git configurado.
              </p>
              {erro && (
                <div className="text-danger" style={{ fontSize: 13 }}>
                  {erro}
                </div>
              )}
              <div className="detail-actions-row">
                <button className="btn btn-primary" disabled={enviando} onClick={criarRepositorio}>
                  Criar repositório
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={enviando}
                  onClick={() => {
                    setErro(null);
                    setVinculando(true);
                  }}
                >
                  Vincular repositório
                </button>
              </div>
            </div>
          ) : (
            <div className="card git-nao-vinculado-card">
              <div className="card-kicker">Vincular repositório</div>
              <div className="field">
                <label htmlFor="git-url">URL do repositório</label>
                <input
                  className="input"
                  id="git-url"
                  placeholder="git@gitlab.internal:etl/..."
                  value={urlVinculo}
                  onChange={(e) => setUrlVinculo(e.target.value)}
                />
              </div>
              {erro && (
                <div className="text-danger" style={{ fontSize: 13 }}>
                  {erro}
                </div>
              )}
              <div className="detail-actions-row">
                <button
                  className="btn btn-secondary"
                  disabled={enviando}
                  onClick={() => {
                    setErro(null);
                    setVinculando(false);
                  }}
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!urlVinculo.trim() || enviando}
                  onClick={vincularRepositorio}
                >
                  Vincular
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tab-shell-page">
      <div className="tab-shell-header">
        <div className="kicker">{cliente.nome}</div>
        <h2>Versionamento</h2>
        <nav className="tab-shell-subnav">
          <NavLink
            to="prj-python"
            className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
          >
            ETL (prj_python)
            {pendenciaPorBranch[BRANCH_ETL] && <span className="sidebar-item-badge" title="Commits pendentes" />}
          </NavLink>
          {conexoesAs
            .filter((c) => c.chave)
            .map((c) => (
              <NavLink
                key={c.id}
                to={c.chave as string}
                className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
              >
                Modelo Tabular ({c.nome})
                {pendenciaPorBranch[nomeBranchModeloTabular(c.chave as string)] && (
                  <span className="sidebar-item-badge" title="Commits pendentes" />
                )}
              </NavLink>
            ))}
        </nav>
      </div>
      <div className="tab-shell-content">
        <Outlet context={{ cliente, repositorioUrl: repositorio.url }} />
      </div>
    </div>
  );
}
