import { NavLink, Outlet } from "react-router-dom";

const SUBNAV = [
  { to: "conexoes-internas", label: "Conexões Internas" },
  { to: "instancias-as", label: "Instâncias Analysis Services" },
];

/** Shell de abas internas de Configurações (mesmo padrão de GitShell/TasksShell). */
export function ConfigShell() {
  return (
    <div className="tab-shell-page">
      <div className="tab-shell-header">
        <div className="kicker">Administração</div>
        <h2>Configurações</h2>
        <nav className="tab-shell-subnav">
          {SUBNAV.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) => `tab-shell-sublink${isActive ? " tab-shell-sublink--ativo" : ""}`}
            >
              {s.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="tab-shell-content">
        <Outlet />
      </div>
    </div>
  );
}
