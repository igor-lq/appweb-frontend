import { api } from "./client";

export type PerfilUsuarioApi = "Administrador" | "Analista ETL" | "Analista";

export interface UsuarioApi {
  id: string;
  nome: string;
  login: string;
  perfil: PerfilUsuarioApi;
  ativo: boolean;
}

export const usuariosApi = {
  listar: () => api.get<UsuarioApi[]>("/usuarios"),
  criar: (payload: { nome: string; login: string; perfil: PerfilUsuarioApi; senha_inicial: string }) =>
    api.post<UsuarioApi>("/usuarios", payload),
  atualizar: (id: string, payload: { nome?: string; perfil?: PerfilUsuarioApi; ativo?: boolean }) =>
    api.patch<UsuarioApi>(`/usuarios/${id}`, payload),
  excluir: (id: string) => api.del(`/usuarios/${id}`),
  resetarSenha: (id: string, novaSenha: string) =>
    api.post<{ ok: boolean }>(`/usuarios/${id}/resetar-senha`, { nova_senha: novaSenha }),
};
