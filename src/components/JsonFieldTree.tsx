import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import "./JsonFieldTree.css";

interface JsonFieldTreeProps {
  dados: unknown;
  selecionados: string[];
  onToggle: (caminho: string) => void;
  onToggleGrupo: (caminhos: string[], todosSelecionados: boolean) => void;
}

/** Árvore recursiva sobre um JSON de exemplo (ex.: amostra de retorno de API). Folhas selecionam
    um único path (ex.: "data.address.city"); grupos selecionam/desmarcam todos os descendentes
    de uma vez — mesmo comportamento de cascata já validado na V1: marcar o pai marca todos os
    filhos, e o pai só fica marcado quando todos os filhos estão (estado indeterminado no meio). */
export function JsonFieldTree({ dados, selecionados, onToggle, onToggleGrupo }: JsonFieldTreeProps) {
  return (
    <div className="json-tree">
      <JsonFieldEntradas dados={dados} caminho="" selecionados={selecionados} onToggle={onToggle} onToggleGrupo={onToggleGrupo} />
    </div>
  );
}

function coletarFolhas(dados: unknown, caminho: string): string[] {
  const alvo = Array.isArray(dados) ? dados[0] : dados;
  if (alvo === null || typeof alvo !== "object") return caminho ? [caminho] : [];
  return Object.entries(alvo as Record<string, unknown>).flatMap(([chave, valor]) =>
    coletarFolhas(valor, caminho ? `${caminho}.${chave}` : chave),
  );
}

function JsonFieldEntradas({
  dados,
  caminho,
  selecionados,
  onToggle,
  onToggleGrupo,
}: {
  dados: unknown;
  caminho: string;
  selecionados: string[];
  onToggle: (caminho: string) => void;
  onToggleGrupo: (caminhos: string[], todosSelecionados: boolean) => void;
}) {
  const alvo = Array.isArray(dados) ? dados[0] : dados;
  if (alvo === null || typeof alvo !== "object") return null;

  return (
    <>
      {Object.entries(alvo as Record<string, unknown>).map(([chave, valor]) => (
        <JsonFieldNode
          key={chave}
          nomeChave={chave}
          valor={valor}
          caminho={caminho ? `${caminho}.${chave}` : chave}
          selecionados={selecionados}
          onToggle={onToggle}
          onToggleGrupo={onToggleGrupo}
        />
      ))}
    </>
  );
}

function JsonFieldNode({
  nomeChave,
  valor,
  caminho,
  selecionados,
  onToggle,
  onToggleGrupo,
}: {
  nomeChave: string;
  valor: unknown;
  caminho: string;
  selecionados: string[];
  onToggle: (caminho: string) => void;
  onToggleGrupo: (caminhos: string[], todosSelecionados: boolean) => void;
}) {
  const [aberto, setAberto] = useState(true);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const alvo = Array.isArray(valor) ? valor[0] : valor;
  const ehGrupo = alvo !== null && typeof alvo === "object";
  const folhas = ehGrupo ? coletarFolhas(valor, caminho) : [];
  const qtdSelecionadas = folhas.filter((f) => selecionados.includes(f)).length;
  const todasSelecionadas = folhas.length > 0 && qtdSelecionadas === folhas.length;
  const algumasSelecionadas = qtdSelecionadas > 0 && !todasSelecionadas;

  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = algumasSelecionadas;
  }, [algumasSelecionadas]);

  if (ehGrupo) {
    return (
      <div className="json-tree-grupo">
        <div className="json-tree-grupo-header">
          <button type="button" className="json-tree-chevron" onClick={() => setAberto((a) => !a)}>
            {aberto ? <ChevronDown size={13} strokeWidth={1.5} /> : <ChevronRight size={13} strokeWidth={1.5} />}
          </button>
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={todasSelecionadas}
            onChange={() => onToggleGrupo(folhas, todasSelecionadas)}
          />
          <span>
            {nomeChave}
            {Array.isArray(valor) ? " []" : ""}
          </span>
        </div>
        {aberto && (
          <div className="json-tree-filhos">
            <JsonFieldEntradas
              dados={valor}
              caminho={caminho}
              selecionados={selecionados}
              onToggle={onToggle}
              onToggleGrupo={onToggleGrupo}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <label className="json-tree-folha">
      <input type="checkbox" checked={selecionados.includes(caminho)} onChange={() => onToggle(caminho)} />
      <span>{nomeChave}</span>
    </label>
  );
}
