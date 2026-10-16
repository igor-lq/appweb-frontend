export type TipoEstrategia = "Substituição" | "Incremental" | "Reprocessamento Recente" | "Full por Período" | "Upsert";
export type UnidadePeriodo = "Dia" | "Mês" | "Ano";

export const tiposEstrategia: TipoEstrategia[] = [
  "Substituição",
  "Incremental",
  "Reprocessamento Recente",
  "Full por Período",
  "Upsert",
];

export const unidadesPeriodo: UnidadePeriodo[] = ["Dia", "Mês", "Ano"];

export interface Estrategia {
  id: string;
  nome: string;
  tipo: TipoEstrategia;
  // Reprocessamento Recente
  filtroQuantidade?: number;
  filtroUnidade?: UnidadePeriodo;
  // Full por Período
  dataInicial?: string;
  dataFinal?: string;
  segmentacaoQuantidade?: number;
  segmentacaoUnidade?: UnidadePeriodo;
}

/** Linha de resumo mostrada na lista/detalhe, conforme o tipo. */
export function resumoEstrategia(e: Estrategia): string | null {
  if (e.tipo === "Reprocessamento Recente" && e.filtroQuantidade && e.filtroUnidade) {
    return `últimos ${e.filtroQuantidade} ${e.filtroUnidade.toLowerCase()}${e.filtroQuantidade > 1 ? "s" : ""}`;
  }
  if (e.tipo === "Full por Período" && e.dataInicial && e.dataFinal) {
    const seg = e.segmentacaoQuantidade && e.segmentacaoUnidade
      ? ` · segmentado a cada ${e.segmentacaoQuantidade} ${e.segmentacaoUnidade.toLowerCase()}`
      : "";
    return `${e.dataInicial} a ${e.dataFinal}${seg}`;
  }
  return null;
}

export const estrategiasPorCliente: Record<string, Estrategia[]> = {
  "cooperativa-vale-norte": [
    { id: "realtime-5dias", nome: "realtime_5dias", tipo: "Reprocessamento Recente", filtroQuantidade: 5, filtroUnidade: "Dia" },
    { id: "recente-3meses", nome: "recente_3meses", tipo: "Reprocessamento Recente", filtroQuantidade: 3, filtroUnidade: "Mês" },
    { id: "carga-full-2024", nome: "carga_full_2024", tipo: "Full por Período", dataInicial: "2024-01-01", dataFinal: "2024-12-31", segmentacaoQuantidade: 1, segmentacaoUnidade: "Mês" },
    { id: "substituicao-padrao", nome: "substituicao_padrao", tipo: "Substituição" },
    { id: "incremental-padrao", nome: "incremental_padrao", tipo: "Incremental" },
    { id: "upsert-teste", nome: "upsert_teste", tipo: "Upsert" },
  ],
};
