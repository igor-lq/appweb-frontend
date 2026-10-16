import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import type { PacoteApi } from "../../api/pacotes";
import "./SelecionarTaskModal.css";

interface SelecionarPacoteModalProps {
  pacotes: PacoteApi[];
  /** nomes já vinculados à DAG — vêm pré-marcados; desmarcar remove da DAG, marcar mais
      adiciona. `onConfirmar` devolve o conjunto final inteiro, não só o que mudou. */
  jaSelecionados: string[];
  onClose: () => void;
  onConfirmar: (nomes: string[]) => void;
}

/** Seleciona (multi-select, sem abas — só existe um tipo de item aqui) quais Pacotes já
    cadastrados entram na DAG. Mesmo padrão de `SelecionarTaskModal`. */
export function SelecionarPacoteModal({ pacotes, jaSelecionados, onClose, onConfirmar }: SelecionarPacoteModalProps) {
  const [query, setQuery] = useState("");
  const [selecionados, setSelecionados] = useState<Set<string>>(() => new Set(jaSelecionados));

  function alternar(nome: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(nome)) novo.delete(nome);
      else novo.add(nome);
      return novo;
    });
  }

  const filtrados = pacotes.filter((p) => p.nome.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog
      title="Adicionar Pacote"
      onClose={onClose}
      wide
      className="selecionar-task-dialog"
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => onConfirmar([...selecionados])}>
            Adicionar {selecionados.size > 0 && `(${selecionados.size})`}
          </button>
        </div>
      }
    >
      <input
        className="input"
        placeholder="Buscar pacote"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="selecionar-task-lista scroll">
        {filtrados.map((p) => (
          <label key={p.nome} className="card selecionar-task-item">
            <input type="checkbox" checked={selecionados.has(p.nome)} onChange={() => alternar(p.nome)} />
            <div className="selecionar-task-item-info">
              <div className="selecionar-task-item-nome">{p.nome}</div>
              <div className="text-muted selecionar-task-item-resumo">
                {p.tasks.length} {p.tasks.length === 1 ? "task" : "tasks"}
              </div>
            </div>
          </label>
        ))}
        {filtrados.length === 0 && <div className="text-muted">Nenhum pacote cadastrado. Crie em Pacotes.</div>}
      </div>
    </Dialog>
  );
}
