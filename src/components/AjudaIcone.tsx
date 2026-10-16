import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, HelpCircle } from "lucide-react";
import { Dialog } from "./Dialog";
import "./AjudaIcone.css";

interface AjudaIconeProps {
  texto: string;
  /** Título do popup ao clicar — normalmente o nome do componente/nó. */
  titulo?: string;
  className?: string;
}

const LARGURA_DICA = 240;
const MARGEM_VIEWPORT = 8;

/** Ícone "?" reusado tanto nos cards da biblioteca quanto no cabeçalho de um nó no canvas —
    passar o mouse mostra uma dica flutuante custom; clicar abre um popup com o texto completo,
    com botão de copiar (pro analista levar a explicação pra outro lugar sem precisar selecionar
    o texto à mão).

    A dica é renderizada via portal em `document.body`, nunca como filha do botão — os dois
    lugares onde esse ícone aparece (biblioteca com `overflow:auto`, canvas dentro de
    `.fluxo-canvas-zoom` com `transform:scale`) cortariam ou deslocariam uma dica posicionada
    normalmente (`position:absolute`/`fixed` dentro de um ancestral com overflow ou transform).
    Fora da árvore, `position:fixed` com coordenadas de `getBoundingClientRect()` (que já são
    relativas à viewport) funciona sempre, e a posição é grudada (clamp) pra nunca vazar da tela. */
export function AjudaIcone({ texto, titulo, className }: AjudaIconeProps) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [dicaPos, setDicaPos] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  function mostrarDica() {
    const rect = botaoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(MARGEM_VIEWPORT, rect.right - LARGURA_DICA), window.innerWidth - LARGURA_DICA - MARGEM_VIEWPORT);
    setDicaPos({ top: rect.top - 8, left });
  }
  function esconderDica() {
    setDicaPos(null);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // clipboard indisponível (contexto não seguro, permissão negada) — sem erro visível, o
      // texto continua selecionável à mão dentro do popup.
    }
  }

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={`ajuda-icone${className ? ` ${className}` : ""}`}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseEnter={mostrarDica}
        onMouseLeave={esconderDica}
        onFocus={mostrarDica}
        onBlur={esconderDica}
        onClick={(e) => {
          e.stopPropagation();
          esconderDica();
          setAberto(true);
        }}
      >
        <HelpCircle size={12} strokeWidth={1.75} />
      </button>

      {dicaPos &&
        createPortal(
          <div className="ajuda-icone-dica" style={{ top: dicaPos.top, left: dicaPos.left }}>
            {texto}
          </div>,
          document.body,
        )}

      {aberto && (
        <Dialog
          title={titulo ?? "Sobre este componente"}
          onClose={() => setAberto(false)}
          actions={
            <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
              <button type="button" className="btn btn-secondary" onClick={copiar}>
                {copiado ? (
                  <>
                    <Check size={14} strokeWidth={1.75} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={14} strokeWidth={1.75} />
                    Copiar
                  </>
                )}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setAberto(false)}>
                Fechar
              </button>
            </div>
          }
        >
          <p className="ajuda-icone-texto">{texto}</p>
        </Dialog>
      )}
    </>
  );
}
