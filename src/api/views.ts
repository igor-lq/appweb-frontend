import { api } from "./client";

export interface ViewApi {
  id: string;
  cliente_id: string;
  nome: string;
  sql_texto: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const viewsApi = {
  listar: (clienteId: string) => api.get<ViewApi[]>(`/clientes/${clienteId}/views`),
  criar: (clienteId: string, payload: { nome: string; sql_texto: string; conexao_interna_id: string }) =>
    api.post<ViewApi>(`/clientes/${clienteId}/views`, payload),
  atualizar: (clienteId: string, id: string, payload: { sql_texto: string }) =>
    api.patch<ViewApi>(`/clientes/${clienteId}/views/${id}`, payload),
  recriar: (clienteId: string, id: string, payload: { sql_texto: string }) =>
    api.post<ViewApi>(`/clientes/${clienteId}/views/${id}/recriar`, payload),
  excluir: (clienteId: string, id: string) => api.del(`/clientes/${clienteId}/views/${id}`),
};

/** Nome real da view no banco interno (`vw_<slug>`) — mesma regra de
    `backend/app/utils/nomes.py::nome_interno_view`, replicada aqui só pra montar
    `tabela_origem` na hora de criar a Tabela do Analysis Services a partir de uma View
    recém-criada/atualizada (evita um round-trip extra só pra descobrir o nome real). */
export function nomeInternoView(nome: string): string {
  const slug = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_\s]/g, "")
    .replace(/\s+/g, "_");
  return `vw_${slug}`;
}
