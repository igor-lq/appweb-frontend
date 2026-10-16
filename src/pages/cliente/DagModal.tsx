import { useState } from "react";
import { GripVertical, X } from "lucide-react";
import { Dialog } from "../../components/Dialog";
import { Switch } from "../../components/Switch";
import { ApiError } from "../../api/client";
import { dagsApi, type DagApi, type PacoteDagItemApi } from "../../api/dags";
import type { PacoteApi } from "../../api/pacotes";
import { SelecionarPacoteModal } from "./SelecionarPacoteModal";
import "./DagsTab.css";

interface DagModalProps {
  titulo: string;
  clienteId: string;
  dag?: DagApi;
  pacotesDisponiveis: PacoteApi[];
  onClose: () => void;
  onSalvar: (nome: string) => void;
}

interface CampoCron {
  minuto: string;
  hora: string;
  dia: string;
  mes: string;
  semana: string;
}

const CRON_PADRAO: CampoCron = { minuto: "0", hora: "6", dia: "*", mes: "*", semana: "*" };

function partesDeCron(cron: string): CampoCron {
  const partes = cron.trim().split(/\s+/);
  return {
    minuto: partes[0] ?? "*",
    hora: partes[1] ?? "*",
    dia: partes[2] ?? "*",
    mes: partes[3] ?? "*",
    semana: partes[4] ?? "*",
  };
}

export function DagModal({ titulo, clienteId, dag, pacotesDisponiveis, onClose, onSalvar }: DagModalProps) {
  const [nome, setNome] = useState(dag?.nome ?? "");
  const [startDate, setStartDate] = useState(dag?.start_date ?? "");
  const [description, setDescription] = useState(dag?.description ?? "");
  const [cron, setCron] = useState<CampoCron>(() => (dag ? partesDeCron(dag.schedule) : CRON_PADRAO));
  // Seleção de pacotes só existe aqui na criação — numa DAG já existente, pacotes são geridos na
  // própria página (drill-down), igual tasks dentro de um Pacote.
  const [pacotes, setPacotes] = useState<PacoteDagItemApi[]>(dag?.pacotes ?? []);
  const [modalPacote, setModalPacote] = useState(false);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const scheduleCalculado = `${cron.minuto} ${cron.hora} ${cron.dia} ${cron.mes} ${cron.semana}`;

  function alterarCampo(campo: keyof CampoCron, valor: string) {
    setCron((atual) => ({ ...atual, [campo]: valor }));
  }

  function alternarAtivo(index: number) {
    setPacotes((atual) => atual.map((p, i) => (i === index ? { ...p, ativo: !p.ativo } : p)));
  }

  function removerPacote(index: number) {
    setPacotes((atual) => atual.filter((_, i) => i !== index));
  }

  function moverPacotePara(index: number) {
    if (arrastando === null || arrastando === index) return;
    const copia = [...pacotes];
    const [movido] = copia.splice(arrastando, 1);
    copia.splice(index, 0, movido);
    setPacotes(copia);
    setArrastando(null);
  }

  const podeSalvar = nome.trim().length > 0;

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const payload = {
        nome,
        pacotes: dag ? dag.pacotes : pacotes,
        schedule: scheduleCalculado,
        description,
        start_date: startDate,
      };
      const resultado = dag ? await dagsApi.atualizar(clienteId, dag.nome, payload) : await dagsApi.criar(clienteId, payload);
      onSalvar(resultado.nome);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar DAG.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      wide
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
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="dag-nome">Nome</label>
          <input
            className="input"
            id="dag-nome"
            placeholder="cooperativa_vale_norte_diario"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="dag-start">Data de início</label>
          <input className="input" id="dag-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>

      <div className="dag-schedule-linha">
        <div className="dag-schedule-caixas">
          <div className="field dag-schedule-campo">
            <label htmlFor="dag-cron-minuto">Minuto</label>
            <input
              className="input opcoes-mono"
              id="dag-cron-minuto"
              value={cron.minuto}
              onChange={(e) => alterarCampo("minuto", e.target.value)}
            />
          </div>
          <div className="field dag-schedule-campo">
            <label htmlFor="dag-cron-hora">Hora</label>
            <input
              className="input opcoes-mono"
              id="dag-cron-hora"
              value={cron.hora}
              onChange={(e) => alterarCampo("hora", e.target.value)}
            />
          </div>
          <div className="field dag-schedule-campo">
            <label htmlFor="dag-cron-dia">Dia</label>
            <input
              className="input opcoes-mono"
              id="dag-cron-dia"
              value={cron.dia}
              onChange={(e) => alterarCampo("dia", e.target.value)}
            />
          </div>
          <div className="field dag-schedule-campo">
            <label htmlFor="dag-cron-mes">Mês</label>
            <input
              className="input opcoes-mono"
              id="dag-cron-mes"
              value={cron.mes}
              onChange={(e) => alterarCampo("mes", e.target.value)}
            />
          </div>
          <div className="field dag-schedule-campo dag-schedule-campo--larga">
            <label htmlFor="dag-cron-semana">Dia da semana</label>
            <input
              className="input opcoes-mono"
              id="dag-cron-semana"
              value={cron.semana}
              onChange={(e) => alterarCampo("semana", e.target.value)}
            />
          </div>
        </div>
        <div className="field dag-schedule-resultado">
          <label>Schedule (cron)</label>
          <div className="input opcoes-mono dag-schedule-texto">{scheduleCalculado}</div>
        </div>
      </div>

      <div className="field">
        <label htmlFor="dag-desc">Descrição</label>
        <input className="input" id="dag-desc" placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {!dag && (
        <div>
          <div className="dags-pacotes-header" style={{ marginTop: 4 }}>
            <div className="card-kicker dags-pacotes-titulo">Pacotes orquestrados</div>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => setModalPacote(true)}>
              + Adicionar Pacote
            </button>
          </div>
          <div className="dags-pacotes-lista">
            {pacotes.map((p, index) => (
              <div
                key={p.nome}
                className={`card dags-pacote-item${arrastando === index ? " dags-pacote-item--arrastando" : ""}`}
                draggable
                onDragStart={() => setArrastando(index)}
                onDragEnd={() => setArrastando(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => moverPacotePara(index)}
              >
                <GripVertical size={15} strokeWidth={1.5} className="dags-pacote-grip" />
                <span className="dags-pacote-ordem">{index + 1}</span>
                <span className="dags-pacote-nome">{p.nome}</span>
                <Switch checked={p.ativo} onChange={() => alternarAtivo(index)} />
                <button type="button" className="btn btn-icon" onClick={() => removerPacote(index)}>
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
            {pacotes.length === 0 && <div className="text-muted">Nenhum pacote adicionado.</div>}
          </div>
        </div>
      )}

      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}

      {modalPacote && (
        <SelecionarPacoteModal
          pacotes={pacotesDisponiveis}
          jaSelecionados={pacotes.map((p) => p.nome)}
          onClose={() => setModalPacote(false)}
          onConfirmar={(nomes) => {
            const nomesSelecionados = new Set(nomes);
            const mantidos = pacotes.filter((p) => nomesSelecionados.has(p.nome));
            const nomesJaPresentes = new Set(mantidos.map((p) => p.nome));
            const novos = nomes.filter((n) => !nomesJaPresentes.has(n)).map((n) => ({ nome: n, ativo: true }));
            setPacotes([...mantidos, ...novos]);
            setModalPacote(false);
          }}
        />
      )}
    </Dialog>
  );
}
