export type Direcionamento = "Um para Muitos" | "Muitos para Um" | "Muitos para Muitos" | "Um para Um";

export const direcionamentos: Direcionamento[] = [
  "Um para Muitos",
  "Muitos para Um",
  "Muitos para Muitos",
  "Um para Um",
];

/** Labels dos dois campos de tabela/coluna, na ordem [linha 1, linha 2], conforme o
    direcionamento escolhido. */
export const labelsDirecionamento: Record<Direcionamento, [string, string]> = {
  "Um para Muitos": ["Tabela (lado um)", "Tabela (lado muitos)"],
  "Muitos para Um": ["Tabela (lado muitos)", "Tabela (lado um)"],
  "Muitos para Muitos": ["Tabela (lado A)", "Tabela (lado B)"],
  "Um para Um": ["Tabela (lado A)", "Tabela (lado B)"],
};

export interface TabelaModelo {
  nome: string;
  colunas: string[];
}

export const tabelasModeloPorCliente: Record<string, TabelaModelo[]> = {
  "cooperativa-vale-norte": [
    { nome: "fato_faturamento", colunas: ["id_nota", "id_cliente", "datavencimento", "valor_total"] },
    { nome: "dim_clientes_delta", colunas: ["id_cliente", "razao_social", "cidade", "uf"] },
    { nome: "stage_estoque_full", colunas: ["id_produto", "quantidade", "deposito"] },
    { nome: "aux_titulos_a_receber", colunas: ["id_titulo", "id_cliente", "valor", "datavencimento"] },
  ],
};

export interface Relacionamento {
  id: string;
  direcionamento: Direcionamento;
  tabela1: string;
  coluna1: string;
  tabela2: string;
  coluna2: string;
}

export const relacionamentosPorCliente: Record<string, Relacionamento[]> = {
  "cooperativa-vale-norte": [
    {
      id: "r1",
      direcionamento: "Muitos para Um",
      tabela1: "fato_faturamento",
      coluna1: "id_cliente",
      tabela2: "dim_clientes_delta",
      coluna2: "id_cliente",
    },
  ],
};
