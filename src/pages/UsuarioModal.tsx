import { useState } from "react";
import { Dialog } from "../components/Dialog";
import { ApiError } from "../api/client";
import { usuariosApi, type UsuarioApi, type PerfilUsuarioApi } from "../api/usuarios";
import { perfisUsuario } from "../mocks/usuarios";

interface UsuarioModalProps {
  titulo: string;
  usuario?: UsuarioApi;
  onClose: () => void;
  onSalvar: () => void;
}

export function UsuarioModal({ titulo, usuario, onClose, onSalvar }: UsuarioModalProps) {
  const criandoNovo = !usuario;
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [login, setLogin] = useState(usuario?.login ?? "");
  const [perfil, setPerfil] = useState<PerfilUsuarioApi>(usuario?.perfil ?? "Analista");
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true);
  const [senhaInicial, setSenhaInicial] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim() && login.trim() && (!criandoNovo || senhaInicial.trim());

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      if (usuario) {
        await usuariosApi.atualizar(usuario.id, { nome, perfil, ativo });
      } else {
        await usuariosApi.criar({ nome, login, perfil, senha_inicial: senhaInicial });
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar usuário.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!podeSalvar || enviando} onClick={salvar}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="us-nome">Nome</label>
        <input className="input" id="us-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="us-login">Login</label>
        <input
          className="input"
          id="us-login"
          placeholder="nome.sobrenome@empresa.com.br"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          autoComplete="off"
          disabled={!criandoNovo}
        />
      </div>
      <div className="field">
        <label htmlFor="us-perfil">Perfil</label>
        <select className="input" id="us-perfil" value={perfil} onChange={(e) => setPerfil(e.target.value as PerfilUsuarioApi)}>
          {perfisUsuario.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {criandoNovo && (
        <div className="field">
          <label htmlFor="us-senha">Senha inicial</label>
          <input
            className="input"
            id="us-senha"
            type="password"
            value={senhaInicial}
            onChange={(e) => setSenhaInicial(e.target.value)}
            autoComplete="new-password"
          />
          <div className="text-muted" style={{ fontSize: 12, marginTop: 5 }}>
            Definida pelo Administrador no cadastro. No primeiro login, o usuário é obrigado a
            trocá-la.
          </div>
        </div>
      )}

      {!criandoNovo && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
      )}

      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
