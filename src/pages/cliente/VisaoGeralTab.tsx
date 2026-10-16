import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import type { Cliente } from "../../mocks/clientes";
import { Tag } from "../../components/Tag";
import { Switch } from "../../components/Switch";
import { Dialog } from "../../components/Dialog";
import { clientesApi } from "../../api/clientes";
import { conexoesApi, conexoesInternasNaoAs } from "../../api/conexoes";
import { conexoesInternasApi } from "../../api/conexoesInternas";
import { analysisServerApi } from "../../api/analysisServer";
import { sincronizacaoApi } from "../../api/sincronizacao";
import type { EventoLog } from "../../api/types";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import "./VisaoGeralTab.css";

interface ClienteContext {
  cliente?: Cliente;
  recarregarCliente: () => Promise<void>;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function VisaoGeralTab() {
  const { cliente, recarregarCliente } = useOutletContext<ClienteContext>();
  const { usuario } = useAuth();
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conexoesInternasDoCliente, setConexoesInternasDoCliente] = useState<[string, string][]>([]);
  const [carregandoConexoesInternas, setCarregandoConexoesInternas] = useState(true);
  // Um cliente pode ter várias Conexões Analysis Services agora (cada uma com sua própria
  // Instância/Database) — mesmo padrão de lista de "Conexões internas" logo abaixo, não mais um
  // banco único.
  const [conexoesAsDoCliente, setConexoesAsDoCliente] = useState<[string, string][]>([]);
  const [carregandoConexoesAs, setCarregandoConexoesAs] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [modalSincronizarAberto, setModalSincronizarAberto] = useState(false);
  const [eventosSincronizar, setEventosSincronizar] = useState<EventoLog[]>([]);

  async function sincronizarCliente() {
    if (!cliente) return;
    setModalSincronizarAberto(true);
    setSincronizando(true);
    setEventosSincronizar([]);
    await sincronizacaoApi.sincronizarCliente(cliente.id, (ev) => setEventosSincronizar((atual) => [...atual, ev]));
    setSincronizando(false);
  }

  useEffect(() => {
    if (!cliente) return;
    setCarregandoConexoesInternas(true);
    setCarregandoConexoesAs(true);
    Promise.all([conexoesApi.listar(cliente.id), conexoesInternasApi.listar(), analysisServerApi.listarInstancias()])
      .then(([conexoes, servidores, instancias]) => {
        const internas = conexoesInternasNaoAs(conexoes)
          .map((c): [string, string] => {
            for (const servidor of servidores) {
              const banco = servidor.bancos.find((b) => b.id === c.banco_interno_id);
              if (banco) return [c.nome, banco.nome];
            }
            return [c.nome, "— não configurado"];
          });
        setConexoesInternasDoCliente(internas);

        const as = conexoes
          .filter((c) => c.tipo === "Analysis Services")
          .map((c): [string, string] => {
            for (const instancia of instancias) {
              const banco = instancia.databases.find((d) => d.id === c.database_as_id);
              if (banco) return [c.nome, banco.nome];
            }
            return [c.nome, "— não configurado"];
          });
        setConexoesAsDoCliente(as);
      })
      .finally(() => {
        setCarregandoConexoesInternas(false);
        setCarregandoConexoesAs(false);
      });
  }, [cliente?.id]);

  if (!cliente) return null;

  const bloqueado = !!cliente.lockPor;
  const souEuQueBloqueei = cliente.lockPor?.id === usuario?.id;
  const souAdmin = usuario?.perfil === "Administrador";
  const possoAlternar = !bloqueado || souEuQueBloqueei || souAdmin;

  async function alternarBloqueio() {
    if (!cliente || processando) return;
    setErro(null);
    setProcessando(true);
    try {
      if (bloqueado) {
        await clientesApi.unlock(cliente.id);
      } else {
        await clientesApi.lock(cliente.id);
      }
      await recarregarCliente();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível alterar o bloqueio.");
    } finally {
      setProcessando(false);
    }
  }

