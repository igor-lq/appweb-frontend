import { useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ApiError } from "../../api/client";
import { conexoesApi, tiposConexaoApi, tiposConexaoDeBanco, tiposConexaoInterna, type ConexaoApi, type OrganizacaoApi, type TipoConexaoApi } from "../../api/conexoes";
import {
  conexoesInternasApi,
  type BancoInternoApi,
  type ConexaoInternaApi,
} from "../../api/conexoesInternas";
import { analysisServerApi, type DatabaseASApi, type InstanciaASApi } from "../../api/analysisServer";

interface ConexaoModalProps {
  titulo: string;
  clienteId: string;
  clienteLabelInterna: string;
  conexao?: ConexaoApi;
  conexoesExistentes?: ConexaoApi[];
  onClose: () => void;
  onSalvar: () => void;
}

export function ConexaoModal({ titulo, clienteId, clienteLabelInterna, conexao, conexoesExistentes, onClose, onSalvar }: ConexaoModalProps) {
  const [nome, setNome] = useState(conexao?.nome ?? "");
  const [tipo, setTipo] = useState<TipoConexaoApi>(conexao?.tipo ?? "PostgreSQL");
  const [organizacao, setOrganizacao] = useState<OrganizacaoApi>(conexao?.organizacao ?? "Externo");

  const [host, setHost] = useState(conexao?.host ?? "");
  const [porta, setPorta] = useState(conexao?.porta ?? "");
  const [banco, setBanco] = useState(conexao?.banco ?? "");
  const [usuario, setUsuario] = useState(conexao?.usuario ?? "");
  const [senha, setSenha] = useState(conexao?.senha ?? "");
  const [linkPlanilha, setLinkPlanilha] = useState(conexao?.link_planilha ?? "");
  const [baseUrl, setBaseUrl] = useState(conexao?.base_url ?? "");
  const [token, setToken] = useState(conexao?.token ?? "");
  const [header, setHeader] = useState(conexao?.header ?? "Authorization: Bearer {token}");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [testando, setTestando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<string | null>(null);
  const [testeOk, setTesteOk] = useState(false);

  const ehTipoBanco = tiposConexaoDeBanco.includes(tipo);

  // Organização "Interno" — Banco Interno do Cliente = Conexão Interna, mesmo objeto.
  const [conexoesInternas, setConexoesInternas] = useState<ConexaoInternaApi[]>([]);
  const [carregandoInternas, setCarregandoInternas] = useState(true);
  const [conexaoInternaId, setConexaoInternaId] = useState("");
  const [bancoInternoId, setBancoInternoId] = useState(conexao?.banco_interno_id ?? "");
  const [bancosDisponiveis, setBancosDisponiveis] = useState<BancoInternoApi[]>([]);
  const [carregandoBancos, setCarregandoBancos] = useState(false);
  const [modoNovoBanco, setModoNovoBanco] = useState(false);
  const [novoBancoNome, setNovoBancoNome] = useState(`dw_${clienteLabelInterna}`);
  const [criandoBanco, setCriandoBanco] = useState(false);

  // Tipo "Analysis Services" — nunca cria a Instância por aqui, só escolhe uma já cadastrada em
  // Configurações + uma Database dentro dela (existente ou recém-criada).
  const [instanciasAs, setInstanciasAs] = useState<InstanciaASApi[]>([]);
  const [carregandoInstanciasAs, setCarregandoInstanciasAs] = useState(true);
  const [instanciaAsId, setInstanciaAsId] = useState("");
  const [databaseAsId, setDatabaseAsId] = useState(conexao?.database_as_id ?? "");
  const [bancosAsDisponiveis, setBancosAsDisponiveis] = useState<DatabaseASApi[]>([]);
  const [carregandoBancosAs, setCarregandoBancosAs] = useState(false);
  const [modoNovoBancoAs, setModoNovoBancoAs] = useState(false);
  const [novoBancoAsNome, setNovoBancoAsNome] = useState("");
  const [criandoBancoAs, setCriandoBancoAs] = useState(false);

  // A 1ª Conexão Analysis Services do cliente sempre vira a branch `modelo_tabular` (sem
  // sufixo) — comportamento automático inalterado. A partir da 2ª, o usuário escolhe o sufixo
  // (sugestão pré-preenchida = nome da Conexão, editável) — ver `routers/conexoes.py::criar`.
  const jaTemConexaoAs = !conexao && tipo === "Analysis Services" && (conexoesExistentes ?? []).some((c) => c.tipo === "Analysis Services");
  const [sufixoBranch, setSufixoBranch] = useState("");
  const [sufixoBranchTocado, setSufixoBranchTocado] = useState(false);

  useEffect(() => {
    if (organizacao !== "Interno") return;
    conexoesInternasApi.listar().then((lista) => {
      setConexoesInternas(lista);
      setCarregandoInternas(false);
      if (conexaoInternaId) return;
      if (conexao?.banco_interno_id) {
        const dona = lista.find((c) => c.bancos.some((b) => b.id === conexao.banco_interno_id));
        if (dona) setConexaoInternaId(dona.id);
        return;
      }
      if (lista.length > 0) setConexaoInternaId(lista[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizacao]);

  useEffect(() => {
    if (!conexaoInternaId) {
      setBancosDisponiveis([]);
      return;
    }
    setCarregandoBancos(true);
    conexoesInternasApi
      .bancosDisponiveis(conexaoInternaId)
      .then((disponiveis) => {
        // O banco já vinculado a ESTA conexão (modo edição) não aparece em
        // "disponíveis" (já está em uso por ela mesma) — inclui de volta.
        if (conexao?.banco_interno_id && !disponiveis.some((b) => b.id === conexao.banco_interno_id)) {
          const atual = conexoesInternas
            .find((c) => c.id === conexaoInternaId)
            ?.bancos.find((b) => b.id === conexao.banco_interno_id);
          if (atual) disponiveis = [...disponiveis, atual];
        }
        setBancosDisponiveis(disponiveis);
      })
      .finally(() => setCarregandoBancos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conexaoInternaId]);

  useEffect(() => {
    if (tipo !== "Analysis Services") return;
    analysisServerApi.listarInstancias().then((lista) => {
      setInstanciasAs(lista);
      setCarregandoInstanciasAs(false);
      if (instanciaAsId) return;
      if (conexao?.instancia_as_id) {
        setInstanciaAsId(conexao.instancia_as_id);
        return;
      }
      if (lista.length > 0) setInstanciaAsId(lista[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  useEffect(() => {
    if (!instanciaAsId) {
      setBancosAsDisponiveis([]);
      return;
    }
    setCarregandoBancosAs(true);
    analysisServerApi
      .bancosDisponiveis(instanciaAsId)
      .then((disponiveis) => {
        if (conexao?.database_as_id && !disponiveis.some((b) => b.id === conexao.database_as_id)) {
          const atual = instanciasAs
            .find((i) => i.id === instanciaAsId)
            ?.databases.find((b) => b.id === conexao.database_as_id);
          if (atual) disponiveis = [...disponiveis, atual];
        }
        setBancosAsDisponiveis(disponiveis);
      })
      .finally(() => setCarregandoBancosAs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanciaAsId]);

  /** Analysis Services só existe como Organização Interna (é o próprio catálogo Instância/
      Database fazendo o papel de "conexão interna"); Excel/API só existem como Externa; os tipos
      "de banco" (Postgres/Oracle/SQL Server) aceitam as duas. */
  function alterarTipo(novoTipo: TipoConexaoApi) {
    setTipo(novoTipo);
    if (novoTipo === "Analysis Services") setOrganizacao("Interno");
    else if (!tiposConexaoDeBanco.includes(novoTipo)) setOrganizacao("Externo");
  }

  function alterarOrganizacao(novaOrganizacao: OrganizacaoApi) {
    setOrganizacao(novaOrganizacao);
    const tiposValidos = novaOrganizacao === "Interno" ? tiposConexaoInterna : tiposConexaoApi.filter((t) => t !== "Analysis Services");
    if (!tiposValidos.includes(tipo)) setTipo(tiposValidos[0]);
  }

  const podeSalvar =
    nome.trim().length > 0 &&
    (organizacao !== "Interno" || !!bancoInternoId) &&
    (tipo !== "Analysis Services" || !!databaseAsId) &&
    (!jaTemConexaoAs || (sufixoBranchTocado ? sufixoBranch : nome).trim().length > 0);

  async function criarBancoNovo() {
    const nomeBanco = novoBancoNome.trim();
    if (!nomeBanco || !conexaoInternaId) return;
    setErro(null);
    setCriandoBanco(true);
    try {
      const novo = await conexoesInternasApi.criarBanco(conexaoInternaId, nomeBanco);
      setBancosDisponiveis((atual) => [...atual, novo]);
      setBancoInternoId(novo.id);
      setModoNovoBanco(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar banco.");
    } finally {
      setCriandoBanco(false);
    }
  }

  async function criarBancoAsNovo() {
    const nomeBanco = novoBancoAsNome.trim();
    if (!nomeBanco || !instanciaAsId) return;
    setErro(null);
    setCriandoBancoAs(true);
    try {
      const novo = await analysisServerApi.criarBanco(instanciaAsId, nomeBanco);
      setBancosAsDisponiveis((atual) => [...atual, novo]);
      setDatabaseAsId(novo.id);
      setModoNovoBancoAs(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar banco.");
    } finally {
      setCriandoBancoAs(false);
    }
  }

  function montarPayload() {
    return {
      nome,
      tipo,
      organizacao,
      host: organizacao === "Interno" || tipo === "Analysis Services" ? null : host || null,
      porta: organizacao === "Interno" || tipo === "Analysis Services" ? null : porta || null,
      banco: organizacao === "Interno" || tipo === "Analysis Services" ? null : banco || null,
      usuario: organizacao === "Interno" || tipo === "Analysis Services" ? null : usuario || null,
      senha: organizacao === "Interno" || tipo === "Analysis Services" ? null : senha || null,
      link_planilha: tipo === "Excel" ? linkPlanilha || null : null,
      base_url: tipo === "API" ? baseUrl || null : null,
      token: tipo === "API" ? token || null : null,
      header: tipo === "API" ? header || null : null,
      banco_interno_id: organizacao === "Interno" ? bancoInternoId || null : null,
      instancia_as_id: tipo === "Analysis Services" ? instanciaAsId || null : null,
      database_as_id: tipo === "Analysis Services" ? databaseAsId || null : null,
    };
  }

  async function testarConexao() {
    setTestando(true);
    setResultadoTeste(null);
    try {
      const resultado = await conexoesApi.testarAvulso(clienteId, montarPayload());
      setTesteOk(resultado.ok);
      setResultadoTeste(resultado.mensagem);
    } catch (e) {
      setTesteOk(false);
      setResultadoTeste(e instanceof ApiError ? e.message : "Falha ao testar conexão.");
    } finally {
      setTestando(false);
    }
  }

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const payload = montarPayload();
      if (conexao) {
        await conexoesApi.atualizar(clienteId, conexao.id, payload);
      } else {
        const payloadCriar = jaTemConexaoAs
          ? { ...payload, sufixo_branch: (sufixoBranchTocado ? sufixoBranch : nome).trim() }
          : payload;
        await conexoesApi.criar(clienteId, payloadCriar);
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar conexão.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={salvar} disabled={!podeSalvar || enviando}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="field">
        <label htmlFor="cn-nome">Nome</label>
        <input className="input" id="cn-nome" placeholder="Oracle Winthor" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor="cn-organizacao">Organização</label>
        <select
          className="input"
          id="cn-organizacao"
          value={organizacao}
          onChange={(e) => alterarOrganizacao(e.target.value as OrganizacaoApi)}
        >
          <option value="Externo">Externo</option>
          <option value="Interno">Interno</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="cn-tipo">Tipo</label>
        <select className="input" id="cn-tipo" value={tipo} onChange={(e) => alterarTipo(e.target.value as TipoConexaoApi)}>
          {(organizacao === "Interno" ? tiposConexaoInterna : tiposConexaoApi.filter((t) => t !== "Analysis Services")).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {ehTipoBanco && organizacao === "Interno" && (
        <>
          <div className="field">
            <label htmlFor="cn-conexao-interna">Conexão interna (servidor)</label>
            <select
              className="input"
              id="cn-conexao-interna"
              value={conexaoInternaId}
              onChange={(e) => {
                setConexaoInternaId(e.target.value);
                setBancoInternoId("");
                setModoNovoBanco(false);
              }}
              disabled={carregandoInternas || conexoesInternas.length === 0}
            >
              {conexoesInternas.length === 0 && <option value="">Nenhuma conexão interna cadastrada</option>}
              {conexoesInternas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.host}:{c.porta})
                </option>
              ))}
            </select>
            {!carregandoInternas && conexoesInternas.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Cadastre uma conexão interna em Configurações → Conexões Internas primeiro.
              </div>
            )}
          </div>

          {conexaoInternaId && (
            <div className="field">
              <label htmlFor="cn-banco-interno">Banco</label>
              {carregandoBancos ? (
                <div className="text-muted" style={{ fontSize: 12.5 }}>
                  Verificando bancos disponíveis...
                </div>
              ) : modoNovoBanco ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    value={novoBancoNome}
                    onChange={(e) => setNovoBancoNome(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-secondary" onClick={criarBancoNovo} disabled={criandoBanco}>
                    {criandoBanco ? "Criando..." : "Criar"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setModoNovoBanco(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="input"
                    id="cn-banco-interno"
                    value={bancoInternoId}
                    onChange={(e) => setBancoInternoId(e.target.value)}
                  >
                    <option value="">Selecione um banco</option>
                    {bancosDisponiveis.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-secondary" onClick={() => setModoNovoBanco(true)}>
                    + Criar banco
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {ehTipoBanco && organizacao === "Externo" && (
        <div>
          <div className="card-kicker" style={{ marginBottom: 10 }}>
            Acesso ao banco
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="field">
              <label htmlFor="cn-host">Host</label>
              <input className="input" id="cn-host" value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <div className="field">
                <label htmlFor="cn-porta">Porta</label>
                <input className="input" id="cn-porta" value={porta} onChange={(e) => setPorta(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="cn-banco">Banco / Service Name</label>
                <input className="input" id="cn-banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="cn-user">Usuário</label>
              <input className="input" id="cn-user" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="cn-pass">Senha</label>
              <input className="input" id="cn-pass" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {tipo === "Excel" && (
        <div className="field">
          <label htmlFor="cn-url">URL da planilha</label>
          <input className="input" id="cn-url" placeholder="https://docs.google.com/spreadsheets/d/..." value={linkPlanilha} onChange={(e) => setLinkPlanilha(e.target.value)} />
        </div>
      )}

      {tipo === "API" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div className="field">
            <label htmlFor="cn-base-url">URL base</label>
            <input className="input" id="cn-base-url" placeholder="https://api.exemplo.com.br/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cn-token">Token</label>
            <input className="input" id="cn-token" value={token} onChange={(e) => setToken(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cn-header">Header</label>
            <input className="input" id="cn-header" value={header} onChange={(e) => setHeader(e.target.value)} />
            <div className="text-muted" style={{ fontSize: 12, marginTop: 5 }}>
              Texto livre — {"{token}"} é substituído pelo valor do campo Token na execução.
            </div>
          </div>
        </div>
      )}

      {tipo === "Analysis Services" && (
        <>
          <div className="field">
            <label htmlFor="cn-instancia-as">Instância Analysis Services</label>
            <select
              className="input"
              id="cn-instancia-as"
              value={instanciaAsId}
              onChange={(e) => {
                setInstanciaAsId(e.target.value);
                setDatabaseAsId("");
                setModoNovoBancoAs(false);
              }}
              disabled={carregandoInstanciasAs || instanciasAs.length === 0}
            >
              {instanciasAs.length === 0 && <option value="">Nenhuma instância cadastrada</option>}
              {instanciasAs.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nome} ({i.host}:{i.porta})
                </option>
              ))}
            </select>
            {!carregandoInstanciasAs && instanciasAs.length === 0 && (
              <div className="text-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                Cadastre uma instância em Configurações → Instâncias Analysis Services primeiro.
              </div>
            )}
          </div>

          {instanciaAsId && (
            <div className="field">
              <label htmlFor="cn-database-as">Banco (database)</label>
              {carregandoBancosAs ? (
                <div className="text-muted" style={{ fontSize: 12.5 }}>
                  Verificando bancos disponíveis...
                </div>
              ) : modoNovoBancoAs ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    placeholder="ModeloVendas"
                    value={novoBancoAsNome}
                    onChange={(e) => setNovoBancoAsNome(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-secondary" onClick={criarBancoAsNovo} disabled={criandoBancoAs}>
                    {criandoBancoAs ? "Criando..." : "Criar"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setModoNovoBancoAs(false)}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className="input"
                    id="cn-database-as"
                    value={databaseAsId}
                    onChange={(e) => setDatabaseAsId(e.target.value)}
                  >
                    <option value="">Selecione um banco</option>
                    {bancosAsDisponiveis.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nome}
                      </option>
                    ))}
                  </select>
                  <button className="btn btn-secondary" onClick={() => setModoNovoBancoAs(true)}>
                    + Criar banco
                  </button>
                </div>
              )}
            </div>
          )}

          {jaTemConexaoAs && (
            <div className="field">
              <label htmlFor="cn-sufixo-branch">Sufixo da branch do Modelo Semântico</label>
              <input
                className="input"
                id="cn-sufixo-branch"
                value={sufixoBranchTocado ? sufixoBranch : nome}
                onChange={(e) => {
                  setSufixoBranchTocado(true);
                  setSufixoBranch(e.target.value);
                }}
                placeholder="winthor"
              />
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Este cliente já tem outra Conexão Analysis Services — a branch desta será
                <span className="opcoes-mono"> modelo_tabular_{"<sufixo>"}</span>.
              </div>
            </div>
          )}
        </>
      )}

      <div className="detail-actions" style={{ marginTop: 4 }}>
        <button
          className="btn btn-secondary btn-block"
          onClick={testarConexao}
          disabled={testando || (organizacao === "Interno" && !bancoInternoId) || (tipo === "Analysis Services" && !databaseAsId)}
        >
          {testando ? "Testando..." : "Testar conexão"}
        </button>
        {resultadoTeste && (
          <div className="acao-feedback" style={!testeOk ? { color: "var(--color-danger-text)" } : undefined}>
            {resultadoTeste}
          </div>
        )}
      </div>

      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
