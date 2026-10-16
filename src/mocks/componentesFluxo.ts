import { metodosHttp } from "./tasks";
import { estrategiasPorCliente, type Estrategia } from "./estrategias";
import { conexoesPorCliente, type Conexao } from "./conexoes";

/** Grupos de componentes do canvas de Fluxo. Os 3 primeiros são "dados reais" (vêm do catálogo
    do cliente — Conexões/Estratégias/Consultas SQL já cadastradas); `seletores`/`extratores`/
    `transformacao`/`carga`/`exportacao`/`spark`/`controle_fluxo`/`instrucoes` são visíveis na
    biblioteca (ver ORDEM_GRUPOS) — arrastar um item deles pro canvas cria uma instância nova de
    TIPOS_COMPONENTES, não referencia nada pré-existente. `aba`/`colunas` NUNCA aparecem na
    biblioteca — são só tipos de PORTA (o que uma saída produz/uma entrada aceita), usados pelo
    Seletor de Abas (saída `aba`) e pelos nós de Instrução SQL (saída `colunas`). */
export type GrupoComponente =
  | "conexoes"
  | "estrategias"
  | "consultas"
  | "seletores"
  | "extratores"
  | "transformacao"
  | "carga"
  | "exportacao"
  | "spark"
  | "controle_fluxo"
  | "instrucoes"
  | "aba"
  | "colunas";

export const TITULO_GRUPO: Record<GrupoComponente, string> = {
  conexoes: "Conexões",
  estrategias: "Estratégias de Atualização",
  consultas: "Consultas SQL",
  seletores: "Seletores",
  extratores: "Leitores",
  transformacao: "Modificadores",
  carga: "Cargas",
  exportacao: "Exportações",
  spark: "Spark",
  controle_fluxo: "Controladores de Fluxo",
  instrucoes: "Instruções",
  aba: "Aba",
  colunas: "Colunas",
};

/** Nome curto (uma palavra) mostrado ao lado do ícone de cada porta dentro do nó — o rótulo
    completo do grupo não cabe ao lado de um ícone de 18px. Sempre no SINGULAR (diferente de
    `TITULO_GRUPO`, que é sempre plural) — é o nome de UM conector específico, não de uma
    categoria. */
export const TITULO_CURTO_GRUPO: Record<GrupoComponente, string> = {
  conexoes: "Conexão",
  estrategias: "Estratégia",
  consultas: "Consulta",
  seletores: "Seletor",
  extratores: "Leitor",
  transformacao: "Modificador",
  carga: "Carga",
  exportacao: "Exportação",
  spark: "Spark",
  controle_fluxo: "Fluxo",
  instrucoes: "Instrução",
  aba: "Aba",
  colunas: "Coluna",
};

/** Ordem de exibição na biblioteca do Fluxo — só os grupos com componente arrastável de verdade
    (`aba`/`colunas` ficam de fora, são só tipo de porta). */
export const ORDEM_GRUPOS: GrupoComponente[] = [
  "conexoes",
  "estrategias",
  "consultas",
  "seletores",
  "extratores",
  "transformacao",
  "carga",
  "exportacao",
  "spark",
  "controle_fluxo",
  "instrucoes",
];

/** Uma porta de entrada — de qual grupo é o ícone esperado ali, e se é obrigatória (mostra a
    bolinha vermelha até ser conectada). */
export interface PortaEntrada {
  grupo: GrupoComponente;
  obrigatoria: boolean;
  /** Portas do MESMO nó com o mesmo `altGrupo` são fontes alternativas pra uma única necessidade
      (princípio 2 do documento de nós) — ex.: dado pode vir de um Extrator OU de uma
      Transformação. O ponto de obrigatoriedade some assim que QUALQUER porta do grupo estiver
      conectada; conectar duas ao mesmo tempo é ambíguo e sinalizado como conflito (borda
      vermelha nas duas), nunca um erro que bloqueia a conexão em si. */
  altGrupo?: string;
  /** Só aceita uma Conexão com `organizacao === "Interno"` (validado em `tentarConectar`,
      `FluxoPage.tsx`) — nenhum componente que MODIFICA banco (Escrita BD, Criar/Delete/Truncate
      Table, os passos de AlterTable) pode escrever num banco externo do cliente; externo é
      sempre só leitura. Não usado nas portas de Conexão de ORIGEM (Extratores, Seletor de Abas),
      só nas de destino. */
  apenasInterno?: boolean;
  /** Só aceita uma Estratégia do tipo indicado (validado em `tentarConectar`, `FluxoPage.tsx`) —
      "Leitor Planilha" é sempre Substituição (spec), então essa é a única porta que usa isso hoje.
      Valor no formato cru do backend (`TipoEstrategiaApi`, ex. "substituicao"), não o rótulo. */
  exigeEstrategiaTipo?: string;
}

/** Contexto disponível pra resolver os campos DINÂMICOS de uma engrenagem — alguns nós têm
    campos que dependem do que está conectado (ex.: Escrita BD só pede Chaves de Upsert quando a
    Estratégia upstream é do tipo Upsert; Criar Tabela pede colunas manuais só quando a fonte não
    é Instrução SQL: Dados). */
