import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { GripVertical, ArrowLeft } from "lucide-react";
import type { Cliente } from "../../mocks/clientes";
import { dagsApi, type DagApi, type PacoteDagItemApi } from "../../api/dags";
import { pacotesApi, type PacoteApi } from "../../api/pacotes";
import { configApi } from "../../api/config";
import { ApiError } from "../../api/client";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { Switch } from "../../components/Switch";
import { DagModal } from "./DagModal";
import { SelecionarPacoteModal } from "./SelecionarPacoteModal";
import "./DagsTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

export function DagsTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [dags, setDags] = useState<DagApi[]>([]);
  const [pacotes, setPacotes] = useState<PacoteApi[]>([]);
  const [airflowUrl, setAirflowUrl] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dagAbertoNome, setDagAbertoNome] = useState<string | null>(null);
  const [modal, setModal] = useState<"nova" | "editar" | null>(null);
  const [modalPacote, setModalPacote] = useState(false);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function recarregar() {
    if (!cliente) return;
    dagsApi.listar(cliente.id).then(setDags);
  }

  useEffect(recarregar, [cliente]);
  useEffect(() => {
    if (cliente) pacotesApi.listar(cliente.id).then(setPacotes);
  }, [cliente]);
  useEffect(() => {
    configApi.obter().then((c) => setAirflowUrl(c.airflow_url));
  }, []);

  if (!cliente) return null;
  const clienteId = cliente.id;

  const dagAberto = dags.find((d) => d.nome === dagAbertoNome) ?? null;

  async function excluirDag(nome: string) {
    await dagsApi.excluir(clienteId, nome);
    setDags((atual) => atual.filter((d) => d.nome !== nome));
    setDagAbertoNome(null);
    setExcluindo(false);
  }

  // `DagUpdate` sempre substitui a lista inteira de pacotes (mesma semântica de
  // tasks/tabelas_analysis_server em Pacotes) — por isso todo save reenvia nome/schedule/
  // description/start_date junto, nunca só o que mudou.
  async function salvarPacotes(alvo: DagApi, pacotesAtuais: PacoteDagItemApi[]) {
    setErro(null);
    try {
      const atualizado = await dagsApi.atualizar(clienteId, alvo.nome, {
        pacotes: pacotesAtuais,
        schedule: alvo.schedule,
        description: alvo.description,
        start_date: alvo.start_date,
      });
      setDags((atual) => atual.map((d) => (d.nome === alvo.nome ? atualizado : d)));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao atualizar a DAG.");
    }
  }

  function alternarAtivoPacote(index: number) {
    if (!dagAberto) return;
    const proximas = dagAberto.pacotes.map((p, i) => (i === index ? { ...p, ativo: !p.ativo } : p));
    salvarPacotes(dagAberto, proximas);
  }

  const filtradas = dags.filter((d) => d.nome.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="dags-page">
      <div className="dags-header">
        <div>
          <div className="kicker">{cliente.nome}</div>
          <div className="dags-title">DAGs</div>
        </div>
        <div className="dags-actions">
          <a
            className="btn btn-ghost"
            href={airflowUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!airflowUrl}
            onClick={(e) => {
              if (!airflowUrl) e.preventDefault();
            }}
          >
            Abrir painel do Airflow ↗
          </a>
          {!dagAberto && (
            <button className="btn btn-primary" onClick={() => setModal("nova")}>
              + Novo DAG
            </button>
          )}
        </div>
      </div>

      <div className="dags-body">
        <div className="dags-list scroll">
          {!dagAberto ? (
            <>
              <input
                className="input dags-search"
                placeholder="Buscar DAG"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {filtradas.map((d) => (
                <div key={d.nome} className="card dags-item" onClick={() => setDagAbertoNome(d.nome)}>
                  <div className="dags-item-nome">{d.nome}</div>
                  <div className="text-muted dags-item-meta">
                    {d.pacotes.length} {d.pacotes.length === 1 ? "pacote" : "pacotes"}
                    <span className="meta-sep">·</span>
                    {d.schedule}
                  </div>
                </div>
              ))}
              {filtradas.length === 0 && <div className="text-muted">Nenhum DAG encontrado.</div>}
            </>
          ) : (
            <>
              <div className="dags-drill-header">
                <button className="dags-voltar" onClick={() => setDagAbertoNome(null)}>
                  <ArrowLeft size={14} strokeWidth={1.5} />
                  DAGs
                </button>
                <button className="btn btn-primary" onClick={() => setModalPacote(true)}>
                  + Adicionar Pacote
                </button>
              </div>
              <div className="card-kicker" style={{ margin: "4px 0 6px" }}>
                Pacotes (ordem de execução)
              </div>
              {dagAberto.pacotes.map((p, index) => (
                <div
                  key={`${p.nome}-${index}`}
                  className={`card dags-pacote-item${arrastando === index ? " dags-pacote-item--arrastando" : ""}`}
                  draggable
                  onDragStart={() => setArrastando(index)}
                  onDragEnd={() => setArrastando(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (arrastando === null || arrastando === index) return;
                    const proximas = [...dagAberto.pacotes];
                    const [movido] = proximas.splice(arrastando, 1);
                    proximas.splice(index, 0, movido);
                    salvarPacotes(dagAberto, proximas);
                    setArrastando(null);
                  }}
                >
                  <GripVertical size={15} strokeWidth={1.5} className="dags-pacote-grip" />
                  <span className="dags-pacote-ordem">{index + 1}</span>
                  <span className="dags-pacote-nome">{p.nome}</span>
                  <Switch checked={p.ativo} onChange={() => alternarAtivoPacote(index)} />
                </div>
              ))}
              {dagAberto.pacotes.length === 0 && <div className="text-muted">Nenhum pacote nesta DAG.</div>}
            </>
          )}
        </div>

        {dagAberto && (
          <aside className="dags-detalhes scroll">
            <div className="card-kicker">DAG</div>
            <div className="dags-detalhes-nome">{dagAberto.nome}</div>
            {dagAberto.description && <div className="text-muted dags-detalhes-descricao">{dagAberto.description}</div>}

            <div className="dags-detalhes-campos">
              <div className="dags-campo">
                <span className="text-muted">Schedule</span>
                <span className="opcoes-mono">{dagAberto.schedule}</span>
              </div>
              <div className="dags-campo">
                <span className="text-muted">Início</span>
                <span>{dagAberto.start_date}</span>
              </div>
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

      {erro && <div className="text-danger" style={{ padding: "0 20px", fontSize: 13 }}>{erro}</div>}

      {modal && (
        <DagModal
          titulo={modal === "nova" ? "Novo DAG" : "Editar DAG"}
          clienteId={clienteId}
          dag={modal === "editar" ? (dagAberto ?? undefined) : undefined}
          pacotesDisponiveis={pacotes}
          onClose={() => setModal(null)}
          onSalvar={(nome) => {
            setModal(null);
            recarregar();
            if (modal === "nova") setDagAbertoNome(nome);
          }}
        />
      )}

      {modalPacote && dagAberto && (
        <SelecionarPacoteModal
          pacotes={pacotes}
          jaSelecionados={dagAberto.pacotes.map((p) => p.nome)}
          onClose={() => setModalPacote(false)}
          onConfirmar={(nomes) => {
            const nomesSelecionados = new Set(nomes);
            const mantidos = dagAberto.pacotes.filter((p) => nomesSelecionados.has(p.nome));
            const nomesJaPresentes = new Set(mantidos.map((p) => p.nome));
            const novos = nomes.filter((n) => !nomesJaPresentes.has(n)).map((n) => ({ nome: n, ativo: true }));
            salvarPacotes(dagAberto, [...mantidos, ...novos]);
            setModalPacote(false);
          }}
        />
      )}

      {excluindo && dagAberto && (
        <ConfirmarExclusaoModal
          titulo="Excluir DAG"
          mensagem={`Tem certeza que deseja excluir o DAG "${dagAberto.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => excluirDag(dagAberto.nome)}
        />
      )}
    </div>
  );
}
