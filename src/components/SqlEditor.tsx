import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-sql";
import "./SqlHighlight.css";

interface SqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/** Campo de SQL editável com highlighting via Prism.js — `react-simple-code-editor` sobrepõe uma
    `<textarea>` transparente a um `<pre>` destacado pelo próprio Prism (sincronizando scroll/
    caret), casando o highlighting com um campo que o usuário digita de verdade. Substitui o
    `<textarea className="code-textarea">` puro usado antes só em Consulta SQL (o único campo de
    SQL que é editado, não só visualizado — ver `SqlView` pros demais). */
export function SqlEditor({ value, onChange, placeholder, id }: SqlEditorProps) {
  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={(code) => Prism.highlight(code, Prism.languages.sql, "sql")}
      padding={12}
      textareaId={id}
      placeholder={placeholder}
      className="input code-textarea sql-editor-container"
    />
  );
}
