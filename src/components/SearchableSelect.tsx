import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search } from "lucide-react";
import "./SearchableSelect.css";

export interface SearchableSelectOption {
  value: string;
  label: string;
  descricao?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  id?: string;
  vazio?: string;
  disabled?: boolean;
}

/** Select com busca — substitui o <select> nativo pra qualquer campo que referencia um catálogo
    que pode crescer (Consultas, Estratégias, Conexões, Tabelas, Colunas, Tasks, Pacotes, Bancos
    internos etc.). Enums realmente pequenos e fixos (Tipo, Organização, Método HTTP, Fonte,
    Direcionamento, Unidade, Perfil...) continuam com <select> nativo — não precisam de busca.

    O painel é renderizado via portal em `document.body` (`position: fixed`, coordenadas
    calculadas do trigger) — um `<select>` nativo sempre desenha seu popup por cima de tudo,
    fora de qualquer contexto de overflow/z-index do ancestral, mas um painel absoluto comum
    ficava PRESO ao `.dialog-body` (que tem `overflow: auto` pra rolar formulários longos),
    cortando o painel quando o popup abria perto do fim do modal. */
export function SearchableSelect({ value, onChange, options, placeholder = "Selecionar...", id, vazio = "Nenhum resultado.", disabled = false }: SearchableSelectProps) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0 });
  const raizRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const painelRef = useRef<HTMLDivElement>(null);
  const buscaRef = useRef<HTMLInputElement>(null);

  const selecionada = options.find((o) => o.value === value);
  const q = busca.trim().toLowerCase();
  const filtradas = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function recalcularPosicao() {
    const r = gatilhoRef.current?.getBoundingClientRect();
    if (r) setPosicao({ top: r.bottom + 4, left: r.left, width: r.width });
  }

  useLayoutEffect(() => {
    if (!aberto) return;
    recalcularPosicao();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      const alvo = e.target as Node;
      if (raizRef.current?.contains(alvo) || painelRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    // `true` (fase de captura) — um ancestral com `overflow: auto` que rola ao arrastar a
    // scrollbar dispara "scroll" antes do documento processar o clique; captura garante que a
    // posição seja recalculada mesmo quando o scroll do próprio `.dialog-body` é o gatilho.
    function aoRolarOuRedimensionar() {
      recalcularPosicao();
    }
    document.addEventListener("mousedown", aoClicarFora);
    window.addEventListener("scroll", aoRolarOuRedimensionar, true);
    window.addEventListener("resize", aoRolarOuRedimensionar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      window.removeEventListener("scroll", aoRolarOuRedimensionar, true);
      window.removeEventListener("resize", aoRolarOuRedimensionar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    setBusca("");
    const id = requestAnimationFrame(() => buscaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [aberto]);

  function escolher(v: string) {
    onChange(v);
    setAberto(false);
  }

  return (
    <div className="searchable-select" ref={raizRef}>
      <button
        type="button"
        id={id}
        ref={gatilhoRef}
        className="input searchable-select-trigger"
        disabled={disabled}
        onClick={() => setAberto((a) => !a)}
      >
        <span className={selecionada ? "searchable-select-valor" : "searchable-select-valor text-muted"}>
          {selecionada?.label ?? placeholder}
        </span>
        <ChevronDown size={14} strokeWidth={1.5} />
      </button>

      {aberto &&
        createPortal(
          <div
            ref={painelRef}
            className="searchable-select-painel card"
            style={{ position: "fixed", top: posicao.top, left: posicao.left, width: posicao.width }}
          >
            <div className="searchable-select-busca">
              <Search size={13} strokeWidth={1.5} />
              <input
                ref={buscaRef}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                onKeyDown={(e) => {
                  if (e.key === "Escape") setAberto(false);
                  if (e.key === "Enter" && filtradas[0]) escolher(filtradas[0].value);
                }}
              />
            </div>
            <div className="searchable-select-lista scroll">
              {filtradas.map((o) => (
                <button
                  type="button"
                  key={o.value}
                  className={`searchable-select-opcao${o.value === value ? " searchable-select-opcao--selecionada" : ""}`}
                  onClick={() => escolher(o.value)}
                >
                  <span>{o.label}</span>
                  {o.descricao && <span className="text-muted searchable-select-opcao-desc">{o.descricao}</span>}
                </button>
              ))}
              {filtradas.length === 0 && <div className="text-muted searchable-select-vazio">{vazio}</div>}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
