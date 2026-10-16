import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { SearchableSelect } from "../../components/SearchableSelect";
import { ApiError } from "../../api/client";
import { analysisServerApi, type RelacionamentoTmdlApi, type TabelaTmdlApi } from "../../api/analysisServer";

interface RelacionamentoModalProps {
  titulo: string;
  clienteId: string;
  conexaoId: string;
  tabelas: TabelaTmdlApi[];
  relacionamento?: RelacionamentoTmdlApi;
  onClose: () => void;
  onSalvar: () => void;
}

type OpcaoCardinalidade = "1:N" | "N:1" | "1:1" | "N:N";

/** "Muitos para um" primeiro — é o caso mais comum (fato->dimensão) e o único totalmente seguro
    pro Analysis Services: o lado "de" (Tabela 1) precisa ser sempre "muitos", a menos que o
    relacionamento seja Um-para-Um de verdade (regra real do TOM, achado 2026-09-04 — "Um para
    muitos" com a Tabela 1 do lado "um" falha o Deploy: "a cardinalidade do lado de origem deve
    sempre ser Muitos, a menos que o relacionamento seja Um para Um"). */
const OPCOES_CARDINALIDADE: { valor: OpcaoCardinalidade; rotulo: string }[] = [
  { valor: "N:1", rotulo: "Muitos para um (N:1)" },
  { valor: "N:N", rotulo: "Muitos para muitos (N:N)" },
  { valor: "1:1", rotulo: "Um para um (1:1)" },
  { valor: "1:N", rotulo: "Um para muitos (1:N)" },
];

function paraOpcaoCardinalidade(de: "um" | "muitos", para: "um" | "muitos"): OpcaoCardinalidade {
  if (de === "um" && para === "muitos") return "1:N";
  if (de === "muitos" && para === "um") return "N:1";
  if (de === "um" && para === "um") return "1:1";
  return "N:N";
}

function paraCardinalidadeDe(opcao: OpcaoCardinalidade): "um" | "muitos" {
  return opcao === "1:N" || opcao === "1:1" ? "um" : "muitos";
}

function paraCardinalidadePara(opcao: OpcaoCardinalidade): "um" | "muitos" {
  return opcao === "N:1" || opcao === "1:1" ? "um" : "muitos";
}

/** Cria ou edita (`relacionamento` presente) um Relacionamento do Modelo Semântico — mesmo modal
    reaproveitado pros dois casos, mesmo princípio de `MedidaModal`/`TaskFormModal` com `task?`. */
export function RelacionamentoModal({ titulo, clienteId, conexaoId, tabelas, relacionamento, onClose, onSalvar }: RelacionamentoModalProps) {
  const [tabela1, setTabela1] = useState(relacionamento?.tabela_de ?? tabelas[0]?.nome ?? "");
  const [coluna1, setColuna1] = useState(relacionamento?.coluna_de ?? tabelas[0]?.colunas[0]?.nome ?? "");
  const [tabela2, setTabela2] = useState(relacionamento?.tabela_para ?? tabelas[1]?.nome ?? tabelas[0]?.nome ?? "");
  const [coluna2, setColuna2] = useState(relacionamento?.coluna_para ?? tabelas[1]?.colunas[0]?.nome ?? tabelas[0]?.colunas[0]?.nome ?? "");
  const [cardinalidade, setCardinalidade] = useState<OpcaoCardinalidade>(
    relacionamento ? paraOpcaoCardinalidade(relacionamento.cardinalidade_de, relacionamento.cardinalidade_para) : "N:1",
  );
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const colunasTabela1 = tabelas.find((t) => t.nome === tabela1)?.colunas ?? [];
  const colunasTabela2 = tabelas.find((t) => t.nome === tabela2)?.colunas ?? [];
  const ladoTabela1 = paraCardinalidadeDe(cardinalidade);
  const ladoTabela2 = paraCardinalidadePara(cardinalidade);

  const podeSalvar = tabela1 && coluna1 && tabela2 && coluna2;

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const payload = {
        tabela_de: tabela1,
        coluna_de: coluna1,
        tabela_para: tabela2,
        coluna_para: coluna2,
        cardinalidade_de: paraCardinalidadeDe(cardinalidade),
        cardinalidade_para: paraCardinalidadePara(cardinalidade),
      };
      if (relacionamento) {
        await analysisServerApi.editarRelacionamento(clienteId, conexaoId, relacionamento.nome, payload);
      } else {
        await analysisServerApi.adicionarRelacionamento(clienteId, conexaoId, {
          nome: `${tabela1}_${tabela2}`,
          ...payload,
          ativo: true,
        });
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar relacionamento.");
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
        <label htmlFor="rl-cardinalidade">Cardinalidade</label>
        <select className="input" id="rl-cardinalidade" value={cardinalidade} onChange={(e) => setCardinalidade(e.target.value as OpcaoCardinalidade)}>
          {OPCOES_CARDINALIDADE.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="rl-tabela1">Tabela (lado "{ladoTabela1}")</label>
          <SearchableSelect
            id="rl-tabela1"
            value={tabela1}
            onChange={(v) => {
              setTabela1(v);
              setColuna1(tabelas.find((t) => t.nome === v)?.colunas[0]?.nome ?? "");
            }}
            options={tabelas.map((t) => ({ value: t.nome, label: t.nome }))}
          />
        </div>
        <div className="field">
          <label htmlFor="rl-coluna1">Coluna</label>
          <SearchableSelect
            id="rl-coluna1"
            value={coluna1}
            onChange={setColuna1}
            options={colunasTabela1.map((c) => ({ value: c.nome, label: c.nome }))}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="rl-tabela2">Tabela (lado "{ladoTabela2}")</label>
          <SearchableSelect
            id="rl-tabela2"
            value={tabela2}
            onChange={(v) => {
              setTabela2(v);
              setColuna2(tabelas.find((t) => t.nome === v)?.colunas[0]?.nome ?? "");
            }}
            options={tabelas.map((t) => ({ value: t.nome, label: t.nome }))}
          />
        </div>
        <div className="field">
          <label htmlFor="rl-coluna2">Coluna</label>
          <SearchableSelect
            id="rl-coluna2"
            value={coluna2}
            onChange={setColuna2}
            options={colunasTabela2.map((c) => ({ value: c.nome, label: c.nome }))}
          />
        </div>
      </div>

      <div className="text-muted" style={{ fontSize: 12 }}>
        Conectado ao Analysis Service — tabelas e colunas vêm do modelo já publicado.
      </div>
      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
