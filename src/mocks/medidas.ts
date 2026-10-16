export interface Medida {
  id: string;
  nome: string;
  pasta: string;
  formato: string;
  expressao: string;
}

export const medidasPorCliente: Record<string, Medida[]> = {
  "cooperativa-vale-norte": [
    { id: "m1", nome: "Valor Total Faturado", pasta: "Financeiro", formato: "#,##0.00", expressao: "SUM('fato_faturamento'[valor_total])" },
    { id: "m2", nome: "Ticket Médio", pasta: "Financeiro", formato: "#,##0.00", expressao: "DIVIDE([Valor Total Faturado], COUNTROWS('fato_faturamento'))" },
    { id: "m3", nome: "Qtd Notas Emitidas", pasta: "Financeiro", formato: "#,##0", expressao: "COUNTROWS('fato_faturamento')" },
    { id: "m4", nome: "Qtd Clientes Ativos", pasta: "Comercial", formato: "#,##0", expressao: "DISTINCTCOUNT('dim_clientes_delta'[id_cliente])" },
    { id: "m5", nome: "Estoque em Unidades", pasta: "Estoque", formato: "#,##0", expressao: "SUM('stage_estoque_full'[quantidade])" },
  ],
};
