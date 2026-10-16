import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { Cliente } from "../../mocks/clientes";
import { rotuloAbaTask, slugTipoTask, tiposTask, type Task, type TipoTask } from "../../mocks/tasks";
import { paraTaskMock, tasksApi } from "../../api/tasks";
import { TaskFormModal } from "./TaskFormModal";

interface ClienteContext {
  cliente?: Cliente;
}

export interface TasksContext {
  cliente?: Cliente;
  tasks: Task[];
  onRecarregarTasks: () => void;
  onExcluirTask: (id: string) => void;
}

/** "Rascunhos" (sem `tipo`) não é um tipo de Task de verdade — junta rascunhos de QUALQUER tipo
    (ver RascunhosTab.tsx) — por isso fica fora do `tiposTask.map(...)` mecânico, como última aba. */
const SUBNAV: { to: string; rotulo: string; tipo?: TipoTask }[] = [
  ...tiposTask.map((tipo) => ({ to: slugTipoTask[tipo], rotulo: rotuloAbaTask[tipo], tipo })),
  { to: "rascunhos", rotulo: "Rascunhos" },
];

export function TasksShell() {
  const { cliente } = useOutletContext<ClienteContext>();
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modalAberto, setModalAberto] = useState(false);

  function recarregar() {
    if (!cliente) return;
    tasksApi.listar(cliente.id).then((lista) => setTasks(lista.map(paraTaskMock)));
  }

  useEffect(recarregar, [cliente]);

  if (!cliente) return null;
  const clienteId = cliente.id;

  const abaAtiva = SUBNAV.find((s) => location.pathname.endsWith(s.to)) ?? SUBNAV[0];
  const podeCriarPadrao = abaAtiva.tipo !== undefined && abaAtiva.tipo !== "fluxo_manual";

  async function excluirTask(id: string) {
    await tasksApi.excluir(clienteId, id);
    setTasks((atual) => atual.filter((t) => t.id !== id));
  }

  return (
    <div className="tab-shell-page">
      <div className="tab-shell-header">
        <div className="tab-shell-header-top">
          <div>
            <div className="kicker">{cliente.nome}</div>
            <h2>Tasks</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {podeCriarPadrao && (
              <button className="btn btn-primary" onClick={() => setModalAberto(true)}>
                + Nova Task
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => navigate(`/clientes/${cliente.id}/tasks/fluxo/novo`)}>
              + Novo Fluxo
            </button>
          </div>
        </div>
        <nav className="tab-shell-subnav">
          {SUBNAV.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
            >
              {s.rotulo}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="tab-shell-content">
        <Outlet context={{ cliente, tasks, onRecarregarTasks: recarregar, onExcluirTask: excluirTask } satisfies TasksContext} />
      </div>

      {modalAberto && (
        <TaskFormModal
          titulo="Nova Task"
          clienteId={cliente.id}
          tipoInicial={podeCriarPadrao && abaAtiva.tipo ? abaAtiva.tipo : "consulta_sql"}
          onClose={() => setModalAberto(false)}
          onSalvar={() => {
            setModalAberto(false);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
