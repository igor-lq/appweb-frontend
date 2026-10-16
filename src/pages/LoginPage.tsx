import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import "./LoginPage.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loginValue, setLoginValue] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(loginValue, senha);
      navigate("/clientes");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo" />
          <div className="login-product">Gerenciador ETL</div>
        </div>
        <h6 className="text-muted">Acesso à plataforma</h6>
        <form className="login-form" onSubmit={aoEnviar}>
          <div className="field">
            <label htmlFor="lg-user">Login</label>
            <input
              className="input"
              id="lg-user"
              value={loginValue}
              onChange={(e) => setLoginValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="lg-pass">Senha</label>
            <input
              className="input"
              id="lg-pass"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={enviando}>
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