export interface NoConfigContext {
  no: NoFluxo;
  nos: NoFluxo[];
  conexoesGrafo: ConexaoFluxo[];
  clienteId: string;
}

interface CampoBase {
  chave: string;
  rotulo: string;
  obrigatoria: boolean;
  /** Texto de apoio, exibido abaixo do campo. */
  ajuda?: string;
}
export interface CampoTexto extends CampoBase { tipo: "texto"; placeholder?: string }
export interface CampoNumero extends CampoBase { tipo: "numero"; placeholder?: string }
export interface CampoTextarea extends CampoBase { tipo: "textarea"; placeholder?: string }
export interface CampoSelect extends CampoBase { tipo: "select"; opcoes: string[] }
/** Linhas de condição livre — o motor une todas com AND antes de virar `TransformFiltroStep`. */
export interface CampoListaCondicoes extends CampoBase { tipo: "lista_condicoes"; placeholder?: string }
/** Uma linha por item (lista estática — Início Loop, Chaves de Upsert). */
export interface CampoListaItens extends CampoBase { tipo: "lista_itens"; placeholder?: string }
/** Tabela de colunas (nome/tipo/PK/Check/Default) — usada só pela engrenagem de Criar Tabela. */
export interface CampoColunas extends CampoBase { tipo: "colunas" }
/** Reusa o componente `TabelaDestinoField` já existente (toggle Vincular/Criar + texto). */
export interface CampoTabelaDestino extends CampoBase { tipo: "tabela_destino" }
/** Texto informativo, sem campo de entrada — usado quando um campo normal só some por causa do
    que está conectado, pra explicar o motivo em vez de simplesmente sumir sem contexto. */
export interface CampoNota { tipo: "nota"; chave: string; texto: string }
/** Botão "Testar endpoint" (só Extração API) — dispara o único gatilho de erro fatal desta leva
    (ver princípio 6 do documento de nós). Sempre `obrigatoria: false`: não participa do ponto de
    obrigatoriedade da engrenagem (esse é só sobre Método/Rota) nem do gate do botão Salvar do
    próprio popup — o bloqueio de "Salvar" da Task inteira é um mecanismo à parte, decidido pelo
    resultado guardado em `config[chave]` (`true`/`false`/`undefined` = ainda não testado). */
export interface CampoTesteEndpoint extends CampoBase { tipo: "teste_endpoint" }

export type CampoEngrenagem =
  | CampoTexto
  | CampoNumero
  | CampoTextarea
  | CampoSelect
  | CampoListaCondicoes
  | CampoListaItens
  | CampoColunas
  | CampoTabelaDestino
  | CampoNota
  | CampoTesteEndpoint;

/** Molde de um tipo de nó genérico — define as entradas (cada uma com grupo+obrigatoriedade) e
    se tem 1 saída. Conexões/Estratégias/Consultas SQL não entram aqui: são sempre 0 entradas + 1
    saída, resolvido direto onde são usadas. */
export interface TipoComponente {
  chave: string;
  grupo: GrupoComponente;
  nome: string;
  entradas: PortaEntrada[];
  saida: boolean;
  /** Grupo real da porta de saída — default é o próprio `grupo` do nó quando ausente (maioria
      dos nós). Só diverge quando o cabeçalho visual do nó não é o mesmo tipo que a porta produz
      (Seletor de Abas mostra "Seletores" no cabeçalho, saída é do tipo `aba`; Instrução SQL
      mostra "Instruções", saída é do tipo `colunas`; Filtros API mostra "Transformação", porta é
      do tipo `extratores`). */
  saidaGrupo?: GrupoComponente;
  /** Só afeta a EXIBIÇÃO (ícone+rótulo) da porta de saída — a compatibilidade de conexão
      continua sendo `saidaGrupo`/`grupo`. Usado só pela Escrita BD: a porta de saída precisa
      continuar do TIPO `transformacao` (pra poder alimentar Exportação/outro Modificador), mas
      exibir "Carga" é mais claro pro analista do que "Modificador" ali. */
  saidaRotuloGrupo?: GrupoComponente;
  /** Nó de função simples (princípio 4) — sem botão de engrenagem; clicar no próprio nó abre um
      popup dedicado (Seletor de Abas, Filtros API). */
  semEngrenagem?: boolean;
  /** Campos da engrenagem — lista fixa OU função do que está conectado (ver NoConfigContext).
      Nó sem `campos` resolvido (ausente ou array vazio) e sem `semEngrenagem` não mostra o botão
      de engrenagem nenhum. */
  campos?: CampoEngrenagem[] | ((ctx: NoConfigContext) => CampoEngrenagem[]);
  /** Frase curta (1 linha) do que o nó faz — mostrada no ícone "?" do card da biblioteca (hover). */
  ajuda: string;
}

