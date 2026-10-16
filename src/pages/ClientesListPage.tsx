import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clientesApi, type ClienteApi } from "../api/clientes";
import { ApiError } from "../api/client";
import { responsaveisApi, type ResponsavelApi } from "../api/responsaveis";
import { Tag } from "../components/Tag";
import { Dialog } from "../components/Dialog";
import "./ClientesListPage.css";

const STATUS_API_PARA_TAG: Record<ClienteApi["status"], "ativo" | "atenção" | "pausado"> = {
  ativo: "ativo",
  bloqueado: "atenção",
  inativo: "pausado",
};

function NovoClienteModal({ onClose, onCriado }: { onClose: () => void; onCriado: (c: ClienteApi) => void }) {
  const [nome, setNome] = useState("");
  const [label, setLabel] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const cliente = await clientesApi.criar({ nome, label: label || nome });
      onCriado(cliente);
      onClose();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar cliente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title="Novo cliente"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={!nome.trim() || enviando}>
            {enviando ? "Criando..." : "Criar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="cl-nome">Nome</label>
        <input className="input" id="cl-nome" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
      </div>
      <div className="field">
        <label htmlFor="cl-label">Label (opcional — deriva do nome)</label>
        <input className="input" id="cl-label" value={label} onChange={(e) => setLabel(e.target.value)} />
      </div>
      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}

export function ClientesListPage() {
  const [clientes, setClientes] = useState<ClienteApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [query, setQuery] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | undefined>();
  const [modalNovo, setModalNovo] = useState(false);
  const navigate = useNavigate();

  function recarregar() {
    setCarregando(true);
    clientesApi
      .listar()
      .then((lista) => {
        setClientes(lista);
        setSelecionadoId((atual) => atual ?? lista[0]?.id);
      })
      .finally(() => setCarregando(false));
  }

  useEffect(recarregar, []);

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => c.nome.toLowerCase().includes(q));
  }, [clientes, query]);

  const cliente = filtrados.find((c) => c.id === selecionadoId) ?? filtrados[0];

  const [responsaveis, setResponsaveis] = useState<ResponsavelApi[]>([]);
  useEffect(() => {
    if (!cliente) {
      setResponsaveis([]);
      return;
    }
    responsaveisApi.listar(cliente.id).then(setResponsaveis);
  }, [cliente?.id]);
  const responsavelPrincipal = responsaveis.find((r) => r.principal) ?? responsaveis[0];

  return (
    <div className="clientes-page">
      <div className="clientes-header">
        <div>
          <div className="kicker">Cadastro</div>
          <h2>Clientes</h2>
        </div>
        <div className="clientes-actions">
          <button className="btn btn-primary" onClick={() => setModalNovo(true)}>
            + Novo cliente
          </button>
        </div>
      </div>

      <div className="clientes-body">
        <div className="clientes-list scroll">
          <input
            className="input clientes-search"
            placeholder="Buscar cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {carregando && <div className="text-muted">Carregando...</div>}
          {!carregando &&
            filtrados.map((c) => (
              <div
                key={c.id}
                className={`card clientes-item${c.id === cliente?.id ? " is-selected" : ""}`}
                onClick={() => setSelecionadoId(c.id)}
              >
                <div className="clientes-item-info">
                  <div className="clientes-item-nome">{c.nome}</div>
                  <div className="text-muted clientes-item-meta">{c.label_interna}</div>
                </div>
                <Tag status={STATUS_API_PARA_TAG[c.status]} />
                <button
                  className="btn btn-secondary clientes-item-abrir"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/clientes/${c.id}/visao-geral`);
                  }}
                >
                  Abrir
                </button>
              </div>
            ))}
          {!carregando && filtrados.length === 0 && <div className="text-muted">Nenhum cliente encontrado.</div>}
        </div>

        {cliente && (
          <aside className="clientes-detalhes scroll">
            <div className="card-kicker">Detalhes do cliente</div>
            <div className="clientes-detalhes-nome">{cliente.nome}</div>
            <div className="clientes-detalhes-status">
              <Tag status={STATUS_API_PARA_TAG[cliente.status]} />
            </div>

            <div className="clientes-detalhes-campos">
              {[
                ["Responsável", responsavelPrincipal?.nome ?? "— nenhum cadastrado"],
                ["Contato", responsavelPrincipal?.email ?? "—"],
                ["Label interna", cliente.label_interna],
                ["Git", cliente.git_url ?? "— não vinculado"],
              ].map(([label, value]) => (
                <div className="clientes-campo" key={label}>
                  <span className="text-muted">{label}</span>
                  <span className="clientes-campo-valor">{value}</span>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary btn-block"
              style={{ marginTop: 16 }}
              onClick={() => navigate(`/clientes/${cliente.id}/visao-geral`)}
            >
              Abrir cliente
            </button>
          </aside>
        )}
      </div>

      {modalNovo && (
        <NovoClienteModal
          onClose={() => setModalNovo(false)}
          onCriado={(c) => {
            setClientes((atual) => [...atual, c]);
            setSelecionadoId(c.id);
          }}
        />
      )}
    </div>
  );
}
