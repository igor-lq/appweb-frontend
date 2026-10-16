import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { JsonFieldTree } from "../../components/JsonFieldTree";

interface ConfigurarCamposModalProps {
  dados: unknown;
  selecionados: string[];
  onClose: () => void;
  onSalvar: (selecionados: string[]) => void;
}

export function ConfigurarCamposModal({ dados, selecionados, onClose, onSalvar }: ConfigurarCamposModalProps) {
  const [temp, setTemp] = useState<string[]>(selecionados);

  function toggle(caminho: string) {
    setTemp((atual) => (atual.includes(caminho) ? atual.filter((c) => c !== caminho) : [...atual, caminho]));
  }

  function toggleGrupo(caminhos: string[], todosSelecionados: boolean) {
    setTemp((atual) =>
      todosSelecionados
        ? atual.filter((c) => !caminhos.includes(c))
        : Array.from(new Set([...atual, ...caminhos])),
    );
  }

  return (
    <Dialog
      title="Configuração de Campos"
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
        Selecione quais campos do retorno vão pra tabela destino. Marcar um grupo marca todos os
        campos dentro dele.
      </div>
      <JsonFieldTree dados={dados} selecionados={temp} onToggle={toggle} onToggleGrupo={toggleGrupo} />
    </Dialog>
  );
}
