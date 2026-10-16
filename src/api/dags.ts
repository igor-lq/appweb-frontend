import { api } from "./client";

export interface PacoteDagItemApi {
  nome: string;
  ativo: boolean;
}

export interface DagApi {
  nome: string;
  pacotes: PacoteDagItemApi[];
  schedule: string;
  description: string;
  start_date: string;
}

export const dagsApi = {
  listar: (clienteId: string) => api.get<DagApi[]>(`/clientes/${clienteId}/dags`),
  obter: (clienteId: string, nome: string) => api.get<DagApi>(`/clientes/${clienteId}/dags/${nome}`),
  criar: (
    clienteId: string,
    payload: { nome: string; pacotes: PacoteDagItemApi[]; schedule: string; description?: string; start_date: string },
  ) => api.post<DagApi>(`/clientes/${clienteId}/dags`, payload),
  atualizar: (
    clienteId: string,
    nome: string,
    payload: {
      nome?: string;
      pacotes: PacoteDagItemApi[];
      schedule: string;
      description?: string;
      start_date: string;
    },
  ) => api.patch<DagApi>(`/clientes/${clienteId}/dags/${nome}`, payload),
  excluir: (clienteId: string, nome: string) => api.del(`/clientes/${clienteId}/dags/${nome}`),
};
