import type { Estrategia, UnidadePeriodo } from "../mocks/estrategias";

// Chave dupla ("{{coluna}}", convenção de templating tipo dbt/Jinja/Airflow) —
// trocado de ":coluna" (2026-08-29) depois de um bug real rodando o motor
// (ETL_Classes, porte desta função) contra dado real: ":coluna" colidia com
// o operador de cast do Postgres ("price::numeric" era lido como marcador
// ":numeric", e a linha inteira era removida, quebrando o SQL final). Chave
// dupla não existe na gramática SQL, risco de colisão fica perto de zero.
//
// Suporta a forma dupla "{{colunaExtracao}}{{colunaDestino}}" (dois tokens
// colados, sem separador) — quando a coluna usada pra filtrar a EXTRAÇÃO (no
// ponto onde o marcador aparece no SQL, que pode ser antes de um alias) é
// diferente da coluna que existe na tabela de DESTINO (usada no DELETE das
// estratégias que reprocessam janela), ex.: "dtvenc as datavencimento" —
// filtra por "{{dtvenc}}{{datavencimento}}". Forma simples "{{marcador}}" =
// as duas colunas são a mesma (caso comum).
//
// O conteúdo de CADA marcador pode ser uma expressão, não só um nome de
// coluna cru — ex.: "{{order_purchase_timestamp::date}}{{datapedido}}" (cast
// explícito na extração, coluna simples no destino). Por isso o token aceita
// qualquer caractere exceto "{"/"}"/quebra de linha (não só identificador) —
// ver `referenciaColuna` abaixo pra decisão de aspas.
const REGEX_MARCADOR = /\{\{([^{}\n]+?)\}\}(?:\{\{([^{}\n]+?)\}\})?/;

export interface Marcador {
  texto: string;
  colunaExtracao: string;
  colunaDestino: string;
}

/** Acha o primeiro marcador (ex.: "{{datavencimento}}") presente no texto do SQL — é ele que a
    estratégia substitui. Se não houver marcador, a consulta não tem filtro de período. */
export function encontrarMarcador(sql: string): Marcador | null {
  const match = sql.match(REGEX_MARCADOR);
  if (!match) return null;
  const colunaExtracao = match[1].trim();
  const colunaDestino = match[2]?.trim() || colunaExtracao;
  return { texto: match[0], colunaExtracao, colunaDestino };
}

const IDENTIFICADOR_SIMPLES = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Nome de coluna simples vira identificador entre aspas (preserva maiúsculas/minúsculas e
    protege palavras reservadas, como já era feito); uma expressão (ex.: cast explícito
    "order_purchase_timestamp::date") é usada como está — colocar aspas duplas nela criaria um
    identificador quotado LITERAL com esse texto todo dentro, o que não é o cast pretendido. */
function referenciaColuna(coluna: string): string {
  return IDENTIFICADOR_SIMPLES.test(coluna) ? `"${coluna}"` : coluna;
}

function condicaoJanela(coluna: string, quantidade: number, unidade: string): string {
  const intervalo: Record<string, string> = { Dia: "days", Mês: "months", Ano: "years" };
  return `${referenciaColuna(coluna)} >= CURRENT_DATE - INTERVAL '${quantidade} ${intervalo[unidade] ?? unidade}'`;
}

/** `fimExclusivo` — mesma convenção do motor (periodo.py::condicao_intervalo): intervalo
    [inicio, fim) meio-aberto. Quem chama já resolve a data final inclusiva escolhida pelo
    analista pra um limite exclusivo (ver `somarPeriodo`), nunca `<=` direto — isso é o que
    permite os segmentos do Full por Período não se sobrepor nem pular um dia na fronteira. */
function condicaoIntervalo(coluna: string, inicio: string, fimExclusivo: string): string {
  const ref = referenciaColuna(coluna);
  return `${ref} >= '${inicio}' AND ${ref} < '${fimExclusivo}'`;
}

function ultimoDiaDoMes(ano: number, mes1a12: number): number {
  return new Date(Date.UTC(ano, mes1a12, 0)).getUTCDate();
}

/** Porte fiel de `periodo.py::_somar_periodo` — soma um período a uma data ISO
    ("AAAA-MM-DD"), com o mesmo tratamento de estouro de dia (mês mais curto,
    29/fev em ano não bissexto cai pra 28) que o motor já usa em `gerar_segmentos`. */
