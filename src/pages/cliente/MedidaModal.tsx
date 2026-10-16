import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { DaxEditor } from "../../components/DaxEditor";
import { ApiError } from "../../api/client";
import { analysisServerApi, type MedidaTmdlApi, type TabelaTmdlApi } from "../../api/analysisServer";

interface MedidaModalProps {
  titulo: string;
  clienteId: string;
  conexaoId: string;
  medida?: MedidaTmdlApi;
  tabelas: TabelaTmdlApi[];
  onClose: () => void;
  onSalvar: () => void;
}

export function MedidaModal({ titulo, clienteId, conexaoId, medida, tabelas, onClose, onSalvar }: MedidaModalProps) {
  const [nome, setNome] = useState(medida?.nome ?? "");
  const [pasta, setPasta] = useState(medida?.pasta ?? "");
  const [formato, setFormato] = useState(medida?.format_string ?? "");
  const [expressao, setExpressao] = useState(medida?.expressao ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim() && expressao.trim();

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      await analysisServerApi.salvarMedida(clienteId, conexaoId, {
        nome,
        expressao,
        pasta: pasta || null,
        format_string: formato || null,
      });
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar medida.");
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
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 12 }}>
        <div className="field">
          <label htmlFor="md-nome">Nome</label>
          <input
            className="input"
            id="md-nome"
            placeholder="Valor Total Faturado"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            disabled={!!medida}
          />
        </div>
        <div className="field">
          <label htmlFor="md-pasta">Pasta</label>
          <input className="input" id="md-pasta" placeholder="Financeiro" value={pasta} onChange={(e) => setPasta(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="md-formato">Formato (opcional)</label>
          <input className="input" id="md-formato" placeholder="#,##0.00" value={formato} onChange={(e) => setFormato(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="md-expressao">Expressão DAX</label>
        <DaxEditor value={expressao} onChange={setExpressao} tabelas={tabelas} />
      </div>
      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
