import { api, streamPost } from "./client";
import type { EventoLog } from "./types";
import type { Task } from "../mocks/tasks";

export type MetodoHttpApi = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export const metodosHttpApi: MetodoHttpApi[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export interface ApiEndpointApi {
  id: string;
  cliente_id: string;
  conexao_id: string;
  nome: string;
  metodo: MetodoHttpApi;
  rota: string;
  campos_selecionados: string[];
  suporta_paginacao: boolean;
  ativo: boolean;
}

export interface ApiEndpointPayload {
  nome: string;
  conexao_id: string;
  metodo: MetodoHttpApi;
  rota: string;
}

export interface CampoJsonApi {
  label: string;
  filhos?: CampoJsonApi[];
}

export const apiEndpointsApi = {
  listar: (clienteId: string) => api.get<ApiEndpointApi[]>(`/clientes/${clienteId}/api-endpoints`),
  criar: (clienteId: string, payload: ApiEndpointPayload) =>
    api.post<ApiEndpointApi>(`/clientes/${clienteId}/api-endpoints`, payload),
  atualizar: (clienteId: string, id: string, payload: Partial<ApiEndpointPayload & { campos_selecionados: string[] }>) =>
    api.patch<ApiEndpointApi>(`/clientes/${clienteId}/api-endpoints/${id}`, payload),
  excluir: (clienteId: string, id: string) => api.del(`/clientes/${clienteId}/api-endpoints/${id}`),
  testar: (clienteId: string, id: string) =>
    api.post<{ campos: CampoJsonApi[] }>(`/clientes/${clienteId}/api-endpoints/${id}/testar`),
  executar: (clienteId: string, id: string, onEvento: (evento: EventoLog) => void) =>
    streamPost(`/clientes/${clienteId}/api-endpoints/${id}/executar`, onEvento),
};

/** Reconstrói um objeto JS "de mentira" a partir da árvore descoberta pelo backend
    (`{label, filhos}[]`) — folha vira `null`, grupo vira objeto aninhado, lista vira `[objeto]` —
    só pra reaproveitar `JsonFieldTree.tsx`/`ConfigurarCamposModal.tsx` (já validados, andam sobre
    JSON bruto) sem precisar reescrevê-los pro formato pré-processado que o backend devolve. */
export function paraDadosArvore(campos: CampoJsonApi[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const campo of campos) {
    obj[campo.label] = campo.filhos ? paraDadosArvore(campo.filhos) : null;
  }
  return obj;
}

/** `ApiEndpoint` não é uma `Task` de verdade no backend (motor só executa `consulta`/`input`,
    ver `TipoTaskMotor`) — mas a lista/detalhe/edição de Tasks (`TasksListTab.tsx`) reaproveita o
    shape mock `Task` pra aba "API", já que a UX (busca, painel de detalhes, editar/excluir) é
    idêntica. */
export function paraTaskMockApi(ep: ApiEndpointApi): Task {
  return {
    id: ep.id,
    tipo: "api",
    nome: ep.nome,
    conexaoOrigemId: ep.conexao_id,
    metodo: ep.metodo,
    rota: ep.rota,
    camposSelecionados: ep.campos_selecionados,
  };
}
