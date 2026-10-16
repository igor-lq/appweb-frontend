import { useEffect, useState } from "react";
import { Dialog } from "../../components/Dialog";
import { analysisServerApi, idTabelaProcessamentoAs, partirIdProcessamentoAs } from "../../api/analysisServer";
import { conexoesApi } from "../../api/conexoes";
import type { TabelaAsPacoteApi } from "../../api/pacotes";
import "./SelecionarTaskModal.css";

interface SelecionarTabelaAsModalProps {
  clienteId: string;
  jaSelecionadas: TabelaAsPacoteApi[];
  onClose: () => void;
  onConfirmar: (itens: TabelaAsPacoteApi[]) => void;
}

interface OpcaoTabela {
  id: string;
  conexaoId: string;
  tabela: string;
  conexaoNome: string;
}

/** Full Refresh de Tabela do Analysis Services como item de Pacote — mesmo padrão de
    multi-seleção por checkbox de `SelecionarTaskModal.tsx` (desmarcar remove do Pacote, marcar
    mais adiciona, "Adicionar (N)" devolve o conjunto final inteiro), só que sem abas de tipo —
    aqui só existe um "tipo" (Tabela do Modelo Semântico), não faz sentido ter abas. Um cliente
    pode ter várias Conexões Analysis Services — a lista mescla as tabelas de todas elas,
    mostrando de qual Conexão cada uma vem (nomes podem se repetir entre Conexões diferentes). */
export function SelecionarTabelaAsModal({ clienteId, jaSelecionadas, onClose, onConfirmar }: SelecionarTabelaAsModalProps) {
  const [opcoes, setOpcoes] = useState<OpcaoTabela[]>([]);
  const [query, setQuery] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [semConexoes, setSemConexoes] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(
    () => new Set(jaSelecionadas.map((s) => idTabelaProcessamentoAs(s.conexao_id, s.tabela))),
  );

  useEffect(() => {
    conexoesApi.listar(clienteId).then((conexoes) => {
      const conexoesAs = conexoes.filter((c) => c.tipo === "Analysis Services");
      if (conexoesAs.length === 0) {
        setSemConexoes(true);
        setCarregando(false);
        return;
      }
      Promise.all(
        conexoesAs.map((c) =>
          analysisServerApi
            .obterModelo(clienteId, c.id)
            .then((modelo) =>
              modelo.tabelas.map((t) => ({
                id: idTabelaProcessamentoAs(c.id, t.nome),
                conexaoId: c.id,
                tabela: t.nome,
                conexaoNome: c.nome,
              })),
            )
            .catch(() => []),
        ),
      ).then((listas) => {
        setOpcoes(listas.flat());
        setCarregando(false);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  function alternar(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const filtradas = opcoes.filter((o) => `${o.tabela} ${o.conexaoNome}`.toLowerCase().includes(query.trim().toLowerCase()));

  function confirmar() {
    const ativoPorId = new Map(
      jaSelecionadas.map((s) => [idTabelaProcessamentoAs(s.conexao_id, s.tabela), s.ativo]),
    );
    onConfirmar(
      [...selecionadas].map((id) => {
        const { conexaoId, nomeTabela } = partirIdProcessamentoAs(id);
        return { conexao_id: conexaoId, tabela: nomeTabela, ativo: ativoPorId.get(id) ?? true };
      }),
    );
  }

  return (
    <Dialog
      title="Adicionar Tabela (Refresh)"
      onClose={onClose}
      wide
      className="selecionar-task-dialog"
      actions={
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={confirmar}>
            Adicionar {selecionadas.size > 0 && `(${selecionadas.size})`}
          </button>
        </div>
      }
    >
      <input
        className="input"
        placeholder="Buscar tabela"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="selecionar-task-lista scroll">
        {filtradas.map((o) => (
          <label key={o.id} className="card selecionar-task-item">
            <input type="checkbox" checked={selecionadas.has(o.id)} onChange={() => alternar(o.id)} />
            <div className="selecionar-task-item-info">
              <div className="selecionar-task-item-nome">{o.tabela}</div>
              <div className="text-muted selecionar-task-item-resumo">{o.conexaoNome}</div>
            </div>
          </label>
        ))}
        {carregando && <div className="text-muted">Carregando...</div>}
        {!carregando && semConexoes && (
          <div className="text-muted">
            Este cliente ainda não tem nenhuma Conexão Analysis Services cadastrada — crie uma na aba Conexões.
          </div>
        )}
        {!carregando && !semConexoes && filtradas.length === 0 && (
          <div className="text-muted">Nenhuma tabela encontrada (nenhum Modelo tem Tabela ainda).</div>
        )}
      </div>
    </Dialog>
  );
}
