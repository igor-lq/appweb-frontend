export type PerfilUsuario = "Administrador" | "Analista ETL" | "Analista";
export const perfisUsuario: PerfilUsuario[] = ["Administrador", "Analista ETL", "Analista"];

export interface Usuario {
  id: string;
  nome: string;
  login: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

/** Mock do "usuário logado" — mesmo e-mail usado como padrão na tela de Login. Só serve pra
    replicar a regra da V1 de esconder "Excluir" pro próprio usuário (protótipo não tem sessão
    real). */
export const USUARIO_LOGADO_ID = "u1";

export const usuarios: Usuario[] = [
  { id: "u1", nome: "Operador Padrão", login: "operador@empresa.com.br", perfil: "Administrador", ativo: true },
  { id: "u2", nome: "Ana Ribeiro", login: "ana.ribeiro@empresa.com.br", perfil: "Analista ETL", ativo: true },
  { id: "u3", nome: "Carlos Menezes", login: "carlos.menezes@empresa.com.br", perfil: "Analista", ativo: true },
  { id: "u4", nome: "Beatriz Nunes", login: "beatriz.nunes@empresa.com.br", perfil: "Analista", ativo: false },
];
