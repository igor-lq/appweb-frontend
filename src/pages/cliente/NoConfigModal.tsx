import { useState } from "react";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { Dialog } from "../../components/Dialog";
import { TabelaDestinoField } from "../../components/TabelaDestinoField";
import { todosObrigatoriosPreenchidos, type CampoEngrenagem } from "../../mocks/componentesFluxo";
import type { EventoLog } from "../../api/types";
import "./NoConfigModal.css";

/** Resolvido por `FluxoPage.tsx::construirCriarTabelaInfo` a partir do grafo (sobe do nó "Escrita
    BD" até o Extrator e resolve cada peça contra os catálogos reais) — ausente (`undefined`)
    quando o nó aberto não é "Escrita BD", ou quando o grafo upstream ainda não resolve tudo que
    "Criar Tabela" precisa (aí o campo cai no fallback bloqueado, com motivo). */
export interface CriarTabelaInfo {
  podeCriar: boolean;
  motivoBloqueio?: string;
  criarTabela: (nomeTabela: string, onEvento: (ev: EventoLog) => void) => Promise<void>;
}

interface LinhaColuna {
  nome: string;
  tipo: string;
  pk: boolean;
  check: string;
  default: string;
}

const TIPOS_COLUNA_SQL = ["text", "int4", "int8", "numeric(15,2)", "date", "timestamp", "bool", "json"];

function linhaColunaVazia(): LinhaColuna {
  return { nome: "", tipo: TIPOS_COLUNA_SQL[0], pk: false, check: "", default: "" };
}

interface NoConfigModalProps {
  titulo: string;
  campos: CampoEngrenagem[];
  valores: Record<string, unknown>;
  /** Só relevante pro campo `tipo: "tabela_destino"` do nó "Escrita BD" — ver `CriarTabelaInfo`. */
  criarTabelaInfo?: CriarTabelaInfo;
  onClose: () => void;
  onSalvar: (valores: Record<string, unknown>) => void;
}

/** Popup genérico da engrenagem — um campo por `CampoEngrenagem`, dirigido por schema (ver
    componentesFluxo.ts). Cada tipo de nó define SEUS campos; este componente só sabe renderizar
    os tipos de campo possíveis, nunca conhece um nó específico. */
export function NoConfigModal({ titulo, campos, valores, criarTabelaInfo, onClose, onSalvar }: NoConfigModalProps) {
  const [temp, setTemp] = useState<Record<string, unknown>>(valores);

  function set(chave: string, valor: unknown) {
    setTemp((atual) => ({ ...atual, [chave]: valor }));
  }

  const podeSalvar = todosObrigatoriosPreenchidos(campos, temp);

  return (
    <Dialog
      title={titulo}
      onClose={onClose}
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!podeSalvar} onClick={() => onSalvar(temp)}>
            Salvar
          </button>
        </div>
      }
    >
      <div className="no-config-campos">
        {campos.map((campo) => (
          <CampoRenderer
            key={campo.chave}
            campo={campo}
            valor={temp[campo.chave]}
            valores={temp}
            criarTabelaInfo={criarTabelaInfo}
            onChange={(v) => set(campo.chave, v)}
          />
        ))}
        {campos.length === 0 && <div className="text-muted">Este nó não tem nada pra configurar.</div>}
      </div>
    </Dialog>
  );
}

function RotuloObrigatorio({ campo }: { campo: CampoEngrenagem }) {
  if (campo.tipo === "nota") return null;
  return (
    <label>
      {campo.rotulo}
      {campo.obrigatoria ? <span className="no-config-obrig"> *</span> : null}
    </label>
  );
}

function Ajuda({ texto }: { texto?: string }) {
  if (!texto) return null;
  return <div className="text-muted no-config-ajuda">{texto}</div>;
}

