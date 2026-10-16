import { useEffect, useState } from "react";
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { conexoesApi, type ConexaoApi } from "../../api/conexoes";
import { analysisServerApi, temDeployPendente, type ModeloTabularApi } from "../../api/analysisServer";
import type { EventoLog } from "../../api/types";
import { Dialog } from "../../components/Dialog";
import "./ModeloSemanticoShell.css";

interface ClienteContext {
  cliente?: Cliente;
}

export interface ModeloSemanticoContext {
  cliente?: Cliente;
  conexaoId: string | null;
  conexao: ConexaoApi | null;
  modelo: ModeloTabularApi | null;
  recarregarModelo: () => void;
}

/** Um cliente pode ter várias Conexões Analysis Services agora (cada uma tipo="Analysis Services",
    seu próprio Modelo Semântico) — o seletor ao lado do título decide qual delas está sendo
    vista/editada. A própria Conexao faz o papel do que antes era "ConfiguracaoModeloTabular"
    (tem `ultima_alteracao_em`/`ultimo_deploy_em` pra gatear o botão Deploy). */
export function ModeloSemanticoShell() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [conexoesAs, setConexoesAs] = useState<ConexaoApi[]>([]);
  const [conexaoId, setConexaoId] = useState<string | null>(null);
  const [modelo, setModelo] = useState<ModeloTabularApi | null>(null);
  const [carregandoConexoes, setCarregandoConexoes] = useState(true);
  const [carregandoModelo, setCarregandoModelo] = useState(true);
  const [deployando, setDeployando] = useState(false);
  const [eventos, setEventos] = useState<EventoLog[]>([]);
  const [logAberto, setLogAberto] = useState(false);

  function recarregarConexoes() {
    if (!cliente) return;
    conexoesApi.listar(cliente.id).then((lista) => {
      const as = lista.filter((c) => c.tipo === "Analysis Services");
      setConexoesAs(as);
      setConexaoId((atual) => (atual && as.some((c) => c.id === atual) ? atual : (as[0]?.id ?? null)));
      setCarregandoConexoes(false);
    });
  }

  useEffect(recarregarConexoes, [cliente]);

  const conexao = conexoesAs.find((c) => c.id === conexaoId) ?? null;

  function recarregarModelo() {
    if (!cliente || !conexaoId) {
      setModelo(null);
      setCarregandoModelo(false);
      return;
    }
    setCarregandoModelo(true);
    analysisServerApi
      .obterModelo(cliente.id, conexaoId)
      .then(setModelo)
      .catch(() => setModelo(null))
      .finally(() => setCarregandoModelo(false));
    // Toda alteração no modelo (tabela/medida/relacionamento) marca `ultima_alteracao_em` na
    // Conexao — recarrega o estado da Conexao junto pra o botão Deploy refletir isso na hora,
    // sem precisar sair/entrar na página (bug real corrigido aqui).
    recarregarConexoes();
  }

  useEffect(recarregarModelo, [cliente, conexaoId]);

  async function deploy() {
    if (!cliente || !conexaoId) return;
    setDeployando(true);
    setEventos([]);
    setLogAberto(true);
    await analysisServerApi.deploy(cliente.id, conexaoId, (ev) => setEventos((atual) => [...atual, ev]));
    setDeployando(false);
    recarregarModelo();
  }

  const pendente = temDeployPendente(conexao);
  const carregando = carregandoConexoes || carregandoModelo;

  return (
    <div className="tab-shell-page">
      <div className="tab-shell-header">
        <div className="tab-shell-header-top">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div className="kicker">{cliente?.nome ?? "Cliente"}</div>
              <h2>Modelo Semântico</h2>
            </div>
            {conexoesAs.length > 0 && (
              <select
                className="modelo-semantico-conexao-select"
                value={conexaoId ?? ""}
                onChange={(e) => setConexaoId(e.target.value)}
              >
                {conexoesAs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button className="btn btn-primary" onClick={deploy} disabled={!pendente || deployando || carregando}>
              {deployando ? "Fazendo deploy..." : "Deploy"}
            </button>
            {!carregandoConexoes && conexoesAs.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12 }}>
                Nenhuma Conexão Analysis Services cadastrada — crie uma na aba Conexões.
              </div>
            )}
            {!logAberto && eventos.length > 0 && (
              <button className="btn btn-secondary btn-block" onClick={() => setLogAberto(true)}>
                Log do Deploy
              </button>
            )}
          </div>
        </div>
        <nav className="tab-shell-subnav">
          <NavLink
            to="medidas"
            className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
          >
            Medidas
          </NavLink>
          <NavLink
            to="relacionamentos"
            className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
          >
            Relacionamentos
          </NavLink>
          <NavLink
            to="roles"
            className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
          >
            Roles
          </NavLink>
        </nav>
      </div>
      <div className="tab-shell-content">
        <Outlet context={{ cliente, conexaoId, conexao, modelo, recarregarModelo } satisfies ModeloSemanticoContext} />
      </div>

      {logAberto && (
        <Dialog
          title="Fazendo Deploy do Modelo Semântico"
          onClose={() => {}}
          wide
          className="tasks-log-dialog"
          actions={
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button
                type="button"
                className={`btn ${deployando ? "btn-secondary" : "btn-primary"}`}
                onClick={() => setLogAberto(false)}
              >
                {deployando ? "Fechar" : "Concluído"}
              </button>
            </div>
          }
        >
          <div className="tasks-log-lista">
            {eventos.length === 0 && <div className="text-muted">Iniciando...</div>}
            {eventos.map((ev, i) => (
              <div key={i} className="acao-feedback" style={ev.nivel === "erro" ? { color: "var(--color-danger-text)" } : undefined}>
                {ev.mensagem}
              </div>
            ))}
          </div>
        </Dialog>
      )}
    </div>
  );
}
