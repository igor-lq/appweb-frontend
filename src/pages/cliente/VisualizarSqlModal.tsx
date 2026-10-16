import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { SqlView } from "../../components/SqlView";
import type { Estrategia } from "../../mocks/estrategias";
import { montarSqlEfetivo, montarSqlPrimeiroSegmento, montarSqlDelete } from "../../utils/sqlEfetivo";

interface VisualizarSqlModalProps {
  nomeConsulta: string;
  sqlOriginal: string;
  estrategia: Estrategia;
  nomeTabela: string;
  onClose: () => void;
}

interface Aba {
  id: string;
  rotulo: string;
  sql: string;
  mensagemVazia?: string;
}

export function VisualizarSqlModal({ nomeConsulta, sqlOriginal, estrategia, nomeTabela, onClose }: VisualizarSqlModalProps) {
  const ehFullPeriodo = estrategia.tipo === "Full por Período";

  // Full por Período: 3 abas (range inteiro / só o primeiro segmento / delete do primeiro
  // segmento) — valida tanto a extração quanto a exclusão, segmento a segmento, sem precisar
  // rodar de verdade. Demais estratégias: 2 abas (extração / delete-ou-truncate).
  const abas: Aba[] = ehFullPeriodo
    ? [
        { id: "full", rotulo: "SQL de Extração Full", sql: montarSqlEfetivo(sqlOriginal, estrategia) },
        { id: "segmentado", rotulo: "SQL de Extração Segmentado", sql: montarSqlPrimeiroSegmento(sqlOriginal, estrategia) },
        { id: "delete", rotulo: "SQL Delete", sql: montarSqlDelete(sqlOriginal, estrategia, nomeTabela) },
      ]
    : [
        { id: "extracao", rotulo: "SQL de Extração", sql: montarSqlEfetivo(sqlOriginal, estrategia) },
        {
          id: "delete",
          rotulo: "SQL Delete",
          sql: montarSqlDelete(sqlOriginal, estrategia, nomeTabela),
          mensagemVazia:
            estrategia.tipo === "Incremental"
              ? "Incremental não usa DELETE — insere direto o que a consulta retornar, sem apagar nada antes."
              : undefined,
        },
      ];

  const [abaAtivaId, setAbaAtivaId] = useState(abas[0].id);
  const abaAtiva = abas.find((a) => a.id === abaAtivaId) ?? abas[0];

  return (
    <Dialog
      title={nomeConsulta}
      onClose={onClose}
      wide
      actions={
        <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={onClose}>
          Fechar
        </button>
      }
    >
      <div className="tab-shell-subnav" style={{ marginTop: 0, marginBottom: 12 }}>
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            className={`tab-shell-sublink${aba.id === abaAtivaId ? " tab-shell-sublink--ativo" : ""}`}
            onClick={() => setAbaAtivaId(aba.id)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      {abaAtiva.sql ? (
        <div className="code-block" style={{ maxHeight: "58vh" }}>
          <SqlView sql={abaAtiva.sql} />
        </div>
      ) : (
        <div className="text-muted" style={{ padding: "10px 2px" }}>
          {abaAtiva.mensagemVazia ?? "Nada a exibir."}
        </div>
      )}
    </Dialog>
  );
}
