export type BranchGit = "prj_python" | "modelo_tabular";
export type StatusArquivoGit = "novo" | "modificado" | "removido";

export interface ArquivoGit {
  caminho: string;
  status: StatusArquivoGit;
}

export const arquivosPendentesPorCliente: Record<string, Record<BranchGit, ArquivoGit[]>> = {
  "cooperativa-vale-norte": {
    prj_python: [
      { caminho: "Consultas/faturamento/consulta.sql", status: "modificado" },
      { caminho: "Consultas/faturamento/config_atualizacao.yaml", status: "modificado" },
      { caminho: "Pacotes/faturamento_diario.py", status: "novo" },
      { caminho: "Dags/cooperativa_vale_norte_diario.py", status: "novo" },
    ],
    modelo_tabular: [{ caminho: "Medidas/Financeiro/valor_total_faturado.tmdl", status: "modificado" }],
  },
};
