import { api } from "./client";
import type { Estrategia } from "../mocks/estrategias";

export type TipoEstrategiaApi = "substituicao" | "incremental" | "reprocessamento_recente" | "full_por_periodo" | "upsert";
export type UnidadePeriodoApi = "Dia" | "Mês" | "Ano";

export const tiposEstrategiaApi: TipoEstrategiaApi[] = [
  "substituicao",
  "incremental",
  "reprocessamento_recente",
  "full_por_periodo",
  "upsert",
];
export const unidadesPeriodoApi: UnidadePeriodoApi[] = ["Dia", "Mês", "Ano"];

export const ROTULO_TIPO_ESTRATEGIA: Record<TipoEstrategiaApi, string> = {
  substituicao: "Substituição",
  incremental: "Incremental",
  reprocessamento_recente: "Reprocessamento Recente",
  full_por_periodo: "Full por Período",
  upsert: "Upsert",
};

export interface EstrategiaApi {
  id: string;
  cliente_id: string;
  nome: string;
  tipo: TipoEstrategiaApi;
  ativo: boolean;
  quantidade_janela: number | null;
  unidade_janela: UnidadePeriodoApi | null;
  data_inicial: string | null;
  data_final: string | null;
  quantidade_segmentacao: number | null;
  unidade_segmentacao: UnidadePeriodoApi | null;
  chaves_upsert: string[] | null;
}

export interface EstrategiaPayload {
  nome: string;
  tipo: TipoEstrategiaApi;
  quantidade_janela?: number | null;
  unidade_janela?: UnidadePeriodoApi | null;
  data_inicial?: string | null;
  data_final?: string | null;
  quantidade_segmentacao?: number | null;
  unidade_segmentacao?: UnidadePeriodoApi | null;
  chaves_upsert?: string[] | null;
}

export const estrategiasApi = {
  listar: (clienteId: string) => api.get<EstrategiaApi[]>(`/clientes/${clienteId}/estrategias`),
  criar: (clienteId: string, payload: EstrategiaPayload) =>
    api.post<EstrategiaApi>(`/clientes/${clienteId}/estrategias`, payload),
  atualizar: (clienteId: string, id: string, payload: Partial<EstrategiaPayload>) =>
    api.patch<EstrategiaApi>(`/clientes/${clienteId}/estrategias/${id}`, payload),
  excluir: (clienteId: string, id: string) => api.del(`/clientes/${clienteId}/estrategias/${id}`),
};

/** Linha de resumo mostrada na lista/detalhe, conforme o tipo — espelha
    `mocks/estrategias.ts::resumoEstrategia`, agora sobre o shape real da API. */
export function resumoEstrategiaApi(e: EstrategiaApi): string | null {
  if (e.tipo === "reprocessamento_recente" && e.quantidade_janela && e.unidade_janela) {
    return `últimos ${e.quantidade_janela} ${e.unidade_janela.toLowerCase()}${e.quantidade_janela > 1 ? "s" : ""}`;
  }
  if (e.tipo === "full_por_periodo" && e.data_inicial && e.data_final) {
    const seg =
      e.quantidade_segmentacao && e.unidade_segmentacao
        ? ` · segmentado a cada ${e.quantidade_segmentacao} ${e.unidade_segmentacao.toLowerCase()}`
        : "";
    return `${e.data_inicial} a ${e.data_final}${seg}`;
  }
  return null;
}

/** Converte pro shape mock (`mocks/estrategias.ts::Estrategia`) — reusado por
    `utils/sqlEfetivo.ts`/`VisualizarSqlModal.tsx`, lógica já validada de preview de SQL que não
    precisa ser duplicada só porque o dado agora vem da API real. */
export function paraEstrategiaMock(e: EstrategiaApi): Estrategia {
  return {
    id: e.id,
    nome: e.nome,
    tipo: ROTULO_TIPO_ESTRATEGIA[e.tipo] as Estrategia["tipo"],
    filtroQuantidade: e.quantidade_janela ?? undefined,
    filtroUnidade: e.unidade_janela ?? undefined,
    dataInicial: e.data_inicial ?? undefined,
    dataFinal: e.data_final ?? undefined,
    segmentacaoQuantidade: e.quantidade_segmentacao ?? undefined,
    segmentacaoUnidade: e.unidade_segmentacao ?? undefined,
  };
}
