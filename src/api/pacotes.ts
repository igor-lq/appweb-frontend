import { api, streamPost } from "./client";
import type { EventoLog } from "./types";

export interface TaskPacoteApi {
  task_id: string;
  /** Ativo=false: fica listada no Pacote, mas "Ativar Pacote" pula ela. */
  ativo: boolean;
}

export interface TabelaAsPacoteApi {
  conexao_id: string;
  tabela: string;
  /** Ativo=false: fica listada no Pacote, mas "Ativar Pacote" pula o Full Refresh dela. */
  ativo: boolean;
}

export interface PacoteApi {
  nome: string;
  tasks: TaskPacoteApi[];
  tabelas_analysis_server: TabelaAsPacoteApi[];
}

export const pacotesApi = {
  listar: (clienteId: string) => api.get<PacoteApi[]>(`/clientes/${clienteId}/pacotes`),
  obter: (clienteId: string, nome: string) => api.get<PacoteApi>(`/clientes/${clienteId}/pacotes/${nome}`),
  criar: (clienteId: string, payload: { nome: string; tasks: TaskPacoteApi[]; tabelas_analysis_server?: TabelaAsPacoteApi[] }) =>
    api.post<PacoteApi>(`/clientes/${clienteId}/pacotes`, payload),
  atualizar: (
    clienteId: string,
    nome: string,
    payload: { tasks: TaskPacoteApi[]; tabelas_analysis_server?: TabelaAsPacoteApi[] },
  ) => api.patch<PacoteApi>(`/clientes/${clienteId}/pacotes/${nome}`, payload),
  excluir: (clienteId: string, nome: string) => api.del(`/clientes/${clienteId}/pacotes/${nome}`),
  rodar: (clienteId: string, nome: string, onEvento: (evento: EventoLog) => void, execucaoId: string) =>
    streamPost(`/clientes/${clienteId}/pacotes/${nome}/rodar?execucao_id=${execucaoId}`, onEvento),
};
