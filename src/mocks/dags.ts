export interface Dag {
  id: string;
  nome: string;
  pacotes: string[];
  schedule: string;
  startDate: string;
  description: string;
}

export const dagsPorCliente: Record<string, Dag[]> = {
  "cooperativa-vale-norte": [
    {
      id: "diario",
      nome: "cooperativa_vale_norte_diario",
      pacotes: ["faturamento_diario", "estoque_noturno"],
      schedule: "0 6 * * *",
      startDate: "2025-01-01",
      description: "Execução diária às 6h — faturamento e estoque.",
    },
  ],
};
