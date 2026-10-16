export interface TaskPacote {
  id: string;
  taskId: string;
}

export interface Pacote {
  id: string;
  nome: string;
  tasks: TaskPacote[];
}

export const pacotesPorCliente: Record<string, Pacote[]> = {
  "cooperativa-vale-norte": [
    {
      id: "faturamento-diario",
      nome: "faturamento_diario",
      tasks: [
        { id: "pt1", taskId: "t1" },
        { id: "pt2", taskId: "t2" },
      ],
    },
    {
      id: "estoque-noturno",
      nome: "estoque_noturno",
      tasks: [{ id: "pt3", taskId: "t3" }],
    },
  ],
};
