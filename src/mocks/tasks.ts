import type { CamadaDW } from "./consultas";
import { consultasPorCliente, nomeInternoConsulta } from "./consultas";
import { conexoesPorCliente } from "./conexoes";
import type { NoFluxo, ConexaoFluxo } from "./componentesFluxo";

export type TipoTask = "consulta_sql" | "planilha" | "api" | "processamento_as" | "fluxo_manual";

/** Todos os tipos, incluindo Fluxo Manual — usado no subnav de Tasks. */
export const tiposTask: TipoTask[] = ["consulta_sql", "planilha", "api", "processamento_as", "fluxo_manual"];

/** Só os tipos criáveis pelo formulário guiado — Fluxo Manual só nasce pelo canvas de Fluxo. */
export const tiposTaskPadrao: TipoTask[] = ["consulta_sql", "planilha", "api", "processamento_as"];

/** Rótulo curto — usado em selects e nas listas. */
export const rotuloTipoTask: Record<TipoTask, string> = {
  consulta_sql: "Consulta SQL",
  planilha: "Planilha",
  api: "API",
  processamento_as: "Processamento AS",
  fluxo_manual: "Fluxo Manual",
};

/** Rótulo por extenso — só usado na aba superior de Tasks. */
export const rotuloAbaTask: Record<TipoTask, string> = {
  ...rotuloTipoTask,
  processamento_as: "Processamento Analysis Service",
};

/** Slug de rota por tipo — subnav de Tasks e navegação a partir do Fluxo. */
export const slugTipoTask: Record<TipoTask, string> = {
  consulta_sql: "consulta-sql",
  planilha: "planilha",
  api: "api",
  processamento_as: "processamento-as",
  fluxo_manual: "fluxo-manual",
};

