import { streamPost } from "./client";
import type { EventoLog } from "./types";

/** Reconciliação arquivo→Postgres (`Clientes/*` da VPS → Cliente/Conexao/sql_texto de Consulta/
    Analysis Services), sob demanda — nunca automática. Ver `backend/app/core/etl_import.py`. */
export const sincronizacaoApi = {
  sincronizarPastas: (onEvento: (evento: EventoLog) => void) =>
    streamPost("/sincronizacao/pastas-clientes", onEvento),
  /** Mesma reconciliação, escopada a um único cliente (botão "Sincronizar Cliente" na Visão
      Geral) — inclui trazer alterações manuais do Git pro Modelo Semântico. */
  sincronizarCliente: (clienteId: string, onEvento: (evento: EventoLog) => void) =>
    streamPost(`/clientes/${clienteId}/sincronizar`, onEvento),
};
