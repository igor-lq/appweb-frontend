import { useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { SearchableSelect } from "../../components/SearchableSelect";
import { ApiError } from "../../api/client";
import { conexoesApi, conexoesInternasNaoAs, type ConexaoApi } from "../../api/conexoes";
import { consultasApi, type ConsultaApi } from "../../api/consultas";
import { viewsApi, nomeInternoView, type ViewApi } from "../../api/views";

interface CriarViewModalProps {
  clienteId: string;
  onClose: () => void;
  onCriada: () => void;
}

/** Cria (ou recria, se já existir uma View com o mesmo nome) uma View real no banco interno de
    uma Conexão Interna do cliente, a partir do SQL de uma Consulta já cadastrada com
    categoria="View" — aberto de dentro de "Nova Task" (Processamento AS), item 3.4. */
export function CriarViewModal({ clienteId, onClose, onCriada }: CriarViewModalProps) {
  const [carregando, setCarregando] = useState(true);
  const [conexoes, setConexoes] = useState<ConexaoApi[]>([]);
  const [consultas, setConsultas] = useState<ConsultaApi[]>([]);
  const [views, setViews] = useState<ViewApi[]>([]);
  const [conexaoInternaId, setConexaoInternaId] = useState("");
  const [consultaId, setConsultaId] = useState("");
  const [nomeView, setNomeView] = useState("");
  const [nomeEditadoManual, setNomeEditadoManual] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([conexoesApi.listar(clienteId), consultasApi.listar(clienteId), viewsApi.listar(clienteId)]).then(
      ([c, q, v]) => {
        const internas = conexoesInternasNaoAs(c);
        setConexoes(internas);
        setConsultas(q.filter((x) => x.categoria === "View"));
        setViews(v);
        setConexaoInternaId(internas[0]?.id ?? "");
        setCarregando(false);
      },
    );
  }, [clienteId]);

  function mudarConsulta(novoId: string) {
    setConsultaId(novoId);
    if (nomeEditadoManual) return;
    const consulta = consultas.find((c) => c.id === novoId);
    // "Nome da View" é o nome LÓGICO (sem "vw_") — `nomeInternoView` é quem adiciona esse
    // prefixo, uma única vez, na hora de resolver o nome real no Postgres (`routers/views.py`).
    // Sugerir aqui já com "vw_" duplicaria o prefixo quando o backend aplicar `nome_interno_view`
    // de novo em cima do nome salvo.
    setNomeView(consulta ? nomeInternoView(consulta.nome).replace(/^vw_/, "") : "");
  }

  const consultaEscolhida = consultas.find((c) => c.id === consultaId);
  const jaExiste = views.some((v) => v.nome === nomeView.trim());
  const podeCriar = !!conexaoInternaId && !!consultaEscolhida && !!nomeView.trim();

  async function criarOuRecriar() {
    if (!consultaEscolhida) return;
    setErro(null);
    setEnviando(true);
    try {
      const nome = nomeView.trim();
      const existente = views.find((v) => v.nome === nome);
      if (existente) {
        await viewsApi.recriar(clienteId, existente.id, { sql_texto: consultaEscolhida.sql_texto ?? "" });
      } else {
        await viewsApi.criar(clienteId, {
          nome,
          sql_texto: consultaEscolhida.sql_texto ?? "",
          conexao_interna_id: conexaoInternaId,
        });
      }
      onCriada();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar/recriar a view.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title="Criar View"
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!podeCriar || enviando} onClick={criarOuRecriar}>
            {enviando ? "Salvando..." : jaExiste ? "Recriar View" : "Criar View"}
          </button>
        </div>
      }
    >
      {carregando ? (
        <div className="text-muted">Carregando...</div>
      ) : (
        <>
          {conexoes.length === 0 && (
            <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Nenhuma Conexão Interna cadastrada ainda — crie uma na aba Conexões primeiro.
            </div>
          )}
          <div className="field">
            <label htmlFor="cv-conexao">Conexão interna</label>
            <SearchableSelect
              id="cv-conexao"
              value={conexaoInternaId}
              onChange={setConexaoInternaId}
              options={conexoes.map((c) => ({ value: c.id, label: c.nome }))}
            />
          </div>
          {consultas.length === 0 && (
            <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
              Nenhuma Consulta SQL com categoria "View" cadastrada ainda.
            </div>
          )}
          <div className="field">
            <label htmlFor="cv-consulta">Consulta SQL</label>
            <SearchableSelect
              id="cv-consulta"
              value={consultaId}
              onChange={mudarConsulta}
              options={consultas.map((c) => ({ value: c.id, label: c.nome }))}
            />
          </div>
          <div className="field">
            <label htmlFor="cv-nome">Nome da View</label>
            <input
              className="input"
              id="cv-nome"
              value={nomeView}
              onChange={(e) => {
                setNomeView(e.target.value);
                setNomeEditadoManual(true);
              }}
            />
            {jaExiste && (
              <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                Já existe uma View com esse nome — confirmar aqui reescreve ela (DROP + CREATE).
              </div>
            )}
          </div>
          {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
        </>
      )}
    </Dialog>
  );
}
