import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RoleModal } from "./RoleModal";
import { analysisServerApi } from "../../api/analysisServer";
import { ApiError } from "../../api/client";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import type { ModeloSemanticoContext } from "./ModeloSemanticoShell";
import "./RelacionamentosTab.css";

/** Mesmo padrão visual/estrutural de `RelacionamentosTab.tsx` (lista+detalhe, reaproveitando o
    CSS já existente) — só estrutura (nome + modelPermission + RLS por tabela), sem gestão de
    membros/usuários do Analysis Services (fora de escopo, decisão do usuário 2026-09-04). */
export function RolesTab() {
  const { cliente, conexaoId, modelo, recarregarModelo } = useOutletContext<ModeloSemanticoContext>();
  const roles = modelo?.roles ?? [];
  const tabelas = modelo?.tabelas ?? [];
  const [query, setQuery] = useState("");
  const [selecionado, setSelecionado] = useState(0);
  const [modal, setModal] = useState<"novo" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!cliente || !conexaoId) return null;

  const filtrados = roles.filter((r) => r.nome.toLowerCase().includes(query.trim().toLowerCase()));
  const role = roles[selecionado];

  async function excluir() {
    if (!role) return;
    setErro(null);
    try {
      await analysisServerApi.excluirRole(cliente!.id, conexaoId!, role.nome);
      setSelecionado(0);
      setExcluindo(false);
      recarregarModelo();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao excluir role.");
      setExcluindo(false);
    }
  }

  return (
    <div className="relacionamentos-page">
      <div className="relacionamentos-toolbar">
        <div />
        <button className="btn btn-primary" onClick={() => setModal("novo")}>
          + Nova role
        </button>
      </div>

      <div className="relacionamentos-body">
        <div className="relacionamentos-lista scroll">
          <input
            className="input relacionamentos-search"
            placeholder="Buscar role"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtrados.map((r) => {
            const idx = roles.indexOf(r);
            return (
              <div
                key={r.nome}
                className={`card relacionamentos-item${idx === selecionado ? " is-selected" : ""}`}
                onClick={() => {
                  setSelecionado(idx);
                  setErro(null);
                }}
              >
                <div className="relacionamentos-item-nome">{r.nome}</div>
                <div className="text-muted relacionamentos-item-meta">
                  {r.model_permission === "read" ? "Leitura" : "Nenhum acesso"}
                  <span className="meta-sep">·</span>
                  {r.permissoes_tabela.length} tabela(s) com RLS
                </div>
              </div>
            );
          })}
          {roles.length === 0 && <div className="text-muted">Nenhuma role criada.</div>}
          {roles.length > 0 && filtrados.length === 0 && <div className="text-muted">Nenhuma role encontrada.</div>}
        </div>

        {role && (
          <aside className="relacionamentos-detalhes scroll">
            <div className="card-kicker">Detalhes da role</div>
            <div className="relacionamentos-detalhes-titulo">{role.nome}</div>

            <div className="relacionamentos-detalhes-campos">
              <div className="relacionamentos-campo">
                <span className="text-muted">Permissão do modelo</span>
                <span className="opcoes-mono">{role.model_permission}</span>
              </div>
              {role.permissoes_tabela.map((p) => (
                <div className="relacionamentos-campo" key={p.tabela} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                  <span className="text-muted">{p.tabela}</span>
                  <span className="opcoes-mono" style={{ fontSize: 11.5 }}>
                    {p.filtro}
                  </span>
                </div>
              ))}
              {role.permissoes_tabela.length === 0 && (
                <div className="relacionamentos-campo">
                  <span className="text-muted">RLS</span>
                  <span className="opcoes-mono">Nenhuma restrição por tabela</span>
                </div>
              )}
            </div>

            <div className="detail-actions-row" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setModal("editar")}>
                Editar
              </button>
              <BotaoExcluir onClick={() => setExcluindo(true)} />
            </div>

            {erro && (
              <div className="text-danger" style={{ fontSize: 13, marginTop: 8 }}>
                {erro}
              </div>
            )}
          </aside>
        )}
      </div>

      {modal && (
        <RoleModal
          titulo={modal === "novo" ? "Nova role" : "Editar role"}
          clienteId={cliente.id}
          conexaoId={conexaoId}
          tabelas={tabelas}
          role={modal === "editar" ? role : undefined}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregarModelo();
          }}
        />
      )}

      {excluindo && role && (
        <ConfirmarExclusaoModal
          titulo="Excluir Role"
          mensagem={`Tem certeza que deseja excluir a role "${role.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={excluir}
        />
      )}
    </div>
  );
}
