import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { Dialog } from "../../components/Dialog";
import { SearchableSelect } from "../../components/SearchableSelect";
import { TabelaDestinoField } from "../../components/TabelaDestinoField";
import { ApiError } from "../../api/client";
import { conexoesApi, conexoesInternasNaoAs, type ConexaoApi } from "../../api/conexoes";
import { consultasApi, nomeInternoConsultaApi, type ConsultaApi } from "../../api/consultas";
import { estrategiasApi, paraEstrategiaMock, type EstrategiaApi } from "../../api/estrategias";
import { tasksApi, type TaskApi } from "../../api/tasks";
import { apiEndpointsApi, metodosHttpApi, paraDadosArvore, type ApiEndpointApi, type MetodoHttpApi } from "../../api/apiEndpoints";
import { analysisServerApi } from "../../api/analysisServer";
import type { EventoLog } from "../../api/types";
import {
  tiposTaskPadrao,
  rotuloTipoTask,
  nomeTaskProcessamentoAs,
  type Task,
  type TipoTask,
} from "../../mocks/tasks";
import { construirFluxoDaTask } from "../../mocks/fluxoDeTask";
import { VisualizarSqlModal } from "./VisualizarSqlModal";
import { ConfigurarCamposModal } from "./ConfigurarCamposModal";
import { SelecionarTabelaOuViewModal } from "./SelecionarTabelaOuViewModal";
import { CriarViewModal } from "./CriarViewModal";
import "./TaskFormModal.css";

interface TaskFormModalProps {
  titulo: string;
  clienteId: string;
  tipoInicial: TipoTask;
  task?: Task;
  onClose: () => void;
  onSalvar: () => void;
}

/** Só Conexões Externas são origem de dado válida — uma Interna não tem
    host/usuário/senha próprios (vive só como vínculo pro banco interno via
    Conexão Interna), então nunca deveria aparecer aqui mesmo tendo
    `tipo="PostgreSQL"` igual a uma Externa de verdade. Sem esse filtro, o
    default (1º item, ordem alfabética) podia cair numa Conexão Interna e
    estourar "Conexão sem 'Banco' definido" ao tentar usá-la como origem. */
function conexoesOrigemPara(tipo: TipoTask, conexoes: ConexaoApi[]): ConexaoApi[] {
  const externas = conexoes.filter((c) => c.organizacao === "Externo");
  if (tipo === "consulta_sql") return externas.filter((c) => c.tipo === "Oracle" || c.tipo === "PostgreSQL" || c.tipo === "SQL Server");
  if (tipo === "planilha") return externas.filter((c) => c.tipo === "Excel");
  if (tipo === "api") return externas.filter((c) => c.tipo === "API");
  return [];
}

/** Campo "Nome da Task" herdado da fonte escolhida — trava a edição até clicar no lápis, pra
    deixar claro que o nome normalmente segue a convenção, mas pode ser corrigido na mão. */
function CampoNomeHerdado({
  label,
  nome,
  travado,
  onDestravar,
  onChange,
}: {
  label: string;
  nome: string;
  travado: boolean;
  onDestravar: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {travado ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            minHeight: 36,
            padding: "6px 10px",
            border: "1px solid var(--color-divider)",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-neutral-100)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
          }}
        >
          <span>{nome || "—"}</span>
          <button type="button" className="btn btn-icon" title="Editar nome" onClick={onDestravar}>
            <Pencil size={13} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <input className="input" value={nome} onChange={(e) => onChange(e.target.value)} autoFocus />
      )}
    </div>
  );
}

