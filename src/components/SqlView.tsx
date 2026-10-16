import { useEffect, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-sql";
import "./SqlHighlight.css";

interface SqlViewProps {
  sql: string;
  className?: string;
}

/** Visualização de SQL só-leitura, com highlighting via Prism.js — substitui o `<pre>{sql}</pre>`
    cru usado antes em toda tela que só mostra SQL (nunca edita). Ver `SqlEditor` pro caso
    editável (campo de digitar SQL de verdade, que precisa de um componente diferente). */
export function SqlView({ sql, className }: SqlViewProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current);
  }, [sql]);

  return (
    <pre className={className}>
      <code ref={ref} className="language-sql">
        {sql}
      </code>
    </pre>
  );
}