const req = (grupo: GrupoComponente, altGrupo?: string): PortaEntrada => ({ grupo, obrigatoria: true, altGrupo });
const opc = (grupo: GrupoComponente, altGrupo?: string): PortaEntrada => ({ grupo, obrigatoria: false, altGrupo });
/** As duas fontes alternativas de "dado" que Modificador/Carga/Exportação/Início Loop aceitam
    — Leitor direto OU depois de uma cadeia de Modificador (princípio 3: nunca um grupo de porta
    fictício "pipeline", sempre as duas entradas reais). */
const dadoAlt = (): PortaEntrada[] => [req("extratores", "dado"), req("transformacao", "dado")];
/** Porta de Conexão destino que só aceita banco INTERNO — nunca externo do cliente (que é sempre
    só-leitura). Usada por todo componente que MODIFICA banco: Escrita BD, Criar/Delete/Truncate
    Table, os passos de renomear/adicionar/excluir coluna. */
const destinoInterno = (): PortaEntrada => ({ grupo: "conexoes", obrigatoria: true, apenasInterno: true });

/** Hierarquia de grupo do projeto inteiro — Conexão é sempre prioridade (regra do usuário, não uma
    escolha local): usada tanto pra ordenar as PORTAS de entrada dentro de um nó
    (`ordenarPorPrioridade`) quanto pra ordenar NÓS verticalmente dentro de uma coluna do "Ajustar
    Layout" (`FluxoPage.tsx::calcularLayoutAutomatico`, mesmo racional — Conexão em cima reduz
    cruzamento de linha, já que a porta de Conexão de quem ela alimenta também está sempre no
    topo). Fonte única — os demais grupos mantêm a ordem em que já apareciam (sort estável). */
export const PRIORIDADE_GRUPO: Partial<Record<GrupoComponente, number>> = {
  conexoes: 0,
};
export function ordenarPorPrioridade(entradas: PortaEntrada[]): PortaEntrada[] {
  return entradas
    .map((porta, indiceOriginal) => ({ porta, indiceOriginal }))
    .sort((a, b) => {
      const diff = (PRIORIDADE_GRUPO[a.porta.grupo] ?? 1) - (PRIORIDADE_GRUPO[b.porta.grupo] ?? 1);
      return diff !== 0 ? diff : a.indiceOriginal - b.indiceOriginal;
    })
    .map((x) => x.porta);
}

const FUNCOES_AGREGADOR = ["Sum", "Count", "Min", "Max", "Average"];
const ISOLATION_LEVELS = ["NONE", "READ_UNCOMMITTED", "READ_COMMITTED", "REPEATABLE_READ", "SERIALIZABLE"];

