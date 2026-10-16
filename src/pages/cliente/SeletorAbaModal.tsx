import { Dialog } from "../../components/Dialog";

interface SeletorAbaModalProps {
  conexao: { abas?: string[] } | undefined;
  selecionada: string | undefined;
  onClose: () => void;
  onSalvar: (aba: string) => void;
}

/** Popup do nó "Seletor de Abas" (princípio 4 — função simples, sem engrenagem) — mesma lista de
    `Conexao.abas` já exibida no painel de detalhes de uma Conexão do tipo Planilha, testada. */
export function SeletorAbaModal({ conexao, selecionada, onClose, onSalvar }: SeletorAbaModalProps) {
  const abas = conexao?.abas ?? [];

  return (
    <Dialog
      title="Selecionar Aba"
      onClose={onClose}
      actions={
        <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: "auto" }}>
          Fechar
        </button>
      }
    >
      {!conexao && (
        <div className="text-muted" style={{ fontSize: 12.5 }}>
          Conecte uma Conexão do tipo Planilha na entrada deste nó pra listar as abas disponíveis.
        </div>
      )}
      {conexao && abas.length === 0 && (
        <div className="text-muted" style={{ fontSize: 12.5 }}>
          Essa conexão ainda não tem abas testadas — teste a conexão primeiro.
        </div>
      )}
      {abas.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {abas.map((aba) => (
            <button
              key={aba}
              type="button"
              className={`btn ${selecionada === aba ? "btn-primary" : "btn-secondary"} btn-block`}
              style={{ justifyContent: "flex-start" }}
              onClick={() => onSalvar(aba)}
            >
              {aba}
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
