import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { GripVertical, ArrowLeft } from "lucide-react";
import type { Cliente } from "../../mocks/clientes";
import { rotuloTipoTask, resumoTaskComEstrategia, type Task } from "../../mocks/tasks";
import { ApiError } from "../../api/client";
import { paraTaskMock, tasksApi } from "../../api/tasks";
import { estrategiasApi, type EstrategiaApi } from "../../api/estrategias";
import { conexoesApi, type ConexaoApi } from "../../api/conexoes";
import { pacotesApi, type PacoteApi, type TabelaAsPacoteApi, type TaskPacoteApi } from "../../api/pacotes";
import { execucoesApi, gerarExecucaoId } from "../../api/execucoes";
import type { EventoLog } from "../../api/types";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { Dialog } from "../../components/Dialog";
import { Switch } from "../../components/Switch";
import { SelecionarTaskModal } from "./SelecionarTaskModal";
import { SelecionarTabelaAsModal } from "./SelecionarTabelaAsModal";
import "./PacotesTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

export function PacotesTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estrategias, setEstrategias] = useState<EstrategiaApi[]>([]);
  const [conexoes, setConexoes] = useState<ConexaoApi[]>([]);
  const [pacotes, setPacotes] = useState<PacoteApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [query, setQuery] = useState("");
  const [pacoteAbertoNome, setPacoteAbertoNome] = useState<string | null>(null);
  const [modalNovoPacote, setModalNovoPacote] = useState(false);
  const [nomeNovoPacote, setNomeNovoPacote] = useState("");
  const [modalNovaTask, setModalNovaTask] = useState(false);
  const [modalNovaTabelaAs, setModalNovaTabelaAs] = useState(false);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [arrastandoAs, setArrastandoAs] = useState<number | null>(null);
  const [executando, setExecutando] = useState(false);
  const [eventosExecucao, setEventosExecucao] = useState<EventoLog[]>([]);
  // Log de execução do Pacote vira popup à parte, mesmo padrão já validado em Tasks
  // (TasksListTab.tsx) — "Fechar" só esconde o popup (nunca cancela nada — navegar pelo app ou
  // fechar a aba do navegador também não interrompe, o app só aciona o ETL_Classes, ver
  // `etl_bridge.py`); "Log de Execução" reabre com o texto acumulado intacto.
  const [logAberto, setLogAberto] = useState(false);
  // Botão "Log de Execução" — some assim que o usuário fecha o popup já sabendo que terminou
  // (mesma regra de TasksListTab.tsx: fechar enquanto ainda roda sempre deixa disponível).
  const [mostrarBotaoLog, setMostrarBotaoLog] = useState(false);
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const execucaoIdRef = useRef<string | null>(null);
  const [excluindoPacote, setExcluindoPacote] = useState(false);
  const [excluindoTaskIndex, setExcluindoTaskIndex] = useState<number | null>(null);
  const [excluindoTabelaAsIndex, setExcluindoTabelaAsIndex] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function recarregar() {
    if (!cliente) return;
    Promise.all([
      tasksApi.listar(cliente.id),
      pacotesApi.listar(cliente.id),
      estrategiasApi.listar(cliente.id),
      conexoesApi.listar(cliente.id),
    ]).then(([t, p, e, c]) => {
      setTasks(t.map(paraTaskMock));
      setPacotes(p);
      setEstrategias(e);
      setConexoes(c);
      setCarregando(false);
    });
  }

  useEffect(recarregar, [cliente]);

  if (!cliente || carregando) return null;
  const clienteId = cliente.id;

  const pacoteAberto = pacotes.find((p) => p.nome === pacoteAbertoNome) ?? null;

  // `PacoteUpdate` sempre substitui a lista inteira (mesma semântica de tasks/tabelas_analysis_server
  // desde o início) — por isso todo save reenvia os dois campos juntos, nunca só o que mudou,
  // senão o campo omitido voltaria pro default (`[]`) e apagaria o outro grupo sem querer.
  async function salvarItens(nome: string, tasksAtuais: TaskPacoteApi[], tabelasAs: TabelaAsPacoteApi[]) {
    setErro(null);
    try {
      const atualizado = await pacotesApi.atualizar(clienteId, nome, {
        tasks: tasksAtuais,
        tabelas_analysis_server: tabelasAs,
      });
      setPacotes((atual) => atual.map((p) => (p.nome === nome ? atualizado : p)));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao atualizar o pacote.");
    }
  }

  function alternarAtivo(index: number) {
    if (!pacoteAberto) return;
    const proximas = pacoteAberto.tasks.map((t, i) => (i === index ? { ...t, ativo: !t.ativo } : t));
    salvarItens(pacoteAberto.nome, proximas, pacoteAberto.tabelas_analysis_server);
  }

  function alternarAtivoAs(index: number) {
    if (!pacoteAberto) return;
    const proximas = pacoteAberto.tabelas_analysis_server.map((t, i) => (i === index ? { ...t, ativo: !t.ativo } : t));
    salvarItens(pacoteAberto.nome, pacoteAberto.tasks, proximas);
  }

  async function criarPacote() {
    const slug = nomeNovoPacote.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    if (!slug) return;
    setErro(null);
    try {
      const criado = await pacotesApi.criar(clienteId, { nome: slug, tasks: [] });
      setPacotes((atual) => [...atual, criado]);
      setNomeNovoPacote("");
      setModalNovoPacote(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar o pacote.");
    }
  }

  async function excluirPacote(nome: string) {
    await pacotesApi.excluir(clienteId, nome);
    setPacotes((atual) => atual.filter((p) => p.nome !== nome));
    if (pacoteAbertoNome === nome) setPacoteAbertoNome(null);
  }

  async function ativarPacote(nome: string) {
    setExecutando(true);
    setConfirmandoCancelamento(false);
    setMostrarBotaoLog(false);
    setEventosExecucao([]);
    setLogAberto(true);
    const execucaoId = gerarExecucaoId();
    execucaoIdRef.current = execucaoId;
    await pacotesApi.rodar(clienteId, nome, (ev) => setEventosExecucao((atual) => [...atual, ev]), execucaoId);
    execucaoIdRef.current = null;
    setExecutando(false);
  }

  /** Primeiro clique só troca "Cancelar" -> "Confirmar" (dupla validação); só o segundo clique
      cancela o pacote de verdade (o stream em si termina sozinho pouco depois, relatando
      "cancelada pelo usuário" — não precisa fechar/abortar nada do lado do front). */
  function cancelarExecucaoPacote() {
    if (!confirmandoCancelamento) {
      setConfirmandoCancelamento(true);
      return;
    }
    setConfirmandoCancelamento(false);
    if (execucaoIdRef.current) execucoesApi.cancelar(execucaoIdRef.current).catch(() => {});
  }

  /** "Fechar"/"Concluído" — só esconde o popup, nunca interrompe nada. Fechar enquanto ainda
      está rodando sempre deixa o botão "Log de Execução" disponível; fechar já sabendo que
      terminou (viu "Concluído") esconde o botão de vez. */
  function fecharPopupLog() {
    setLogAberto(false);
    setMostrarBotaoLog(executando);
  }

  function reabrirPopupLog() {
    setLogAberto(true);
  }

  return (
    <div className="pacotes-page">
      <div className="pacotes-header">
        <div>
          <div className="kicker">{cliente.nome}</div>
          <div className="pacotes-title">Pacotes</div>
        </div>
        {!pacoteAberto && (
          <div className="pacotes-actions">
            <button className="btn btn-primary" onClick={() => setModalNovoPacote(true)}>
              + Novo pacote
            </button>
          </div>
        )}
      </div>

      <div className="pacotes-body">
        <div className="pacotes-list scroll">
          {!pacoteAberto ? (
            <>
              <input
                className="input pacotes-search"
                placeholder="Buscar pacote"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {pacotes
                .filter((p) => p.nome.toLowerCase().includes(query.trim().toLowerCase()))
                .map((p) => (
                  <div key={p.nome} className="card pacotes-item" onClick={() => setPacoteAbertoNome(p.nome)}>
                    <div className="pacotes-item-nome">{p.nome}</div>
                    <div className="text-muted pacotes-item-meta">
                      {p.tasks.length} {p.tasks.length === 1 ? "task" : "tasks"}
                      {p.tabelas_analysis_server.length > 0 && ` · ${p.tabelas_analysis_server.length} refresh(es) AS`}
                    </div>
                  </div>
                ))}
              {pacotes.length === 0 && <div className="text-muted">Nenhum pacote criado.</div>}
            </>
          ) : (
            <>
              <div className="pacotes-drill-header">
                <button
                  className="pacotes-voltar"
                  onClick={() => {
                    setPacoteAbertoNome(null);
                    setEventosExecucao([]);
                  }}
                >
                  <ArrowLeft size={14} strokeWidth={1.5} />
                  Pacotes
                </button>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary" onClick={() => setModalNovaTabelaAs(true)}>
                    + Tabela (Refresh)
                  </button>
                  <button className="btn btn-primary" onClick={() => setModalNovaTask(true)}>
                    + Adicionar Task
                  </button>
                </div>
              </div>
              <div className="card-kicker" style={{ margin: "4px 0 6px" }}>
                Tasks (ETL_Classes) — rodam primeiro
              </div>
              {pacoteAberto.tasks.map((t, index) => {
                const task = tasks.find((x) => x.id === t.task_id);
                return (
                  <div
                    key={`${t.task_id}-${index}`}
                    className={`card pacotes-task${arrastando === index ? " pacotes-task--arrastando" : ""}`}
                    draggable
                    onDragStart={() => setArrastando(index)}
                    onDragEnd={() => setArrastando(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (arrastando === null || arrastando === index) return;
                      const proximas = [...pacoteAberto.tasks];
                      const [movida] = proximas.splice(arrastando, 1);
                      proximas.splice(index, 0, movida);
                      salvarItens(pacoteAberto.nome, proximas, pacoteAberto.tabelas_analysis_server);
                      setArrastando(null);
                    }}
                  >
                    <GripVertical size={15} strokeWidth={1.5} className="pacotes-task-grip" />
                    <span className="pacotes-task-ordem">{index + 1}</span>
                    <div className="pacotes-task-info">
                      <div className="pacotes-task-nome">{task?.nome ?? "Task removida"}</div>
                      {task && (
                        <div className="text-muted pacotes-task-meta">
                          {rotuloTipoTask[task.tipo]}
                          <span className="meta-sep">·</span>
                          {resumoTaskComEstrategia(task, estrategias)}
                        </div>
                      )}
                    </div>
                    <Switch checked={t.ativo} onChange={() => alternarAtivo(index)} />
                    <BotaoExcluir onClick={() => setExcluindoTaskIndex(index)} />
                  </div>
                );
              })}
              {pacoteAberto.tasks.length === 0 && <div className="text-muted">Nenhuma task neste pacote.</div>}

              <div className="card-kicker" style={{ margin: "14px 0 6px" }}>
                Analysis Services — Refresh (depois das Tasks)
              </div>
              {pacoteAberto.tabelas_analysis_server.map((item, index) => (
                <div
                  key={`${item.conexao_id}-${item.tabela}-${index}`}
                  className={`card pacotes-task${arrastandoAs === index ? " pacotes-task--arrastando" : ""}`}
                  draggable
                  onDragStart={() => setArrastandoAs(index)}
                  onDragEnd={() => setArrastandoAs(null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (arrastandoAs === null || arrastandoAs === index) return;
                    const proximas = [...pacoteAberto.tabelas_analysis_server];
                    const [movida] = proximas.splice(arrastandoAs, 1);
                    proximas.splice(index, 0, movida);
                    salvarItens(pacoteAberto.nome, pacoteAberto.tasks, proximas);
                    setArrastandoAs(null);
                  }}
                >
                  <GripVertical size={15} strokeWidth={1.5} className="pacotes-task-grip" />
                  <span className="pacotes-task-ordem">{index + 1}</span>
                  <div className="pacotes-task-info">
                    <div className="pacotes-task-nome">{item.tabela}</div>
                    <div className="text-muted pacotes-task-meta">
                      Full Refresh
                      <span className="meta-sep">·</span>
                      {conexoes.find((c) => c.id === item.conexao_id)?.nome ?? "Conexão removida"}
                    </div>
                  </div>
                  <Switch checked={item.ativo} onChange={() => alternarAtivoAs(index)} />
                  <BotaoExcluir onClick={() => setExcluindoTabelaAsIndex(index)} />
                </div>
              ))}
              {pacoteAberto.tabelas_analysis_server.length === 0 && (
                <div className="text-muted">Nenhuma tabela de Refresh neste pacote.</div>
              )}
            </>
          )}
        </div>

        {pacoteAberto && (
          <aside className="pacotes-detalhes scroll">
            <div className="card-kicker">Pacote</div>
            <div className="pacotes-detalhes-nome">{pacoteAberto.nome}</div>
            <div className="text-muted pacotes-detalhes-caminho">
              Clientes/{cliente.labelInterna}/Pacotes/{pacoteAberto.nome}.py
            </div>

            <div className="detail-actions">
              <button className="btn btn-primary btn-block" onClick={() => ativarPacote(pacoteAberto.nome)} disabled={executando}>
                {executando ? "Em execução" : "Ativar pacote"}
              </button>
              {mostrarBotaoLog && !logAberto && (
                <button className="btn btn-secondary btn-block" onClick={reabrirPopupLog}>
                  Log de Execução
                </button>
              )}
              <BotaoExcluir onClick={() => setExcluindoPacote(true)} texto="Excluir pacote" className="btn-block" />
            </div>
          </aside>
        )}
      </div>

      {erro && <div className="text-danger" style={{ padding: "0 20px", fontSize: 13 }}>{erro}</div>}

      {logAberto && (
        <Dialog
          title="Executando Pacote"
          onClose={() => {}}
          wide
          className="pacotes-log-dialog"
          actions={
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {executando && (
                <button
                  type="button"
                  className={`btn ${confirmandoCancelamento ? "btn-danger-solid" : "btn-danger"}`}
                  onClick={cancelarExecucaoPacote}
                >
                  {confirmandoCancelamento ? "Confirmar" : "Cancelar"}
                </button>
              )}
              <button
                type="button"
                className={`btn ${executando ? "btn-secondary" : "btn-primary"}`}
                onClick={fecharPopupLog}
              >
                {executando ? "Fechar" : "Concluído"}
              </button>
            </div>
          }
        >
          <div className="pacotes-log-lista">
            {eventosExecucao.length === 0 && <div className="text-muted">Iniciando...</div>}
            {eventosExecucao.map((ev, i) => (
              <div key={i} className="acao-feedback" style={ev.nivel === "erro" ? { color: "var(--color-danger-text)" } : undefined}>
                {ev.mensagem}
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {excluindoPacote && pacoteAberto && (
        <ConfirmarExclusaoModal
          titulo="Excluir Pacote"
          mensagem={`Tem certeza que deseja excluir o pacote "${pacoteAberto.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindoPacote(false)}
          onConfirmar={() => {
            excluirPacote(pacoteAberto.nome);
            setExcluindoPacote(false);
          }}
        />
      )}

      {excluindoTaskIndex !== null && pacoteAberto && (
        <ConfirmarExclusaoModal
          titulo="Excluir Task do Pacote"
          mensagem="Tem certeza que deseja remover essa task deste pacote? Essa ação não pode ser desfeita."
          onClose={() => setExcluindoTaskIndex(null)}
          onConfirmar={() => {
            salvarItens(
              pacoteAberto.nome,
              pacoteAberto.tasks.filter((_, i) => i !== excluindoTaskIndex),
              pacoteAberto.tabelas_analysis_server,
            );
            setExcluindoTaskIndex(null);
          }}
        />
      )}

      {excluindoTabelaAsIndex !== null && pacoteAberto && (
        <ConfirmarExclusaoModal
          titulo="Excluir Tabela do Pacote"
          mensagem="Tem certeza que deseja remover essa tabela (Refresh) deste pacote? Essa ação não pode ser desfeita."
          onClose={() => setExcluindoTabelaAsIndex(null)}
          onConfirmar={() => {
            salvarItens(
              pacoteAberto.nome,
              pacoteAberto.tasks,
              pacoteAberto.tabelas_analysis_server.filter((_, i) => i !== excluindoTabelaAsIndex),
            );
            setExcluindoTabelaAsIndex(null);
          }}
        />
      )}

      {modalNovoPacote && (
        <Dialog
          title="Novo pacote"
          onClose={() => setModalNovoPacote(false)}
          actions={
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn btn-secondary" onClick={() => setModalNovoPacote(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={criarPacote} disabled={!nomeNovoPacote.trim()}>
                Salvar
              </button>
            </div>
          }
        >
          <div className="field">
            <label htmlFor="pc-nome">Nome</label>
            <input
              className="input"
              id="pc-nome"
              placeholder="faturamento_diario"
              value={nomeNovoPacote}
              onChange={(e) => setNomeNovoPacote(e.target.value)}
              autoFocus
            />
          </div>
        </Dialog>
      )}

      {modalNovaTask && pacoteAberto && (
        <SelecionarTaskModal
          tasks={tasks}
          estrategias={estrategias}
          jaSelecionadas={pacoteAberto.tasks.map((t) => t.task_id)}
          onClose={() => setModalNovaTask(false)}
          onConfirmar={(taskIds) => {
            const idsSelecionados = new Set(taskIds);
            const mantidas = pacoteAberto.tasks.filter((t) => idsSelecionados.has(t.task_id));
            const idsJaPresentes = new Set(mantidas.map((t) => t.task_id));
            const novas = taskIds
              .filter((id) => !idsJaPresentes.has(id))
              .map((id) => ({ task_id: id, ativo: true }));
            salvarItens(pacoteAberto.nome, [...mantidas, ...novas], pacoteAberto.tabelas_analysis_server);
            setModalNovaTask(false);
          }}
        />
      )}

      {modalNovaTabelaAs && pacoteAberto && (
        <SelecionarTabelaAsModal
          clienteId={clienteId}
          jaSelecionadas={pacoteAberto.tabelas_analysis_server}
          onClose={() => setModalNovaTabelaAs(false)}
          onConfirmar={(itens) => {
            salvarItens(pacoteAberto.nome, pacoteAberto.tasks, itens);
            setModalNovaTabelaAs(false);
          }}
        />
      )}
    </div>
  );
}