const TIPOS_COMPONENTES_BASE: TipoComponente[] = [
  // Seletores 🆕
  {
    chave: "seletor_abas",
    grupo: "seletores",
    nome: "Seletor de Abas",
    entradas: [req("conexoes")],
    saida: true,
    saidaGrupo: "aba",
    semEngrenagem: true,
    ajuda: "Lista as abas disponíveis na Conexão do tipo Planilha conectada e escolhe qual usar.",
  },

  // Leitores
  {
    chave: "extracao_sql",
    grupo: "extratores",
    nome: "Leitor SQL",
    entradas: [req("conexoes"), req("estrategias"), req("consultas"), opc("spark")],
    saida: true,
    ajuda: "Lê dados de uma Conexão via SQL, aplicando a Estratégia de atualização escolhida.",
  },
  {
    chave: "extracao_planilha",
    grupo: "extratores",
    nome: "Leitor Planilha",
    entradas: [req("aba"), { grupo: "estrategias", obrigatoria: true, exigeEstrategiaTipo: "substituicao" }],
    saida: true,
    ajuda: "Lê os dados da Aba selecionada (Seletor de Abas já carrega a Conexão) — sempre Substituição.",
  },
  {
    chave: "extracao_api",
    grupo: "extratores",
    nome: "Leitor API",
    // Por ora (sem campo de parâmetros da API ainda implementado), Task API só aceita Estratégia
    // do tipo Substituição — mesma trava do Leitor Planilha (ver `exigeEstrategiaTipo`).
    entradas: [req("conexoes"), { grupo: "estrategias", obrigatoria: true, exigeEstrategiaTipo: "substituicao" }, opc("spark")],
    saida: true,
    ajuda: "Faz uma requisição HTTP à Conexão do tipo API e extrai os dados retornados.",
    campos: [
      { chave: "metodo", tipo: "select", rotulo: "Método HTTP", obrigatoria: true, opcoes: metodosHttp },
      { chave: "rota", tipo: "texto", rotulo: "Rota", obrigatoria: true, placeholder: "/users" },
      { chave: "_testeApiOk", tipo: "teste_endpoint", rotulo: "Teste do endpoint", obrigatoria: false },
    ],
  },
  {
    chave: "filtros_api",
    grupo: "transformacao",
    nome: "Filtros API",
    entradas: [req("extratores")],
    saida: true,
    saidaGrupo: "extratores",
    semEngrenagem: true,
    ajuda: "Seleciona quais campos do retorno da API viram coluna na tabela final.",
  },

  // Modificador
  {
    chave: "filtros",
    grupo: "transformacao",
    nome: "Filtros",
    entradas: dadoAlt(),
    saida: true,
    ajuda: "Filtra as linhas do dado recebido por uma ou mais condições (unidas com AND).",
    campos: [{ chave: "condicoes", tipo: "lista_condicoes", rotulo: "Condições", obrigatoria: true, ajuda: "Cada condição é unida às demais com AND." }],
  },
  {
    chave: "transformacao_customizada",
    grupo: "transformacao",
    nome: "Transformação Customizada",
    entradas: dadoAlt(),
    saida: true,
    ajuda: "Aplica uma função Python customizada sobre o dado recebido.",
    campos: [
      {
        chave: "nomeFuncao",
        tipo: "texto",
        rotulo: "Nome da função",
        obrigatoria: true,
        placeholder: "transformar_pedido",
        ajuda: "Função esperada em custom/<nome_da_task>.py, assinatura def nome(df, item=None).",
      },
    ],
  },
  {
    chave: "agregador",
    grupo: "transformacao",
    nome: "Agregador",
    entradas: dadoAlt(),
    saida: true,
    ajuda: "Agrupa e agrega o dado recebido (soma, contagem, mínimo, máximo, média) nativamente no Spark.",
    campos: [
      { chave: "funcao", tipo: "select", rotulo: "Função", obrigatoria: true, opcoes: FUNCOES_AGREGADOR },
      { chave: "agruparPor", tipo: "texto", rotulo: "Agrupar por", obrigatoria: true, placeholder: "codigocliente, categoria" },
    ],
  },

  // Carga
  {
    chave: "escrita_bd",
    grupo: "carga",
    nome: "Escrita BD",
    entradas: [...dadoAlt(), destinoInterno()],
    saida: true,
    saidaGrupo: "transformacao",
    saidaRotuloGrupo: "carga",
    ajuda: "Grava o dado recebido numa tabela do banco interno, conforme a Estratégia da extração.",
    campos: (ctx) => {
      const base: CampoEngrenagem[] = [{ chave: "tabelaDestino", tipo: "tabela_destino", rotulo: "Tabela destino", obrigatoria: true }];
      const estrategia = resolverEstrategiaUpstream(ctx);
      if (estrategia?.tipo === "Upsert") {
        base.push({ chave: "chavesUpsert", tipo: "lista_itens", rotulo: "Chaves de Upsert", obrigatoria: true, placeholder: "codigocliente" });
      }
      return base;
    },
  },
  {
    chave: "criar_tabela",
    grupo: "carga",
    nome: "Criar Tabela",
    entradas: [destinoInterno(), req("consultas", "colunas"), req("colunas", "colunas")],
    saida: false,
    ajuda: "Cria uma tabela no banco interno com colunas definidas manualmente ou vindas de uma Instrução SQL.",
    campos: (ctx) => {
      const base: CampoEngrenagem[] = [{ chave: "nomeTabela", tipo: "texto", rotulo: "Nome da tabela", obrigatoria: true }];
      const fonte = resolverFonteColunasCriarTabela(ctx);
      if (fonte === "instrucao_dados") {
        return [
          ...base,
          { chave: "notaCtas", tipo: "nota", texto: "Colunas e dados vêm da Instrução SQL: Dados conectada (CREATE TABLE ... AS SELECT) — sem PK/Check/Default." },
        ];
      }
      return [...base, { chave: "colunas", tipo: "colunas", rotulo: "Colunas", obrigatoria: true }];
    },
  },
  {
    chave: "delete_table",
    grupo: "carga",
    nome: "Delete Table",
    entradas: [destinoInterno()],
    saida: false,
    ajuda: "Apaga linhas de uma tabela do banco interno por uma condição livre.",
    campos: [
      { chave: "nomeTabela", tipo: "texto", rotulo: "Nome da tabela", obrigatoria: true },
      { chave: "condicaoWhere", tipo: "texto", rotulo: "Condição WHERE", obrigatoria: true, placeholder: "status = 'cancelado'" },
    ],
  },
  {
    chave: "truncate_table",
    grupo: "carga",
    nome: "Truncate Table",
    entradas: [destinoInterno()],
    saida: false,
    ajuda: "Esvazia completamente uma tabela do banco interno.",
    campos: [{ chave: "nomeTabela", tipo: "texto", rotulo: "Nome da tabela", obrigatoria: true }],
  },

  // Exportação
  {
    chave: "exportar_excel",
    grupo: "exportacao",
    nome: "Exportar Excel",
    entradas: dadoAlt(),
    saida: false,
    ajuda: "Baixa o dado recebido como um arquivo Excel (download direto no navegador).",
    campos: [{ chave: "nomeArquivo", tipo: "texto", rotulo: "Nome do arquivo", obrigatoria: true, placeholder: "relatorio_pedidos" }],
  },
  {
    chave: "exportar_csv",
    grupo: "exportacao",
    nome: "Exportar CSV",
    entradas: dadoAlt(),
    saida: false,
    ajuda: "Baixa o dado recebido como um arquivo CSV (download direto no navegador).",
    campos: [{ chave: "nomeArquivo", tipo: "texto", rotulo: "Nome do arquivo", obrigatoria: true, placeholder: "relatorio_pedidos" }],
  },

  // Spark
  {
    chave: "parametros_spark",
    grupo: "spark",
    nome: "Parâmetros Spark",
    entradas: [],
    saida: true,
    ajuda: "Configura particionamento de leitura e overrides de fetch/batch size do Spark.",
    campos: [
      {
        chave: "colunaParticionamento",
        tipo: "texto",
        rotulo: "Coluna de particionamento",
        obrigatoria: false,
        placeholder: "datapedido",
        ajuda: "Os 4 campos de particionamento (coluna, limites, número de partições) são todos opcionais, mas preencha todos ou nenhum.",
      },
      { chave: "limiteInferior", tipo: "numero", rotulo: "Limite inferior", obrigatoria: false },
      { chave: "limiteSuperior", tipo: "numero", rotulo: "Limite superior", obrigatoria: false },
      { chave: "numParticoes", tipo: "numero", rotulo: "Número de partições", obrigatoria: false },
      { chave: "fetchsize", tipo: "numero", rotulo: "Fetchsize", obrigatoria: false, ajuda: "Sobrepõe o piso padrão da Conexão." },
      { chave: "batchsize", tipo: "numero", rotulo: "Batchsize", obrigatoria: false, ajuda: "Sobrepõe o piso padrão da Conexão." },
      { chave: "isolationLevel", tipo: "select", rotulo: "Isolation Level", obrigatoria: false, opcoes: ISOLATION_LEVELS },
    ],
  },

  // Controle de Fluxo
  {
    chave: "inicio_loop",
    grupo: "controle_fluxo",
    nome: "Início Loop",
    entradas: dadoAlt(),
    saida: true,
    saidaGrupo: "transformacao",
    ajuda: "Repete o trecho seguinte do fluxo uma vez por item de uma lista fixa, até o Fim Loop.",
    campos: [{ chave: "itens", tipo: "lista_itens", rotulo: "Lista de itens", obrigatoria: true, placeholder: "2025" }],
  },
  {
    chave: "fim_loop",
    grupo: "controle_fluxo",
    nome: "Fim Loop",
    entradas: [req("transformacao")],
    saida: true,
    saidaGrupo: "transformacao",
    ajuda: "Marca o fim do trecho repetido por um Início Loop.",
  },

  // Instruções 🆕
  {
    chave: "instrucao_sql_colunas",
    grupo: "instrucoes",
    nome: "Instrução SQL: Colunas",
    entradas: [],
    saida: true,
    saidaGrupo: "colunas",
    ajuda: "Define colunas e tipos manualmente, em texto livre, pra usar em Criar Tabela.",
    campos: [
      {
        chave: "definicao",
        tipo: "textarea",
        rotulo: "Definição das colunas",
        obrigatoria: true,
        placeholder: "id int4, datavenda date, valor numeric(15,2)",
      },
    ],
  },
  {
    chave: "instrucao_sql_dados",
    grupo: "instrucoes",
    nome: "Instrução SQL: Dados",
    entradas: [],
    saida: true,
    saidaGrupo: "colunas",
    ajuda: "Um SELECT literal cujo resultado vira estrutura e dados de uma tabela nova (CREATE TABLE AS).",
    campos: [
      {
        chave: "instrucaoSql",
        tipo: "textarea",
        rotulo: "Instrução SQL",
        obrigatoria: true,
        placeholder: "select 'fato' as categoria, 1 as codigocategoria union all select 'dim', 2",
      },
    ],
  },
  {
    chave: "altertable_add_coluna",
    grupo: "instrucoes",
    nome: "Adicionar Coluna",
    entradas: [destinoInterno()],
    saida: false,
    ajuda: "Adiciona uma nova coluna a uma tabela existente do banco interno.",
    campos: [
      { chave: "nomeTabela", tipo: "texto", rotulo: "Nome da tabela", obrigatoria: true },
      { chave: "nomeColuna", tipo: "texto", rotulo: "Nome da nova coluna", obrigatoria: true },
      { chave: "tipoColuna", tipo: "texto", rotulo: "Tipo", obrigatoria: true, placeholder: "numeric(15,2)" },
      { chave: "default", tipo: "texto", rotulo: "Default", obrigatoria: false, placeholder: "CURRENT_TIMESTAMP" },
    ],
  },
  {
    chave: "altertable_renomear_coluna",
    grupo: "instrucoes",
    nome: "Renomear Coluna",
    entradas: [destinoInterno()],
    saida: false,
    ajuda: "Renomeia uma coluna existente de uma tabela do banco interno.",
    campos: [
      { chave: "nomeTabela", tipo: "texto", rotulo: "Nome da tabela", obrigatoria: true },
      { chave: "nomeAtual", tipo: "texto", rotulo: "Nome atual da coluna", obrigatoria: true },
      { chave: "novoNome", tipo: "texto", rotulo: "Novo nome", obrigatoria: true },
    ],
  },
  {
    chave: "altertable_excluir_coluna",
    grupo: "instrucoes",
    nome: "Excluir Coluna",
    entradas: [destinoInterno()],
    saida: false,
    ajuda: "Remove uma coluna existente de uma tabela do banco interno.",
    campos: [
      { chave: "nomeTabela", tipo: "texto", rotulo: "Nome da tabela", obrigatoria: true },
      { chave: "nomeColuna", tipo: "texto", rotulo: "Nome da coluna", obrigatoria: true },
    ],
  },
  {
    chave: "altertable_renomear_tabela",
    grupo: "instrucoes",
    nome: "Renomear Tabela",
    entradas: [destinoInterno()],
    saida: false,
    ajuda: "Renomeia uma tabela existente do banco interno.",
    campos: [
      { chave: "nomeAtual", tipo: "texto", rotulo: "Nome atual da tabela", obrigatoria: true },
      { chave: "novoNome", tipo: "texto", rotulo: "Novo nome", obrigatoria: true },
    ],
  },
];

