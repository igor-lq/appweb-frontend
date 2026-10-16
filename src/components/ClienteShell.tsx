import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  ChevronsLeft,
  FileCode,
  FolderTree,
  GitBranch,
  LayoutDashboard,
  ListChecks,
  Package,
  Plug,
  Sigma,
  SlidersHorizontal,
  Workflow,
  Zap,
} from "lucide-react";
import { clientesApi, type ClienteApi } from "../api/clientes";
import { gitApi } from "../api/git";
import type { Cliente, StatusCliente } from "../mocks/clientes";
import "./ClienteShell.css";

const CLIENT_TABS = [
  { label: "Visão geral", icon: LayoutDashboard, to: "visao-geral" },
  { label: "Conexões", icon: Plug, to: "conexoes" },
  { label: "Consultas (SQL)", icon: FileCode, to: "consultas" },
  { label: "Estratégias de atualização", icon: Zap, to: "estrategias" },
  { label: "Tasks", icon: ListChecks, to: "tasks" },
  { label: "Pacotes", icon: Package, to: "pacotes" },
  { label: "DAGs", icon: Workflow, to: "dags" },
  { label: "Modelo Semântico", icon: Sigma, to: "modelo-semantico" },
  { label: "Versionamento", icon: GitBranch, to: "git" },
  { label: "Arquivos", icon: FolderTree, to: "arquivos" },
  { label: "Opções do cliente", icon: SlidersHorizontal, to: "opcoes" },
];

const STATUS_API_PARA_MOCK: Record<ClienteApi["status"], StatusCliente> = {
  ativo: "ativo",
  bloqueado: "atenção",
  inativo: "pausado",
};

/** Mapeia o shape real da API pro `Cliente` (mock) já consumido por todo o
    resto do app — mantém compatibilidade com as abas ainda não religadas
    (Opções do Cliente, Git etc.), que continuam lendo os campos só-de-exibição
    (`fluxosAtivos`/`ultimaExecucao`/`ambiente`/`criadoEm`) sem valor real
    ainda (a API não rastreia isso hoje) — `id`/`nome`/`label`/`labelInterna`/
    `gitUrl`/`status` já são de verdade. */
function paraCliente(c: ClienteApi): Cliente {
  return {
    id: c.id,
    nome: c.nome,
    label: c.label,
    labelInterna: c.label_interna,
    fluxosAtivos: 0,
    ultimaExecucao: "—",
    status: STATUS_API_PARA_MOCK[c.status],
    ambiente: "Produção",
    criadoEm: "—",
    gitUrl: c.git_url,
    lockPor: c.lock_por,
    lockDataHora: c.lock_data_hora,
  };
}

export function ClienteShell() {
  const [hidden, setHidden] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState<Cliente | undefined>(undefined);
  const [carregando, setCarregando] = useState(true);
  const [commitsPendentes, setCommitsPendentes] = useState(false);

  const recarregarCliente = useCallback(() => {
    if (!id) return Promise.resolve();
    return clientesApi
      .obter(id)
      .then((c) => setCliente(paraCliente(c)))
      .catch(() => setCliente(undefined));
  }, [id]);

  useEffect(() => {
    setCarregando(true);
    recarregarCliente().finally(() => setCarregando(false));
  }, [recarregarCliente]);

  useEffect(() => {
    if (!id) return;
    gitApi
      .pendencias(id)
      .then((lista) => setCommitsPendentes(lista.some((p) => p.pendente)))
      .catch(() => setCommitsPendentes(false));
  }, [id]);

  if (carregando) return null;

  if (hidden) {
    return (
      <div className="cliente-shell">
        <button
          className="sidebar-rail"
          title="Exibir menu do cliente"
          onClick={() => setHidden(false)}
        >
          <span className="sidebar-rail-tab sidebar-rail-tab--secondary">
            <ChevronRight size={13} strokeWidth={2} />
          </span>
        </button>
        <div className="cliente-shell-main">
          <Outlet context={{ cliente, recarregarCliente }} />
        </div>
      </div>
    );
  }

  return (
    <div className="cliente-shell">
      <nav className="cliente-sidebar">
        <div className="cliente-sidebar-header">
          <div className="kicker">Cliente</div>
          <div className="cliente-sidebar-name">{cliente?.nome ?? "Cliente"}</div>
        </div>
        <div className="cliente-sidebar-nav scroll">
          {CLIENT_TABS.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={label}
              to={to}
              className={({ isActive }) => `sidebar-item${isActive ? " sidebar-item--active" : ""}`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
              {to === "git" && commitsPendentes && <span className="sidebar-item-badge" title="Commits pendentes" />}
            </NavLink>
          ))}
        </div>
        <button className="cliente-sidebar-link" onClick={() => navigate("/clientes")}>
          <ArrowLeft size={14} strokeWidth={1.5} />
          Todos os clientes
        </button>
        <button className="cliente-sidebar-link" onClick={() => setHidden(true)}>
          <ChevronsLeft size={14} strokeWidth={1.5} />
          Esconder menu
        </button>
      </nav>
      <div className="cliente-shell-main">
        <Outlet context={{ cliente, recarregarCliente }} />
      </div>
    </div>
  );
}
