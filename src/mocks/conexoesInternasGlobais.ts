/** Catálogo global de servidores de banco interno — cadastrado uma única vez nas configurações
    gerais (ADM) e reaproveitado por todos os clientes, em vez de repetir host/usuário/senha em
    cada cliente. Cada cliente só referencia qual servidor + qual banco dentro dele usa (ver
    Conexao.conexaoInternaId/bancoInterno em mocks/conexoes.ts). */
export interface ConexaoInternaGlobal {
  id: string;
  nome: string;
  host: string;
  porta: string;
  usuario: string;
  senha: string;
  bancos: string[];
}

export const conexoesInternasGlobais: ConexaoInternaGlobal[] = [
  {
    id: "srv-dw-01",
    nome: "srv_dw_01",
    host: "10.0.9.10",
    porta: "5432",
    usuario: "app_admin",
    senha: "AppDw#2025",
    bancos: ["dw_cooperativa_vale_norte", "dw_metalcamp"],
  },
];
