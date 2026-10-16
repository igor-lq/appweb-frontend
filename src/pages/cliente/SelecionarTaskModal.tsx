import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { rotuloTipoTask, resumoTaskComEstrategia, type Task, type TipoTask } from "../../mocks/tasks";
import type { EstrategiaApi } from "../../api/estrategias";
import "./SelecionarTaskModal.css";

interface SelecionarTaskModalProps {
  tasks: Task[];
  estrategias: EstrategiaApi[];
  /** ids já vinculados ao Pacote — vêm pré-marcados; desmarcar remove do Pacote, marcar mais
      adiciona. `onConfirmar` devolve o conjunto final inteiro, não só o que mudou. */
  jaSelecionadas: string[];
  onClose: () => void;
  onConfirmar: (taskIds: string[]) => void;
}

/** Só os tipos que viram `Task` real no backend com `task_id` pra um Pacote referenciar —
    "processamento_as" é uma Tabela do Modelo Semântico (Analysis Services), não uma Task, tem
    seleção própria (`SelecionarTabelaAsModal`). */
const TIPOS_PACOTE: TipoTask[] = ["consulta_sql", "planilha", "api", "fluxo_manual"];

/** Seleciona (multi-select, por abas de tipo) quais Tasks já cadastradas em Tasks entram no
    Pacote — a criação da Task em si não acontece mais aqui, migrou de vez pra lá; aqui é só
    montagem do Pacote, por isso nem mostra SQL/detalhe, só nome + resumo curto de cada uma. */
export function SelecionarTaskModal({ tasks, estrategias, jaSelecionadas, onClose, onConfirmar }: SelecionarTaskModalProps) {
  const [tipoAtivo, setTipoAtivo] = useState<TipoTask>(
    () => TIPOS_PACOTE.find((t) => tasks.some((task) => task.tipo === t)) ?? "consulta_sql",
  );
  const [query, setQuery] = useState("");
  const [selecionadas, setSelecionadas] = useState<Set<string>>(() => new Set(jaSelecionadas));

  function alternar(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const porTipo = tasks
    .filter((t) => t.tipo === tipoAtivo)
    .filter((t) => t.nome.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Dialog
      title="Adicionar Task"
      onClose={onClose}
      wide
      className="selecionar-task-dialog"
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={() => onConfirmar([...selecionadas])}>
            Adicionar {selecionadas.size > 0 && `(${selecionadas.size})`}
          </button>
        </div>
      }
    >
      <div className="tab-shell-subnav selecionar-task-abas">
        {TIPOS_PACOTE.map((t) => (
          <button
            key={t}
            type="button"
            className={`tab-shell-sublink${tipoAtivo === t ? " tab-shell-sublink--ativo" : ""}`}
            onClick={() => setTipoAtivo(t)}
          >
            {rotuloTipoTask[t]}
            <span className="text-muted selecionar-task-aba-count">{tasks.filter((task) => task.tipo === t).length}</span>
          </button>
        ))}
      </div>

      <input
        className="input"
        placeholder="Buscar task"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="selecionar-task-lista scroll">
        {porTipo.map((t) => (
          <label key={t.id} className="card selecionar-task-item">
            <input type="checkbox" checked={selecionadas.has(t.id)} onChange={() => alternar(t.id)} />
            <div className="selecionar-task-item-info">
              <div className="selecionar-task-item-nome">{t.nome}</div>
              <div className="text-muted selecionar-task-item-resumo">{resumoTaskComEstrategia(t, estrategias)}</div>
            </div>
          </label>
        ))}
        {porTipo.length === 0 && (
          <div className="text-muted">Nenhuma task desse tipo cadastrada. Crie em Tasks.</div>
        )}
      </div>
    </Dialog>
  );
}