/** Catálogo de verdade, usado em todo o resto do app — cada molde passa por
    `ordenarPorPrioridade` automaticamente, então declarar `entradas` em `TIPOS_COMPONENTES_BASE`
    nunca precisa se preocupar com a ordem (Conexão sempre sobe pro topo sozinha). */
export const TIPOS_COMPONENTES: TipoComponente[] = TIPOS_COMPONENTES_BASE.map((t) => ({ ...t, entradas: ordenarPorPrioridade(t.entradas) }));

/** Resumo curto de portas, pra mostrar como descrição do card na biblioteca. */
export function resumoPortas(t: TipoComponente): string {
  const entrada = t.entradas.length === 0 ? "sem entrada" : `${t.entradas.length} entrada${t.entradas.length > 1 ? "s" : ""}`;
  const saida = t.saida ? "1 saída" : "sem saída";
  return `${entrada} · ${saida}`;
}

export function resolverTipoComponente(no: NoFluxo): TipoComponente | undefined {
  return no.tipoChave ? TIPOS_COMPONENTES.find((t) => t.chave === no.tipoChave) : undefined;
}

/** Campos já resolvidos (estáticos ou via função) pra um nó — [] quando o tipo não tem
    engrenagem nenhuma. */
export function resolverCampos(ctx: NoConfigContext): CampoEngrenagem[] {
  const tipo = resolverTipoComponente(ctx.no);
  if (!tipo?.campos) return [];
  return typeof tipo.campos === "function" ? tipo.campos(ctx) : tipo.campos;
}

