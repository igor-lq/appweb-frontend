import { api } from "./client";

export type CategoriaConsultaApi = "Fato" | "dim" | "Stage" | "aux" | "View";

export const categoriasConsultaApi: CategoriaConsultaApi[] = ["Fato", "dim", "Stage", "aux", "View"];

export const ROTULO_CATEGORIA_CONSULTA: Record<CategoriaConsultaApi, string> = {
  Fato: "Fato",
  dim: "Dimensão",
  Stage: "Stage",
  aux: "Auxiliar",
  View: "View",
};

const PREFIXO_CATEGORIA: Record<CategoriaConsultaApi, string> = {
  Fato: "fato",
  dim: "dim",
  Stage: "stage",
  aux: "aux",
  View: "view",
};

function slugify(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/** Espelha `app/utils/nomes.py::nome_interno_consulta` (backend) — mesma regra de nome interno já
    usada em `mocks/consultas.ts`. "View" aqui é só a categoria/Camada DW da Consulta (metadado,
    sem lógica de execução anexada) — diferente da entidade `View` própria do backend
    (`routers/views.py`, `CREATE VIEW` de verdade), que continua existindo à parte. */
export function nomeInternoConsultaApi(categoria: CategoriaConsultaApi, nome: string): string {
  return `${PREFIXO_CATEGORIA[categoria]}_${slugify(nome)}`;
}

export interface ConsultaApi {
  id: string;
  cliente_id: string;
  nome: string;
  arquivo_slug: string;
  categoria: CategoriaConsultaApi;
  conexao_origem_id: string | null;
  rotina_erp: string | null;
  ativo: boolean;
  sql_texto: string | null;
}

export interface ConsultaPayload {
  nome: string;
  categoria: CategoriaConsultaApi;
  rotina_erp?: string | null;
  sql_texto?: string | null;
}

export const consultasApi = {
  listar: (clienteId: string) => api.get<ConsultaApi[]>(`/clientes/${clienteId}/consultas`),
  criar: (clienteId: string, payload: ConsultaPayload) =>
    api.post<ConsultaApi>(`/clientes/${clienteId}/consultas`, payload),
  atualizar: (clienteId: string, id: string, payload: Partial<ConsultaPayload>) =>
    api.patch<ConsultaApi>(`/clientes/${clienteId}/consultas/${id}`, payload),
  excluir: (clienteId: string, id: string) => api.del(`/clientes/${clienteId}/consultas/${id}`),
};
