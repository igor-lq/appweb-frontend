import { api } from "./client";

export interface ItemArquivoApi {
  nome: string;
  tipo: "pasta" | "arquivo";
}

export interface ConteudoArquivoApi {
  caminho: string;
  conteudo: string;
}

export const arquivosApi = {
  listar: (clienteId: string, caminho: string) =>
    api.get<ItemArquivoApi[]>(`/clientes/${clienteId}/arquivos?caminho=${encodeURIComponent(caminho)}`),
  conteudo: (clienteId: string, caminho: string) =>
    api.get<ConteudoArquivoApi>(`/clientes/${clienteId}/arquivos/conteudo?caminho=${encodeURIComponent(caminho)}`),
};
