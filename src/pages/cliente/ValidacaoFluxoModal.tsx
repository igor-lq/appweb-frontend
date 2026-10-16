import { Dialog } from "../../components/Dialog";
import "./ValidacaoFluxoModal.css";

interface ValidacaoFluxoModalProps {
  achados: string[];
  onClose: () => void;
  onSalvarComoRascunho: () => void;
}

/** Popup mostrado quando o analista clica "Salvar" e o fluxo tem algum problema — porta
    obrigatória sem conectar, campo obrigatório da engrenagem vazio, fonte alternativa em
    conflito, teste de endpoint com falha, ou um nó cuja saída não alimenta nada (fluxo
    incoerente). Lista TODOS os achados de uma vez (não um de cada vez) — ver
    `componentesFluxo.ts::validarFluxo`. */
export function ValidacaoFluxoModal({ achados, onClose, onSalvarComoRascunho }: ValidacaoFluxoModalProps) {
  return (
    <Dialog
      title="Não é possível salvar"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSalvarComoRascunho}>
            Salvar como Rascunho
          </button>
        </div>
      }
    >
      <div className="text-muted validacao-fluxo-intro">
        {achados.length === 1 ? "1 problema encontrado" : `${achados.length} problemas encontrados`} — corrija antes de
        salvar de verdade, ou salve como Rascunho enquanto isso (rascunho não precisa estar completo).
      </div>
      <ul className="validacao-fluxo-lista">
        {achados.map((achado, i) => (
          <li key={i}>{achado}</li>
        ))}
      </ul>
    </Dialog>
  );
}
