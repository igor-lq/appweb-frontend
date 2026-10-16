import { api, streamPost } from "./client";
import type { EventoLog } from "./types";

export type TipoConexaoApi = "Oracle" | "PostgreSQL" | "SQL Server" | "Excel" | "API" | "Analysis Services";
export type OrganizacaoApi = "Externo" | "Interno";
export type StatusVerificacaoApi = "ok" | "falha" | "pendente";

export const tiposConexaoApi: TipoConexaoApi[] = [
  "PostgreSQL",
  "Oracle",
  "SQL Server",
  "Excel",
  "API",
  "Analysis Services",
];

/** Tipos de banco "de verdade" — capazes de ser Organização Externa OU Interna via o picker
    genérico de Conexão Interna/Banco Interno (host/porta/usuário/senha quando Externo). Mesmo
    conjunto que `_TIPOS_BANCO` já usa no backend (`routers/conexoes.py`). */
export const tiposConexaoDeBanco: TipoConexaoApi[] = ["PostgreSQL", "Oracle", "SQL Server"];

/** Tipos que hoje têm um catálogo real de "Conexão Interna" pra escolher quando Organização =
    Interno — Postgres (`ConexaoInterna`/`BancoInterno`, cadastrados em Config) e Analysis
    Services (`InstanciaAS`/`DatabaseAS`, seu próprio catálogo/picker). Oracle e SQL Server NÃO
    têm nenhum catálogo interno hoje (o "banco interno" é sempre tecnologia Postgres), por isso
    não aparecem aqui mesmo sendo tipos "de banco" válidos como Organização Externa. Analysis
    Services, ao contrário, só existe como Organização Interna — nunca Externa. */
export const tiposConexaoInterna: TipoConexaoApi[] = ["PostgreSQL", "Analysis Services"];

export interface ConexaoApi {
  id: string;
  cliente_id: string;
  nome: string;
  tipo: TipoConexaoApi;
  organizacao: OrganizacaoApi;
  ativo: boolean;
  status_verificacao: StatusVerificacaoApi;
  mensagem_verificacao: string | null;
  host: string | null;
  porta: string | null;
  usuario: string | null;
  senha: string | null;
  banco: string | null;
  link_planilha: string | null;
  abas_disponiveis: string[] | null;
  base_url: string | null;
  header: string | null;
  token: string | null;
  banco_interno_id: string | null;
  instancia_as_id: string | null;
  database_as_id: string | null;
  chave: string | null;
  ultima_alteracao_em: string | null;
  ultimo_deploy_em: string | null;
}

export interface ConexaoPayload {
  nome: string;
  tipo: TipoConexaoApi;
  organizacao?: OrganizacaoApi;
  host?: string | null;
  porta?: string | null;
  usuario?: string | null;
  banco?: string | null;
  senha?: string | null;
  link_planilha?: string | null;
  base_url?: string | null;
  header?: string | null;
  token?: string | null;
  banco_interno_id?: string | null;
  instancia_as_id?: string | null;
  database_as_id?: string | null;
  sufixo_branch?: string | null;
}

export interface TestarConexaoAvulsoResultado {
  ok: boolean;
  mensagem: string;
}

export interface TabelasEViewsApi {
  tabelas: string[];
  views: string[];
}

export const conexoesApi = {
  listar: (clienteId: string) => api.get<ConexaoApi[]>(`/clientes/${clienteId}/conexoes`),
  criar: (clienteId: string, payload: ConexaoPayload) =>
    api.post<ConexaoApi>(`/clientes/${clienteId}/conexoes`, payload),
  atualizar: (clienteId: string, id: string, payload: Partial<ConexaoPayload>) =>
    api.patch<ConexaoApi>(`/clientes/${clienteId}/conexoes/${id}`, payload),
  excluir: (clienteId: string, id: string) => api.del(`/clientes/${clienteId}/conexoes/${id}`),
  testar: (clienteId: string, id: string, onEvento: (evento: EventoLog) => void) =>
    streamPost(`/clientes/${clienteId}/conexoes/${id}/testar`, onEvento),
  /** Testa uma Conexao ainda não salva (modal "Nova conexão") — Externo E Interno. */
  testarAvulso: (clienteId: string, payload: ConexaoPayload) =>
    api.post<TestarConexaoAvulsoResultado>(`/clientes/${clienteId}/conexoes/testar-avulso`, payload),
  /** Tabelas/views do banco interno vinculado a uma Conexão Interna (organização Interno) — usado
      como Fonte na Task Processamento AS ("Selecionar Tabela/View") e no popup "Criar View". */
  tabelas: (clienteId: string, conexaoId: string) =>
    api.get<TabelasEViewsApi>(`/clientes/${clienteId}/conexoes/${conexaoId}/tabelas`),
};

/** Conexões "Organização: Interno" (exclui Analysis Services, que também vive em Conexao mas
    nunca é uma Fonte de dado válida — é o destino do Modelo Semântico). Mesmo filtro usado em
    `VisaoGeralTab.tsx`. */
export function conexoesInternasNaoAs(conexoes: ConexaoApi[]): ConexaoApi[] {
  return conexoes.filter((c) => c.organizacao === "Interno" && c.tipo !== "Analysis Services");
}

/** Linha de resumo pro card da lista — espelha `mocks/conexoes.ts::resumoConexao`. */
export function resumoConexaoApi(c: ConexaoApi): string {
  if (c.tipo === "Analysis Services") return "Analysis Services";
  if (c.organizacao === "Interno") return "Conexão interna";
  if (c.tipo === "PostgreSQL" || c.tipo === "SQL Server") return `${c.host}:${c.porta} · ${c.banco}`;
  if (c.tipo === "Oracle") return `${c.host}:${c.porta} · ${c.banco}`;
  if (c.tipo === "Excel") return c.link_planilha ?? "—";
  return c.base_url ?? "—";
}
