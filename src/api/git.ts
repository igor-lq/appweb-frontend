import { api } from "./client";

/** Antes era um union fixo de 2 valores — desde que um cliente pode ter várias Conexões
    Analysis Services (cada uma com sua própria branch `modelo_tabular[_<chave>]`), a branch deixou
    de ser um conjunto fixo. `BRANCH_ETL` continua sendo a única constante real. */
export const BRANCH_ETL = "prj_python";
export type BranchGit = string;
export type StatusArquivoGitApi = "novo" | "modificado" | "removido";

/** Nome real da branch/worktree do Modelo Semântico de uma Conexão Analysis Services, a partir da
    sua `chave` — mesmo cálculo do backend (`core/etl_git.py::nome_branch_modelo_tabular`). A
    Conexão migrada da época do singleton usa a chave legada `"modelo_tabular"` (branch sem
    sufixo, idêntica ao que já está publicado no GitLab pra ela). */
export function nomeBranchModeloTabular(chave: string): string {
  return chave === "modelo_tabular" ? "modelo_tabular" : `modelo_tabular_${chave}`;
}

export interface ArquivoGitApi {
  caminho: string;
  status: StatusArquivoGitApi;
}

export interface RepositorioInfoApi {
  vinculado: boolean;
  url: string | null;
}

export interface RepositorioResultadoApi {
  url: string;
}

export interface PublicarResultadoApi {
  commit: string;
}

export interface PendenciaBranchApi {
  branch: string;
  pendente: boolean;
}

export const gitApi = {
  obterRepositorio: (clienteId: string) => api.get<RepositorioInfoApi>(`/clientes/${clienteId}/git/repositorio`),
  criarRepositorio: (clienteId: string) =>
    api.post<RepositorioResultadoApi>(`/clientes/${clienteId}/git/repositorio/criar`),
  vincularRepositorio: (clienteId: string, url: string) =>
    api.post<RepositorioResultadoApi>(`/clientes/${clienteId}/git/repositorio/vincular`, { url }),
  status: (clienteId: string, branch: BranchGit) =>
    api.get<ArquivoGitApi[]>(`/clientes/${clienteId}/git/status?branch=${encodeURIComponent(branch)}`),
  pendencias: (clienteId: string) => api.get<PendenciaBranchApi[]>(`/clientes/${clienteId}/git/pendencias`),
  publicar: (clienteId: string, branch: BranchGit, payload: { caminhos: string[]; mensagem: string }) =>
    api.post<PublicarResultadoApi>(`/clientes/${clienteId}/git/publicar?branch=${encodeURIComponent(branch)}`, payload),
};
