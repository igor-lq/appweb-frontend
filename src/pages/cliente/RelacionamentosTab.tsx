import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RelacionamentoModal } from "./RelacionamentoModal";
import { analysisServerApi } from "../../api/analysisServer";
import { ApiError } from "../../api/client";
import { Switch } from "../../components/Switch";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import type { ModeloSemanticoContext } from "./ModeloSemanticoShell";
import "./RelacionamentosTab.css";

export function RelacionamentosTab() {
  const { cliente, conexaoId, modelo, recarregarModelo } = useOutletContext<ModeloSemanticoContext>();
  const relacionamentos = modelo?.relacionamentos ?? [];
  const tabelas = modelo?.tabelas ?? [];
  const [query, setQuery] = useState("");
  const [selecionado, setSelecionado] = useState(0);
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [alternando, setAlternando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!cliente || !conexaoId) return null;

  const filtrados = relacionamentos.filter((r) =>
    `${r.tabela_de} ${r.tabela_para}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const relacionamento = relacionamentos[selecionado];

  async function alternarAtivo() {
    if (!relacionamento) return;
    setErro(null);
    setAlternando(true);
    try {
      await analysisServerApi.editarRelacionamento(cliente!.id, conexaoId!, relacionamento.nome, {
        ativo: !relacionamento.ativo,
      });
      recarregarModelo();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao alternar o relacionamento.");
    } finally {
      setAlternando(false);
    }
  }

  async function excluir() {
    if (!relacionamento) return;
    setErro(null);
    try {
      await analysisServerApi.excluirRelacionamento(cliente!.id, conexaoId!, relacionamento.nome);
      setSelecionado(0);
      setExcluindo(false);
      recarregarModelo();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao excluir relacionamento.");
      setExcluindo(false);
    }
  }

  return (
    <div className="relacionamentos-page">
      <div className="relacionamentos-toolbar">
        <div />
        <button className="btn btn-primary" onClick={() => setModal("novo")}>
          + Novo relacionamento
        </button>
      </div>

      <div className="relacionamentos-body">
        <div className="relacionamentos-lista scroll">
          <input
            className="input relacionamentos-search"
            placeholder="Buscar relacionamento"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtrados.map((r) => {
            const idx = relacionamentos.indexOf(r);
            return (
              <div
                key={r.nome}
                className={`card relacionamentos-item${idx === selecionado ? " is-selected" : ""}`}
                onClick={() => {
                  setSelecionado(idx);
                  setErro(null);
                }}
              >
                <div className="relacionamentos-item-nome">
                  {r.tabela_de}
                  <span className="opcoes-mono">[{r.coluna_de}]</span> → {r.tabela_para}
                  <span className="opcoes-mono">[{r.coluna_para}]</span>
                  {!r.ativo && (
                    <span className="text-muted" style={{ fontSize: 11, marginLeft: 6 }}>
                      (inativo)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {relacionamentos.length === 0 && <div className="text-muted">Nenhum relacionamento criado.</div>}
          {relacionamentos.length > 0 && filtrados.length === 0 && (
            <div className="text-muted">Nenhum relacionamento encontrado.</div>
          )}
        </div>

        {relacionamento && (
          <aside className="relacionamentos-detalhes scroll">
            <div className="card-kicker">Detalhes do relacionamento</div>
            <div className="relacionamentos-detalhes-titulo">{relacionamento.nome}</div>

            <div className="relacionamentos-detalhes-campos">
              <div className="relacionamentos-campo">
                <span className="text-muted">Tabela 1</span>
                <span className="opcoes-mono">
                  {relacionamento.tabela_de}[{relacionamento.coluna_de}]
                </span>
              </div>
              <div className="relacionamentos-campo">
                <span className="text-muted">Tabela 2</span>
                <span className="opcoes-mono">
                  {relacionamento.tabela_para}[{relacionamento.coluna_para}]
                </span>
              </div>
              <div className="relacionamentos-campo">
                <span className="text-muted">Cardinalidade</span>
                <span className="opcoes-mono">
                  {relacionamento.cardinalidade_de === "um" ? "1" : "N"}:{relacionamento.cardinalidade_para === "um" ? "1" : "N"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              <Switch checked={relacionamento.ativo} onChange={alternarAtivo} disabled={alternando} />
              <span>{relacionamento.ativo ? "Ativo" : "Desativado"}</span>
            </div>

            <div className="detail-actions-row" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setModal("editar")}>
                Editar
              </button>
              <BotaoExcluir onClick={() => setExcluindo(true)} />
            </div>

            {erro && (
              <div className="text-danger" style={{ fontSize: 13, marginTop: 8 }}>
                {erro}
              </div>
            )}
          </aside>
        )}
      </div>

      {modal && (
        <RelacionamentoModal
          titulo={modal === "novo" ? "Novo relacionamento" : "Editar relacionamento"}
          clienteId={cliente.id}
          conexaoId={conexaoId}
          tabelas={tabelas}
          relacionamento={modal === "editar" ? relacionamento : undefined}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregarModelo();
          }}
        />
      )}

      {excluindo && relacionamento && (
        <ConfirmarExclusaoModal
          titulo="Excluir Relacionamento"
          mensagem={`Tem certeza que deseja excluir o relacionamento "${relacionamento.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={excluir}
        />
      )}
    </div>
  );
}
