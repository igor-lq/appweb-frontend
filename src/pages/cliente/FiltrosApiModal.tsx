import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { JsonFieldTree } from "../../components/JsonFieldTree";
import { amostraRespostaApi } from "../../mocks/apiSample";

interface FiltrosApiModalProps {
  selecionados: string[];
  onClose: () => void;
  onSalvar: (selecionados: string[]) => void;
}

/** Popup do nó "Filtros API" (princípio 4 — função simples, sem engrenagem) — mesma árvore de
    seleção já usada no formulário guiado de Task tipo API (`ConfigurarCamposModal.tsx`), aqui
    definindo quais ramificações do JSON de resposta viram coluna na tabela final. Clicar no nó já
    "testa" o endpoint — nesta leva sem backend real, a amostra é sempre `amostraRespostaApi`. */
export function FiltrosApiModal({ selecionados, onClose, onSalvar }: FiltrosApiModalProps) {
  const [temp, setTemp] = useState<string[]>(selecionados);

  function toggle(caminho: string) {
    setTemp((atual) => (atual.includes(caminho) ? atual.filter((c) => c !== caminho) : [...atual, caminho]));
  }

  function toggleGrupo(caminhos: string[], todosSelecionados: boolean) {
    setTemp((atual) => (todosSelecionados ? atual.filter((c) => !caminhos.includes(c)) : Array.from(new Set([...atual, ...caminhos]))));
  }

  return (
    <Dialog
      title="Filtros API"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => onSalvar(temp)}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="text-muted" style={{ fontSize: 12.5 }}>
        Selecione quais ramificações do retorno da API viram coluna na tabela destino. Marcar um
        grupo marca todos os campos dentro dele.
      </div>
      <JsonFieldTree dados={amostraRespostaApi} selecionados={temp} onToggle={toggle} onToggleGrupo={toggleGrupo} />
    </Dialog>
  );
}
