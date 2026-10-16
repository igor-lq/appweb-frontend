import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { camposExibicaoTask, rotuloTipoTask } from "../../mocks/tasks";
import { ConfirmarExclusaoModal } from "../../components/ConfirmarExclusaoModal";
import { BotaoExcluir } from "../../components/BotaoExcluir";
import type { TasksContext } from "./TasksShell";
import "./TasksListTab.css";

/** Aba "Rascunhos" — junta Tasks de QUALQUER tipo salvas como rascunho (`task.rascunho === true`,
    gravado pelo botão "Salvar como Rascunho" do canvas de Fluxo, seja numa Task nova de Fluxo
    Manual ou numa Task de formulário aberta via "Editar Fluxo"). Fica fora das abas normais por
    tipo (`TasksListTab` já filtra rascunho pra fora delas) — um rascunho é uma estrutura
    incompleta/inválida, não uma Task "de verdade" ainda, então não faz sentido misturar com as
    Tasks reais daquele tipo. Única ação por item é "Editar Fluxo" (retomar de onde parou) +
    Excluir — não faz sentido "Editar" (formulário guiado) uma estrutura que já foi construída/
    alterada pelo canvas. */
export function RascunhosTab() {
  const { cliente, tasks, onExcluirTask } = useOutletContext<TasksContext>();
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const rascunhos = tasks.filter((t) => t.rascunho);
  const filtradas = rascunhos.filter((t) => t.nome.toLowerCase().includes(query.trim().toLowerCase()));
  const [selecionadaId, setSelecionadaId] = useState<string | null>(filtradas[0]?.id ?? null);
  const [excluindo, setExcluindo] = useState(false);

  if (!cliente) return null;

  const task = filtradas.find((t) => t.id === selecionadaId) ?? filtradas[0];

  return (
    <div className="tasks-body">
      <div className="tasks-list scroll">
        <input
          className="input tasks-search"
          placeholder="Buscar rascunho"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {filtradas.map((t) => (
          <div
            key={t.id}
            className={`card tasks-item${t.id === task?.id ? " is-selected" : ""}`}
            onClick={() => setSelecionadaId(t.id)}
          >
            <div className="tasks-item-nome">{t.nome}</div>
            <div className="text-muted tasks-item-meta">{rotuloTipoTask[t.tipo]}</div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <div className="text-muted">{rascunhos.length === 0 ? "Nenhum rascunho salvo." : "Nenhum rascunho encontrado."}</div>
        )}
      </div>

      {task && (
        <aside className="tasks-detalhes scroll">
          <div className="card-kicker">Detalhes do rascunho</div>
          <div className="tasks-detalhes-nome">{task.nome}</div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>{rotuloTipoTask[task.tipo]}</div>

          <div className="tasks-detalhes-campos">
            {camposExibicaoTask(task, cliente.id).map(([label, value]) => (
              <div className="tasks-campo" key={label}>
                <span className="text-muted">{label}</span>
                <span className="tasks-campo-valor">{value}</span>
              </div>
            ))}
          </div>

          <div className="detail-actions-row detail-actions-row--end" style={{ marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => navigate(`/clientes/${cliente.id}/tasks/fluxo/${task.id}`)}>
              Editar Fluxo
            </button>
            <BotaoExcluir onClick={() => setExcluindo(true)} />
          </div>
        </aside>
      )}

      {excluindo && task && (
        <ConfirmarExclusaoModal
          titulo="Excluir Rascunho"
          mensagem={`Tem certeza que deseja excluir o rascunho "${task.nome}"? Essa ação não pode ser desfeita.`}
          onClose={() => setExcluindo(false)}
          onConfirmar={() => {
            onExcluirTask(task.id);
            setSelecionadaId(null);
            setExcluindo(false);
          }}
        />
      )}
    </div>
  );
}
