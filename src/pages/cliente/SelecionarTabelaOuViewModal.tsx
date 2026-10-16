import { useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { conexoesApi } from "../../api/conexoes";
import "./SelecionarTaskModal.css";

interface SelecionarTabelaOuViewModalProps {
  clienteId: string;
  conexaoId: string;
  onClose: () => void;
  onSelecionar: (nomeObjeto: string) => void;
}

/** Seleção única (rádio, não dropdown) de uma Tabela OU View já existente no banco interno da
    Conexão-fonte escolhida em "Fonte" (Task Processamento AS) — Tabelas e Views vêm de
    `information_schema.tables` (`conexoesApi.tabelas`), exibidas em duas seções separadas
    visualmente, mesmo padrão de lista/card de `SelecionarTaskModal.tsx` (mas single-select, um
    único grupo de rádio cobrindo as duas seções). */
export function SelecionarTabelaOuViewModal({ clienteId, conexaoId, onClose, onSelecionar }: SelecionarTabelaOuViewModalProps) {
  const [tabelas, setTabelas] = useState<string[]>([]);
  const [views, setViews] = useState<string[]>([]);
  const [nome, setNome] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    conexoesApi.tabelas(clienteId, conexaoId).then((resultado) => {
      setTabelas(resultado.tabelas);
      setViews(resultado.views);
      setNome(resultado.tabelas[0] ?? resultado.views[0] ?? "");
      setCarregando(false);
    });
  }, [clienteId, conexaoId]);

  const semOpcoes = !carregando && tabelas.length === 0 && views.length === 0;

  return (
    <Dialog
      title="Selecionar Tabela/View"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={!nome}
            onClick={() => {
              onSelecionar(nome);
              onClose();
            }}
          >
            {nome ? "Concluído" : "Fechar"}
          </button>
        </div>
      }
    >
      {carregando ? (
        <div className="text-muted">Carregando tabelas/views...</div>
      ) : semOpcoes ? (
        <div className="text-muted">Nenhuma tabela ou view no banco interno desta conexão ainda.</div>
      ) : (
        <>
          {tabelas.length > 0 && (
            <>
              <div className="card-kicker" style={{ margin: "4px 0 6px" }}>
                Tabelas
              </div>
              <div className="selecionar-task-lista scroll" style={{ maxHeight: 160 }}>
                {tabelas.map((t) => (
                  <label key={`tabela:${t}`} className="card selecionar-task-item">
                    <input type="radio" name="stv-objeto" checked={nome === t} onChange={() => setNome(t)} />
                    <div className="selecionar-task-item-info">
                      <div className="selecionar-task-item-nome">{t}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
          {views.length > 0 && (
            <>
              <div className="card-kicker" style={{ margin: "14px 0 6px" }}>
                Views
              </div>
              <div className="selecionar-task-lista scroll" style={{ maxHeight: 160 }}>
                {views.map((v) => (
                  <label key={`view:${v}`} className="card selecionar-task-item">
                    <input type="radio" name="stv-objeto" checked={nome === v} onChange={() => setNome(v)} />
                    <div className="selecionar-task-item-info">
                      <div className="selecionar-task-item-nome">{v}</div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Dialog>
  );
}
