import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { estrategiasApi, resumoEstrategiaApi, ROTULO_TIPO_ESTRATEGIA, type EstrategiaApi } from "../../api/estrategias";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { EstrategiaModal } from "./EstrategiaModal";
import "./EstrategiasTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

export function EstrategiasTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [estrategias, setEstrategias] = useState<EstrategiaApi[]>([]);
  const [query, setQuery] = useState("");
  const [selecionada, setSelecionada] = useState(0);
  const [modal, setModal] = useState<"nova" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  function recarregar() {
    if (!cliente) return;
    estrategiasApi.listar(cliente.id).then(setEstrategias);
  }

  useEffect(recarregar, [cliente]);

  async function excluirEstrategia(id: string) {
    if (!cliente) return;
    await estrategiasApi.excluir(cliente.id, id);
    setEstrategias((atual) => atual.filter((e) => e.id !== id));
    setSelecionada(0);
    setExcluindo(false);
  }

  const filtradas = estrategias.filter((e) => e.nome.toLowerCase().includes(query.trim().toLowerCase()));
  const estrategia = estrategias[selecionada];

  return (
    <div className="estrategias-page">
      <div className="estrategias-header">
        <div>
          <div className="kicker">{cliente?.nome ?? "Cliente"}</div>
          <div className="estrategias-title">Estratégias de atualização</div>
        </div>
        <div className="estrategias-actions">
          <button className="btn btn-primary" onClick={() => setModal("nova")}>
            + Nova estratégia
          </button>
        </div>
      </div>

      <div className="estrategias-body">
        <div className="estrategias-list scroll">
          <input
            className="input estrategias-search"
            placeholder="Buscar estratégia"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtradas.map((e) => {
            const idx = estrategias.indexOf(e);
            return (
              <div
                key={e.id}
                className={`card estrategias-item${idx === selecionada ? " is-selected" : ""}`}
                onClick={() => setSelecionada(idx)}
              >
                <div className="estrategias-item-nome">{e.nome}</div>
                <div className="text-muted estrategias-item-meta">
                  {ROTULO_TIPO_ESTRATEGIA[e.tipo]}
                  {resumoEstrategiaApi(e) && (
                    <>
                      <span className="meta-sep">·</span>
                      {resumoEstrategiaApi(e)}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {filtradas.length === 0 && <div className="text-muted">Nenhuma estratégia encontrada.</div>}
        </div>

        {estrategia && (
          <aside className="estrategias-detalhes scroll">
            <div className="card-kicker">Detalhes da estratégia</div>
            <div className="estrategias-detalhes-nome">{estrategia.nome}</div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              {ROTULO_TIPO_ESTRATEGIA[estrategia.tipo]}
            </div>

            <div className="estrategias-detalhes-campos">
              {estrategia.tipo === "reprocessamento_recente" && (
                <>
                  <div className="estrategias-campo">
                    <span className="text-muted">Unidade</span>
                    <span>{estrategia.unidade_janela}</span>
                  </div>
                  <div className="estrategias-campo">
                    <span className="text-muted">Quantidade</span>
                    <span>{estrategia.quantidade_janela}</span>
                  </div>
                </>
              )}
              {estrategia.tipo === "full_por_periodo" && (
                <>
                  <div className="estrategias-campo">
                    <span className="text-muted">Data inicial</span>
                    <span>{estrategia.data_inicial}</span>
                  </div>
                  <div className="estrategias-campo">
                    <span className="text-muted">Data final</span>
                    <span>{estrategia.data_final}</span>
                  </div>
                  <div className="estrategias-campo">
                    <span className="text-muted">Segmentação</span>
                    <span>
                      a cada {estrategia.quantidade_segmentacao} {estrategia.unidade_segmentacao}
                    </span>
                  </div>
                </>
              )}
              {estrategia.tipo === "upsert" && (
                <div className="estrategias-campo">
                  <span className="text-muted">Chaves de Upsert</span>
                  <span>{(estrategia.chaves_upsert ?? []).join(", ") || "—"}</span>
                </div>
              )}
              {(estrategia.tipo === "substituicao" || estrategia.tipo === "incremental") && (
                <div className="estrategias-campo">
                  <span className="text-muted">Configuração</span>
                  <span>Sem campos adicionais</span>
                </div>
              )}
            </div>

            <div className="detail-actions">
              <div className="detail-actions-row">
                <button className="btn btn-secondary" onClick={() => setModal("editar")}>
                  Editar
                </button>
                <BotaoExcluir onClick={() => setExcluindo(true)} />
              </div>
            </div>
          </aside>
        )}
      </div>

      {modal && cliente && (
        <EstrategiaModal
          titulo={modal === "nova" ? "Nova estratégia" : "Editar estratégia"}
          clienteId={cliente.id}
          estrategia={modal === "editar" ? estrategia : undefined}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregar();
          }}
        />
      )}

      {excluindo && estrategia && (
        <ConfirmarExclusaoModal
          titulo="Excluir Estratégia"
          mensagem={`Tem certeza que deseja excluir a estratégia "${estrategia.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => excluirEstrategia(estrategia.id)}
        />
      )}
    </div>
  );
}
