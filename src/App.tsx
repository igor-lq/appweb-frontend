import { Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/AppShell";
import { ClienteShell } from "./components/ClienteShell";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { ClientesListPage } from "./pages/ClientesListPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { VisaoGeralTab } from "./pages/cliente/VisaoGeralTab";
import { ConexoesTab } from "./pages/cliente/ConexoesTab";
import { ConsultasTab } from "./pages/cliente/ConsultasTab";
import { EstrategiasTab } from "./pages/cliente/EstrategiasTab";
import { TasksShell } from "./pages/cliente/TasksShell";
import { TasksListTab } from "./pages/cliente/TasksListTab";
import { RascunhosTab } from "./pages/cliente/RascunhosTab";
import { FluxoPage } from "./pages/cliente/FluxoPage";
import { PacotesTab } from "./pages/cliente/PacotesTab";
import { DagsTab } from "./pages/cliente/DagsTab";
import { ModeloSemanticoShell } from "./pages/cliente/ModeloSemanticoShell";
import { MedidasTab } from "./pages/cliente/MedidasTab";
import { RelacionamentosTab } from "./pages/cliente/RelacionamentosTab";
import { RolesTab } from "./pages/cliente/RolesTab";
import { GitShell } from "./pages/cliente/GitShell";
import { GitBranchTab, GitBranchTabAs } from "./pages/cliente/GitBranchTab";
import { ArquivosTab } from "./pages/cliente/ArquivosTab";
import { OpcoesClienteTab } from "./pages/cliente/OpcoesClienteTab";
import { ConfigShell } from "./pages/config/ConfigShell";
import { ConexoesInternasTab } from "./pages/config/ConexoesInternasTab";
import { InstanciasAsTab } from "./pages/config/InstanciasAsTab";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="clientes" element={<ClientesListPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="config" element={<ConfigShell />}>
          <Route index element={<Navigate to="conexoes-internas" replace />} />
          <Route path="conexoes-internas" element={<ConexoesInternasTab />} />
          <Route path="instancias-as" element={<InstanciasAsTab />} />
        </Route>

        <Route path="clientes/:id" element={<ClienteShell />}>
          <Route index element={<Navigate to="visao-geral" replace />} />
          <Route path="visao-geral" element={<VisaoGeralTab />} />
          <Route path="conexoes" element={<ConexoesTab />} />
          <Route path="consultas" element={<ConsultasTab />} />
          <Route path="estrategias" element={<EstrategiasTab />} />
          <Route path="tasks" element={<TasksShell />}>
            <Route index element={<Navigate to="consulta-sql" replace />} />
            <Route path="consulta-sql" element={<TasksListTab tipo="consulta_sql" />} />
            <Route path="planilha" element={<TasksListTab tipo="planilha" />} />
            <Route path="api" element={<TasksListTab tipo="api" />} />
            <Route path="processamento-as" element={<TasksListTab tipo="processamento_as" />} />
            <Route path="fluxo-manual" element={<TasksListTab tipo="fluxo_manual" />} />
            <Route path="rascunhos" element={<RascunhosTab />} />
          </Route>
          <Route path="tasks/fluxo/novo" element={<FluxoPage />} />
          <Route path="tasks/fluxo/:taskId" element={<FluxoPage />} />
          <Route path="pacotes" element={<PacotesTab />} />
          <Route path="dags" element={<DagsTab />} />
          <Route path="modelo-semantico" element={<ModeloSemanticoShell />}>
            <Route index element={<Navigate to="medidas" replace />} />
            <Route path="medidas" element={<MedidasTab />} />
            <Route path="relacionamentos" element={<RelacionamentosTab />} />
            <Route path="roles" element={<RolesTab />} />
          </Route>
          <Route path="git" element={<GitShell />}>
            <Route index element={<Navigate to="prj-python" replace />} />
            <Route path="prj-python" element={<GitBranchTab branch="prj_python" />} />
            <Route path=":chave" element={<GitBranchTabAs />} />
          </Route>
          <Route path="arquivos" element={<ArquivosTab />} />
          <Route path="opcoes" element={<OpcoesClienteTab />} />
        </Route>
      </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
