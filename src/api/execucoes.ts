import { api } from "./client";

/** Gera um id de execução no próprio front — vai junto na chamada de "Executar"/"Rodar" e é a
    chave que `cancelar` usa depois pra matar o subprocesso certo (ver `etl_bridge.py::_Execucao`).
    Não usa `crypto.randomUUID()` porque essa API só existe em contexto seguro (https/localhost) —
    o app roda em http puro num IP. */
export function gerarExecucaoId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

export const execucoesApi = {
  cancelar: (execucaoId: string) => api.post<{ cancelada: boolean }>(`/execucoes/${execucaoId}/cancelar`),
};
