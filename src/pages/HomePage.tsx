import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { dashboardApi, type DashboardApi } from "../api/dashboard";
import "./HomePage.css";

function formatarDataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

export function HomePage() {
  const navigate = useNavigate();
  const [dados, setDados] = useState<DashboardApi | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    dashboardApi
      .obter()
      .then(setDados)
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="kicker">Painel</div>
        <h2>Início</h2>
      </div>

      {carregando || !dados ? (
        <div className="home-loading text-muted">Carregando...</div>
      ) : (
        <>
          <div className="home-stats">
            <div className="card home-stat">
              <div className="card-kicker">Clientes ativos</div>
              <div className="home-stat-value">{dados.clientes_ativos}</div>
            </div>
            <div className="card home-stat">
              <div className="card-kicker">Usuários logados agora</div>
              <div className="home-stat-value">{dados.usuarios_logados_agora}</div>
            </div>
          </div>

          <div className="home-blocks">
            <div className="card home-block">
              <div className="card-kicker">Clientes com trava</div>
              {dados.clientes_com_trava.length === 0 ? (
                <div className="text-muted home-block-empty">Nenhum cliente travado no momento.</div>
              ) : (
                <div className="home-block-list">
                  {dados.clientes_com_trava.map((c) => (
                    <button
                      key={c.cliente_id}
                      type="button"
                      className="home-block-row"
                      onClick={() => navigate(`/clientes/${c.cliente_id}/visao-geral`)}
                    >
                      <span className="home-block-row-title">{c.cliente_nome}</span>
                      <span className="home-block-row-meta">
                        travado por {c.usuario_nome} · {formatarDataHora(c.lock_data_hora)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card home-block">
              <div className="card-kicker">Conexões com falha</div>
              {dados.conexoes_com_falha.length === 0 ? (
                <div className="text-muted home-block-empty">Nenhuma conexão com falha registrada.</div>
              ) : (
                <div className="home-block-list">
                  {dados.conexoes_com_falha.map((c, i) => (
                    <button
                      key={`${c.cliente_id}-${c.conexao_nome}-${i}`}
                      type="button"
                      className="home-block-row"
                      onClick={() => navigate(`/clientes/${c.cliente_id}/conexoes`)}
                    >
                      <span className="home-block-row-title">
                        {c.cliente_nome} — {c.conexao_nome}
                      </span>
                      <span className="home-block-row-meta home-block-row-meta--danger">
                        {c.mensagem || "Falha na verificação"}
                      </span>
                      <span className="home-block-row-meta">
                        verificado em {formatarDataHora(c.ultima_verificacao)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card home-block">
              <div className="card-kicker">Git pendente de publicar</div>
              {dados.clientes_git_pendente.length === 0 ? (
                <div className="text-muted home-block-empty">Nenhum cliente com alteração pendente.</div>
              ) : (
                <div className="home-block-list">
                  {dados.clientes_git_pendente.map((c) => (
                    <button
                      key={c.cliente_id}
                      type="button"
                      className="home-block-row"
                      onClick={() => navigate(`/clientes/${c.cliente_id}/git`)}
                    >
                      <span className="home-block-row-title">{c.cliente_nome}</span>
                      <span className="home-block-row-meta">
                        {c.arquivos_pendentes} arquivo(s) pendente(s)
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
