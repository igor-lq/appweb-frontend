import { useState } from "react";
import { Dialog } from "../../components/Dialog";
import { SqlEditor } from "../../components/SqlEditor";
import { ApiError } from "../../api/client";
import {
  categoriasConsultaApi,
  consultasApi,
  nomeInternoConsultaApi,
  ROTULO_CATEGORIA_CONSULTA,
  type CategoriaConsultaApi,
  type ConsultaApi,
} from "../../api/consultas";

interface ConsultaModalProps {
  titulo: string;
  clienteId: string;
  consulta?: ConsultaApi;
  onClose: () => void;
  onSalvar: () => void;
}

/** Consulta SQL é só texto puro (SQL + metadado de categoria) — sem vínculo com nenhuma Conexão.
    A origem/destino de dados é sempre decisão da Task que referencia a Consulta, nunca da
    Consulta em si. */
export function ConsultaModal({ titulo, clienteId, consulta, onClose, onSalvar }: ConsultaModalProps) {
  const [categoria, setCategoria] = useState<CategoriaConsultaApi>(consulta?.categoria ?? "Fato");
  const [nome, setNome] = useState(consulta?.nome ?? "");
  const [sql, setSql] = useState(consulta?.sql_texto ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const podeSalvar = nome.trim() && sql.trim();

  async function salvar() {
    setErro(null);
    setEnviando(true);
    try {
      const payload = {
        nome,
        categoria,
        sql_texto: sql,
      };
      if (consulta) {
        await consultasApi.atualizar(clienteId, consulta.id, payload);
      } else {
        await consultasApi.criar(clienteId, payload);
      }
      onSalvar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao salvar consulta.");
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
      <div className="field">
        <label htmlFor="cs-camada">Camada DW</label>
        <select className="input" id="cs-camada" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaConsultaApi)}>
          {categoriasConsultaApi.map((c) => (
            <option key={c} value={c}>
              {ROTULO_CATEGORIA_CONSULTA[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="cs-nome">Nome</label>
        <input className="input" id="cs-nome" placeholder="Faturamento" value={nome} onChange={(e) => setNome(e.target.value)} />
        {nome.trim() && (
          <div className="text-muted consulta-nome-interno">
            Nome interno: <span className="opcoes-mono">{nomeInternoConsultaApi(categoria, nome)}</span>
          </div>
        )}
      </div>
      <div className="field">
        <label htmlFor="cs-sql">SQL</label>
        <SqlEditor
          id="cs-sql"
          placeholder={"SELECT\n  ...\nFROM tabela\nWHERE :datacompetencia"}
          value={sql}
          onChange={setSql}
        />
      </div>
      {erro && <div className="text-danger" style={{ fontSize: 13 }}>{erro}</div>}
    </Dialog>
  );
}
