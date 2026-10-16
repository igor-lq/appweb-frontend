import { api } from "./client";

export type TipoConexaoInternaApi = "Postgres";
export const tiposConexaoInternaApi: TipoConexaoInternaApi[] = ["Postgres"];

export interface BancoInternoApi {
  id: string;
  nome: string;
}

export interface ConexaoInternaApi {
  id: string;
  nome: string;
  tipo: TipoConexaoInternaApi;
  host: string;
  porta: string;
  usuario: string;
  senha: string;
  bancos: BancoInternoApi[];
}

export interface ConexaoInternaPayload {
  nome: string;
  tipo: TipoConexaoInternaApi;
  host: string;
  porta: string;
  usuario: string;
  senha: string;
}

export interface TestarConexaoResultado {
  ok: boolean;
  mensagem?: string;
  databases?: string[];
}

export const conexoesInternasApi = {
  listar: () => api.get<ConexaoInternaApi[]>("/conexoes-internas"),
  criar: (payload: ConexaoInternaPayload) => api.post<ConexaoInternaApi>("/conexoes-internas", payload),
  atualizar: (id: string, payload: Partial<ConexaoInternaPayload>) =>
    api.patch<ConexaoInternaApi>(`/conexoes-internas/${id}`, payload),
  excluir: (id: string) => api.del(`/conexoes-internas/${id}`),
  criarBanco: (conexaoId: string, nome: string) =>
    api.post<BancoInternoApi>(`/conexoes-internas/${conexaoId}/bancos`, { nome }),
  /** Redundante com a sincronização automática que já roda ao listar — só
      um jeito manual explícito de disparar a mesma descoberta de bancos. */
  atualizarBancos: (conexaoId: string) =>
    api.post<ConexaoInternaApi>(`/conexoes-internas/${conexaoId}/atualizar-bancos`),
  bancosDisponiveis: (conexaoId: string) =>
    api.get<BancoInternoApi[]>(`/conexoes-internas/${conexaoId}/bancos-disponiveis`),
  testar: (conexaoId: string) =>
    api.post<TestarConexaoResultado>(`/conexoes-internas/${conexaoId}/testar-conexao`),
  testarAvulsa: (payload: Omit<ConexaoInternaPayload, "nome" | "tipo">) =>
    api.post<TestarConexaoResultado>("/conexoes-internas/testar-conexao", payload),
};
