export type CamadaDW = "Fato" | "Auxiliar" | "Dimensão" | "Stage" | "View";

export const camadasDW: CamadaDW[] = ["Fato", "Auxiliar", "Dimensão", "Stage", "View"];

/** Prefixo do nome interno por camada — Dimensão/Auxiliar usam forma curta (igual à V1),
    Fato/Stage usam a palavra cheia. View não é uma tela própria — é uma Consulta SQL como
    qualquer outra, só que salva com o prefixo "vw" (ex.: vw_faturamento_resumo). */
const PREFIXO_CAMADA: Record<CamadaDW, string> = {
  Fato: "fato",
  Auxiliar: "aux",
  Dimensão: "dim",
  Stage: "stage",
  View: "vw",
};

/** Minúsculo, sem acentos, espaços viram "_" — mesma regra de src/utils/nomeInterno.ts da V1
    (preserva "_" já existentes no texto digitado, só normaliza espaço/caixa). */
function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export function nomeInternoConsulta(camada: CamadaDW, nome: string): string {
  return `${PREFIXO_CAMADA[camada]}_${slugify(nome)}`;
}

export interface Consulta {
  id: string;
  nome: string;
  camada: CamadaDW;
  sql: string;
}

export const consultasPorCliente: Record<string, Consulta[]> = {
  "cooperativa-vale-norte": [
    {
      id: "faturamento",
      nome: "Faturamento",
      camada: "Fato",
      sql: `SELECT
  nf.id_nota,
  nf.id_cliente,
  nf.datavencimento,
  nf.valor_total
FROM faturamento.notas_fiscais nf
WHERE {{datavencimento}}`,
    },
    {
      id: "clientes-delta",
      nome: "Clientes Delta",
      camada: "Dimensão",
      sql: `SELECT
  id_cliente,
  razao_social,
  cidade,
  uf
FROM cadastro.clientes`,
    },
    {
      id: "estoque-full",
      nome: "Estoque Full",
      camada: "Stage",
      sql: `SELECT *
FROM estoque.posicao_atual`,
    },
    {
      id: "titulos-receber",
      nome: "Títulos a Receber",
      camada: "Auxiliar",
      sql: `SELECT
  id_titulo,
  id_cliente,
  valor,
  datavencimento
FROM financeiro.titulos_receber
WHERE {{datavencimento}}`,
    },
    {
      id: "faturamento-resumo",
      nome: "Faturamento Resumo",
      camada: "View",
      sql: `SELECT
  id_cliente,
  date_trunc('month', datavencimento) AS mes,
  sum(valor_total) AS total
FROM fato_faturamento
GROUP BY id_cliente, date_trunc('month', datavencimento)`,
    },
  ],
};
