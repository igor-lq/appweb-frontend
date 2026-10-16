export interface NoArquivo {
  nome: string;
  tipo: "pasta" | "arquivo";
  conteudo?: string;
  filhos?: NoArquivo[];
}

export const arvorePorCliente: Record<string, NoArquivo[]> = {
  "cooperativa-vale-norte": [
    {
      nome: "Consultas",
      tipo: "pasta",
      filhos: [
        {
          nome: "faturamento",
          tipo: "pasta",
          filhos: [
            {
              nome: "consulta.sql",
              tipo: "arquivo",
              conteudo: "SELECT\n  nf.id_nota,\n  nf.id_cliente,\n  nf.datavencimento,\n  nf.valor_total\nFROM faturamento.notas_fiscais nf\nWHERE {{datavencimento}}",
            },
            {
              nome: "config_atualizacao.yaml",
              tipo: "arquivo",
              conteudo:
                "estrategias_atualizacao:\n  realtime_5dias:\n    tipo: reprocessamento_recente\n    marcador: \":datavencimento\"\n    quantidade_janela: 5\n    unidade_janela: dia\n  recente_3meses:\n    tipo: reprocessamento_recente\n    marcador: \":datavencimento\"\n    quantidade_janela: 3\n    unidade_janela: mes",
            },
          ],
        },
      ],
    },
    {
      nome: "Pacotes",
      tipo: "pasta",
      filhos: [
        {
          nome: "faturamento_diario.py",
          tipo: "arquivo",
          conteudo: "# Pacote gerado automaticamente pelo Gerenciador ETL\n\nTASKS = [\n    {\"tipo\": \"consulta_sql\", \"nome\": \"fato_faturamento\", \"estrategia\": \"realtime_5dias\"},\n    {\"tipo\": \"processamento_as\", \"nome\": \"TabCooperativa_Vale_Norte\", \"estrategia\": \"padrao\"},\n]",
        },
      ],
    },
    {
      nome: "Dags",
      tipo: "pasta",
      filhos: [
        {
          nome: "cooperativa_vale_norte_diario.py",
          tipo: "arquivo",
          conteudo: "from airflow import DAG\n\nwith DAG(\n    dag_id=\"cooperativa_vale_norte_diario\",\n    schedule_interval=\"0 6 * * *\",\n    start_date=\"2025-01-01\",\n) as dag:\n    ...",
        },
      ],
    },
  ],
};
