import { api } from "./client";

export interface ResponsavelApi {
  id: string;
  cliente_id: string;
  nome: string;
  email: string;
  celular: string | null;
  cargo: string | null;
  principal: boolean;
}

export interface ResponsavelPayload {
  nome: string;
  email: string;
  celular?: string | null;
  cargo?: string | null;
  principal?: boolean;
}

export const responsaveisApi = {
  listar: (clienteId: string) => api.get<ResponsavelApi[]>(`/clientes/${clienteId}/responsaveis`),
  criar: (clienteId: string, payload: ResponsavelPayload) =>
    api.post<ResponsavelApi>(`/clientes/${clienteId}/responsaveis`, payload),
  atualizar: (clienteId: string, id: string, payload: ResponsavelPayload) =>
    api.patch<ResponsavelApi>(`/clientes/${clienteId}/responsaveis/${id}`, payload),
  excluir: (clienteId: string, id: string) => api.del(`/clientes/${clienteId}/responsaveis/${id}`),
};
