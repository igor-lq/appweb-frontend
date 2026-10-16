import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Pencil, Star } from "lucide-react";
import type { Cliente } from "../../mocks/clientes";
import { ConfirmDeleteButton } from "../../components/ConfirmDeleteButton";
import { clientesApi } from "../../api/clientes";
import { responsaveisApi, type ResponsavelApi } from "../../api/responsaveis";
import { ApiError } from "../../api/client";
import { ResponsavelModal } from "./ResponsavelModal";
import "./OpcoesClienteTab.css";

interface ClienteContext {
  cliente?: Cliente;
}

type EtapaExclusao = "inicial" | "escolher" | "senha";

export function OpcoesClienteTab() {
  const { cliente } = useOutletContext<ClienteContext>();
  const navigate = useNavigate();

  const [nomeSalvo, setNomeSalvo] = useState(cliente?.nome ?? "");
  const [nome, setNome] = useState(cliente?.nome ?? "");
  const [salvo, setSalvo] = useState(false);
  const [salvandoIdentificacao, setSalvandoIdentificacao] = useState(false);
  const [erroIdentificacao, setErroIdentificacao] = useState<string | null>(null);

  const identificacaoDirty = nome !== nomeSalvo;

  const [responsaveis, setResponsaveis] = useState<ResponsavelApi[]>([]);
  const [editandoResponsavel, setEditandoResponsavel] = useState<ResponsavelApi | null>(null);
  const [modalResponsavelAberto, setModalResponsavelAberto] = useState(false);
  const [excluindoResponsavelErro, setExcluindoResponsavelErro] = useState<string | null>(null);

  function recarregarResponsaveis() {
    if (!cliente) return;
    responsaveisApi.listar(cliente.id).then(setResponsaveis);
  }
  useEffect(recarregarResponsaveis, [cliente]);

  const [etapaExclusao, setEtapaExclusao] = useState<EtapaExclusao>("inicial");
  const [senhaExclusao, setSenhaExclusao] = useState("");
  const [erroZonaRisco, setErroZonaRisco] = useState<string | null>(null);
  const [desativando, setDesativando] = useState(false);
  const [excluindoPermanente, setExcluindoPermanente] = useState(false);

  if (!cliente) return null;

  async function salvarIdentificacao() {
    setSalvandoIdentificacao(true);
    setErroIdentificacao(null);
    try {
      await clientesApi.atualizar(cliente!.id, { nome });
      setNomeSalvo(nome);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2000);
    } catch (e) {
      setErroIdentificacao(e instanceof ApiError ? e.message : "Falha ao salvar identificação.");
    } finally {
      setSalvandoIdentificacao(false);
    }
  }

  function cancelarIdentificacao() {
    setNome(nomeSalvo);
    setErroIdentificacao(null);
  }

  async function desativarCliente() {
    setDesativando(true);
    setErroZonaRisco(null);
    try {
      await clientesApi.atualizar(cliente!.id, { status: "inativo" });
      navigate("/clientes");
    } catch (e) {
      setErroZonaRisco(e instanceof ApiError ? e.message : "Falha ao desativar cliente.");
      setDesativando(false);
    }
  }

  async function excluirPermanente() {
    setExcluindoPermanente(true);
    setErroZonaRisco(null);
    try {
      await clientesApi.excluirPermanente(cliente!.id, senhaExclusao);
      navigate("/clientes");
    } catch (e) {
      setErroZonaRisco(e instanceof ApiError ? e.message : "Falha ao excluir cliente.");
      setExcluindoPermanente(false);
    }
  }

  function abrirNovoResponsavel() {
    setEditandoResponsavel(null);
    setModalResponsavelAberto(true);
  }

  function abrirEditarResponsavel(r: ResponsavelApi) {
    setEditandoResponsavel(r);
    setModalResponsavelAberto(true);
  }

  async function excluirResponsavel(r: ResponsavelApi) {
    setExcluindoResponsavelErro(null);
    try {
      await responsaveisApi.excluir(cliente!.id, r.id);
      recarregarResponsaveis();
    } catch (e) {
      setExcluindoResponsavelErro(e instanceof ApiError ? e.message : "Falha ao excluir responsável.");
    }
  }

  function resetarExclusao() {
    setEtapaExclusao("inicial");
    setSenhaExclusao("");
    setErroZonaRisco(null);
  }

  return (
    <div className="opcoes-page">
      <div className="opcoes-header">
        <div className="kicker">{cliente.nome}</div>
        <h2>Opções do cliente</h2>
      </div>

      <div className="opcoes-body scroll">
        <div className="card opcoes-card">
          <div className="card-kicker">Identificação do cliente</div>
          <div className="field">
            <label htmlFor="op-nome">Nome</label>
            <input className="input" id="op-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="op-label">Label</label>
            <div className="input opcoes-mono" id="op-label" style={{ display: "flex", alignItems: "center" }}>
              {cliente.label}
            </div>
          </div>
          <div className="field">
            <label htmlFor="op-label-interna">Label interna</label>
            <div className="input opcoes-mono" id="op-label-interna" style={{ display: "flex", alignItems: "center" }}>
              {cliente.labelInterna}
            </div>
          </div>
          <div className="text-muted" style={{ fontSize: 12 }}>
            Label e Label interna são definidas na criação do cliente e nunca podem ser
            alteradas depois — são a identidade real dele (URL do app, repositório Git).
          </div>

          {identificacaoDirty && (
            <div className="opcoes-identificacao-actions">
              <button className="btn btn-primary" onClick={salvarIdentificacao} disabled={salvandoIdentificacao}>
                {salvandoIdentificacao ? "Salvando..." : "Salvar"}
              </button>
              <button className="btn btn-secondary" onClick={cancelarIdentificacao} disabled={salvandoIdentificacao}>
                Cancelar
              </button>
            </div>
          )}
          {erroIdentificacao && <div className="text-danger" style={{ fontSize: 12.5 }}>{erroIdentificacao}</div>}
          {salvo && <div className="opcoes-saved">Salvo!</div>}
        </div>

        <div className="card opcoes-card">
          <div className="opcoes-card-header">
            <div className="card-kicker">Responsáveis pelo cliente</div>
            <button className="btn btn-primary" onClick={abrirNovoResponsavel}>
              + Novo responsável
            </button>
          </div>
          {excluindoResponsavelErro && (
            <div className="text-danger" style={{ fontSize: 12.5 }}>{excluindoResponsavelErro}</div>
          )}
          <div className="opcoes-responsaveis">
            {responsaveis.map((r) => (
              <div className="opcoes-responsavel" key={r.id}>
                <div className="opcoes-responsavel-topo">
                  <span className="opcoes-responsavel-nome">
                    {r.principal && <Star size={13} strokeWidth={0} fill="var(--color-warning-icon)" />}
                    {r.nome}
                  </span>
                  <div className="opcoes-responsavel-acoes">
                    <button className="btn btn-icon opcoes-responsavel-editar" title="Editar" onClick={() => abrirEditarResponsavel(r)}>
                      <Pencil size={14} strokeWidth={1.5} />
                    </button>
                    <ConfirmDeleteButton onConfirm={() => excluirResponsavel(r)} />
                  </div>
                </div>
                <div className="text-muted opcoes-responsavel-linha">{r.cargo}</div>
                <div className="text-muted opcoes-responsavel-linha">{r.email}</div>
                <div className="text-muted opcoes-responsavel-linha">{r.celular}</div>
              </div>
            ))}
            {responsaveis.length === 0 && (
              <div className="text-muted">Nenhum responsável cadastrado.</div>
            )}
          </div>
        </div>

        <div className="card opcoes-card opcoes-card--danger">
          <div className="card-kicker" style={{ color: "var(--color-danger-text)" }}>
            Zona de risco
          </div>

          {etapaExclusao === "inicial" && (
            <button className="btn btn-danger" onClick={() => setEtapaExclusao("escolher")}>
              Excluir cliente
            </button>
          )}

          {etapaExclusao !== "inicial" && (
            <p className="text-muted opcoes-danger-copy">
              <strong>Desativar</strong> não remove o cliente nem seu histórico — fica inativo
              (Conexões, Consultas e Inputs param de rodar) e some da lista para analistas.{" "}
              <strong>Excluir Permanente</strong> apaga tudo de verdade e sem volta: o banco
              interno, a database do Analysis Services, o repositório Git e a pasta local inteira
              deste cliente.
            </p>
          )}

          {etapaExclusao === "escolher" && (
            <div className="opcoes-danger-actions">
              <button className="btn btn-danger" onClick={desativarCliente} disabled={desativando}>
                {desativando ? "Desativando..." : "Desativar"}
              </button>
              <button className="btn btn-danger" onClick={() => setEtapaExclusao("senha")}>
                Excluir permanente
              </button>
              <button className="btn btn-secondary" onClick={resetarExclusao}>
                Cancelar
              </button>
            </div>
          )}

          {etapaExclusao === "senha" && (
            <>
              <div className="field">
                <label htmlFor="op-senha-exclusao">Confirme sua senha pra excluir permanentemente</label>
                <input
                  className="input"
                  id="op-senha-exclusao"
                  type="password"
                  value={senhaExclusao}
                  onChange={(e) => setSenhaExclusao(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="opcoes-danger-actions">
                <button
                  className="btn btn-danger"
                  disabled={!senhaExclusao || excluindoPermanente}
                  onClick={excluirPermanente}
                >
                  {excluindoPermanente ? "Excluindo..." : "Confirmar exclusão permanente"}
                </button>
                <button className="btn btn-secondary" onClick={resetarExclusao} disabled={excluindoPermanente}>
                  Cancelar
                </button>
              </div>
            </>
          )}

          {erroZonaRisco && <div className="text-danger" style={{ fontSize: 12.5 }}>{erroZonaRisco}</div>}
        </div>
      </div>

      {modalResponsavelAberto && (
        <ResponsavelModal
          titulo={editandoResponsavel === null ? "Novo responsável" : "Editar responsável"}
          clienteId={cliente.id}
          responsavel={editandoResponsavel ?? undefined}
          onClose={() => setModalResponsavelAberto(false)}
          onSalvar={() => {
            setModalResponsavelAberto(false);
            recarregarResponsaveis();
          }}
        />
      )}
    </div>
  );
}