export type MetodoHttp = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export const metodosHttp: MetodoHttp[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export type FonteAs = "Tabela SQL" | "View";
export const fontesAs: FonteAs[] = ["Tabela SQL", "View"];

export interface Task {
  id: string;
  tipo: TipoTask;
  nome: string;

  // Consulta SQL / Processamento AS (Fonte = View, reaproveita o mesmo campo)
  camada?: CamadaDW;
  consultaId?: string;
  estrategiaNome?: string;
  /** Id real da Estratégia (API) — preenchido só quando a Task vem do backend real
      (`api/tasks.ts::paraTaskMock`); `estrategiaNome` continua sendo o que a UI mostra. */
  estrategiaId?: string;

  // Planilha
  aba?: string;

  // API
  metodo?: MetodoHttp;
  rota?: string;
  camposSelecionados?: string[];

  // Processamento AS
  fonteTipo?: FonteAs;
  fonteNome?: string;

  // Consulta SQL / Planilha / API / Processamento AS (Fonte = View)
  conexaoOrigemId?: string;

  // Todos os tipos, exceto Fluxo Manual e Processamento AS com Fonte = View
  conexaoDestinoId?: string;
  tabelaDestino?: string;

  /** Gravado pelo botão "Salvar como Rascunho" do canvas de Fluxo (sempre disponível, mesmo com
      problemas de validação na estrutura); "Salvar" (de verdade, só quando o fluxo valida sem
      achados) grava `false`/ausente. Rascunho é texto livre pro motor (sem validade estrutural),
      ver NOS_FLUXOGRAMA_PRIMEIRA_IMPLEMENTACAO.md. Não é exclusivo de Fluxo Manual — "Editar
      Fluxo" numa Task de formulário também pode salvar como Rascunho se o analista mexer no
      canvas e deixar algo incompleto. */
  rascunho?: boolean;
  /** Grafo do canvas de Fluxo (nós soltos, conectados, reposicionados, com os `config` de cada
      engrenagem) — gravado toda vez que a Task é salva a partir do canvas (`FluxoPage.tsx`), pra
      "Editar Fluxo" reabrir exatamente de onde parou (nunca um canvas em branco). Ausente em
      Tasks nunca abertas pelo Fluxo — nesse caso `FluxoPage` deriva uma representação inicial a
      partir dos campos do formulário guiado (`mocks/fluxoDeTask.ts`). */
  fluxoNos?: NoFluxo[];
  fluxoConexoes?: ConexaoFluxo[];
}

/** Abreviação do prefixo de camada usada no nome herdado de uma Task de Processamento AS com
    Fonte = Tabela SQL — fato->f, dim->d, aux/stage->aux (Stage some abreviado, tratado como
    auxiliar pra fins de nomenclatura no Analysis Services). */
const ABREVIACAO_CAMADA: [string, string][] = [
  ["fato_", "f"],
  ["dim_", "d"],
  ["stage_", "aux"],
  ["aux_", "aux"],
];

export function nomeTaskProcessamentoAs(tabela: string): string {
  for (const [prefixo, letra] of ABREVIACAO_CAMADA) {
    if (tabela.startsWith(prefixo)) {
      const resto = tabela.slice(prefixo.length);
      const pascal = resto
        .split("_")
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("");
      return `${letra}${pascal}`;
    }
  }
  return tabela;
}

export const tasksPorCliente: Record<string, Task[]> = {
  "cooperativa-vale-norte": [
    {
      id: "t1",
      tipo: "consulta_sql",
      nome: "fato_faturamento",
      camada: "Fato",
      consultaId: "faturamento",
      estrategiaNome: "realtime_5dias",
      conexaoOrigemId: "conexao_postgres",
      conexaoDestinoId: "conexao_interna_dw",
      tabelaDestino: "fato_faturamento",
    },
    {
      id: "t2",
      tipo: "processamento_as",
      nome: "fFaturamento",
      fonteTipo: "Tabela SQL",
      fonteNome: "fato_faturamento",
      conexaoDestinoId: "conexao_interna_dw",
      tabelaDestino: "TabCooperativa_Vale_Norte",
    },
    {
      id: "t3",
      tipo: "consulta_sql",
      nome: "stage_estoque_full",
      camada: "Stage",
      consultaId: "estoque-full",
      estrategiaNome: "substituicao_padrao",
      conexaoOrigemId: "conexao_postgres",
      conexaoDestinoId: "conexao_interna_dw",
      tabelaDestino: "stage_estoque_full",
    },
    {
      id: "task-exemplo-fluxo",
      tipo: "fluxo_manual",
      nome: "exemplo_fluxo_faturamento",
    },
  ],
};

/** Linha de resumo mostrada na lista de Tasks, conforme o tipo. */
export function resumoTask(t: Task): string {
  if (t.tipo === "consulta_sql") return t.estrategiaNome ?? "—";
  if (t.tipo === "planilha") return t.aba ? `aba ${t.aba}` : "—";
  if (t.tipo === "api") return t.metodo && t.rota ? `${t.metodo} ${t.rota}` : "—";
  if (t.tipo === "processamento_as") return t.fonteTipo ?? "—";
  return "Criada pelo Fluxo";
}

/** Mesmo resumo de `resumoTask`, mas resolvendo a Estratégia contra o catálogo REAL —
    `t.estrategiaNome`/`t.metodo`/`t.rota` nunca são preenchidos por `paraTaskMock` (só existem
    no grafo compilado, não em colunas da Task), então `resumoTask` sozinho sempre mostra "—"
    pra Task real. Consulta SQL/Planilha/API são sempre Substituição (mesma trava validada em
    Tasks) — por isso todas as três resolvem a Estratégia real; Fluxo Manual/Processamento AS
    caem no `resumoTask` puro (sem Estratégia própria fixa pra resolver assim). */
export function resumoTaskComEstrategia(t: Task, estrategias: { id: string; nome: string }[]): string {
  if (t.tipo === "consulta_sql" || t.tipo === "planilha" || t.tipo === "api") {
    return estrategias.find((e) => e.id === t.estrategiaId)?.nome ?? "—";
  }
  return resumoTask(t);
}

/** Pares label/valor exibidos no painel de detalhes de uma Task, conforme o tipo — resolve as
    referências (conexão/consulta) pro nome real. */
export function camposExibicaoTask(t: Task, clienteId: string): [string, string][] {
  const conexoes = conexoesPorCliente[clienteId] ?? [];
  const consultas = consultasPorCliente[clienteId] ?? [];
  const nomeConexao = (id?: string) => conexoes.find((c) => c.id === id)?.nome ?? "—";

  if (t.tipo === "consulta_sql") {
    const consulta = consultas.find((c) => c.id === t.consultaId);
    return [
      ["Camada DW", t.camada ?? "—"],
      ["Conexão origem", nomeConexao(t.conexaoOrigemId)],
      ["Conexão destino", nomeConexao(t.conexaoDestinoId)],
      ["Tabela destino", t.tabelaDestino ?? "—"],
      ["Consulta", consulta ? nomeInternoConsulta(consulta.camada, consulta.nome) : "—"],
      ["Estratégia de atualização", t.estrategiaNome ?? "—"],
    ];
  }
  if (t.tipo === "planilha") {
    return [
      ["Conexão origem", nomeConexao(t.conexaoOrigemId)],
      ["Conexão destino", nomeConexao(t.conexaoDestinoId)],
      ["Aba", t.aba ?? "—"],
      ["Tabela destino", t.tabelaDestino ?? "—"],
    ];
  }
  if (t.tipo === "api") {
    return [
      ["Conexão origem", nomeConexao(t.conexaoOrigemId)],
      ["Método", t.metodo ?? "—"],
      ["Rota", t.rota ?? "—"],
      ["Conexão destino", nomeConexao(t.conexaoDestinoId)],
      ["Tabela destino", t.tabelaDestino ?? "—"],
      ["Campos selecionados", t.camposSelecionados?.length ? t.camposSelecionados.join(", ") : "—"],
    ];
  }
  if (t.tipo === "processamento_as") {
    if (t.fonteTipo === "View") {
      const view = consultas.find((c) => c.id === t.consultaId);
      return [
        ["Fonte", "View"],
        ["View", view ? nomeInternoConsulta(view.camada, view.nome) : "—"],
        ["Conexão origem", nomeConexao(t.conexaoOrigemId)],
        ["Conexão destino", nomeConexao(t.conexaoDestinoId)],
      ];
    }
    return [
      ["Fonte", "Tabela SQL"],
      ["Nome da fonte", t.fonteNome ?? "—"],
      ["Conexão destino", nomeConexao(t.conexaoDestinoId)],
      ["Tabela destino", t.tabelaDestino ?? "—"],
    ];
  }
  return [["Origem", "Construída pelo canvas de Fluxo"]];
}
