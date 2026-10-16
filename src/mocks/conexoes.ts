import { conexoesInternasGlobais } from "./conexoesInternasGlobais";

export type StatusConexao = "ativa" | "atenção" | "inativa";

export type TipoConexao = "Oracle" | "PostgreSQL" | "Planilha" | "API";
export const tiposConexao: TipoConexao[] = ["Oracle", "PostgreSQL", "Planilha", "API"];

/** Externo: os dados de acesso (host/usuário/senha/etc.) ficam na própria conexão do cliente.
    Interno: a conexão só referencia o catálogo global (conexaoInternaId + bancoInterno) —
    o servidor em si é cadastrado uma única vez nas configurações gerais, ver
    mocks/conexoesInternasGlobais.ts. Toda Conexão Destino de uma Task é sempre Interno. */
export type Organizacao = "Externo" | "Interno";

export interface Conexao {
  id: string;
  /** Nome de exibição — livre, é o que aparece em todo o projeto (listas, seletores, painéis).
      Puramente visual, sem regra de formato. */
  nome: string;
  /** Auto-calculada a partir do nome (minúsculo, sem espaço/acento/caractere especial) — é o
      identificador salvo nos arquivos internos, que não podem ter espaço ou caractere especial.
      Ex.: "Oracle Winthor" -> "oraclewinthor". Ver labelInternaConexao(). */
  labelInterna: string;
  tipo: TipoConexao;
  organizacao: Organizacao;
  status: StatusConexao;
  verificadaHa: string;
  usoEmFluxos: number;

  // Externo + PostgreSQL
  host?: string;
  porta?: string;
  banco?: string;
  usuario?: string;
  senha?: string;
  // Externo + Oracle (no lugar de "Banco")
  serviceName?: string;
  // Externo + Planilha
  url?: string;
  /** Abas da planilha — só exibidas no painel de detalhes depois de "Testar conexão", como se a
      lista viesse de fato do teste (mock já vem preenchido). */
  abas?: string[];
  // Externo + API
  baseUrl?: string;
  token?: string;
  headers?: string;

  // Interno (qualquer tipo, sempre tratado como Postgres por baixo)
  conexaoInternaId?: string;
  bancoInterno?: string;
}

/** Minúsculo, sem acento/espaço/caractere especial — mesma regra da Label do Cliente, só que
    aqui espaço é removido de vez (não vira "_"), porque o Nome da conexão é texto livre digitado
    naturalmente (ex.: "Oracle Winthor"), não um label já semi-formatado. */
export function labelInternaConexao(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const conexoesPorCliente: Record<string, Conexao[]> = {
  "cooperativa-vale-norte": [
    {
      id: "conexao_postgres",
      nome: "Postgres Faturamento",
      labelInterna: labelInternaConexao("Postgres Faturamento"),
      tipo: "PostgreSQL",
      organizacao: "Externo",
      host: "10.0.4.21",
      porta: "5432",
      banco: "faturamento",
      usuario: "etl_app",
      senha: "PgFat#2025",
      status: "ativa",
      verificadaHa: "há 6 min",
      usoEmFluxos: 9,
    },
    {
      id: "conexao_oracle",
      nome: "Oracle Winthor",
      labelInterna: labelInternaConexao("Oracle Winthor"),
      tipo: "Oracle",
      organizacao: "Externo",
      host: "srv-ora-01",
      porta: "1521",
      serviceName: "PRD",
      usuario: "etl_reader",
      senha: "OraRead#25",
      status: "ativa",
      verificadaHa: "há 22 min",
      usoEmFluxos: 4,
    },
    {
      id: "conexao_planilha_erp",
      nome: "Planilha Vendas ERP",
      labelInterna: labelInternaConexao("Planilha Vendas ERP"),
      tipo: "Planilha",
      organizacao: "Externo",
      url: "https://docs.google.com/spreadsheets/d/1aB2cD-erp-vendas/edit",
      abas: ["Vendas", "Metas"],
      status: "ativa",
      verificadaHa: "há 1 h",
      usoEmFluxos: 2,
    },
    {
      id: "conexao_api_erp",
      nome: "API Pedidos ERP",
      labelInterna: labelInternaConexao("API Pedidos ERP"),
      tipo: "API",
      organizacao: "Externo",
      baseUrl: "https://api.erp-cooperativa.com.br/v1",
      token: "sk_live_9f3ac1d0",
      headers: "Authorization: Bearer {token}",
      status: "atenção",
      verificadaHa: "há 3 h",
      usoEmFluxos: 3,
    },
    {
      id: "conexao_interna_dw",
      nome: "Banco Interno DW",
      labelInterna: labelInternaConexao("Banco Interno DW"),
      tipo: "PostgreSQL",
      organizacao: "Interno",
      conexaoInternaId: "srv-dw-01",
      bancoInterno: "dw_cooperativa_vale_norte",
      status: "ativa",
      verificadaHa: "há 6 min",
      usoEmFluxos: 6,
    },
    {
      id: "conexao_interna_as",
      nome: "Banco Interno AS",
      labelInterna: labelInternaConexao("Banco Interno AS"),
      tipo: "PostgreSQL",
      organizacao: "Interno",
      conexaoInternaId: "srv-dw-01",
      bancoInterno: "dw_cooperativa_vale_norte",
      status: "ativa",
      verificadaHa: "há 6 min",
      usoEmFluxos: 1,
    },
  ],
};

/** Linha de resumo mostrada no card da lista de conexões, conforme tipo/organização. */
export function resumoConexao(c: Conexao): string {
  if (c.organizacao === "Interno") return `Interno · ${c.bancoInterno ?? "—"}`;
  if (c.tipo === "PostgreSQL") return `${c.host}:${c.porta} · ${c.banco}`;
  if (c.tipo === "Oracle") return `${c.host}:${c.porta} · ${c.serviceName}`;
  if (c.tipo === "Planilha") return c.url ?? "—";
  return c.baseUrl ?? "—";
}

/** Pares label/valor exibidos no painel de detalhes, conforme tipo/organização. */
export function camposExibicaoConexao(c: Conexao): [string, string][] {
  const base: [string, string][] = [["Label interna", c.labelInterna]];
  if (c.organizacao === "Interno") {
    const servidor = conexoesInternasGlobais.find((s) => s.id === c.conexaoInternaId);
    return [
      ...base,
      ["Organização", "Interno"],
      ["Servidor", servidor?.nome ?? "—"],
      ["Banco", c.bancoInterno ?? "—"],
    ];
  }
  if (c.tipo === "PostgreSQL") {
    return [
      ...base,
      ["Tipo", c.tipo],
      ["Host", c.host ?? "—"],
      ["Porta", c.porta ?? "—"],
      ["Banco", c.banco ?? "—"],
      ["Usuário", c.usuario ?? "—"],
      ["Senha", c.senha ?? "—"],
    ];
  }
  if (c.tipo === "Oracle") {
    return [
      ...base,
      ["Tipo", c.tipo],
      ["Host", c.host ?? "—"],
      ["Porta", c.porta ?? "—"],
      ["Service Name", c.serviceName ?? "—"],
      ["Usuário", c.usuario ?? "—"],
      ["Senha", c.senha ?? "—"],
    ];
  }
  if (c.tipo === "Planilha") {
    return [
      ...base,
      ["Tipo", c.tipo],
      ["URL", c.url ?? "—"],
    ];
  }
  return [
    ...base,
    ["Tipo", c.tipo],
    ["URL base", c.baseUrl ?? "—"],
    ["Token", c.token ?? "—"],
    ["Headers", c.headers ?? "—"],
  ];
}