function CampoRenderer({
  campo,
  valor,
  valores,
  criarTabelaInfo,
  onChange,
}: {
  campo: CampoEngrenagem;
  valor: unknown;
  valores: Record<string, unknown>;
  criarTabelaInfo?: CriarTabelaInfo;
  onChange: (valor: unknown) => void;
}) {
  if (campo.tipo === "nota") {
    return (
      <div className="no-config-nota">
        <div className="text-muted">{campo.texto}</div>
      </div>
    );
  }

  if (campo.tipo === "texto") {
    return (
      <div className="field">
        <RotuloObrigatorio campo={campo} />
        <input
          className="input"
          value={(valor as string) ?? ""}
          placeholder={campo.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <Ajuda texto={campo.ajuda} />
      </div>
    );
  }

  if (campo.tipo === "numero") {
    return (
      <div className="field">
        <RotuloObrigatorio campo={campo} />
        <input
          className="input"
          type="number"
          value={(valor as string) ?? ""}
          placeholder={campo.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <Ajuda texto={campo.ajuda} />
      </div>
    );
  }

  if (campo.tipo === "textarea") {
    return (
      <div className="field">
        <RotuloObrigatorio campo={campo} />
        <textarea
          className="input no-config-textarea"
          value={(valor as string) ?? ""}
          placeholder={campo.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        <Ajuda texto={campo.ajuda} />
      </div>
    );
  }

  if (campo.tipo === "select") {
    return (
      <div className="field">
        <RotuloObrigatorio campo={campo} />
        <select className="input" value={(valor as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Selecione...
          </option>
          {campo.opcoes.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
        <Ajuda texto={campo.ajuda} />
      </div>
    );
  }

  if (campo.tipo === "lista_condicoes" || campo.tipo === "lista_itens") {
    const linhas = (valor as string[] | undefined) ?? [];
    function setLinha(i: number, v: string) {
      const proximo = [...linhas];
      proximo[i] = v;
      onChange(proximo);
    }
    function remover(i: number) {
      onChange(linhas.filter((_, idx) => idx !== i));
    }
    return (
      <div className="field">
        <RotuloObrigatorio campo={campo} />
        <div className="no-config-lista">
          {linhas.map((l, i) => (
            <div className="no-config-lista-linha" key={i}>
              <input className="input" value={l} placeholder={campo.placeholder} onChange={(e) => setLinha(i, e.target.value)} />
              <button type="button" className="btn btn-icon btn-secondary" onClick={() => remover(i)} title="Remover">
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <button type="button" className="btn btn-secondary no-config-lista-add" onClick={() => onChange([...linhas, ""])}>
            <Plus size={14} strokeWidth={1.5} />
            Adicionar {campo.tipo === "lista_condicoes" ? "condição" : "item"}
          </button>
        </div>
        {campo.tipo === "lista_condicoes" && linhas.some((l) => l.trim()) && (
          <div className="text-muted no-config-preview">{linhas.filter((l) => l.trim()).join(" AND ")}</div>
        )}
        <Ajuda texto={campo.ajuda} />
      </div>
    );
  }

  if (campo.tipo === "colunas") {
    const linhas = (valor as LinhaColuna[] | undefined) ?? [];
    function atualizar(i: number, patch: Partial<LinhaColuna>) {
      const proximo = linhas.map((l, idx) => (idx === i ? { ...l, ...patch } : l));
      onChange(proximo);
    }
    function remover(i: number) {
      onChange(linhas.filter((_, idx) => idx !== i));
    }
    return (
      <div className="field">
        <RotuloObrigatorio campo={campo} />
        <div className="no-config-colunas">
          {linhas.length > 0 && (
            <div className="no-config-colunas-header">
              <span>Nome</span>
              <span>Tipo</span>
              <span>PK</span>
              <span>Check</span>
              <span>Default</span>
              <span />
            </div>
          )}
          {linhas.map((l, i) => (
            <div className="no-config-colunas-linha" key={i}>
              <input className="input" value={l.nome} placeholder="nome" onChange={(e) => atualizar(i, { nome: e.target.value })} />
              <select className="input" value={l.tipo} onChange={(e) => atualizar(i, { tipo: e.target.value })}>
                {TIPOS_COLUNA_SQL.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input type="checkbox" checked={l.pk} onChange={(e) => atualizar(i, { pk: e.target.checked })} title="Primary Key" />
              <input className="input" value={l.check} placeholder="valor >= 0" onChange={(e) => atualizar(i, { check: e.target.value })} />
              <input
                className="input"
                value={l.default}
                placeholder="CURRENT_TIMESTAMP"
                onChange={(e) => atualizar(i, { default: e.target.value })}
              />
              <button type="button" className="btn btn-icon btn-secondary" onClick={() => remover(i)} title="Remover coluna">
                <Trash2 size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary no-config-lista-add"
            onClick={() => onChange([...linhas, linhaColunaVazia()])}
          >
            <Plus size={14} strokeWidth={1.5} />
            Adicionar coluna
          </button>
        </div>
        <Ajuda texto={campo.ajuda} />
      </div>
    );
  }

  if (campo.tipo === "tabela_destino") {
    return (
      <TabelaDestinoField
        value={(valor as string) ?? ""}
        onChange={onChange}
        podeCriar={criarTabelaInfo?.podeCriar ?? false}
        motivoBloqueio={
          criarTabelaInfo?.motivoBloqueio ??
          "Conecte Conexão de Origem, Conexão Destino e o restante do Leitor antes de criar a tabela."
        }
        criarTabela={
          criarTabelaInfo?.criarTabela ??
          (async () => {
            throw new Error("Contexto incompleto — conecte tudo antes de criar a tabela.");
          })
        }
      />
    );
  }

  if (campo.tipo === "teste_endpoint") {
    const rota = typeof valores.rota === "string" ? valores.rota : "";
    const resultado = valor as boolean | undefined;
    return (
      <div className="field">
        <label>{campo.rotulo}</label>
        <div className="no-config-teste-linha">
          <button type="button" className="btn btn-secondary" onClick={() => onChange(rota.trim().startsWith("/"))}>
            Testar endpoint
          </button>
          {resultado === true && (
            <span className="no-config-teste-ok">
              <CheckCircle2 size={14} strokeWidth={1.75} />
              Endpoint OK
            </span>
          )}
          {resultado === false && (
            <span className="no-config-teste-falha">
              <XCircle size={14} strokeWidth={1.75} />
              Falha — a Rota precisa começar com &quot;/&quot;
            </span>
          )}
        </div>
      </div>
    );
  }

  return null;
}
