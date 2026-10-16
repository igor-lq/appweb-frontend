import { ordenarPorPrioridade, type GrupoComponente, type PortaEntrada, type NoFluxo, type ConexaoFluxo } from "./componentesFluxo";

export type { NoFluxo, ConexaoFluxo };

/** ID da Task de exemplo (ver mocks/tasks.ts, tipo "fluxo_manual") cujo canvas de Fluxo já vem
    pré-montado — é o único exemplo pedido, as demais Tasks de Fluxo começam vazias. */
export const TASK_ID_EXEMPLO_FLUXO = "task-exemplo-fluxo";

const req = (grupo: GrupoComponente, altGrupo?: string): PortaEntrada => ({ grupo, obrigatoria: true, altGrupo });
const opc = (grupo: GrupoComponente, altGrupo?: string): PortaEntrada => ({ grupo, obrigatoria: false, altGrupo });

/** Fluxo de exemplo: Conexão + Estratégia + Consulta SQL + Spark alimentam um Extrator (4
    entradas), que alimenta uma Transformação (Filtros), que alimenta uma Carga (Escrita BD).
    `tipoChave` em cada nó genérico é o que permite resolver campos/engrenagem dele em
    `TIPOS_COMPONENTES` — os 3 primeiros são "dado real" (sem tipoChave, nunca têm engrenagem). */
export const nosExemplo: NoFluxo[] = [
  { id: "ex-conexao", grupo: "conexoes", nome: "Oracle Winthor", entradas: [], saida: true, x: 40, y: 40 },
  { id: "ex-estrategia", grupo: "estrategias", nome: "realtime_5dias", entradas: [], saida: true, x: 40, y: 150 },
  { id: "ex-consulta", grupo: "consultas", nome: "fato_faturamento", entradas: [], saida: true, x: 40, y: 260 },
  { id: "ex-spark", grupo: "spark", nome: "Parâmetros Spark", entradas: [], saida: true, x: 40, y: 370 },
  { id: "ex-conexao-destino", grupo: "conexoes", nome: "Banco Interno DW", entradas: [], saida: true, x: 640, y: 40 },
  {
    id: "ex-extrator",
    grupo: "extratores",
    nome: "Leitor SQL",
    tipoChave: "extracao_sql",
    entradas: [req("conexoes"), req("estrategias"), req("consultas"), opc("spark")],
    saida: true,
    x: 340,
    y: 190,
  },
  {
    id: "ex-transformacao",
    grupo: "transformacao",
    nome: "Filtros",
    tipoChave: "filtros",
    entradas: [req("extratores", "dado"), req("transformacao", "dado")],
    saida: true,
    x: 640,
    y: 225,
    config: { condicoes: ["status = 'faturado'"] },
  },
  {
    id: "ex-carga",
    grupo: "carga",
    nome: "Escrita BD",
    tipoChave: "escrita_bd",
    entradas: ordenarPorPrioridade([req("extratores", "dado"), req("transformacao", "dado"), { grupo: "conexoes", obrigatoria: true, apenasInterno: true }]),
    saida: true,
    saidaGrupo: "transformacao",
    saidaRotuloGrupo: "carga",
    x: 940,
    y: 225,
    config: { tabelaDestino: "fato_faturamento" },
  },
];

export const conexoesExemplo: ConexaoFluxo[] = [
  { id: "ec1", de: "ex-conexao", para: "ex-extrator", portaEntrada: 0 },
  { id: "ec2", de: "ex-estrategia", para: "ex-extrator", portaEntrada: 1 },
  { id: "ec3", de: "ex-consulta", para: "ex-extrator", portaEntrada: 2 },
  { id: "ec4", de: "ex-spark", para: "ex-extrator", portaEntrada: 3 },
  { id: "ec5", de: "ex-extrator", para: "ex-transformacao", portaEntrada: 0 },
  { id: "ec6", de: "ex-transformacao", para: "ex-carga", portaEntrada: 2 },
  { id: "ec7", de: "ex-conexao-destino", para: "ex-carga", portaEntrada: 0 },
];
