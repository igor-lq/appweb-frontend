import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronDown, ChevronRight, File, Folder, RefreshCw } from "lucide-react";
import type { Cliente } from "../../mocks/clientes";
import { arquivosApi, type ItemArquivoApi } from "../../api/arquivos";
import "./ArquivosTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

function NoArvore({
  item,
  caminho,
  nivel,
  abertos,
  filhosPorCaminho,
  carregandoPastas,
  onToggle,
  selecionado,
  onSelecionar,
}: {
  item: ItemArquivoApi;
  caminho: string;
  nivel: number;
  abertos: Record<string, boolean>;
  filhosPorCaminho: Record<string, ItemArquivoApi[]>;
  carregandoPastas: Record<string, boolean>;
  onToggle: (caminho: string) => void;
  selecionado: string | null;
  onSelecionar: (caminho: string) => void;
}) {
  const isPasta = item.tipo === "pasta";
  const aberto = abertos[caminho] ?? false;
  const filhos = filhosPorCaminho[caminho];

  return (
    <div>
      <div
        className={`arquivos-linha${selecionado === caminho ? " arquivos-linha--selecionada" : ""}`}
        style={{ paddingLeft: 10 + nivel * 16 }}
        onClick={() => (isPasta ? onToggle(caminho) : onSelecionar(caminho))}
      >
        {isPasta ? (
          aberto ? <ChevronDown size={13} strokeWidth={1.5} /> : <ChevronRight size={13} strokeWidth={1.5} />
        ) : (
          <span className="arquivos-linha-spacer" />
        )}
        {isPasta ? <Folder size={14} strokeWidth={1.5} /> : <File size={14} strokeWidth={1.5} />}
        <span className="arquivos-linha-nome">{item.nome}</span>
      </div>
      {isPasta && aberto && (
        <div>
          {carregandoPastas[caminho] && !filhos && (
            <div className="text-muted" style={{ paddingLeft: 10 + (nivel + 1) * 16 }}>
              Carregando…
            </div>
          )}
          {filhos?.map((filho) => (
            <NoArvore
              key={filho.nome}
              item={filho}
              caminho={`${caminho}/${filho.nome}`}
              nivel={nivel + 1}
              abertos={abertos}
              filhosPorCaminho={filhosPorCaminho}
              carregandoPastas={carregandoPastas}
              onToggle={onToggle}
              selecionado={selecionado}
              onSelecionar={onSelecionar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function ArquivosTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const [filhosPorCaminho, setFilhosPorCaminho] = useState<Record<string, ItemArquivoApi[]>>({});
  const [carregandoPastas, setCarregandoPastas] = useState<Record<string, boolean>>({});
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [conteudo, setConteudo] = useState<string | null>(null);
  const [carregandoConteudo, setCarregandoConteudo] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [sincronizado, setSincronizado] = useState(false);
  const ultimoCaminhoRef = useRef<string | null>(null);

  async function carregarPasta(clienteId: string, caminho: string) {
    setCarregandoPastas((atual) => ({ ...atual, [caminho]: true }));
    try {
      const itens = await arquivosApi.listar(clienteId, caminho);
      setFilhosPorCaminho((atual) => ({ ...atual, [caminho]: itens }));
    } finally {
      setCarregandoPastas((atual) => ({ ...atual, [caminho]: false }));
    }
  }

  useEffect(() => {
    if (!cliente) return;
    setFilhosPorCaminho({});
    setAbertos({});
    setSelecionado(null);
    setConteudo(null);
    carregarPasta(cliente.id, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cliente?.id]);

  if (!cliente) return null;
  const clienteId = cliente.id;

  function toggle(caminho: string) {
    const abrindo = !(abertos[caminho] ?? false);
    setAbertos((atual) => ({ ...atual, [caminho]: abrindo }));
    if (abrindo && !filhosPorCaminho[caminho]) {
      carregarPasta(clienteId, caminho);
    }
  }

  async function selecionar(caminho: string) {
    ultimoCaminhoRef.current = caminho;
    setSelecionado(caminho);
    setConteudo(null);
    setCarregandoConteudo(true);
    try {
      const resultado = await arquivosApi.conteudo(clienteId, caminho);
      if (ultimoCaminhoRef.current === caminho) setConteudo(resultado.conteudo);
    } catch {
      if (ultimoCaminhoRef.current === caminho) setConteudo("(erro ao carregar o conteúdo do arquivo)");
    } finally {
      if (ultimoCaminhoRef.current === caminho) setCarregandoConteudo(false);
    }
  }

  async function sincronizar() {
    setSincronizando(true);
    const abertosAtuais = Object.entries(abertos)
      .filter(([, valor]) => valor)
      .map(([caminho]) => caminho);
    setFilhosPorCaminho({});
    try {
      await carregarPasta(clienteId, "");
      for (const caminho of abertosAtuais) {
        await carregarPasta(clienteId, caminho);
      }
    } finally {
      setSincronizando(false);
      setSincronizado(true);
      setTimeout(() => setSincronizado(false), 2000);
    }
  }

  const raiz = filhosPorCaminho[""] ?? [];

  return (
    <div className="arquivos-page">
      <div className="arquivos-header">
        <div>
          <div className="kicker">{cliente.nome}</div>
          <div className="arquivos-title">Arquivos</div>
        </div>
        <div className="arquivos-actions">
          {sincronizado && <span className="text-muted arquivos-sync-msg">Atualizado.</span>}
          <button className="btn btn-secondary" onClick={sincronizar} disabled={sincronizando}>
            <RefreshCw size={14} strokeWidth={1.5} />
            Sincronizar
          </button>
        </div>
      </div>

      <div className="arquivos-body">
        <div className="arquivos-arvore scroll">
          {carregandoPastas[""] && raiz.length === 0 && (
            <div className="text-muted" style={{ padding: 12 }}>
              Carregando…
            </div>
          )}
          {raiz.map((item) => (
            <NoArvore
              key={item.nome}
              item={item}
              caminho={item.nome}
              nivel={0}
              abertos={abertos}
              filhosPorCaminho={filhosPorCaminho}
              carregandoPastas={carregandoPastas}
              onToggle={toggle}
              selecionado={selecionado}
              onSelecionar={selecionar}
            />
          ))}
          {!carregandoPastas[""] && raiz.length === 0 && (
            <div className="text-muted" style={{ padding: 12 }}>
              Nenhum arquivo sincronizado ainda.
            </div>
          )}
        </div>

        <aside className="arquivos-conteudo scroll">
          {selecionado ? (
            <>
              <div className="card-kicker">{selecionado}</div>
              {carregandoConteudo ? (
                <div className="text-muted">Carregando…</div>
              ) : (
                <pre className="arquivos-pre">{conteudo}</pre>
              )}
            </>
          ) : (
            <div className="text-muted">Selecione um arquivo pra ver o conteúdo.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
