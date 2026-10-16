import { api, streamPost } from "./client";
import type { EventoLog } from "./types";
import type { Task } from "../mocks/tasks";

export interface ColunaTmdlApi {
  nome: string;
  tipo: string;
  coluna_origem: string | null;
}

export interface MedidaTmdlApi {
  nome: string;
  expressao: string;
  pasta: string | null;
  format_string: string | null;
}

export interface TabelaTmdlApi {
  nome: string;
  colunas: ColunaTmdlApi[];
  medidas: MedidaTmdlApi[];
}

export type CardinalidadeRelacionamentoApi = "um" | "muitos";

export interface RelacionamentoTmdlApi {
  nome: string;
  tabela_de: string;
  coluna_de: string;
  tabela_para: string;
  coluna_para: string;
  cardinalidade_de: CardinalidadeRelacionamentoApi;
  cardinalidade_para: CardinalidadeRelacionamentoApi;
  ativo: boolean;
}

export interface TablePermissionTmdlApi {
  tabela: string;
  filtro: string;
}

export interface RoleTmdlApi {
  nome: string;
  model_permission: string;
  permissoes_tabela: TablePermissionTmdlApi[];
}

export interface ModeloTabularApi {
  tabelas: TabelaTmdlApi[];
  relacionamentos: RelacionamentoTmdlApi[];
  roles: RoleTmdlApi[];
  atualizado_do_git: boolean;
}

export interface DatabaseASApi {
  id: string;
  instancia_as_id: string;
  nome: string;
}

export interface InstanciaASApi {
  id: string;
  nome: string;
  host: string;
  porta: string;
  token: string;
  databases: DatabaseASApi[];
}

export interface InstanciaASPayload {
  nome: string;
  host: string;
  porta: string;
  token: string;
}

export interface TestarInstanciaResultado {
  ok: boolean;
  mensagem?: string;
  databases?: string[];
}

export const analysisServerApi = {
  obterModelo: (clienteId: string, conexaoId: string) =>
    api.get<ModeloTabularApi>(`/clientes/${clienteId}/analysis-server/${conexaoId}/modelo`),
  criarTabela: (
    clienteId: string,
    conexaoId: string,
    payload: { nome: string; tabela_origem: string; conexao_interna_id: string },
  ) => api.post<{ nome: string }>(`/clientes/${clienteId}/analysis-server/${conexaoId}/tabelas`, payload),
  salvarMedida: (
    clienteId: string,
    conexaoId: string,
    payload: { nome: string; expressao: string; pasta?: string | null; format_string?: string | null },
  ) => api.post<MedidaTmdlApi>(`/clientes/${clienteId}/analysis-server/${conexaoId}/medidas`, payload),
  excluirMedida: (clienteId: string, conexaoId: string, nomeMedida: string) =>
    api.del(`/clientes/${clienteId}/analysis-server/${conexaoId}/medidas/${encodeURIComponent(nomeMedida)}`),
  adicionarRelacionamento: (
    clienteId: string,
    conexaoId: string,
    payload: {
      nome: string;
      tabela_de: string;
      coluna_de: string;
      tabela_para: string;
      coluna_para: string;
      cardinalidade_de: CardinalidadeRelacionamentoApi;
      cardinalidade_para: CardinalidadeRelacionamentoApi;
      ativo: boolean;
    },
  ) => api.post<RelacionamentoTmdlApi>(`/clientes/${clienteId}/analysis-server/${conexaoId}/relacionamentos`, payload),
  editarRelacionamento: (
    clienteId: string,
    conexaoId: string,
    nome: string,
    payload: Partial<{
      tabela_de: string;
      coluna_de: string;
      tabela_para: string;
      coluna_para: string;
      cardinalidade_de: CardinalidadeRelacionamentoApi;
      cardinalidade_para: CardinalidadeRelacionamentoApi;
      ativo: boolean;
    }>,
  ) =>
    api.patch<RelacionamentoTmdlApi>(
      `/clientes/${clienteId}/analysis-server/${conexaoId}/relacionamentos/${encodeURIComponent(nome)}`,
      payload,
    ),
  excluirRelacionamento: (clienteId: string, conexaoId: string, nome: string) =>
    api.del(`/clientes/${clienteId}/analysis-server/${conexaoId}/relacionamentos/${encodeURIComponent(nome)}`),
  adicionarRole: (
    clienteId: string,
    conexaoId: string,
    payload: { nome: string; model_permission: string; permissoes_tabela: TablePermissionTmdlApi[] },
  ) => api.post<RoleTmdlApi>(`/clientes/${clienteId}/analysis-server/${conexaoId}/roles`, payload),
  editarRole: (
    clienteId: string,
    conexaoId: string,
    nome: string,
    payload: Partial<{ model_permission: string; permissoes_tabela: TablePermissionTmdlApi[] }>,
  ) =>
    api.patch<RoleTmdlApi>(
      `/clientes/${clienteId}/analysis-server/${conexaoId}/roles/${encodeURIComponent(nome)}`,
      payload,
    ),
  excluirRole: (clienteId: string, conexaoId: string, nome: string) =>
    api.del(`/clientes/${clienteId}/analysis-server/${conexaoId}/roles/${encodeURIComponent(nome)}`),
  deploy: (clienteId: string, conexaoId: string, onEvento: (evento: EventoLog) => void) =>
    streamPost(`/clientes/${clienteId}/analysis-server/${conexaoId}/deploy`, onEvento),
  refreshTabela: (clienteId: string, conexaoId: string, nomeTabela: string, onEvento: (evento: EventoLog) => void) =>
    streamPost(
      `/clientes/${clienteId}/analysis-server/${conexaoId}/tabelas/${encodeURIComponent(nomeTabela)}/refresh`,
      onEvento,
    ),
  listarInstancias: () => api.get<InstanciaASApi[]>("/instancias-as"),
  criarInstancia: (payload: InstanciaASPayload) => api.post<InstanciaASApi>("/instancias-as", payload),
  testarInstancia: (instanciaId: string) =>
    api.post<TestarInstanciaResultado>(`/instancias-as/${instanciaId}/testar-conexao`),
  bancosDisponiveis: (instanciaId: string) =>
    api.get<DatabaseASApi[]>(`/instancias-as/${instanciaId}/bancos-disponiveis`),
  criarBanco: (instanciaId: string, nome: string) =>
    api.post<DatabaseASApi>(`/instancias-as/${instanciaId}/bancos`, { nome }),
};