interface LinhaColuna {
  nome: string;
  tipo: string;
  pk: boolean;
  check: string;
  default: string;
}

/** Um campo (`nota` sempre conta como preenchido — não tem entrada) está satisfeito quando não é
    obrigatório, ou quando tem valor de verdade conforme o tipo (lista/tabela não-vazia com pelo
    menos uma linha útil, texto não-branco). Usado tanto pelo popup da engrenagem (gate do botão
    Salvar) quanto pelo ponto vermelho sob o ícone (FluxoPage). */
export function campoPreenchido(campo: CampoEngrenagem, valor: unknown): boolean {
  if (campo.tipo === "nota") return true;
  if (!campo.obrigatoria) return true;
  if (campo.tipo === "lista_condicoes" || campo.tipo === "lista_itens") {
    return Array.isArray(valor) && valor.some((v) => String(v).trim() !== "");
  }
  if (campo.tipo === "colunas") {
    return (
      Array.isArray(valor) &&
      valor.length > 0 &&
      (valor as LinhaColuna[]).every((c) => String(c?.nome ?? "").trim() !== "" && String(c?.tipo ?? "").trim() !== "")
    );
  }
  return typeof valor === "string" ? valor.trim() !== "" : valor !== undefined && valor !== null;
}

export function todosObrigatoriosPreenchidos(campos: CampoEngrenagem[], valores: Record<string, unknown>): boolean {
  return campos.every((c) => campoPreenchido(c, valores[c.chave]));
}

// --- Nó/Fluxo -----------------------------------------------------------------------------

export interface NoFluxo {
  id: string;
  grupo: GrupoComponente;
  nome: string;
  entradas: PortaEntrada[];
  saida: boolean;
  /** Ver `TipoComponente.saidaGrupo` — default é `grupo` quando ausente. */
  saidaGrupo?: GrupoComponente;
  /** Ver `TipoComponente.saidaRotuloGrupo` — só afeta ícone/rótulo exibidos, nunca a
      compatibilidade de conexão (essa é sempre `saidaGrupo`). */
  saidaRotuloGrupo?: GrupoComponente;
  x: number;
  y: number;
  /** Chave em TIPOS_COMPONENTES — ausente pros nós "dado real" (Conexão/Estratégia/Consulta
      soltos no canvas, que nunca têm engrenagem/campos/ação de função simples). Presente em todo
      nó genérico — é o que permite resolver campos/engrenagem a qualquer momento sem duplicar a
      definição do molde dentro do próprio nó. */
  tipoChave?: string;
  /** Valores preenchidos na engrenagem (ou no popup de função simples) deste nó — chave por
      `CampoEngrenagem.chave`. Nunca persiste fora do estado local do canvas (mesma limitação do
      resto do protótipo). */
  config?: Record<string, unknown>;
}

