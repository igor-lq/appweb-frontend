import { useRef } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditorNs, Position } from "monaco-editor";

/** ~60 funções DAX mais comuns — só o suficiente pra highlighting/autocomplete básico, não uma
    lista exaustiva da linguagem inteira. */
const FUNCOES_DAX = [
  "CALCULATE", "CALCULATETABLE", "SUM", "SUMX", "AVERAGE", "AVERAGEX", "COUNT", "COUNTX",
  "COUNTA", "COUNTROWS", "COUNTBLANK", "DISTINCTCOUNT", "MIN", "MINX", "MAX", "MAXX",
  "FILTER", "ALL", "ALLEXCEPT", "ALLSELECTED", "VALUES", "DISTINCT", "RELATED", "RELATEDTABLE",
  "IF", "SWITCH", "AND", "OR", "NOT", "ISBLANK", "ISERROR", "IFERROR",
  "DIVIDE", "ROUND", "ROUNDUP", "ROUNDDOWN", "ABS", "INT", "TRUNC",
  "DATE", "DATEADD", "DATEDIFF", "DATESYTD", "DATESMTD", "DATESQTD", "SAMEPERIODLASTYEAR",
  "TOTALYTD", "TOTALMTD", "TOTALQTD", "YEAR", "MONTH", "DAY", "TODAY", "NOW",
  "CONCATENATE", "CONCATENATEX", "FORMAT", "BLANK", "SELECTEDVALUE", "HASONEVALUE",
  "RANKX", "TOPN", "SUMMARIZE", "ADDCOLUMNS", "VAR", "RETURN",
];

let linguagemRegistrada = false;

/** Registra a linguagem "dax" no Monaco uma única vez por sessão de página (chamado no
    `beforeMount` do editor, que já roda depois do Monaco carregado). Ponto central do que o
    CodeMirror 6 fazia errado: o `wordPattern` default do Monaco quebra em `'`/`[`/`]`, então
    duplo-clique ou o range de autocomplete não pegava `'Tabela'`/`[Coluna]` como um token só —
    aqui isso é corrigido explicitamente. */
function registrarLinguagemDax(monaco: Monaco) {
  if (linguagemRegistrada) return;
  linguagemRegistrada = true;

  monaco.languages.register({ id: "dax" });

  // Cobre 'Nome de Tabela' e [Nome de Coluna] como um único "word" pra seleção/duplo-clique e
  // pro range de autocomplete considerarem o token inteiro, não pararem nas aspas/colchetes.
  monaco.languages.setLanguageConfiguration("dax", {
    wordPattern: /'[^']+'|\[[^\]]*\]|[A-Za-z_][A-Za-z0-9_]*/,
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["(", ")"],
      ["[", "]"],
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
  });

  monaco.languages.setMonarchTokensProvider("dax", {
    ignoreCase: true,
    keywords: FUNCOES_DAX,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"(?:[^"\\]|\\.)*"/, "string"],
        [/'[^']+'/, "type.identifier"],
        [/\[[^\]]*\]/, "variable.name"],
        [/\b\d+(\.\d+)?\b/, "number"],
        [
          /[A-Za-z_][A-Za-z0-9_]*/,
          { cases: { "@keywords": "keyword", "@default": "identifier" } },
        ],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });
}

export interface DaxEditorTabela {
  nome: string;
  colunas: { nome: string }[];
}

interface DaxEditorProps {
  value: string;
  onChange: (v: string) => void;
  tabelas: DaxEditorTabela[];
  height?: string;
}

/** Editor de código com highlighting/autocomplete de DAX (funções comuns + tabelas/colunas do
    Modelo Semântico já carregado) — substitui o textarea puro na criação/edição de Medidas.
    Monaco Editor (decisão do usuário 2026-09-04, trocando o CodeMirror 6 anterior — que não
    selecionava corretamente `'Tabela'[Coluna]` como um token único). Também reaproveitado pro
    filtro RLS de Roles (`RoleModal.tsx`, `height` menor — expressão costuma ser 1 linha),
    passando só a tabela selecionada em `tabelas` pra sugerir apenas as colunas dela. */
export function DaxEditor({ value, onChange, tabelas, height = "140px" }: DaxEditorProps) {
  const disposableRef = useRef<{ dispose: () => void } | null>(null);

  function aoMontar(_editor: MonacoEditorNs.IStandaloneCodeEditor, monaco: Monaco) {
    registrarLinguagemDax(monaco);

    disposableRef.current?.dispose();
    disposableRef.current = monaco.languages.registerCompletionItemProvider("dax", {
      triggerCharacters: ["'", "[", "."],
      provideCompletionItems(model: MonacoEditorNs.ITextModel, position: Position) {
        const palavra = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: palavra.startColumn,
          endColumn: palavra.endColumn,
        };
        const sugestoes = [
          ...FUNCOES_DAX.map((f) => ({
            label: f,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: f,
            detail: "Função DAX",
            range,
          })),
          ...tabelas.map((t) => ({
            label: `'${t.nome}'`,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: `'${t.nome}'`,
            detail: "Tabela",
            range,
          })),
          ...tabelas.flatMap((t) =>
            t.colunas.map((c) => ({
              label: `[${c.nome}]`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `[${c.nome}]`,
              detail: t.nome,
              range,
            })),
          ),
        ];
        return { suggestions: sugestoes };
      },
    });
  }

  return (
    <div style={{ border: "1px solid var(--color-divider)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
      <Editor
        height={height}
        language="dax"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        beforeMount={(monaco) => registrarLinguagemDax(monaco)}
        onMount={aoMontar}
        theme="vs"
        options={{
          fontSize: 13,
          fontFamily: "var(--font-mono)",
          minimap: { enabled: false },
          lineNumbers: "off",
          glyphMargin: false,
          folding: false,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          renderLineHighlight: "none",
          overviewRulerLanes: 0,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}
