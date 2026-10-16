import { api } from "./client";

export interface ClienteComTravaApi {
  cliente_id: string;
  cliente_nome: string;
  usuario_nome: string;
  lock_data_hora: string;
}

export interface ConexaoComFalhaApi {
  cliente_id: string;
  cliente_nome: string;
  conexao_nome: string;
  mensagem: string | null;
  ultima_verificacao: string | null;
}

export interface ClienteGitPendenteApi {
  cliente_id: string;
  cliente_nome: string;
  arquivos_pendentes: number;
}

export interface DashboardApi {
  clientes_ativos: number;
  usuarios_logados_agora: number;
  clientes_com_trava: ClienteComTravaApi[];
  conexoes_com_falha: ConexaoComFalhaApi[];
  clientes_git_pendente: ClienteGitPendenteApi[];
}

export const dashboardApi = {
  obter: () => api.get<DashboardApi>("/dashboard"),
};
