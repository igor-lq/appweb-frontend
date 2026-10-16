import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { consultasApi, nomeInternoConsultaApi, ROTULO_CATEGORIA_CONSULTA, type ConsultaApi } from "../../api/consultas";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { SqlView } from "../../components/SqlView";
import { ConsultaModal } from "./ConsultaModal";
import "./ConsultasTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

export function ConsultasTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [consultas, setConsultas] = useState<ConsultaApi[]>([]);
  const [query, setQuery] = useState("");
  const [selecionada, setSelecionada] = useState(0);
  const [modal, setModal] = useState<"nova" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  function recarregar() {
    if (!cliente) return;
    consultasApi.listar(cliente.id).then(setConsultas);
  }

  useEffect(recarregar, [cliente]);

  async function excluirConsulta(id: string) {
    if (!cliente) return;
    await consultasApi.excluir(cliente.id, id);
    setConsultas((atual) => atual.filter((c) => c.id !== id));
    setSelecionada(0);
    setExcluindo(false);
  }

  const filtradas = consultas.filter((c) =>
    nomeInternoConsultaApi(c.categoria, c.nome).toLowerCase().includes(query.trim().toLowerCase()),
  );
  const consulta = consultas[selecionada];

  return (
    <div className="consultas-page">
      <div className="consultas-header">
        <div>
          <div className="kicker">{cliente?.nome ?? "Cliente"}</div>
          <div className="consultas-title">Consultas (SQL)</div>
        </div>
        <div className="consultas-actions">
          <button className="btn btn-primary" onClick={() => setModal("nova")}>
            + Nova consulta
          </button>
        </div>
      </div>

      <div className="consultas-body">
        <div className="consultas-list scroll">
          <input
            className="input consultas-search"
            placeholder="Buscar consulta"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtradas.map((c) => {
            const idx = consultas.indexOf(c);
            const linhas = (c.sql_texto ?? "").split("\n").length;
            return (
              <div
                key={c.id}
                className={`card consultas-item${idx === selecionada ? " is-selected" : ""}`}
                onClick={() => setSelecionada(idx)}
              >
                <div className="consultas-item-nome">{nomeInternoConsultaApi(c.categoria, c.nome)}</div>
                <div className="text-muted consultas-item-meta">
                  {ROTULO_CATEGORIA_CONSULTA[c.categoria]}
                  <span className="meta-sep">·</span>
                  {linhas} {linhas === 1 ? "linha" : "linhas"}
                </div>
              </div>
            );
          })}
          {filtradas.length === 0 && <div className="text-muted">Nenhuma consulta encontrada.</div>}
        </div>

        {consulta && (
          <aside className="consultas-detalhes scroll">
            <div className="card-kicker">Detalhes da consulta</div>
            <div className="consultas-detalhes-nome">{nomeInternoConsultaApi(consulta.categoria, consulta.nome)}</div>
            <div className="text-muted consultas-detalhes-meta">
              {ROTULO_CATEGORIA_CONSULTA[consulta.categoria]} · Nome: {consulta.nome}
            </div>

            <div className="code-block consultas-sql-bloco scroll">
              <SqlView sql={consulta.sql_texto ?? ""} />
            </div>

            <div className="detail-actions-row detail-actions-row--end" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setModal("editar")}>
                Editar
              </button>
              <BotaoExcluir onClick={() => setExcluindo(true)} />
            </div>
          </aside>
        )}
      </div>

      {modal && cliente && (
        <ConsultaModal
          titulo={modal === "nova" ? "Nova consulta" : "Editar consulta"}
          clienteId={cliente.id}
          consulta={modal === "editar" ? consulta : undefined}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregar();
          }}
        />
      )}

      {excluindo && consulta && (
        <ConfirmarExclusaoModal
          titulo="Excluir Consulta"
          mensagem={`Tem certeza que deseja excluir a consulta "${nomeInternoConsultaApi(consulta.categoria, consulta.nome)}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => excluirConsulta(consulta.id)}
        />
      )}
    </div>
  );
}