export interface ConexaoFluxo {
  id: string;
  de: string;
  para: string;
  /** índice da porta de entrada no nó de destino (posição em `entradas`). */
  portaEntrada: number;
}

// --- Helpers de grafo (resolvem conteúdo dinâmico de engrenagem + sinalização de porta) -------

export function noConectadoNaEntrada(
  ctx: Pick<NoConfigContext, "nos" | "conexoesGrafo">,
  noId: string,
  indice: number,
): NoFluxo | undefined {
  const con = ctx.conexoesGrafo.find((c) => c.para === noId && c.portaEntrada === indice);
  if (!con) return undefined;
  return ctx.nos.find((n) => n.id === con.de);
}

const GRUPOS_EXTRATORES_TIPOCHAVE = new Set(["extracao_sql", "extracao_planilha", "extracao_api"]);

/** Sobe a cadeia de dado (porta `extratores`/`transformacao`, altGrupo "dado") a partir de um nó
    até achar o Extrator que originou o dado — usado pra resolver a Estratégia upstream de uma
    Escrita BD, mesmo quando ela vem depois de vários passos de Transformação. Guarda de
    profundidade evita loop infinito num grafo malformado (ciclo). */
export function encontrarExtratorUpstream(ctx: Pick<NoConfigContext, "nos" | "conexoesGrafo">, noId: string, profundidade = 0): NoFluxo | undefined {
  if (profundidade > 12) return undefined;
  const no = ctx.nos.find((n) => n.id === noId);
  if (!no) return undefined;
  const idxDado = no.entradas.findIndex((p) => p.grupo === "extratores" || p.grupo === "transformacao");
  if (idxDado < 0) return undefined;
  const conectado = noConectadoNaEntrada(ctx, noId, idxDado) ?? noConectadoNaEntrada(ctx, noId, idxDado + 1);
  if (!conectado) return undefined;
  if (conectado.tipoChave && GRUPOS_EXTRATORES_TIPOCHAVE.has(conectado.tipoChave)) return conectado;
  return encontrarExtratorUpstream(ctx, conectado.id, profundidade + 1);
}

export function resolverEstrategiaUpstream(ctx: NoConfigContext): Estrategia | undefined {
  const extrator = encontrarExtratorUpstream(ctx, ctx.no.id);
  if (!extrator) return undefined;
  const idxEstrategia = extrator.entradas.findIndex((p) => p.grupo === "estrategias");
  if (idxEstrategia < 0) return undefined;
  const noEstrategia = noConectadoNaEntrada(ctx, extrator.id, idxEstrategia);
  if (!noEstrategia) return undefined;
  return (estrategiasPorCliente[ctx.clienteId] ?? []).find((e) => e.nome === noEstrategia.nome);
}

/** Resolve o `Conexao` real (com `organizacao`/`tipo`/etc.) por trás de um nó "dado real" de
    Conexão solto no canvas — esses nós só guardam o `nome` de exibição (não o id), então o match
    é por nome (único por cliente no fixture). Usado pra validar `apenasInterno` em
    `tentarConectar` e pra achar as `abas` no Seletor de Abas. */
export function resolverConexaoPorNome(nome: string, clienteId: string): Conexao | undefined {
  return (conexoesPorCliente[clienteId] ?? []).find((c) => c.nome === nome);
}

export function resolverFonteColunasCriarTabela(ctx: NoConfigContext): "consulta" | "instrucao_colunas" | "instrucao_dados" | undefined {
  const idxConsulta = ctx.no.entradas.findIndex((p) => p.grupo === "consultas");
  const idxColunas = ctx.no.entradas.findIndex((p) => p.grupo === "colunas");
  if (idxConsulta >= 0 && noConectadoNaEntrada(ctx, ctx.no.id, idxConsulta)) return "consulta";
  if (idxColunas >= 0) {
    const conectado = noConectadoNaEntrada(ctx, ctx.no.id, idxColunas);
    if (conectado?.tipoChave === "instrucao_sql_dados") return "instrucao_dados";
    if (conectado?.tipoChave === "instrucao_sql_colunas") return "instrucao_colunas";
  }
  return undefined;
}

// --- Portas: conexão, obrigatoriedade (altGrupo-aware), conflito ------------------------------
// Movidos de FluxoPage.tsx pra cá — `validarFluxo` (abaixo) precisa deles, e o desenho do próprio
// nó no canvas (pontos vermelhos, destaque de conflito) também, então viram fonte única aqui.

export function entradaConectada(noId: string, indice: number, conexoes: ConexaoFluxo[]): boolean {
  return conexoes.some((c) => c.para === noId && c.portaEntrada === indice);
}

export function saidaConectada(noId: string, conexoes: ConexaoFluxo[]): boolean {
  return conexoes.some((c) => c.de === noId);
}