/** Uma Conexão Analysis Services está com Deploy pendente quando teve alteração depois do último
    deploy (ou nunca fez deploy nenhum, tendo pelo menos uma alteração salva) — a própria Conexao
    guarda `ultima_alteracao_em`/`ultimo_deploy_em` agora (não existe mais uma configuração
    separada). */
export function temDeployPendente(c: { ultima_alteracao_em: string | null; ultimo_deploy_em: string | null } | null | undefined): boolean {
  if (!c || !c.ultima_alteracao_em) return false;
  if (!c.ultimo_deploy_em) return true;
  return new Date(c.ultima_alteracao_em) > new Date(c.ultimo_deploy_em);
}

const SEPARADOR_ID_TABELA_AS = "::";

/** Uma Tabela do Modelo Semântico só é única dentro da sua PRÓPRIA Conexão — um cliente com
    várias Conexões Analysis Services pode ter tabelas de mesmo nome em conexões diferentes. Esse
    id composto (`<conexaoId>::<nomeTabela>`) é o que dá unicidade real pro React (`key`) e pra
    saber qual Conexão/Instância acionar num Full Refresh — nunca o nome da tabela sozinho. */
export function idTabelaProcessamentoAs(conexaoId: string, nomeTabela: string): string {
  return `${conexaoId}${SEPARADOR_ID_TABELA_AS}${nomeTabela}`;
}

export function partirIdProcessamentoAs(id: string): { conexaoId: string; nomeTabela: string } {
  const indice = id.indexOf(SEPARADOR_ID_TABELA_AS);
  if (indice === -1) return { conexaoId: "", nomeTabela: id };
  return { conexaoId: id.slice(0, indice), nomeTabela: id.slice(indice + SEPARADOR_ID_TABELA_AS.length) };
}

/** Tabela do Analysis Services -> shape mock `Task` (tipo "processamento_as"), mesmo princípio de
    `paraTaskMockApi` — reaproveita a lista/detalhe/"Ativar" já validados de `TasksListTab.tsx`.
    O TMDL não guarda de volta "veio de Tabela SQL ou de View" nem o nome da fonte original, então
    `fonteTipo`/`fonteNome` ficam undefined — o detalhe mostra fatos reais (colunas/medidas) no
    lugar, não uma fonte fabricada. */
export function paraTaskMockProcessamentoAs(t: TabelaTmdlApi, conexaoId: string): Task {
  return { id: idTabelaProcessamentoAs(conexaoId, t.nome), tipo: "processamento_as", nome: t.nome };
}
