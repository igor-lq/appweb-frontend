import { api } from "./client";

export type StatusClienteApi = "ativo" | "bloqueado" | "inativo";

export interface ClienteApi {
  id: string;
  nome: string;
  label: string;
  label_interna: string;
  git_url: string | null;
  status: StatusClienteApi;
  lock_por: { id: string; nome: string } | null;
  lock_data_hora: string | null;
}

export const clientesApi = {
  listar: () => api.get<ClienteApi[]>("/clientes"),
  obter: (id: string) => api.get<ClienteApi>(`/clientes/${id}`),
  criar: (payload: { nome: string; label: string }) => api.post<ClienteApi>("/clientes", payload),
  atualizar: (id: string, payload: { nome?: string; git_url?: string; status?: StatusClienteApi }) =>
    api.patch<ClienteApi>(`/clientes/${id}`, payload),
  excluirPermanente: (id: string, senha: string) => api.post<void>(`/clientes/${id}/excluir-permanente`, { senha }),
  lock: (id: string) => api.post<ClienteApi>(`/clientes/${id}/lock`),
  unlock: (id: string) => api.post<ClienteApi>(`/clientes/${id}/unlock`),
};
