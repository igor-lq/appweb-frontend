import { useState } from "react";
import { Dialog } from "./Dialog";
import { ApiError } from "../api/client";
import type { EventoLog } from "../api/types";

interface TabelaDestinoFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Se os pré-requisitos pra inferir a estrutura da tabela já estão prontos
      (Consulta+Estratégia+Conexão Origem+Destino, ou Aba+Conexão Origem+
      Destino, dependendo do tipo de Task) — "Criar nova" fica desabilitado
      sem isso, já que não dá pra inferir coluna nenhuma. */
  podeCriar: boolean;
  motivoBloqueio?: string;
  /** Chama a rota real de criação (streaming) — quem chama já sabe montar o
      payload certo (Consulta/Estratégia ou Aba, conforme o tipo de Task). */
  criarTabela: (nomeTabela: string, onEvento: (evento: EventoLog) => void) => Promise<void>;
}

/** Campo "Tabela destino" reutilizado pelas Tasks tipo Consulta SQL/Planilha.
    "Vincular existente" só grava o nome — a ligação de verdade acontece
    quando a Task é salva, sem ação nenhuma agora. "Criar nova" é diferente:
    clicar no botão abre uma confirmação, e só ao confirmar a tabela é
    de fato criada (DROP + CREATE) no banco interno, JÁ NESTE MOMENTO — a
    Task só grava o vínculo (`tabela_destino`) quando salva depois. */
export function TabelaDestinoField({ value, onChange, podeCriar, motivoBloqueio, criarTabela }: TabelaDestinoFieldProps) {
  const [modo, setModo] = useState<"vincular" | "criar">("vincular");
  const [criada, setCriada] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [eventos, setEventos] = useState<EventoLog[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  function vincularExistente() {
    setModo("vincular");
    setCriada(false);
  }

  function abrirConfirmacao() {
    if (!podeCriar || !value.trim()) return;
    setEventos([]);
    setErro(null);
    setConfirmando(true);
  }

  async function confirmarCriacao() {
    setCriando(true);
    setErro(null);
    setEventos([]);
    try {
      let falhou = false;
      await criarTabela(value.trim(), (ev) => {
        setEventos((atual) => [...atual, ev]);
        if (ev.nivel === "erro") falhou = true;
      });
      if (!falhou) {
        setModo("criar");
        setCriada(true);
        setConfirmando(false);
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao criar tabela.");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="field">
      <label>Tabela destino</label>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          className={`btn ${modo === "vincular" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1 }}
          onClick={vincularExistente}
        >
          Vincular existente
        </button>
        <button
          type="button"
          className={`btn ${modo === "criar" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1 }}
          onClick={abrirConfirmacao}
          disabled={!podeCriar || !value.trim()}
        >
          Criar nova
        </button>
      </div>

      <input
        className="input"
        placeholder="nome_da_tabela"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={criada}
      />

      <div className="text-muted" style={{ fontSize: 12, marginTop: 5 }}>
        {criada
          ? 'Tabela criada agora, neste momento — pra usar outro nome, clique em "Vincular existente" e depois em "Criar nova" de novo.'
          : modo === "vincular"
            ? "Grava na tabela já existente com esse nome, quando a Task for salva."
            : "Clique em \"Criar nova\" pra criar essa tabela agora mesmo, antes de salvar a Task."}
      </div>
      {!podeCriar && !criada && motivoBloqueio && (
        <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
          {motivoBloqueio}
        </div>
      )}

      {confirmando && (
        <Dialog
          title="Criar tabela agora"
          onClose={() => !criando && setConfirmando(false)}
          actions={
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button className="btn btn-secondary" onClick={() => setConfirmando(false)} disabled={criando}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={confirmarCriacao} disabled={criando}>
                {criando ? "Criando..." : "Confirmar e criar agora"}
              </button>
            </div>
          }
        >
          <p style={{ marginTop: 0 }}>
            Isso cria a tabela <strong>"{value.trim()}"</strong> agora mesmo no banco interno — só funciona se ainda
            não existir uma tabela com esse nome (se já existir, a criação falha e nada é alterado). A Task só fica
            vinculada a ela quando você salvar a Task.
          </p>
          {eventos.map((ev, i) => (
            <div
              key={i}
              className="acao-feedback"
              style={ev.nivel === "erro" ? { color: "var(--color-danger-text)" } : undefined}
            >
              {ev.mensagem}
            </div>
          ))}
          {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
        </Dialog>
      )}
    </div>
  );
}
