import { useEffect, useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { ApiError } from "../../api/client";
import { gitApi, nomeBranchModeloTabular, type ArquivoGitApi, type BranchGit, type StatusArquivoGitApi } from "../../api/git";
import "./GitBranchTab.css";

interface ClienteContext {
  cliente?: Cliente;
  repositorioUrl?: string | null;
}

const BADGE_STATUS: Record<StatusArquivoGitApi, { color: string; background: string }> = {
  novo: { color: "var(--color-accent-800)", background: "var(--color-accent-100)" },
  modificado: { color: "var(--color-warning-icon)", background: "var(--color-neutral-200)" },
  removido: { color: "var(--color-danger-text)", background: "color-mix(in srgb, var(--color-danger-border) 14%, transparent)" },
};

function agruparPorPasta(arquivos: ArquivoGitApi[]): Record<string, ArquivoGitApi[]> {
  return arquivos.reduce<Record<string, ArquivoGitApi[]>>((grupos, arquivo) => {
    const pasta = arquivo.caminho.split("/")[0];
    (grupos[pasta] ??= []).push(arquivo);
    return grupos;
  }, {});
}

/** Rota `:chave` (uma por Conexão Analysis Services do cliente, ver GitShell.tsx) — resolve o nome
    real da branch a partir da `chave` no path antes de delegar pro `GitBranchTab` genérico. */
export function GitBranchTabAs() {
  const { chave } = useParams<{ chave: string }>();
  return <GitBranchTab branch={nomeBranchModeloTabular(chave ?? "modelo_tabular")} />;
}

export function GitBranchTab({ branch }: { branch: BranchGit }) {
  const { cliente, repositorioUrl } = useOutletContext<ClienteContext>();
  const [arquivos, setArquivos] = useState<ArquivoGitApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [etapa, setEtapa] = useState<"lista" | "commit" | "sucesso">("lista");
  const [mensagem, setMensagem] = useState("");
  const [commitHash, setCommitHash] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);

  useEffect(() => {
    if (!cliente) return;
    setCarregando(true);
    setErro(null);
    gitApi
      .status(cliente.id, branch)
      .then(setArquivos)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Falha ao carregar status do Git."))
      .finally(() => setCarregando(false));
  }, [cliente, branch]);

  const grupos = useMemo(() => agruparPorPasta(arquivos), [arquivos]);

  if (!cliente || carregando) return null;

  function alternarSelecao(caminho: string) {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(caminho)) proximo.delete(caminho);
      else proximo.add(caminho);
      return proximo;
    });
  }

  function selecionarTudo(marcar: boolean) {
    setSelecionados(marcar ? new Set(arquivos.map((a) => a.caminho)) : new Set());
  }

  function preencherTextoPadrao() {
    setMensagem(`Arquivos: ${Array.from(selecionados).join(", ")}\nDevOps: \nAnalista: Você`);
  }

  async function publicar() {
    setErro(null);
    setPublicando(true);
    try {
      const resultado = await gitApi.publicar(cliente!.id, branch, {
        caminhos: Array.from(selecionados),
        mensagem,
      });
      setCommitHash(resultado.commit);
      setEtapa("sucesso");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao publicar no Git.");
    } finally {
      setPublicando(false);
    }
  }

  function reiniciar() {
    setEtapa("lista");
    setSelecionados(new Set());
    setMensagem("");
    setErro(null);
    if (cliente) {
      setCarregando(true);
      gitApi
        .status(cliente.id, branch)
        .then(setArquivos)
        .catch((e) => setErro(e instanceof ApiError ? e.message : "Falha ao carregar status do Git."))
        .finally(() => setCarregando(false));
    }
  }

  return (
    <div className="git-body scroll">
      <div className="text-muted git-repo-status">
        Repositório vinculado: {repositorioUrl ?? cliente.gitUrl} (branch {branch})
      </div>

      {etapa === "lista" && (
        <>
          <label className="git-selecionar-tudo">
            <input
              type="checkbox"
              checked={arquivos.length > 0 && selecionados.size === arquivos.length}
              onChange={(e) => selecionarTudo(e.target.checked)}
            />
            Selecionar tudo
          </label>

          {Object.entries(grupos).map(([pasta, itens]) => (
            <div className="git-grupo" key={pasta}>
              <div className="git-grupo-titulo">{pasta}</div>
              {itens.map((a) => (
                <label className="git-arquivo-linha" key={a.caminho}>
                  <input type="checkbox" checked={selecionados.has(a.caminho)} onChange={() => alternarSelecao(a.caminho)} />
                  <span className="opcoes-mono git-arquivo-caminho">{a.caminho}</span>
                  <span className="tag" style={BADGE_STATUS[a.status]}>
                    {a.status}
                  </span>
                </label>
              ))}
            </div>
          ))}
          {erro && (
            <div className="text-danger" style={{ fontSize: 13 }}>
              {erro}
            </div>
          )}
          {arquivos.length === 0 && !erro && <div className="text-muted">Nenhuma alteração pendente nesta branch.</div>}

          {arquivos.length > 0 && (
            <div className="git-publicar-linha">
              <button className="btn btn-primary" disabled={selecionados.size === 0} onClick={() => setEtapa("commit")}>
                Publicar selecionados ({selecionados.size})
              </button>
            </div>
          )}
        </>
      )}

      {etapa === "commit" && (
        <div className="git-commit-view">
          <div className="card-kicker">Arquivos selecionados</div>
          <ul className="git-commit-lista">
            {Array.from(selecionados).map((c) => (
              <li key={c} className="opcoes-mono">
                {c}
              </li>
            ))}
          </ul>
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="git-mensagem">Mensagem de commit</label>
            <textarea
              className="input git-mensagem-textarea"
              id="git-mensagem"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost" style={{ marginTop: -4 }} onClick={preencherTextoPadrao}>
            Preencher texto padrão
          </button>
          {erro && (
            <div className="text-danger" style={{ fontSize: 13, marginTop: 8 }}>
              {erro}
            </div>
          )}
          <div className="detail-actions-row" style={{ marginTop: 12 }}>
            <button className="btn btn-secondary" disabled={publicando} onClick={() => setEtapa("lista")}>
              Voltar
            </button>
            <button className="btn btn-primary" disabled={!mensagem.trim() || publicando} onClick={publicar}>
              Publicar no Git
            </button>
          </div>
        </div>
      )}

      {etapa === "sucesso" && (
        <div className="git-sucesso">
          <div className="card-kicker" style={{ color: "var(--color-accent-700)" }}>
            Publicado com sucesso
          </div>
          <div className="opcoes-mono" style={{ fontSize: 13, marginTop: 6 }}>
            commit {commitHash}
          </div>
          <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={reiniciar}>
            Voltar
          </button>
        </div>
      )}
    </div>
  );
}
