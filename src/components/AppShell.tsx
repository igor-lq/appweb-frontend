import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  ChevronsLeft,
  Home,
  LogOut,
  RefreshCw,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import { Dialog } from "./Dialog";
import { sincronizacaoApi } from "../api/sincronizacao";
import type { EventoLog } from "../api/types";
import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/clientes", label: "Clientes", icon: Users, end: false },
  { to: "/usuarios", label: "Usuários", icon: UserCog, end: false },
];

export function AppShell() {
  const [navHidden, setNavHidden] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [modalSincronizarAberto, setModalSincronizarAberto] = useState(false);
  const [eventosSincronizar, setEventosSincronizar] = useState<EventoLog[]>([]);
  const navigate = useNavigate();

  async function sincronizarPastas() {
    setModalSincronizarAberto(true);
    setSincronizando(true);
    setEventosSincronizar([]);
    await sincronizacaoApi.sincronizarPastas((ev) => setEventosSincronizar((atual) => [...atual, ev]));
    setSincronizando(false);
  }

  // Modal fica fora dos dois branches (nav visível/escondido) — os dois têm botão nenhum ou
  // "Sincronizar" em lugares diferentes, mas o modal em si precisa sobreviver a esconder/mostrar
  // o menu enquanto uma sincronização está rodando (mesmo componente, não perde estado).
  const modalSincronizar = modalSincronizarAberto && (
    <Dialog
      title="Sincronizar pastas"
      onClose={() => !sincronizando && setModalSincronizarAberto(false)}
      actions={
        <button className="btn btn-secondary" onClick={() => setModalSincronizarAberto(false)} disabled={sincronizando}>
          Fechar
        </button>
      }
    >
      {eventosSincronizar.length === 0 && sincronizando && <div className="text-muted">Iniciando...</div>}
      {eventosSincronizar.map((ev, i) => (
        <div key={i} className="acao-feedback" style={ev.nivel === "erro" ? { color: "var(--color-danger-text)" } : undefined}>
          {ev.mensagem}
        </div>
      ))}
    </Dialog>
  );

  if (navHidden) {
    return (
      <div className="app-shell">
        <button
          className="sidebar-rail"
          title="Exibir menu principal"
          onClick={() => setNavHidden(false)}
        >
          <span className="sidebar-rail-tab sidebar-rail-tab--primary">
            <ChevronRight size={13} strokeWidth={2} />
          </span>
        </button>
        <main className="app-shell-main">
          <Outlet />
        </main>
        {modalSincronizar}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <nav className="app-sidebar">
        <div className="app-sidebar-brand">
          <div className="app-sidebar-logo" />
          <div className="app-sidebar-name">Gerenciador ETL</div>
        </div>
        <div className="app-sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `sidebar-item${isActive ? " sidebar-item--active" : ""}`}
            >
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </div>
        <div className="app-sidebar-spacer" />
        <div className="app-sidebar-footer">
          <button className="sidebar-item" onClick={() => navigate("/config")}>
            <Settings size={16} strokeWidth={1.5} />
            Config
          </button>
          <button className="sidebar-item" onClick={sincronizarPastas}>
            <RefreshCw size={16} strokeWidth={1.5} />
            Sincronizar
          </button>
          <button className="sidebar-item" onClick={() => navigate("/login")}>
            <LogOut size={16} strokeWidth={1.5} />
            Sair
          </button>
          <button className="sidebar-item sidebar-item--muted" onClick={() => setNavHidden(true)}>
            <ChevronsLeft size={15} strokeWidth={1.5} />
            Esconder
          </button>
        </div>
      </nav>
      <main className="app-shell-main">
        <Outlet />
      </main>
      {modalSincronizar}
    </div>
  );
}
