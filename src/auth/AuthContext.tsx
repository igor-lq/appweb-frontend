import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";
import type { PerfilUsuario } from "../mocks/usuarios";

export interface UsuarioLogado {
  id: string;
  nome: string;
  login: string;
  perfil: PerfilUsuario;
  must_change_password: boolean;
}

interface AuthContextValue {
  usuario: UsuarioLogado | null;
  carregando: boolean;
  login: (login: string, senha: string) => Promise<UsuarioLogado>;
  logout: () => void;
  atualizarUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioLogado | null>(null);
  const [carregando, setCarregando] = useState(true);

  const atualizarUsuario = useCallback(async () => {
    if (!getToken()) {
      setUsuario(null);
      return;
    }
    try {
      const dados = await api.get<UsuarioLogado>("/auth/me");
      setUsuario(dados);
    } catch {
      clearToken();
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    atualizarUsuario().finally(() => setCarregando(false));
  }, [atualizarUsuario]);

  async function login(loginValue: string, senha: string): Promise<UsuarioLogado> {
    const resposta = await api.post<{ access_token: string; must_change_password: boolean }>(
      "/auth/login",
      { login: loginValue, senha },
    );
    setToken(resposta.access_token);
    const dados = await api.get<UsuarioLogado>("/auth/me");
    setUsuario(dados);
    return dados;
  }

  function logout() {
    clearToken();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, logout, atualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
