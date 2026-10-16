import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { conexoesApi, resumoConexaoApi, type ConexaoApi } from "../../api/conexoes";
import { conexoesInternasApi, type ConexaoInternaApi } from "../../api/conexoesInternas";
import { analysisServerApi, type InstanciaASApi } from "../../api/analysisServer";
import type { EventoLog } from "../../api/types";
import { Tag } from "../../components/Tag";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { ConexaoModal } from "./ConexaoModal";
import "./ConexoesTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

const STATUS_API_PARA_TAG: Record<ConexaoApi["status_verificacao"], "ativa" | "atenção" | "inativa"> = {
  ok: "ativa",
  falha: "atenção",
  pendente: "inativa",
};

function camposExibicaoConexaoApi(
  c: ConexaoApi,
  conexoesInternas: ConexaoInternaApi[],
  instanciasAs: InstanciaASApi[],
): [string, string][] {
  if (c.tipo === "Analysis Services") {
    for (const instancia of instanciasAs) {
      const banco = instancia.databases.find((d) => d.id === c.database_as_id);
      if (banco) return [["Organização", c.organizacao], ["Nome da Instância", instancia.nome], ["Nome do Banco", banco.nome]];
    }
    return [["Organização", c.organizacao], ["Instância/Banco", "— não configurado"]];
  }
  if (c.organizacao === "Interno") {
    for (const servidor of conexoesInternas) {
      const banco = servidor.bancos.find((b) => b.id === c.banco_interno_id);
      if (banco) return [["Organização", "Interno"], ["Conexão interna", servidor.nome], ["Banco", banco.nome]];
    }
    return [["Organização", "Interno"], ["Banco", "— não configurado"]];
  }
  if (c.tipo === "PostgreSQL" || c.tipo === "Oracle" || c.tipo === "SQL Server") {
    return [
      ["Tipo", c.tipo],
      ["Host", c.host ?? "—"],
      ["Porta", c.porta ?? "—"],
      ["Banco", c.banco ?? "—"],
      ["Usuário", c.usuario ?? "—"],
      ["Senha", c.senha ?? "—"],
    ];
  }
  if (c.tipo === "Excel") return [["Tipo", c.tipo], ["URL", c.link_planilha ?? "—"]];
  return [
    ["Tipo", c.tipo],
    ["URL base", c.base_url ?? "—"],
    ["Token", c.token ?? "—"],
    ["Header", c.header ?? "—"],
  ];
}

export function ConexoesTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [conexoes, setConexoes] = useState<ConexaoApi[]>([]);
  const [conexoesInternas, setConexoesInternas] = useState<ConexaoInternaApi[]>([]);
  const [instanciasAs, setInstanciasAs] = useState<InstanciaASApi[]>([]);
  const [query, setQuery] = useState("");
  const [selecionada, setSelecionada] = useState(0);
  const [modal, setModal] = useState<"nova" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [testando, setTestando] = useState(false);
  const [eventosTest, setEventosTest] = useState<EventoLog[]>([]);

  function recarregar() {
    if (!cliente) return;
    conexoesApi.listar(cliente.id).then(setConexoes);
    conexoesInternasApi.listar().then(setConexoesInternas);
    analysisServerApi.listarInstancias().then(setInstanciasAs);
  }

  useEffect(recarregar, [cliente]);

  async function excluirConexao(id: string) {
    if (!cliente) return;
    await conexoesApi.excluir(cliente.id, id);
    setConexoes((atual) => atual.filter((c) => c.id !== id));
    setSelecionada(0);
    setExcluindo(false);
  }

  async function testarConexao(id: string) {
    if (!cliente) return;
    setTestando(true);
    setEventosTest([]);
    await conexoesApi.testar(cliente.id, id, (evento) => setEventosTest((atual) => [...atual, evento]));
    setTestando(false);
    recarregar();
  }

  const filtradas = conexoes.filter((c) => c.nome.toLowerCase().includes(query.trim().toLowerCase()));
  const conn = conexoes[selecionada];

  return (
    <div className="conexoes-page">
      <div className="conexoes-header">
        <div>
          <div className="kicker">{cliente?.nome ?? "Cliente"}</div>
          <div className="conexoes-title">Conexões</div>
        </div>
        <div className="conexoes-actions">
          <button className="btn btn-primary" onClick={() => setModal("nova")}>
            + Nova conexão
          </button>
        </div>
      </div>

      <div className="conexoes-body">
        <div className="conexoes-list scroll">
          <input
            className="input conexoes-search"
            placeholder="Buscar conexão"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtradas.map((c) => {
            const idx = conexoes.indexOf(c);
            return (
              <div
                key={c.id}
                className={`card conexoes-item${idx === selecionada ? " is-selected" : ""}`}
                onClick={() => {
                  setSelecionada(idx);
                  setEventosTest([]);
                }}
              >
                <div className="conexoes-item-nome">{c.nome}</div>
                <div className="conexoes-item-row">
                  <div className="text-muted conexoes-item-meta">
                    {c.tipo}
                    <span className="meta-sep">·</span>
                    {resumoConexaoApi(c)}
                  </div>
                  <Tag status={STATUS_API_PARA_TAG[c.status_verificacao]} />
                </div>
              </div>
            );
          })}
          {filtradas.length === 0 && <div className="text-muted">Nenhuma conexão encontrada.</div>}
        </div>

        {conn && (
          <aside className="conexoes-detalhes scroll">
            <div className="card-kicker">Detalhes da conexão</div>
            <div className="conexoes-detalhes-nome">{conn.nome}</div>
            <div className="conexoes-detalhes-status">
              <Tag status={STATUS_API_PARA_TAG[conn.status_verificacao]} />
              {conn.mensagem_verificacao && (
                <span className="text-muted" style={{ fontSize: 12 }}>
                  {conn.mensagem_verificacao}
                </span>
              )}
            </div>

            <div className="conexoes-detalhes-campos">
              {camposExibicaoConexaoApi(conn, conexoesInternas, instanciasAs).map(([label, value]) => (
                <div className="conexoes-campo" key={label}>
                  <span className="text-muted">{label}</span>
                  <span className="conexoes-campo-valor">{value}</span>
                </div>
              ))}
            </div>

            <div className="detail-actions">
              <button className="btn btn-secondary btn-block" onClick={() => testarConexao(conn.id)} disabled={testando}>
                {testando ? "Testando..." : "Testar conexão"}
              </button>
              {eventosTest.map((ev, i) => (
                <div key={i} className="acao-feedback" style={ev.nivel === "erro" ? { color: "var(--color-danger-text)" } : undefined}>
                  {ev.mensagem}
                </div>
              ))}
              {conn.tipo === "Excel" && conn.abas_disponiveis && conn.abas_disponiveis.length > 0 && (
                <div className="acao-feedback">{conn.abas_disponiveis.length} Abas disponíveis</div>
              )}
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
        <ConexaoModal
          titulo={modal === "nova" ? "Nova conexão" : "Editar conexão"}
          clienteId={cliente.id}
          clienteLabelInterna={cliente.labelInterna}
          conexao={modal === "editar" ? conn : undefined}
          conexoesExistentes={conexoes}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregar();
          }}
        />
      )}

      {excluindo && conn && (
        <ConfirmarExclusaoModal
          titulo="Excluir Conexão"
          mensagem={`Tem certeza que deseja excluir a conexão "${conn.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => excluirConexao(conn.id)}
        />
      )}
    </div>
  );
}
