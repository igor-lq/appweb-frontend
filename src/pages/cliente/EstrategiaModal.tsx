import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { ApiError } from "../../api/client";
import {
  estrategiasApi,
  tiposEstrategiaApi,
  unidadesPeriodoApi,
  ROTULO_TIPO_ESTRATEGIA,
  type EstrategiaApi,
  type TipoEstrategiaApi,
  type UnidadePeriodoApi,
} from "../../api/estrategias";

interface EstrategiaModalProps {
  titulo: string;
  clienteId: string;
  estrategia?: EstrategiaApi;
  onClose: () => void;
  onSalvar: () => void;
}

export function EstrategiaModal({ titulo, clienteId, estrategia, onClose, onSalvar }: EstrategiaModalProps) {
  const [nome, setNome] = useState(estrategia?.nome ?? "");
  const [tipo, setTipo] = useState<TipoEstrategiaApi>(estrategia?.tipo ?? "substituicao");
  const [filtroQuantidade, setFiltroQuantidade] = useState(String(estrategia?.quantidade_janela ?? ""));
  const [filtroUnidade, setFiltroUnidade] = useState<UnidadePeriodoApi>(estrategia?.unidade_janela ?? "Dia");
  const [dataInicial, setDataInicial] = useState(estrategia?.data_inicial ?? "");
  const [dataFinal, setDataFinal] = useState(estrategia?.data_final ?? "");
  const [segmentacaoQuantidade, setSegmentacaoQuantidade] = useState(String(estrategia?.quantidade_segmentacao ?? ""));
  const [segmentacaoUnidade, setSegmentacaoUnidade] = useState<UnidadePeriodoApi>(estrategia?.unidade_segmentacao ?? "Dia");
  const [chavesUpsert, setChavesUpsert] = useState((estrategia?.chaves_upsert ?? []).join(", "));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim().length > 0;

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const payload = {
        nome,
        tipo,
        quantidade_janela: tipo === "reprocessamento_recente" ? Number(filtroQuantidade) || null : null,
        unidade_janela: tipo === "reprocessamento_recente" ? filtroUnidade : null,
        data_inicial: tipo === "full_por_periodo" ? dataInicial || null : null,
        data_final: tipo === "full_por_periodo" ? dataFinal || null : null,
        quantidade_segmentacao: tipo === "full_por_periodo" ? Number(segmentacaoQuantidade) || null : null,
        unidade_segmentacao: tipo === "full_por_periodo" ? segmentacaoUnidade : null,
        chaves_upsert: tipo === "upsert" ? chavesUpsert.split(",").map((c) => c.trim()).filter(Boolean) : null,
      };
      if (estrategia) {
        await estrategiasApi.atualizar(clienteId, estrategia.id, payload);
      } else {
        await estrategiasApi.criar(clienteId, payload);
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar estratégia.");
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
        <label htmlFor="es-nome">Nome</label>
        <input className="input" id="es-nome" placeholder="realtime_5dias" value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="es-tipo">Estratégia de atualização</label>
        <select className="input" id="es-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoEstrategiaApi)}>
          {tiposEstrategiaApi.map((t) => (
            <option key={t} value={t}>
              {ROTULO_TIPO_ESTRATEGIA[t]}
            </option>
          ))}
        </select>
      </div>

      {tipo === "reprocessamento_recente" && (
        <div>
          <div className="card-kicker" style={{ marginBottom: 10 }}>
            Período de filtro
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <select className="input" value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value as UnidadePeriodoApi)}>
              {unidadesPeriodoApi.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="1"
              value={filtroQuantidade}
              onChange={(e) => setFiltroQuantidade(e.target.value)}
            />
          </div>
        </div>
      )}

      {tipo === "full_por_periodo" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label htmlFor="es-data-inicial">Data inicial</label>
              <input className="input" id="es-data-inicial" type="date" value={dataInicial} onChange={(e) => setDataInicial(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="es-data-final">Data final</label>
              <input className="input" id="es-data-final" type="date" value={dataFinal} onChange={(e) => setDataFinal(e.target.value)} />
            </div>
          </div>
          <div>
            <div className="card-kicker" style={{ marginBottom: 10 }}>
              Intervalo de segmentação
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <select className="input" value={segmentacaoUnidade} onChange={(e) => setSegmentacaoUnidade(e.target.value as UnidadePeriodoApi)}>
                {unidadesPeriodoApi.map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
              <input
                className="input"
                type="number"
                min={1}
                placeholder="1"
                value={segmentacaoQuantidade}
                onChange={(e) => setSegmentacaoQuantidade(e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      {tipo === "upsert" && (
        <div className="field">
          <label htmlFor="es-chaves-upsert">Chaves de Upsert (separadas por vírgula)</label>
          <input
            className="input"
            id="es-chaves-upsert"
            placeholder="codigocliente, codigofilial"
            value={chavesUpsert}
            onChange={(e) => setChavesUpsert(e.target.value)}
          />
        </div>
      )}

      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
