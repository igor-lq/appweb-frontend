import type { EventoLog } from "./types";

const TOKEN_KEY = "etl_manager_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const corpo = await res.json();
      detail = corpo.detail ?? detail;
    } catch {
      // resposta sem corpo JSON — mantém o statusText
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body !== undefined ? JSON.stringify(body) : undefined }),
  del: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Lê uma resposta NDJSON (uma linha de log por vez) e chama `onEvento` para
 * cada uma, conforme chega — mesmo padrão de `src/api/client.ts` (V1). `body`
 * opcional (serializado como JSON) — a maioria das rotas de streaming não
 * precisa de corpo (agem sobre uma Task/Consulta já salva pelo id na URL),
 * mas "Criar Tabela" do modal "Nova Task" acontece ANTES da Task existir,
 * então precisa mandar tudo explícito. */
export async function streamPost(
  path: string,
  onEvento: (evento: EventoLog) => void,
  body?: unknown,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.body) {
    throw new ApiError(res.status, "Sem corpo de resposta.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const linhas = buffer.split("\n");
    buffer = linhas.pop() ?? "";
    for (const linha of linhas) {
      if (linha.trim()) onEvento(JSON.parse(linha));
    }
  }
  if (buffer.trim()) onEvento(JSON.parse(buffer));
}