function somarPeriodo(dataIso: string, quantidade: number, unidade: UnidadePeriodo): string {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  const fmt = (a: number, m: number, d: number) =>
    `${String(a).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  if (unidade === "Dia") {
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    d.setUTCDate(d.getUTCDate() + quantidade);
    return fmt(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  if (unidade === "Ano") {
    const novoAno = ano + quantidade;
    return fmt(novoAno, mes, Math.min(dia, ultimoDiaDoMes(novoAno, mes)));
  }
  // Mês
  const totalMeses = mes - 1 + quantidade;
  const novoAno = ano + Math.floor(totalMeses / 12);
  const novoMes = ((totalMeses % 12) + 12) % 12 + 1;
  return fmt(novoAno, novoMes, Math.min(dia, ultimoDiaDoMes(novoAno, novoMes)));
}

/** Fim (exclusivo) do PRIMEIRO segmento de um Full por Período — mesma lógica de
    `periodo.py::gerar_segmentos`, só que resolvendo um segmento em vez do range inteiro
    (não precisamos da lista completa só pra mostrar o preview do primeiro). */
function fimPrimeiroSegmento(dataInicial: string, quantidade: number, unidade: UnidadePeriodo, dataFinalInclusiva: string): string {
  const fimTotal = somarPeriodo(dataFinalInclusiva, 1, "Dia"); // inclusiva -> exclusiva
  const proximo = somarPeriodo(dataInicial, quantidade, unidade);
  return proximo < fimTotal ? proximo : fimTotal; // datas ISO comparam certo como string
}

/** Monta o SQL que de fato vai ser enviado pra execução, considerando a estratégia escolhida.
    Substituição/Incremental não têm filtro de período — se a consulta tiver um marcador
    mesmo assim, a LINHA inteira daquele marcador é removida (nunca comentada — um comentário
    como última linha do arquivo quebra o ETL). Pra Full por Período, mostra o range INTEIRO
    (do início ao fim escolhido) — pro preview do primeiro segmento, ver
    `montarSqlPrimeiroSegmento`. */
export function montarSqlEfetivo(sqlOriginal: string, estrategia: Estrategia): string {
  const marcador = encontrarMarcador(sqlOriginal);

  if (estrategia.tipo === "Substituição" || estrategia.tipo === "Incremental") {
    if (!marcador) return sqlOriginal;
    return sqlOriginal
      .split("\n")
      .filter((linha) => !linha.includes(marcador.texto))
      .join("\n");
  }

  if (!marcador) return sqlOriginal;

  if (estrategia.tipo === "Reprocessamento Recente") {
    if (!estrategia.filtroQuantidade || !estrategia.filtroUnidade) return sqlOriginal;
    const condicao = condicaoJanela(marcador.colunaExtracao, estrategia.filtroQuantidade, estrategia.filtroUnidade);
    return sqlOriginal.replace(marcador.texto, condicao);
  }

  if (estrategia.tipo === "Full por Período") {
    if (!estrategia.dataInicial || !estrategia.dataFinal) return sqlOriginal;
    const fimExclusivo = somarPeriodo(estrategia.dataFinal, 1, "Dia");
    const condicao = condicaoIntervalo(marcador.colunaExtracao, estrategia.dataInicial, fimExclusivo);
    return sqlOriginal.replace(marcador.texto, condicao);
  }

  return sqlOriginal;
}

/** Só se aplica a "Full por Período" — monta o SQL do PRIMEIRO segmento (mesma condição que a
    execução real usaria pra ele). Ex.: filtro de 1 ano segmentado a cada 1 mês -> mostra só o
    filtro do primeiro mês desse ano. Pra qualquer outra estratégia devolve o SQL original
    (não existe segmento fora de Full por Período). */
export function montarSqlPrimeiroSegmento(sqlOriginal: string, estrategia: Estrategia): string {
  if (estrategia.tipo !== "Full por Período") return sqlOriginal;
  const marcador = encontrarMarcador(sqlOriginal);
  if (!marcador || !estrategia.dataInicial || !estrategia.dataFinal || !estrategia.segmentacaoQuantidade || !estrategia.segmentacaoUnidade) {
    return sqlOriginal;
  }
  const fim = fimPrimeiroSegmento(estrategia.dataInicial, estrategia.segmentacaoQuantidade, estrategia.segmentacaoUnidade, estrategia.dataFinal);
  const condicao = condicaoIntervalo(marcador.colunaExtracao, estrategia.dataInicial, fim);
  return sqlOriginal.replace(marcador.texto, condicao);
}

/** SQL de exclusão que roda no destino antes do INSERT, conforme a estratégia — Substituição
    (TRUNCATE), Reprocessamento Recente (DELETE da janela) e Full por Período (DELETE do
    PRIMEIRO segmento, mesmo recorte de `montarSqlPrimeiroSegmento`) usam a coluna de DESTINO
    do marcador (`colunaDestino`), não a de extração — é a coluna que de fato existe na tabela
    criada. Incremental não apaga nada, devolve string vazia (quem chama decide como exibir
    isso). */
export function montarSqlDelete(sqlOriginal: string, estrategia: Estrategia, nomeTabela: string): string {
  if (estrategia.tipo === "Substituição") {
    return `TRUNCATE TABLE "${nomeTabela}"`;
  }
  if (estrategia.tipo === "Incremental") {
    return "";
  }

  const marcador = encontrarMarcador(sqlOriginal);
  if (!marcador) return "";

  if (estrategia.tipo === "Reprocessamento Recente") {
    if (!estrategia.filtroQuantidade || !estrategia.filtroUnidade) return "";
    const condicao = condicaoJanela(marcador.colunaDestino, estrategia.filtroQuantidade, estrategia.filtroUnidade);
    return `DELETE FROM "${nomeTabela}" WHERE ${condicao}`;
  }

  if (estrategia.tipo === "Full por Período") {
    if (!estrategia.dataInicial || !estrategia.dataFinal || !estrategia.segmentacaoQuantidade || !estrategia.segmentacaoUnidade) return "";
    const fim = fimPrimeiroSegmento(estrategia.dataInicial, estrategia.segmentacaoQuantidade, estrategia.segmentacaoUnidade, estrategia.dataFinal);
    const condicao = condicaoIntervalo(marcador.colunaDestino, estrategia.dataInicial, fim);
    return `DELETE FROM "${nomeTabela}" WHERE ${condicao}`;
  }

  return "";
}
