import type { ConexaoFluxo, NoFluxo } from "../mocks/componentesFluxo";
import type { Task, TipoTask } from "../mocks/tasks";
import { classificarFluxo } from "../mocks/fluxoDeTask";
import { api, streamPost } from "./client";
import type { EventoLog } from "./types";

export type TipoTaskMotorApi = "consulta" | "input" | "api";
export type CategoriaApi = "Fato" | "dim" | "Stage" | "aux";

export interface TaskApi {
  id: string;
  cliente_id: string;
  nome: string;
  tipo: TipoTaskMotorApi;
  consulta_id: string | null;
  input_id: string | null;
  estrategia_id: string | null;
  conexao_origem_id: string | null;
  conexao_destino_id: string | null;
  tabela_destino: string | null;
  categoria: CategoriaApi | null;
  rascunho: boolean;
  fluxo_nos: NoFluxo[];
  fluxo_conexoes: ConexaoFluxo[];
}

export interface TaskPayload {
  nome: string;
  tipo: TipoTaskMotorApi;
  consulta_id?: string | null;
  input_id?: string | null;
  estrategia_id?: string | null;
  conexao_origem_id?: string | null;
  conexao_destino_id?: string | null;
  tabela_destino?: string | null;
  categoria?: CategoriaApi | null;
  rascunho?: boolean;
  fluxo_nos?: NoFluxo[];
  fluxo_conexoes?: ConexaoFluxo[];
}

export interface CompilacaoResultado {
  erros: { mensagem: string }[];
  task: Record<string, unknown> | null;
}

export interface TaskCriarTabelaPayload {
  tipo: TipoTaskMotorApi;
  nome_tabela: string;
  conexao_destino_id: string;
  conexao_origem_id: string;
  consulta_id?: string | null;
  estrategia_id?: string | null;
  aba?: string | null;
  campos_selecionados?: string[] | null;
  metodo?: string | null;
  rota?: string | null;
}

/** Adapta o shape real da API pro `Task` (mock) já consumido por
    `FluxoPage.tsx`/`TasksListTab.tsx`/`RascunhosTab.tsx` — evita reescrever
    esses componentes inteiros nesta leva. `tipo` é derivado (não vem direto
    do backend, que só conhece "consulta"/"input"): uma Task com grafo salvo
    (`fluxo_nos` não-vazio) só vira "fluxo_manual" se a FORMA do grafo não
    bater mais com o molde guiado do seu tipo original (`classificarFluxo`) —
    mesmo princípio de convergência entre formulário guiado e Fluxo Manual já
    usado no motor (`ETL_Classes/classificacao.py`). Bug real corrigido
    2026-09-01: antes qualquer grafo não-vazio virava "fluxo_manual" sem
    checar a forma — "Ajustar Layout" (só reposiciona nós) ou trocar qual
    Conexão um nó representa reclassificavam a Task pra sempre, mesmo sem
    nenhuma mudança estrutural real (`Task.tipo` no banco nunca muda depois
    de criada — `FluxoPage.tsx::salvar` nunca manda `tipo` no PATCH — então
    ele continua sendo a fonte confiável do tipo ORIGINAL quando o grafo
    ainda não existe ou quando `classificarFluxo` não reconhece a forma).
    `fluxoNos`/`fluxoConexoes` ficam `undefined` (não `[]`) quando vazios —
    `dadosIniciaisRef` em `FluxoPage.tsx` distingue "nunca editado pelo
    canvas" de "editado e ficou vazio" por truthiness, não por length. */
export function paraTaskMock(t: TaskApi): Task {
  const temGrafo = t.fluxo_nos.length > 0;
  const tipoOriginal: TipoTask = t.tipo === "consulta" ? "consulta_sql" : t.tipo === "api" ? "api" : "planilha";
  const tipo: TipoTask = temGrafo ? classificarFluxo(t.fluxo_nos, t.fluxo_conexoes) ?? "fluxo_manual" : tipoOriginal;
  return {
    id: t.id,
    tipo,
    nome: t.nome,
    consultaId: t.consulta_id ?? undefined,
    estrategiaId: t.estrategia_id ?? undefined,
    conexaoOrigemId: t.conexao_origem_id ?? undefined,
    conexaoDestinoId: t.conexao_destino_id ?? undefined,
    tabelaDestino: t.tabela_destino ?? undefined,
    rascunho: t.rascunho,
    fluxoNos: temGrafo ? t.fluxo_nos : undefined,
    fluxoConexoes: temGrafo ? t.fluxo_conexoes : undefined,
  };
}

export const tasksApi = {
  listar: (clienteId: string) => api.get<TaskApi[]>(`/clientes/${clienteId}/tasks`),
  criar: (clienteId: string, payload: TaskPayload) => api.post<TaskApi>(`/clientes/${clienteId}/tasks`, payload),
  atualizar: (clienteId: string, taskId: string, payload: Partial<TaskPayload>) =>
    api.patch<TaskApi>(`/clientes/${clienteId}/tasks/${taskId}`, payload),
  excluir: (clienteId: string, taskId: string) => api.del(`/clientes/${clienteId}/tasks/${taskId}`),
  compilar: (clienteId: string, taskId: string) =>
    api.post<CompilacaoResultado>(`/clientes/${clienteId}/tasks/${taskId}/compilar`),
  executar: (clienteId: string, taskId: string, onEvento: (evento: EventoLog) => void, execucaoId: string) =>
    streamPost(`/clientes/${clienteId}/tasks/${taskId}/executar?execucao_id=${execucaoId}`, onEvento),
  criarTabela: (clienteId: string, payload: TaskCriarTabelaPayload, onEvento: (evento: EventoLog) => void) =>
    streamPost(`/clientes/${clienteId}/tasks/criar-tabela`, onEvento, payload),
};