  const modalSincronizar = modalSincronizarAberto && (
    <Dialog
      title="Sincronizar Cliente"
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

  return (
    <div className="visao-geral-page">
      <div className="visao-geral-header tab-shell-header-top">
        <div>
          <div className="kicker">{cliente.nome}</div>
          <h2>Visão geral</h2>
        </div>
        <button className="btn btn-secondary" onClick={sincronizarCliente} disabled={sincronizando}>
          <RefreshCw size={14} strokeWidth={1.5} />
          {sincronizando ? "Sincronizando..." : "Sincronizar Cliente"}
        </button>
      </div>

      {modalSincronizar}

      <div className="visao-geral-grid scroll">
        <div className="card visao-geral-card">
          <div className="card-kicker">Informações</div>
          <div className="visao-geral-campos">
            {[
              ["Nome", cliente.nome, false],
              ["Label", cliente.label, true],
              ["Label interna", cliente.labelInterna, true],
            ].map(([label, value, mono]) => (
              <div className="visao-geral-campo" key={label as string}>
                <span className="text-muted">{label}</span>
                <span className={mono ? "visao-geral-valor-mono" : undefined}>{value}</span>
              </div>
            ))}
            <div className="visao-geral-campo">
              <span className="text-muted">Status</span>
              {cliente.status === "ativo" ? (
                <span>ativo</span>
              ) : (
                <Tag status={cliente.status} />
              )}
            </div>
            <div className="visao-geral-campo">
              <span className="text-muted">Conexões internas (Postgres)</span>
              {carregandoConexoesInternas ? (
                <span className="text-muted">…</span>
              ) : conexoesInternasDoCliente.length === 0 ? (
                <span className="text-muted">— nenhuma conexão interna configurada</span>
              ) : (
                <span />
              )}
            </div>
            {!carregandoConexoesInternas &&
              conexoesInternasDoCliente.map(([nomeConexao, nomeBanco]) => (
                <div className="visao-geral-campo" key={nomeConexao} style={{ paddingLeft: 16 }}>
                  <span className="text-muted" style={{ fontSize: 12.5 }}>
                    {nomeConexao}
                  </span>
                  <span className="visao-geral-valor-mono">{nomeBanco}</span>
                </div>
              ))}
            <div className="visao-geral-campo">
              <span className="text-muted">Conexões Analysis Services</span>
              {carregandoConexoesAs ? (
                <span className="text-muted">…</span>
              ) : conexoesAsDoCliente.length === 0 ? (
                <span className="text-muted">— nenhuma conexão configurada</span>
              ) : (
                <span />
              )}
            </div>
            {!carregandoConexoesAs &&
              conexoesAsDoCliente.map(([nomeConexao, nomeBanco]) => (
                <div className="visao-geral-campo" key={nomeConexao} style={{ paddingLeft: 16 }}>
                  <span className="text-muted" style={{ fontSize: 12.5 }}>
                    {nomeConexao}
                  </span>
                  <span className="visao-geral-valor-mono">{nomeBanco}</span>
                </div>
              ))}
            <div className="visao-geral-campo">
              <span className="text-muted">Repositório Git</span>
              {cliente.gitUrl ? (
                <span className="visao-geral-valor-mono">{cliente.gitUrl}</span>
              ) : (
                <span className="text-muted">— não configurado</span>
              )}
            </div>
          </div>
        </div>

        <div className="card visao-geral-card">
          <div className="card-kicker">Bloqueio de edição</div>
          <p className="visao-geral-lock-copy text-muted">
            Um cliente só pode ser editado por um analista por vez. Outros podem consultar, mas
            não editar Conexões, Consultas ou Inputs enquanto o bloqueio estiver ativo.
          </p>
          <div className="visao-geral-lock-toggle">
            <Switch checked={!bloqueado} onChange={alternarBloqueio} disabled={processando || !possoAlternar} />
            <span>{bloqueado ? "Bloqueado para edição" : "Disponível para edição"}</span>
          </div>
          {bloqueado && cliente.lockPor && (
            <div className="visao-geral-lock-status">
              🔒 Bloqueado por: {souEuQueBloqueei ? "Você" : cliente.lockPor.nome}
              {cliente.lockDataHora && <> · desde {formatarDataHora(cliente.lockDataHora)}</>}
            </div>
          )}
          {bloqueado && !possoAlternar && (
            <div className="text-muted" style={{ fontSize: 12.5 }}>
              Somente quem bloqueou ou um Administrador pode liberar.
            </div>
          )}
          {erro && (
            <div className="text-muted" style={{ fontSize: 12.5, color: "var(--color-danger-text)" }}>
              {erro}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