export function TaskFormModal({ titulo, clienteId, tipoInicial, task, onClose, onSalvar }: TaskFormModalProps) {
  const [carregando, setCarregando] = useState(true);
  const [conexoes, setConexoes] = useState<ConexaoApi[]>([]);
  const [consultas, setConsultas] = useState<ConsultaApi[]>([]);
  const [estrategias, setEstrategias] = useState<EstrategiaApi[]>([]);
  const conexoesInternas = conexoesInternasNaoAs(conexoes);
  const conexoesDestino = conexoesInternas;
  const conexoesAs = conexoes.filter((c) => c.tipo === "Analysis Services");

  useEffect(() => {
    Promise.all([
      conexoesApi.listar(clienteId),
      consultasApi.listar(clienteId),
      estrategiasApi.listar(clienteId),
      apiEndpointsApi.listar(clienteId),
    ]).then(([c, q, e, ep]) => {
      setConexoes(c);
      setConsultas(q);
      setEstrategias(e);
      // Task "api" é só uma casca mock em volta de um ApiEndpoint real — reconecta pelo id
      // (a lista já vem de `paraTaskMockApi`, então bate direto) ou por nome como fallback.
      if (task?.tipo === "api") {
        const existente = ep.find((x) => x.id === task.id) ?? ep.find((x) => x.nome === task.nome);
        if (existente) {
          setApiEndpointId(existente.id);
          setCamposSelecionados(existente.campos_selecionados);
          setMetodo(existente.metodo);
          setRota(existente.rota);
          setConexaoOrigemId(existente.conexao_id);
        }
      }
      setCarregando(false);
    });
  }, [clienteId]);

  const [tipo, setTipo] = useState<TipoTask>(task?.tipo ?? tipoInicial);
  const [consultaId, setConsultaId] = useState(task?.consultaId ?? "");
  const [estrategiaId, setEstrategiaId] = useState(task?.estrategiaId ?? "");
  const [aba, setAba] = useState(task?.aba ?? "");
  const [metodo, setMetodo] = useState<MetodoHttpApi>("GET");
  const [rota, setRota] = useState(task?.rota ?? "");
  const [camposSelecionados, setCamposSelecionados] = useState<string[]>(task?.camposSelecionados ?? []);
  const [camposModalAberto, setCamposModalAberto] = useState(false);
  const [dadosArvoreApi, setDadosArvoreApi] = useState<Record<string, unknown>>({});
  const [apiEndpointId, setApiEndpointId] = useState<string | undefined>(undefined);
  const [testandoApi, setTestandoApi] = useState(false);
  const [fonteConexaoId, setFonteConexaoId] = useState("");
  const [fonteObjeto, setFonteObjeto] = useState("");
  const [conexaoAsId, setConexaoAsId] = useState("");
  const [pickerTabelaAberto, setPickerTabelaAberto] = useState(false);
  const [criarViewAberto, setCriarViewAberto] = useState(false);
  const [conexaoOrigemId, setConexaoOrigemId] = useState(task?.conexaoOrigemId ?? "");
  const [conexaoDestinoId, setConexaoDestinoId] = useState(task?.conexaoDestinoId ?? "");
  const [nome, setNome] = useState(task?.nome ?? "");
  const [tabelaDestino, setTabelaDestino] = useState(task?.tabelaDestino ?? "");
  const [tabelaDestinoManual, setTabelaDestinoManual] = useState(!!task);
  const [nomeTravado, setNomeTravado] = useState(!task);
  const [sqlAberto, setSqlAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Assim que os catálogos reais chegam, preenche os defaults de uma Task NOVA (não dá pra saber
  // o primeiro item antes de carregar) — Task em edição já veio com os ids certos do próprio prop.
  useEffect(() => {
    if (carregando || task) return;
    const origem = conexoesOrigemPara(tipo, conexoes)[0];
    if (origem) setConexaoOrigemId(origem.id);
    if (conexoesDestino[0]) setConexaoDestinoId(conexoesDestino[0].id);
    if (tipo === "planilha" && origem) {
      setAba(origem.abas_disponiveis?.[0] ?? "");
    }
    if (tipo === "consulta_sql") {
      const c = consultas[0];
      if (c) {
        setConsultaId(c.id);
        aplicarNomeHerdado(nomeInternoConsultaApi(c.categoria, c.nome));
      }
    }
    const estrategiaPadrao = tipo === "planilha" || tipo === "api" ? estrategiasSubstituicao[0] : estrategias[0];
    if (estrategiaPadrao) setEstrategiaId(estrategiaPadrao.id);
    if (conexoesAs[0]) setConexaoAsId(conexoesAs[0].id);
    if (conexoesInternas[0]) setFonteConexaoId(conexoesInternas[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando]);

  function aplicarNomeHerdado(novoNome: string) {
    setNome(novoNome);
    if (!tabelaDestinoManual) setTabelaDestino(novoNome);
  }

  function alterarTabelaDestino(v: string) {
    setTabelaDestino(v);
    setTabelaDestinoManual(true);
  }

  const podeCriarTabelaConsulta = !!consultaId && !!estrategiaId && !!conexaoOrigemId && !!conexaoDestinoId;
  async function criarTabelaConsulta(nomeTabela: string, onEvento: (ev: EventoLog) => void) {
    await tasksApi.criarTabela(
      clienteId,
      {
        tipo: "consulta",
        nome_tabela: nomeTabela,
        conexao_destino_id: conexaoDestinoId,
        conexao_origem_id: conexaoOrigemId,
        consulta_id: consultaId,
        estrategia_id: estrategiaId,
      },
      onEvento,
    );
  }

  const podeCriarTabelaPlanilha = !!conexaoOrigemId && !!aba && !!conexaoDestinoId;
  async function criarTabelaPlanilha(nomeTabela: string, onEvento: (ev: EventoLog) => void) {
    await tasksApi.criarTabela(
      clienteId,
      {
        tipo: "input",
        nome_tabela: nomeTabela,
        conexao_destino_id: conexaoDestinoId,
        conexao_origem_id: conexaoOrigemId,
        aba,
      },
      onEvento,
    );
  }

  const podeCriarTabelaApi = !!conexaoOrigemId && !!conexaoDestinoId && camposSelecionados.length > 0;
  async function criarTabelaApi(nomeTabela: string, onEvento: (ev: EventoLog) => void) {
    await tasksApi.criarTabela(
      clienteId,
      {
        tipo: "api",
        nome_tabela: nomeTabela,
        conexao_destino_id: conexaoDestinoId,
        conexao_origem_id: conexaoOrigemId,
        campos_selecionados: camposSelecionados,
        metodo,
        rota,
      },
      onEvento,
    );
  }

  function mudarTipo(novoTipo: TipoTask) {
    setTipo(novoTipo);
    setConexaoOrigemId(conexoesOrigemPara(novoTipo, conexoes)[0]?.id ?? "");
    if (!nomeTravado) return;
    if (novoTipo === "consulta_sql") {
      const c = consultas[0];
      setConsultaId(c?.id ?? "");
      aplicarNomeHerdado(c ? nomeInternoConsultaApi(c.categoria, c.nome) : "");
    } else if (novoTipo === "processamento_as") {
      setFonteConexaoId(conexoesInternas[0]?.id ?? "");
      setFonteObjeto("");
      setConexaoAsId(conexoesAs[0]?.id ?? "");
      aplicarNomeHerdado("");
    } else {
      aplicarNomeHerdado("");
    }
  }

  function mudarConsulta(novoId: string) {
    setConsultaId(novoId);
    if (!nomeTravado) return;
    const c = consultas.find((x) => x.id === novoId);
    aplicarNomeHerdado(c ? nomeInternoConsultaApi(c.categoria, c.nome) : "");
  }

  function mudarConexaoOrigemPlanilha(novoId: string) {
    setConexaoOrigemId(novoId);
    const abas = conexoes.find((c) => c.id === novoId)?.abas_disponiveis ?? [];
    setAba(abas[0] ?? "");
  }

  function mudarFonteConexao(novoId: string) {
    setFonteConexaoId(novoId);
    setFonteObjeto("");
    if (nomeTravado) aplicarNomeHerdado("");
  }

  function selecionarFonteObjeto(novoNome: string) {
    setFonteObjeto(novoNome);
    if (nomeTravado) aplicarNomeHerdado(nomeTaskProcessamentoAs(novoNome));
  }

  const consultaEscolhida = consultas.find((c) => c.id === consultaId);
  const estrategiaEscolhida = estrategias.find((e) => e.id === estrategiaId);
  const podeVisualizarSql = !!consultaEscolhida && !!estrategiaEscolhida;
  const abasOrigem = conexoes.find((c) => c.id === conexaoOrigemId)?.abas_disponiveis ?? [];
  // Task Planilha é sempre Substituição (spec) — só deixa escolher/salvar com uma Estratégia
  // desse tipo; sem nenhuma cadastrada, a criação fica bloqueada (só Rascunho, como qualquer
  // outra Task sem destino explícito completo). Task API, por ora (sem campo de parâmetros
  // ainda implementado), segue a mesma trava — futuramente, com parâmetros de API, outros tipos
  // de Estratégia passam a fazer sentido.
  const estrategiasSubstituicao = estrategias.filter((e) => e.tipo === "substituicao");

  const ehTipoReal = tipo === "consulta_sql" || tipo === "planilha" || tipo === "api" || tipo === "processamento_as";
  const podeSalvar =
    nome.trim().length > 0 &&
    (tipo === "consulta_sql" ? !!consultaId && !!estrategiaId && !!conexaoDestinoId : true) &&
    (tipo === "planilha"
      ? !!estrategiaId && estrategiasSubstituicao.some((e) => e.id === estrategiaId) && !!conexaoOrigemId && !!conexaoDestinoId
      : true) &&
    (tipo === "api"
      ? !!conexaoOrigemId && !!rota.trim() && !!estrategiaId && estrategiasSubstituicao.some((e) => e.id === estrategiaId) && !!conexaoDestinoId
      : true) &&
    (tipo === "processamento_as" ? !!conexaoAsId && !!fonteConexaoId && !!fonteObjeto.trim() : true);

  /** Garante que existe um `ApiEndpoint` real refletindo os campos atuais do form — cria na
      primeira vez, atualiza dali em diante. Reusado tanto por "Salvar" quanto por "Conectar e
      Configurar Campos" (que precisa de um `endpoint_id` real pra chamar `/testar`). */
  async function garantirApiEndpoint(): Promise<ApiEndpointApi> {
    // `conexao_id` só é aceito na criação — o backend não permite trocar a origem de um
    // endpoint existente (ApiEndpointUpdate não tem esse campo).
    if (apiEndpointId) {
      return apiEndpointsApi.atualizar(clienteId, apiEndpointId, { nome, metodo, rota });
    }
    const criado = await apiEndpointsApi.criar(clienteId, { nome, conexao_id: conexaoOrigemId, metodo, rota });
    setApiEndpointId(criado.id);
    return criado;
  }

  async function abrirConfigCampos() {
    if (!conexaoOrigemId || !rota.trim()) {
      setErro("Preencha Conexão de Origem e Rota antes de testar o endpoint.");
      return;
    }
    setErro(null);
    setTestandoApi(true);
    try {
      const endpoint = await garantirApiEndpoint();
      const resultado = await apiEndpointsApi.testar(clienteId, endpoint.id);
      setDadosArvoreApi(paraDadosArvore(resultado.campos));
      setCamposModalAberto(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao testar o endpoint.");
    } finally {
      setTestandoApi(false);
    }
  }

  /** A Fonte já é uma Tabela/View real, existente no banco interno da Conexão-fonte escolhida
      (Tabela SQL carregada por outra Task, ou View criada via popup "Criar View") — só cria a
      Tabela do Analysis Services apontando pra ela. Sem edição depois de criada — mesmo limite de
      Medidas/Relacionamentos, o backend do Analysis Services só cria Tabela, nunca atualiza/exclui. */
  async function salvarProcessamentoAs() {
    await analysisServerApi.criarTabela(clienteId, conexaoAsId, {
      nome,
      tabela_origem: fonteObjeto,
      conexao_interna_id: fonteConexaoId,
    });
  }

  async function salvar() {
    if (!ehTipoReal) {
      setErro('Tasks do tipo "' + rotuloTipoTask[tipo] + '" ainda não são suportadas pelo motor — só Consulta SQL, Planilha, API e Processamento AS persistem por enquanto.');
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      if (tipo === "processamento_as") {
        await salvarProcessamentoAs();
        onSalvar();
        return;
      }
      // "Conectar e Configurar Campos" precisa de um ApiEndpoint real pra chamar `/testar` — mantido
      // à parte da Task de verdade abaixo mesmo pra tipo "api" (é só o mecanismo de descoberta de
      // campos; a Task é quem de fato roda o ETL, com seu próprio grafo compilável).
      if (tipo === "api") {
        await garantirApiEndpoint();
      }
      // Sintetiza o grafo (fluxo_nos/fluxo_conexoes) já no save do formulário guiado — Fluxo
      // (canvas) e Task (guiado) são a mesma coisa pro motor, então o guiado também precisa
      // entregar um grafo compilável de cara, sem depender de alguém abrir "Editar Fluxo" depois
      // (gap real: antes disso, uma Task guiada ficava sem fluxo_nos até a 1ª abertura do canvas).
      const taskParaFluxo: Task = {
        id: task?.id ?? "",
        tipo,
        nome,
        consultaId,
        estrategiaId,
        conexaoOrigemId,
        conexaoDestinoId,
        tabelaDestino,
        aba,
        metodo,
        rota,
        camposSelecionados,
      };
      const { nos: fluxoNos, conexoes: fluxoConexoes } = construirFluxoDaTask(taskParaFluxo, {
        conexoes,
        consultas,
        estrategias,
      });

      const payloadBase = { nome, estrategia_id: estrategiaId, conexao_origem_id: conexaoOrigemId, conexao_destino_id: conexaoDestinoId, tabela_destino: tabelaDestino || null, fluxo_nos: fluxoNos, fluxo_conexoes: fluxoConexoes };
      const payload =
        tipo === "consulta_sql"
          ? { ...payloadBase, tipo: "consulta" as const, consulta_id: consultaId }
          : tipo === "api"
            ? { ...payloadBase, tipo: "api" as const }
            : { ...payloadBase, tipo: "input" as const };
      let salva: TaskApi;
      if (task && !task.id.startsWith("task-")) {
        salva = await tasksApi.atualizar(clienteId, task.id, payload);
      } else {
        salva = await tasksApi.criar(clienteId, payload);
      }
      // Input (planilha) precisa da aba escolhida — Task real não guarda "aba" (isso vive no
      // Input, criado/atualizado sob demanda pelo compilador na hora de compilar/executar; aqui
      // só grava o que a Task em si já cobre. `aba` fica só de referência visual no form por ora).
      void salva;
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar task.");
    } finally {
      setEnviando(false);
    }
  }

  const campoTipo = (
    <div className="field task-form-campo-tipo">
      <label htmlFor="tf-tipo">Tipo</label>
      <select className="input" id="tf-tipo" value={tipo} onChange={(e) => mudarTipo(e.target.value as TipoTask)}>
        {tiposTaskPadrao.map((t) => (
          <option key={t} value={t}>
            {rotuloTipoTask[t]}
          </option>
        ))}
      </select>
    </div>
  );

  if (carregando) {
    return (
      <Dialog
        title={titulo}
        onClose={onClose}
        actions={
          <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={onClose}>
            Cancelar
          </button>
        }
      >
        <div className="text-muted">Carregando Conexões/Consultas/Estratégias...</div>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog
        title={titulo}
        onClose={onClose}
        wide
        className="task-form-dialog"
        actions={
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            {tipo === "processamento_as" && (
              <button type="button" className="btn btn-secondary" onClick={() => setCriarViewAberto(true)}>
                Criar View
              </button>
            )}
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={salvar} disabled={!podeSalvar || enviando}>
                {enviando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        }
      >
        {tipo !== "consulta_sql" && tipo !== "processamento_as" && campoTipo}

        {tipo !== "consulta_sql" && tipo !== "processamento_as" && (
          <div className="field">
            <label htmlFor="tf-nome">Nome da Task</label>
            <input className="input" id="tf-nome" placeholder="stage_metas" value={nome} onChange={(e) => aplicarNomeHerdado(e.target.value)} />
          </div>
        )}

        {tipo === "consulta_sql" && (
          <>
            {consultas.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Nenhuma Consulta SQL cadastrada ainda — crie uma na aba "Consultas (SQL)" primeiro.
              </div>
            )}
            {estrategias.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Nenhuma Estratégia cadastrada ainda — crie uma na aba "Estratégias de atualização" primeiro.
              </div>
            )}
            <div className="task-form-row task-form-row--consulta">
              {campoTipo}
              <div className="field">
                <label htmlFor="tf-consulta">Consulta SQL vinculada</label>
                <SearchableSelect
                  id="tf-consulta"
                  value={consultaId}
                  onChange={mudarConsulta}
                  options={consultas.map((c) => ({ value: c.id, label: nomeInternoConsultaApi(c.categoria, c.nome) }))}
                />
              </div>
              <div className="field">
                <label htmlFor="tf-estrategia">Estratégia de Atualização</label>
                <SearchableSelect
                  id="tf-estrategia"
                  value={estrategiaId}
                  onChange={setEstrategiaId}
                  options={estrategias.map((es) => ({ value: es.id, label: es.nome }))}
                />
              </div>
            </div>
            <CampoNomeHerdado
              label="Nome da Task"
              nome={nome}
              travado={nomeTravado}
              onDestravar={() => setNomeTravado(false)}
              onChange={aplicarNomeHerdado}
            />
            <div className="task-form-row task-form-row--2col">
              <div className="field">
                <label htmlFor="tf-conexao-origem">Conexão Origem</label>
                <SearchableSelect
                  id="tf-conexao-origem"
                  value={conexaoOrigemId}
                  onChange={setConexaoOrigemId}
                  options={conexoesOrigemPara(tipo, conexoes).map((c) => ({ value: c.id, label: c.nome }))}
                />
              </div>
              <div className="field">
                <label htmlFor="tf-conexao-destino">Conexão Destino</label>
                <SearchableSelect
                  id="tf-conexao-destino"
                  value={conexaoDestinoId}
                  onChange={setConexaoDestinoId}
                  options={conexoesDestino.map((c) => ({ value: c.id, label: c.nome }))}
                />
              </div>
            </div>
            <TabelaDestinoField
              value={tabelaDestino}
              onChange={alterarTabelaDestino}
              podeCriar={podeCriarTabelaConsulta}
              motivoBloqueio="Escolha Consulta SQL, Estratégia, Conexão Origem e Conexão Destino antes de criar a tabela."
              criarTabela={criarTabelaConsulta}
            />
            <div>
              <button type="button" className="btn btn-secondary" disabled={!podeVisualizarSql} onClick={() => setSqlAberto(true)}>
                Visualizar SQL
              </button>
            </div>
          </>
        )}

        {tipo === "planilha" && (
          <>
            {estrategiasSubstituicao.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Nenhuma Estratégia do tipo Substituição cadastrada ainda — Task Planilha exige uma
                (crie na aba "Estratégias de atualização" primeiro). Sem isso, só é possível salvar
                como Rascunho.
              </div>
            )}
            <div className="task-form-row task-form-row--2col">
              <div className="field">
                <label htmlFor="tf-conexao-origem">Conexão Origem</label>
                <SearchableSelect
                  id="tf-conexao-origem"
                  value={conexaoOrigemId}
                  onChange={mudarConexaoOrigemPlanilha}
                  options={conexoesOrigemPara(tipo, conexoes).map((c) => ({ value: c.id, label: c.nome }))}
                />
              </div>
              <div className="field">
                <label htmlFor="tf-aba">Aba</label>
                <select className="input" id="tf-aba" value={aba} onChange={(e) => setAba(e.target.value)}>
                  {abasOrigem.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                  {abasOrigem.length === 0 && <option value="">Nenhuma aba disponível (teste a conexão)</option>}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="tf-estrategia">Estratégia de Atualização</label>
              <SearchableSelect
                id="tf-estrategia"
                value={estrategiaId}
                onChange={setEstrategiaId}
                options={estrategiasSubstituicao.map((es) => ({ value: es.id, label: es.nome }))}
              />
            </div>
            <div className="field">
              <label htmlFor="tf-conexao-destino">Conexão Destino</label>
              <SearchableSelect
                id="tf-conexao-destino"
                value={conexaoDestinoId}
                onChange={setConexaoDestinoId}
                options={conexoesDestino.map((c) => ({ value: c.id, label: c.nome }))}
              />
            </div>
            <TabelaDestinoField
              value={tabelaDestino}
              onChange={alterarTabelaDestino}
              podeCriar={podeCriarTabelaPlanilha}
              motivoBloqueio="Escolha Conexão Origem, Aba e Conexão Destino antes de criar a tabela."
              criarTabela={criarTabelaPlanilha}
            />
          </>
        )}

        {tipo === "api" && (
          <>
            <div className="field">
              <label htmlFor="tf-conexao-origem">Conexão de Origem</label>
              <SearchableSelect
                id="tf-conexao-origem"
                value={conexaoOrigemId}
                onChange={setConexaoOrigemId}
                options={conexoesOrigemPara(tipo, conexoes).map((c) => ({ value: c.id, label: c.nome }))}
                disabled={!!apiEndpointId}
              />
              {apiEndpointId && (
                <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Conexão travada após a criação — o backend não permite trocar a origem de um endpoint existente.
                </div>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="tf-metodo">Método HTTP</label>
                <select className="input" id="tf-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoHttpApi)}>
                  {metodosHttpApi.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="tf-rota">Rota</label>
                <input className="input" id="tf-rota" placeholder="/users" value={rota} onChange={(e) => setRota(e.target.value)} />
              </div>
            </div>
            <div>
              <div className="card-kicker" style={{ marginBottom: 10 }}>
                Configuração de Campos
              </div>
              <button type="button" className="btn btn-secondary" onClick={abrirConfigCampos} disabled={testandoApi}>
                {testandoApi ? "Testando..." : "Conectar e Configurar Campos"}
              </button>
              {camposSelecionados.length > 0 && (
                <div className="text-muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                  {camposSelecionados.length} campo{camposSelecionados.length > 1 ? "s" : ""} selecionado
                  {camposSelecionados.length > 1 ? "s" : ""}.
                </div>
              )}
            </div>
            {estrategiasSubstituicao.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
                Nenhuma Estratégia do tipo Substituição cadastrada ainda — por ora, Task API só
                aceita esse tipo (crie na aba "Estratégias de atualização" primeiro). Sem isso, só
                é possível salvar como Rascunho.
              </div>
            )}
            <div className="field">
              <label htmlFor="tf-estrategia">Estratégia de Atualização</label>
              <SearchableSelect
                id="tf-estrategia"
                value={estrategiaId}
                onChange={setEstrategiaId}
                options={estrategiasSubstituicao.map((es) => ({ value: es.id, label: es.nome }))}
              />
            </div>
            <div className="field">
              <label htmlFor="tf-conexao-destino">Conexão Destino</label>
              <SearchableSelect
                id="tf-conexao-destino"
                value={conexaoDestinoId}
                onChange={setConexaoDestinoId}
                options={conexoesDestino.map((c) => ({ value: c.id, label: c.nome }))}
              />
            </div>
            <TabelaDestinoField
              value={tabelaDestino}
              onChange={alterarTabelaDestino}
              podeCriar={podeCriarTabelaApi}
              motivoBloqueio="Escolha Conexão Origem, Conexão Destino e selecione ao menos um campo antes de criar a tabela."
              criarTabela={criarTabelaApi}
            />
          </>
        )}

        {tipo === "processamento_as" && (
          <>
            <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Cria uma Tabela no Modelo Semântico (Analysis Services) a partir de uma tabela/view já
              carregada no banco interno. Sem edição depois de criada — o Analysis Services só cria
              Tabela, nunca atualiza/exclui (mesmo limite de Medidas/Relacionamentos).
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
              {campoTipo}
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="tf-conexao-as">Conexão Analysis Services</label>
                <select
                  className="input"
                  id="tf-conexao-as"
                  value={conexaoAsId}
                  onChange={(e) => setConexaoAsId(e.target.value)}
                  disabled={conexoesAs.length === 0}
                >
                  {conexoesAs.length === 0 && <option value="">Nenhuma conexão cadastrada</option>}
                  {conexoesAs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {conexoesAs.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: -8, marginBottom: 10 }}>
                Cadastre uma Conexão Analysis Services na aba Conexões primeiro.
              </div>
            )}

            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div className="field" style={{ flex: 1 }}>
                <label htmlFor="tf-fonte">Fonte</label>
                <select
                  className="input"
                  id="tf-fonte"
                  value={fonteConexaoId}
                  onChange={(e) => mudarFonteConexao(e.target.value)}
                  disabled={conexoesInternas.length === 0}
                >
                  {conexoesInternas.length === 0 && <option value="">Nenhuma conexão interna cadastrada</option>}
                  {conexoesInternas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!fonteConexaoId}
                onClick={() => setPickerTabelaAberto(true)}
              >
                Selecionar Tabela/View
              </button>
            </div>
            {conexoesInternas.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 4, marginBottom: 10 }}>
                Cadastre uma Conexão Interna na aba Conexões primeiro.
              </div>
            )}
            {fonteObjeto && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 4, marginBottom: 10 }}>
                Selecionado: <span className="visao-geral-valor-mono">{fonteObjeto}</span>
              </div>
            )}

            <CampoNomeHerdado
              label="Nome da Tabela (Analysis Services)"
              nome={nome}
              travado={nomeTravado}
              onDestravar={() => setNomeTravado(false)}
              onChange={aplicarNomeHerdado}
            />
          </>
        )}

        {erro && <div className="text-danger" style={{ fontSize: 13, marginTop: 8 }}>{erro}</div>}
      </Dialog>

      {sqlAberto && consultaEscolhida && estrategiaEscolhida && (
        <VisualizarSqlModalReal
          nomeConsulta={nomeInternoConsultaApi(consultaEscolhida.categoria, consultaEscolhida.nome)}
          sqlOriginal={consultaEscolhida.sql_texto ?? ""}
          estrategia={estrategiaEscolhida}
          nomeTabela={tabelaDestino}
          onClose={() => setSqlAberto(false)}
        />
      )}

      {camposModalAberto && (
        <ConfigurarCamposModal
          dados={dadosArvoreApi}
          selecionados={camposSelecionados}
          onClose={() => setCamposModalAberto(false)}
          onSalvar={async (selecionados) => {
            setCamposSelecionados(selecionados);
            setCamposModalAberto(false);
            if (apiEndpointId) {
              try {
                await apiEndpointsApi.atualizar(clienteId, apiEndpointId, { campos_selecionados: selecionados });
              } catch (e) {
                setErro(e instanceof ApiError ? e.message : "Falha ao salvar campos selecionados.");
              }
            }
          }}
        />
      )}

      {pickerTabelaAberto && fonteConexaoId && (
        <SelecionarTabelaOuViewModal
          clienteId={clienteId}
          conexaoId={fonteConexaoId}
          onClose={() => setPickerTabelaAberto(false)}
          onSelecionar={selecionarFonteObjeto}
        />
      )}

      {criarViewAberto && <CriarViewModal clienteId={clienteId} onClose={() => setCriarViewAberto(false)} onCriada={() => setCriarViewAberto(false)} />}
    </>
  );
}

/** Adapta `EstrategiaApi` (real) -> `Estrategia` (mock) pra reusar `VisualizarSqlModal` sem
    duplicar a lógica de preview de SQL, já validada. */
function VisualizarSqlModalReal(props: {
  nomeConsulta: string;
  sqlOriginal: string;
  estrategia: EstrategiaApi;
  nomeTabela: string;
  onClose: () => void;
}) {
  return <VisualizarSqlModal {...props} estrategia={paraEstrategiaMock(props.estrategia)} />;
}
