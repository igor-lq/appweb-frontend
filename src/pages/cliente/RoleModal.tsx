import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { SearchableSelect } from "../../components/SearchableSelect";
import { DaxEditor } from "../../components/DaxEditor";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { ApiError } from "../../api/client";
import { analysisServerApi, type RoleTmdlApi, type TabelaTmdlApi, type TablePermissionTmdlApi } from "../../api/analysisServer";

interface RoleModalProps {
  titulo: string;
  clienteId: string;
  conexaoId: string;
  tabelas: TabelaTmdlApi[];
  role?: RoleTmdlApi;
  onClose: () => void;
  onSalvar: () => void;
}

/** Cria ou edita (`role` presente) uma Role do Modelo Semântico — mesmo princípio de
    `RelacionamentoModal`/`MedidaModal` com o objeto opcional. Só estrutura (modelPermission +
    filterExpression por tabela) — sem gestão de membros/usuários do Analysis Services. */
export function RoleModal({ titulo, clienteId, conexaoId, tabelas, role, onClose, onSalvar }: RoleModalProps) {
  const [nome, setNome] = useState(role?.nome ?? "");
  const [modelPermission, setModelPermission] = useState(role?.model_permission ?? "read");
  const [permissoes, setPermissoes] = useState<TablePermissionTmdlApi[]>(role?.permissoes_tabela ?? []);
  const [novaTabela, setNovaTabela] = useState(tabelas[0]?.nome ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const tabelasDisponiveis = tabelas.filter((t) => !permissoes.some((p) => p.tabela === t.nome));
  const podeSalvar = nome.trim().length > 0;

  function adicionarPermissao() {
    if (!novaTabela || permissoes.some((p) => p.tabela === novaTabela)) return;
    setPermissoes((atual) => [...atual, { tabela: novaTabela, filtro: "" }]);
    const proxima = tabelasDisponiveis.find((t) => t.nome !== novaTabela);
    setNovaTabela(proxima?.nome ?? "");
  }

  function removerPermissao(tabela: string) {
    setPermissoes((atual) => atual.filter((p) => p.tabela !== tabela));
  }

  function alterarFiltro(tabela: string, filtro: string) {
    setPermissoes((atual) => atual.map((p) => (p.tabela === tabela ? { ...p, filtro } : p)));
  }

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      if (role) {
        await analysisServerApi.editarRole(clienteId, conexaoId, role.nome, {
          model_permission: modelPermission,
          permissoes_tabela: permissoes,
        });
      } else {
        await analysisServerApi.adicionarRole(clienteId, conexaoId, {
          nome: nome.trim(),
          model_permission: modelPermission,
          permissoes_tabela: permissoes,
        });
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar role.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      wide
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={!podeSalvar || enviando}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="rl-nome">Nome</label>
        <input
          className="input"
          id="rl-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={!!role}
          placeholder="Vendedores"
        />
      </div>

      <div className="field">
        <label htmlFor="rl-permissao-modelo">Permissão do modelo</label>
        <select
          className="input"
          id="rl-permissao-modelo"
          value={modelPermission}
          onChange={(e) => setModelPermission(e.target.value)}
        >
          <option value="read">Leitura</option>
          <option value="none">Nenhum acesso</option>
        </select>
      </div>

      <div className="card-kicker" style={{ marginTop: 8 }}>
        Segurança em nível de linha (RLS) por tabela
      </div>
      {permissoes.map((p) => {
        const colunasTabela = tabelas.find((t) => t.nome === p.tabela)?.colunas ?? [];
        return (
          <div key={p.tabela} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8 }}>
            <div className="field" style={{ flex: "0 0 160px" }}>
              <span className="opcoes-mono" style={{ fontSize: 13 }}>
                {p.tabela}
              </span>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <DaxEditor
                value={p.filtro}
                onChange={(v) => alterarFiltro(p.tabela, v)}
                tabelas={[{ nome: p.tabela, colunas: colunasTabela }]}
                height="60px"
              />
            </div>
            <BotaoExcluir onClick={() => removerPermissao(p.tabela)} />
          </div>
        );
      })}

      {tabelasDisponiveis.length > 0 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <div style={{ flex: 1 }}>
            <SearchableSelect
              value={novaTabela}
              onChange={setNovaTabela}
              options={tabelasDisponiveis.map((t) => ({ value: t.nome, label: t.nome }))}
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={adicionarPermissao} disabled={!novaTabela}>
            + Tabela
          </button>
        </div>
      )}

      {erro && <div className="text-danger" style={{ fontSize: 13, marginTop: 10 }}>{erro}</div>}
    </Dialog>
  );
}
