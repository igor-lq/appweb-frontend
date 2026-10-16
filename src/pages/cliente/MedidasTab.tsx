import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { analysisServerApi, type MedidaTmdlApi } from "../../api/analysisServer";
import { ApiError } from "../../api/client";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { MedidaModal } from "./MedidaModal";
import type { ModeloSemanticoContext } from "./ModeloSemanticoShell";
import "./MedidasTab.css";

function agruparPorPasta(medidas: MedidaTmdlApi[]): Record<string, MedidaTmdlApi[]> {
  return medidas.reduce<Record<string, MedidaTmdlApi[]>>((grupos, m) => {
    const pasta = m.pasta || "Sem pasta";
    (grupos[pasta] ??= []).push(m);
    return grupos;
  }, {});
}

export function MedidasTab() {
  const { cliente, conexaoId, modelo, recarregarModelo } = useOutletContext<ModeloSemanticoContext>();
  const medidas = useMemo(() => (modelo?.tabelas ?? []).flatMap((t) => t.medidas), [modelo]);
  const grupos = useMemo(() => agruparPorPasta(medidas), [medidas]);

  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [selecionadaNome, setSelecionadaNome] = useState<string | null>(null);
  const [modal, setModal] = useState<"nova" | "editar" | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!cliente || !conexaoId) return null;

  const medida = medidas.find((m) => m.nome === selecionadaNome);

  function toggleGrupo(pasta: string) {
    setAbertos((atual) => ({ ...atual, [pasta]: !(atual[pasta] ?? true) }));
  }

  async function excluir() {
    if (!medida) return;
    setErro(null);
    try {
      await analysisServerApi.excluirMedida(cliente!.id, conexaoId!, medida.nome);
      setSelecionadaNome(null);
      setExcluindo(false);
      recarregarModelo();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao excluir medida.");
      setExcluindo(false);
    }
  }

  return (
    <div className="medidas-page">
      <div className="medidas-toolbar">
        <input className="input medidas-search" placeholder="Buscar medida" />
        <button className="btn btn-primary" onClick={() => setModal("nova")}>
          + Nova medida
        </button>
      </div>

      <div className="medidas-body">
        <div className="medidas-lista scroll">
          {Object.entries(grupos).map(([pasta, itens]) => {
            const aberto = abertos[pasta] ?? true;
            return (
              <div key={pasta} className="medidas-grupo">
                <button className="medidas-grupo-header" onClick={() => toggleGrupo(pasta)}>
                  {aberto ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
                  <Folder size={14} strokeWidth={1.5} />
                  <span className="medidas-grupo-nome">{pasta}</span>
                  <span className="text-muted medidas-grupo-count">{itens.length}</span>
                </button>
                {aberto && (
                  <div className="medidas-grupo-itens">
                    {itens.map((m) => (
                      <div
                        key={m.nome}
                        className={`medidas-item${selecionadaNome === m.nome ? " medidas-item--selecionada" : ""}`}
                        onClick={() => setSelecionadaNome(m.nome)}
                      >
                        {m.nome}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {medidas.length === 0 && <div className="text-muted" style={{ padding: 12 }}>Nenhuma medida criada.</div>}
        </div>

        {medida && (
          <aside className="medidas-detalhes scroll">
            <div className="card-kicker">Detalhes da medida</div>
            <div className="medidas-detalhes-nome">{medida.nome}</div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
              {medida.pasta || "Sem pasta"}
              {medida.format_string && (
                <>
                  <span className="meta-sep">·</span>
                  {medida.format_string}
                </>
              )}
            </div>

            <div className="code-block scroll" style={{ marginTop: 16 }}>
              <pre>{medida.expressao}</pre>
            </div>

            <div className="detail-actions-row detail-actions-row--end" style={{ marginTop: 16 }}>
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

      {excluindo && medida && (
        <ConfirmarExclusaoModal
          titulo="Excluir Medida"
          mensagem={`Tem certeza que deseja excluir a medida "${medida.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={excluir}
        />
      )}

      {modal && (
        <MedidaModal
          titulo={modal === "nova" ? "Nova medida" : "Editar medida"}
          clienteId={cliente.id}
          conexaoId={conexaoId}
          medida={modal === "editar" ? medida : undefined}
          tabelas={modelo?.tabelas ?? []}
          onClose={() => setModal(null)}
          onSalvar={() => {
            setModal(null);
            recarregarModelo();
          }}
        />
      )}
    </div>
  );
}
