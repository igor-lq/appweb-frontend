import { useEffect, useState } from "react";
import { usuariosApi, type UsuarioApi } from "../api/usuarios";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Tag } from "../components/Tag";
import { ConfirmarExclusaoModal } from "../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../components/BotaoExcluir";
import { UsuarioModal } from "./UsuarioModal";
import { ResetarSenhaModal } from "./ResetarSenhaModal";
import "./UsuariosPage.css";

export function UsuariosPage() {
  const { usuario: usuarioLogado } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioApi[]>([]);
  const [query, setQuery] = useState("");
  const [selecionadoId, setSelecionadoId] = useState<string | undefined>(undefined);
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [resetandoSenha, setResetandoSenha] = useState(false);
  const [senhaResetadaId, setSenhaResetadaId] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  function recarregar() {
    usuariosApi.listar().then((lista) => {
      setUsuarios(lista);
      setSelecionadoId((atual) => atual ?? lista[0]?.id);
    });
  }

  useEffect(recarregar, []);

  const filtrados = usuarios.filter((u) => u.nome.toLowerCase().includes(query.trim().toLowerCase()));
  const usuario = filtrados.find((u) => u.id === selecionadoId) ?? filtrados[0];

  async function excluirUsuario(id: string) {
    setErroExclusao(null);
    try {
      await usuariosApi.excluir(id);
      setUsuarios((atual) => atual.filter((u) => u.id !== id));
      setSelecionadoId((atual) => (atual === id ? undefined : atual));
      setExcluindo(false);
    } catch (e) {
      setErroExclusao(e instanceof ApiError ? e.message : "Falha ao excluir usuário.");
      setExcluindo(false);
    }
  }

  function confirmarResetSenha() {
    if (!usuario) return;
    setResetandoSenha(false);
    setSenhaResetadaId(usuario.id);
    setTimeout(() => setSenhaResetadaId((atual) => (atual === usuario.id ? null : atual)), 2000);
  }

  return (
    <div className="usuarios-page">
      <div className="usuarios-header">
        <div>
          <div className="kicker">Administração</div>
          <h2>Usuários</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setModal("novo")}>
          + Novo usuário
        </button>
      </div>

      <div className="usuarios-body">
        <div className="usuarios-list scroll">
          <input
            className="input usuarios-search"
            placeholder="Buscar usuário"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtrados.map((u) => (
            <div
              key={u.id}
              className={`card usuarios-item${u.id === usuario?.id ? " is-selected" : ""}`}
              onClick={() => {
                setSelecionadoId(u.id);
                setResetandoSenha(false);
                setErroExclusao(null);
              }}
            >
              <div className="usuarios-item-nome">{u.nome}</div>
              <div className="usuarios-item-row">
                <div className="text-muted usuarios-item-meta">{u.login}</div>
                <Tag status={u.ativo ? "ativo" : "pausado"} />
              </div>
            </div>
          ))}
          {filtrados.length === 0 && <div className="text-muted">Nenhum usuário encontrado.</div>}
        </div>

        {usuario && (
          <aside className="usuarios-detalhes scroll">
            <div className="card-kicker">Detalhes do usuário</div>
            <div className="usuarios-detalhes-nome">{usuario.nome}</div>

            <div className="usuarios-detalhes-campos">
              {[
                ["Login", usuario.login],
                ["Perfil", usuario.perfil],
                ["Ativo", usuario.ativo ? "Sim" : "Não"],
              ].map(([label, value]) => (
                <div className="usuarios-campo" key={label}>
                  <span className="text-muted">{label}</span>
                  <span className="usuarios-campo-valor">{value}</span>
                </div>
              ))}
            </div>

            <div className="detail-actions">
              <div className="detail-actions-row">
                <button className="btn btn-secondary" onClick={() => setModal("editar")}>
                  Editar
                </button>
                <button className="btn btn-secondary" onClick={() => setResetandoSenha(true)}>
                  {senhaResetadaId === usuario.id ? "Senha resetada!" : "Resetar senha"}
                </button>
              </div>
              {usuario.id !== usuarioLogado?.id && (
                <BotaoExcluir onClick={() => { setErroExclusao(null); setExcluindo(true); }} className="btn-block" />
              )}
              {erroExclusao && <div className="text-danger" style={{ fontSize: 13 }}>{erroExclusao}</div>}
            </div>

            <p className="text-muted usuarios-hint">
              Excluir apaga o cadastro pra sempre. Pra só suspender o acesso sem perder o
              histórico, desmarque "Ativo" em Editar.
            </p>
          </aside>
        )}
      </div>

      {excluindo && usuario && (
        <ConfirmarExclusaoModal
          titulo="Excluir Usuário"
          mensagem={`Tem certeza que deseja excluir o usuário "${usuario.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => excluirUsuario(usuario.id)}
        />
      )}

      {modal && (
        <UsuarioModal
          titulo={modal === "novo" ? "Novo usuário" : "Editar usuário"}
          usuario={modal === "editar" ? usuario : undefined}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregar();
          }}
        />
      )}

      {resetandoSenha && usuario && (
        <ResetarSenhaModal
          usuarioId={usuario.id}
          nomeUsuario={usuario.nome}
          onClose={() => setResetandoSenha(false)}
          onConfirmar={confirmarResetSenha}
        />
      )}
    </div>
  );
}