/** Índices de entrada que dividem o mesmo `altGrupo` de `indice` (fonte alternativa — princípio
    2) — inclui o próprio índice; sem altGrupo, devolve só `[indice]`. */
export function indicesMesmoAltGrupo(no: NoFluxo, indice: number): number[] {
  const alt = no.entradas[indice]?.altGrupo;
  if (!alt) return [indice];
  return no.entradas.map((p, i) => (p.altGrupo === alt ? i : -1)).filter((i) => i >= 0);
}

/** Ponto vermelho de obrigatoriedade da porta — some assim que QUALQUER porta do mesmo altGrupo
    estiver conectada (não só a própria). */
export function portaDeveSinalizar(no: NoFluxo, indice: number, conexoes: ConexaoFluxo[]): boolean {
  const porta = no.entradas[indice];
  if (!porta?.obrigatoria) return false;
  return !indicesMesmoAltGrupo(no, indice).some((i) => entradaConectada(no.id, i, conexoes));
}

/** Conflito: duas (ou mais) portas do mesmo altGrupo conectadas ao mesmo tempo — ambíguo, ver
    princípio 2. Sinalização visual sempre; em `validarFluxo` também vira achado que bloqueia
    "Salvar" de verdade. */
export function portaEmConflito(no: NoFluxo, indice: number, conexoes: ConexaoFluxo[]): boolean {
  if (!no.entradas[indice]?.altGrupo) return false;
  const conectadas = indicesMesmoAltGrupo(no, indice).filter((i) => entradaConectada(no.id, i, conexoes));
  return conectadas.length > 1;
}

// --- Validação de Fluxo (botão Salvar) ---------------------------------------------------------

/** Tipos de nó cuja saída NÃO precisa estar conectada — a própria natureza deles já é o "fim" do
    fluxo (escrever é o objetivo em si). Todo outro nó com saída (Leitor, Modificador, Seletor de
    Abas, Instrução SQL, Início/Fim Loop, ou até um nó "dado real" solto sem uso) precisa
    alimentar algo — senão é trabalho à toa. Nós de DDL/Exportação (`saida:false`) nem entram
    nessa checagem. Base do critério de coerência: "um fluxo que lê e não faz nada com a leitura
    não pode ser salvo". */
const SAIDA_OPCIONAL_TIPOCHAVE = new Set(["escrita_bd"]);

/** Roda no clique de "Salvar" — junta TODOS os achados de uma vez (porta obrigatória sem
    conectar, conflito de fonte alternativa, campo obrigatório da engrenagem vazio, teste de
    endpoint com falha, nó cuja saída não alimenta nada) pra mostrar de uma vez só. Lista vazia =
    pode salvar de verdade; qualquer achado = só "Salvar como Rascunho" (rascunho é texto livre,
    sem validade estrutural — ver NOS_FLUXOGRAMA_PRIMEIRA_IMPLEMENTACAO.md). */
export function validarFluxo(nos: NoFluxo[], conexoesGrafo: ConexaoFluxo[], clienteId: string): string[] {
  const achados: string[] = [];

  if (nos.length === 0) {
    achados.push("O fluxo está vazio — arraste componentes pro canvas antes de salvar.");
    return achados;
  }

  for (const no of nos) {
    const indicesVistos = new Set<number>();
    no.entradas.forEach((porta, i) => {
      if (indicesVistos.has(i)) return;
      const grupoAlt = indicesMesmoAltGrupo(no, i);
      grupoAlt.forEach((idx) => indicesVistos.add(idx));

      if (portaDeveSinalizar(no, i, conexoesGrafo)) {
        const rotulo =
          grupoAlt.length > 1
            ? grupoAlt.map((idx) => TITULO_CURTO_GRUPO[no.entradas[idx].grupo]).join(" ou ")
            : TITULO_CURTO_GRUPO[porta.grupo];
        achados.push(`"${no.nome}": falta conectar ${rotulo}.`);
      } else if (portaEmConflito(no, i, conexoesGrafo)) {
        achados.push(`"${no.nome}": duas fontes alternativas conectadas ao mesmo tempo (ambíguo) — deixe só uma.`);
      }
    });

    const campos = resolverCampos({ no, nos, conexoesGrafo, clienteId });
    for (const campo of campos) {
      if (campo.tipo === "nota" || campo.tipo === "teste_endpoint") continue;
      if (!campoPreenchido(campo, no.config?.[campo.chave])) {
        achados.push(`"${no.nome}": preencha o campo "${campo.rotulo}" na engrenagem.`);
      }
    }

    if (no.tipoChave === "extracao_api" && no.config?._testeApiOk === false) {
      achados.push(`"${no.nome}": o teste do endpoint falhou — corrija a Rota e teste de novo.`);
    }

    if (no.saida && !SAIDA_OPCIONAL_TIPOCHAVE.has(no.tipoChave ?? "") && !saidaConectada(no.id, conexoesGrafo)) {
      achados.push(`"${no.nome}" não está conectado a nada — o resultado dele não é usado em lugar nenhum.`);
    }
  }

  return achados;
}
