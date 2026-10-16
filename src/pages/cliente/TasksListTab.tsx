import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { resumoTask, resumoTaskComEstrategia, type Task, type TipoTask } from "../../mocks/tasks";
import { conexoesApi, type ConexaoApi } from "../../api/conexoes";
import { consultasApi, nomeInternoConsultaApi, type ConsultaApi } from "../../api/consultas";
import { estrategiasApi, paraEstrategiaMock, type EstrategiaApi } from "../../api/estrategias";
import {
  analysisServerApi,
  idTabelaProcessamentoAs,
  paraTaskMockProcessamentoAs,
  partirIdProcessamentoAs,
  type TabelaTmdlApi,
} from "../../api/analysisServer";
import { tasksApi } from "../../api/tasks";
import { execucoesApi, gerarExecucaoId } from "../../api/execucoes";
import type { EventoLog } from "../../api/types";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { Dialog } from "../../components/Dialog";
import { TaskFormModal } from "./TaskFormModal";
import { VisualizarSqlModal } from "./VisualizarSqlModal";
import type { TasksContext } from "./TasksShell";
import "./TasksListTab.css";

export function TasksListTab({ tipo }: { tipo: TipoTask }) {
  const { cliente, tasks, onRecarregarTasks, onExcluirTask } = useOutletContext<TasksContext>();
  const navigate = useNavigate();

  const [conexoes, setConexoes] = useState<ConexaoApi[]>([]);
  const [consultas, setConsultas] = useState<ConsultaApi[]>([]);
  const [estrategias, setEstrategias] = useState<EstrategiaApi[]>([]);
  const [query, setQuery] = useState("");

  // "processamento_as" também não é uma Task de verdade — é uma Tabela do Modelo Semântico
  // (Analysis Services), que nem tem TipoTaskMotor pra ser. Um cliente pode ter várias Conexões
  // Analysis Services agora, cada uma com seu próprio Modelo — a lista aqui mescla as tabelas de
  // TODAS elas (id composto `conexaoId::nome`, já que duas Conexões podem ter tabela de mesmo
  // nome). `modeloTabelasReais` guarda a lista crua (colunas/medidas + de qual Conexão cada uma
  // veio) só pro painel de detalhe; `modeloTabelasMock` é a mesma lista adaptada pro shape Task,
  // reaproveitando lista/seleção/"Ativar" já validados.
  const [modeloTabelasReais, setModeloTabelasReais] = useState<{ conexaoId: string; conexaoNome: string; tabela: TabelaTmdlApi }[]>([]);
  const [modeloTabelasMock, setModeloTabelasMock] = useState<Task[]>([]);
  function recarregarModeloAs() {
    if (!cliente || tipo !== "processamento_as") return;
    const conexoesAs = conexoes.filter((c) => c.tipo === "Analysis Services");
    if (conexoesAs.length === 0) {
      setModeloTabelasReais([]);
      setModeloTabelasMock([]);
      return;
    }
    Promise.all(
      conexoesAs.map((c) =>
        analysisServerApi
          .obterModelo(cliente.id, c.id)
          .then((modelo) => modelo.tabelas.map((tabela) => ({ conexaoId: c.id, conexaoNome: c.nome, tabela })))
          .catch(() => []),
      ),
    ).then((listas) => {
      const achatado = listas.flat();
      setModeloTabelasReais(achatado);
      setModeloTabelasMock(achatado.map(({ conexaoId, tabela }) => paraTaskMockProcessamentoAs(tabela, conexaoId)));
    });
  }
  useEffect(recarregarModeloAs, [cliente, tipo, tasks, conexoes]);

  // Rascunho é uma estrutura ainda incompleta/inválida (ver validarFluxo) — fica só na aba
  // "Rascunhos" (RascunhosTab.tsx), nunca junto das Tasks "de verdade" daquele tipo. "api" é uma
  // Task real como qualquer outra desde 2026-09-02 (antes só existia como ApiEndpoint solto).
  const porTipo = tipo === "processamento_as" ? modeloTabelasMock : tasks.filter((t) => t.tipo === tipo && !t.rascunho);
  const filtradas = porTipo.filter((t) => t.nome.toLowerCase().includes(query.trim().toLowerCase()));
  const [selecionadaId, setSelecionadaId] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [sqlAberto, setSqlAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [executando, setExecutando] = useState(false);
  const [eventosExecucao, setEventosExecucao] = useState<EventoLog[]>([]);
  // Log de execução vive num popup à parte (não mais inline no painel de detalhes — leitura ficava
  // ruim ali) — fecha SÓ pelo botão "Fechar", nunca clicando fora (`Dialog.onClose` vira no-op).
  // Fechar NUNCA cancela a execução (o app só aciona o ETL_Classes — navegar pelo app ou fechar
  // a aba do navegador também não interrompe, ver `etl_bridge.py`) — só esconde o popup;
  // "Log de Execução" reabre com o texto acumulado intacto (`eventosExecucao` não é resetado).
  const [logAberto, setLogAberto] = useState(false);
  // Botão "Log de Execução" (reabre o popup) — aparece ao fechar enquanto ainda está rodando
  // (nunca esconde o acesso a uma execução em andamento) OU logo após terminar, se o popup
  // estava fechado nesse momento (usuário não viu o resultado ainda); some assim que o usuário
  // fecha o popup já sabendo que terminou (viu "Concluído" e dispensou).
  const [mostrarBotaoLog, setMostrarBotaoLog] = useState(false);
  // "Cancelar" (interrompe a task de verdade — chama `execucoesApi.cancelar`, que mata o
  // subprocesso no backend; ver `etl_bridge.py`) exige dupla confirmação: primeiro clique só
  // troca o texto pra "Confirmar"; só o segundo clique cancela de verdade.
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const execucaoIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cliente) return;
    conexoesApi.listar(cliente.id).then(setConexoes);
    consultasApi.listar(cliente.id).then(setConsultas);
    estrategiasApi.listar(cliente.id).then(setEstrategias);
  }, [cliente]);

  if (!cliente) return null;
  const clienteId = cliente.id;

  const task = filtradas.find((t) => t.id === selecionadaId) ?? filtradas[0];
  const consulta = task ? consultas.find((c) => c.id === task.consultaId) : undefined;
  const estrategia = task ? estrategias.find((e) => e.id === task.estrategiaId) : undefined;
  const nomeConexao = (id?: string) => conexoes.find((c) => c.id === id)?.nome ?? "—";

  function camposExibicao(): [string, string][] {
    if (!task) return [];
    if (task.tipo === "consulta_sql") {
      return [
        ["Conexão origem", nomeConexao(task.conexaoOrigemId)],
        ["Conexão destino", nomeConexao(task.conexaoDestinoId)],
        ["Tabela destino", task.tabelaDestino ?? "—"],
        ["Consulta", consulta ? nomeInternoConsultaApi(consulta.categoria, consulta.nome) : "—"],
        ["Estratégia de atualização", estrategia?.nome ?? "—"],
      ];
    }
    if (task.tipo === "planilha") {
      return [
        ["Conexão origem", nomeConexao(task.conexaoOrigemId)],
        ["Conexão destino", nomeConexao(task.conexaoDestinoId)],
        ["Tabela destino", task.tabelaDestino ?? "—"],
        ["Estratégia de atualização", estrategia?.nome ?? "—"],
      ];
    }
    if (task.tipo === "api") {
      // Método/Rota/Campos vivem só no grafo compilado (fluxo_nos), não em colunas próprias da
      // Task — "Editar" reabre o formulário guiado, que já busca isso via ApiEndpoint/nome.
      return [
        ["Conexão origem", nomeConexao(task.conexaoOrigemId)],
        ["Conexão destino", nomeConexao(task.conexaoDestinoId)],
        ["Tabela destino", task.tabelaDestino ?? "—"],
        ["Estratégia de atualização", estrategia?.nome ?? "—"],
      ];
    }
    if (task.tipo === "processamento_as") {
      const entrada = modeloTabelasReais.find((m) => idTabelaProcessamentoAs(m.conexaoId, m.tabela.nome) === task.id);
      return [
        ["Conexão", entrada?.conexaoNome ?? "—"],
        ["Colunas", entrada ? String(entrada.tabela.colunas.length) : "—"],
        ["Medidas", entrada ? String(entrada.tabela.medidas.length) : "—"],
      ];
    }
    return [["Configuração", resumoTask(task)]];
  }

  async function ativarTask() {
    if (!task) return;
    setExecutando(true);
    setConfirmandoCancelamento(false);
    setMostrarBotaoLog(false);
    setEventosExecucao([]);
    setLogAberto(true);
    const onEvento = (ev: EventoLog) => setEventosExecucao((atual) => [...atual, ev]);
    if (tipo === "processamento_as") {
      const { conexaoId, nomeTabela } = partirIdProcessamentoAs(task.id);
      await analysisServerApi.refreshTabela(clienteId, conexaoId, nomeTabela, onEvento);
    } else {
      const execucaoId = gerarExecucaoId();
      execucaoIdRef.current = execucaoId;
      await tasksApi.executar(clienteId, task.id, onEvento, execucaoId);
      execucaoIdRef.current = null;
    }
    setExecutando(false);
  }

  /** Primeiro clique só troca "Cancelar" -> "Confirmar" (dupla validação); só o segundo clique
      cancela a task de verdade (o stream em si termina sozinho pouco depois, relatando "cancelada
      pelo usuário" — não precisa fechar/abortar nada do lado do front). */
  function cancelarExecucao() {
    if (!confirmandoCancelamento) {
      setConfirmandoCancelamento(true);
      return;
    }
    setConfirmandoCancelamento(false);
    if (execucaoIdRef.current) execucoesApi.cancelar(execucaoIdRef.current).catch(() => {});
  }

  /** "Fechar"/"Concluído" — só esconde o popup, nunca interrompe nada. Fechar enquanto ainda
      está rodando sempre deixa o botão "Log de Execução" disponível (nunca tranca o acesso a
      uma execução em andamento); fechar já sabendo que terminou (viu "Concluído") esconde o
      botão de vez — não há mais nada de novo pra ver. */
  function fecharPopupLog() {
    setLogAberto(false);
    setMostrarBotaoLog(executando);
  }

  function reabrirPopupLog() {
    setLogAberto(true);
  }

  return (
    <div className="tasks-body">
      <div className="tasks-list scroll">
        <input
          className="input tasks-search"
          placeholder="Buscar task"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtradas.map((t) => (
          <div
            key={t.id}
            className={`card tasks-item${t.id === task?.id ? " is-selected" : ""}`}
            onClick={() => {
              setSelecionadaId(t.id);
              setEventosExecucao([]);
              setLogAberto(false);
              setMostrarBotaoLog(false);
            }}
          >
            <div className="tasks-item-nome">{t.nome}</div>
            <div className="text-muted tasks-item-meta">
              {resumoTaskComEstrategia(t, estrategias)}
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <div className="text-muted">{porTipo.length === 0 ? "Nenhuma task cadastrada." : "Nenhuma task encontrada."}</div>
        )}
      </div>

      {task && (
        <aside className="tasks-detalhes scroll">
          <div className="card-kicker">Detalhes da task</div>
          <div className="tasks-detalhes-nome">{task.nome}</div>

          <div className="tasks-detalhes-campos">
            {camposExibicao().map(([label, value]) => (
              <div className="tasks-campo" key={label}>
                <span className="text-muted">{label}</span>
                <span className="tasks-campo-valor">{value}</span>
              </div>
            ))}
          </div>

          {tipo === "consulta_sql" && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn btn-primary btn-block"
                disabled={!consulta || !estrategia}
                onClick={() => setSqlAberto(true)}
              >
                Visualizar SQL
              </button>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary btn-block" onClick={ativarTask} disabled={executando}>
              {executando ? "Em execução" : tipo === "processamento_as" ? "Full Refresh" : "Ativar Task"}
            </button>
            {mostrarBotaoLog && !logAberto && (
              <button className="btn btn-secondary btn-block" onClick={reabrirPopupLog} style={{ marginTop: 6 }}>
                Log de Execução
              </button>
            )}
            {tipo === "processamento_as" && (
              <div className="text-muted" style={{ fontSize: 12, marginTop: 6 }}>
                Exige que o Modelo Semântico já tenha sido publicado (Deploy) pelo menos uma vez —
                a Tabela precisa existir no Analysis Services de verdade antes de dar Refresh nela.
              </div>
            )}
          </div>

          <div className="detail-actions-row" style={{ marginTop: 12 }}>
            {tipo !== "fluxo_manual" && tipo !== "processamento_as" && (
              <button className="btn btn-secondary tasks-detalhes-btn-editar" onClick={() => setEditando(true)}>
                Editar
              </button>
            )}
            {tipo !== "processamento_as" && (
              <button
                className="btn btn-secondary"
                onClick={() => navigate(`/clientes/${clienteId}/tasks/fluxo/${task.id}`)}
              >
                Editar Fluxo
              </button>
            )}
            {tipo !== "processamento_as" && <BotaoExcluir onClick={() => setExcluindo(true)} />}
          </div>
          {tipo === "processamento_as" && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 8 }}>
              Editar/excluir Tabela ainda não é suportado pelo backend do Analysis Services.
            </div>
          )}
        </aside>
      )}

      {excluindo && task && (
        <ConfirmarExclusaoModal
          titulo="Excluir Task"
          mensagem={`Tem certeza que deseja excluir a task "${task.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => {
            onExcluirTask(task.id);
            setSelecionadaId(null);
            setExcluindo(false);
          }}
        />
      )}

      {editando && task && (
        <TaskFormModal
          titulo="Editar Task"
          clienteId={clienteId}
          tipoInicial={task.tipo}
          task={task}
          onClose={() => setEditando(false)}
          onSalvar={() => {
            setEditando(false);
            onRecarregarTasks();
          }}
        />
      )}

      {logAberto && (
        <Dialog
          title={tipo === "processamento_as" ? "Executando Full Refresh" : "Executando Task"}
          onClose={() => {}}
          wide
          className="tasks-log-dialog"
          actions={
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              {executando && tipo !== "processamento_as" && (
                <button
                  type="button"
                  className={`btn ${confirmandoCancelamento ? "btn-danger-solid" : "btn-danger"}`}
                  onClick={cancelarExecucao}
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
          <div className="tasks-log-lista">
            {eventosExecucao.length === 0 && <div className="text-muted">Iniciando...</div>}
            {eventosExecucao.map((ev, i) => (
              <div key={i} className="acao-feedback" style={ev.nivel === "erro" ? { color: "var(--color-danger-text)" } : undefined}>
                {ev.mensagem}
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {sqlAberto && consulta && estrategia && task && (
        <VisualizarSqlModal
          nomeConsulta={nomeInternoConsultaApi(consulta.categoria, consulta.nome)}
          sqlOriginal={consulta.sql_texto ?? ""}
          estrategia={paraEstrategiaMock(estrategia)}
          nomeTabela={task.tabelaDestino ?? ""}
          onClose={() => setSqlAberto(false)}
        />
      )}
    </div>
  );
}
