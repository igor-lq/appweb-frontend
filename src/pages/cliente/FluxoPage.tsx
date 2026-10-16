import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  FileCode,
  FileOutput,
  FileSpreadsheet,
  Flame,
  LayoutGrid,
  ListChecks,
  ListTree,
  Plug,
  Repeat,
  Settings,
  Terminal,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import type { Cliente } from "../../mocks/clientes";
import { Dialog } from "../../components/Dialog";
import { ApiError } from "../../api/client";
import { rotuloAbaTask, slugTipoTask, type Task } from "../../mocks/tasks";
import { tasksApi, paraTaskMock } from "../../api/tasks";
import { conexoesApi, type ConexaoApi } from "../../api/conexoes";
import { estrategiasApi, resumoEstrategiaApi, type EstrategiaApi } from "../../api/estrategias";
import { consultasApi, nomeInternoConsultaApi, type ConsultaApi } from "../../api/consultas";
import type { EventoLog } from "../../api/types";
import {
  ORDEM_GRUPOS,
  TIPOS_COMPONENTES,
  TITULO_GRUPO,
  TITULO_CURTO_GRUPO,
  PRIORIDADE_GRUPO,
  resumoPortas,
  resolverTipoComponente,
  resolverCampos,
  todosObrigatoriosPreenchidos,
  noConectadoNaEntrada,
  encontrarExtratorUpstream,
  entradaConectada,
  saidaConectada,
  portaDeveSinalizar,
  portaEmConflito,
  validarFluxo,
  type GrupoComponente,
  type NoFluxo,
  type ConexaoFluxo,
} from "../../mocks/componentesFluxo";
import { TASK_ID_EXEMPLO_FLUXO, nosExemplo, conexoesExemplo } from "../../mocks/fluxoExemplo";
import { construirFluxoDaTask } from "../../mocks/fluxoDeTask";
import { AjudaIcone } from "../../components/AjudaIcone";
import { NoConfigModal } from "./NoConfigModal";
import { SeletorAbaModal } from "./SeletorAbaModal";
import { FiltrosApiModal } from "./FiltrosApiModal";
import { ValidacaoFluxoModal } from "./ValidacaoFluxoModal";
import "./FluxoPage.css";

interface ClienteContext {
  cliente?: Cliente;
}

interface Componente {
  chave: string;
  grupo: GrupoComponente;
  nome: string;
  descricao: string;
  /** Só nos tipos genéricos (Leitores, Carga etc.) — usado pra resolver entradas/saída ao
      soltar no canvas. Componentes "dados reais" (Conexões/Estratégias/Consultas) não têm. */
  tipoChave?: string;
  /** Frase curta do que o componente faz — ícone "?" no card, só nos tipos genéricos. */
  ajuda?: string;
}

interface PortaRef {
  noId: string;
  tipo: "entrada" | "saida";
  indice?: number;
  grupo: GrupoComponente;
}

const ICONE_GRUPO: Record<GrupoComponente, typeof Plug> = {
  conexoes: Plug,
  estrategias: Zap,
  consultas: FileCode,
  seletores: ListChecks,
  extratores: Download,
  transformacao: Wand2,
  carga: Upload,
  exportacao: FileOutput,
  spark: Flame,
  controle_fluxo: Repeat,
  instrucoes: Terminal,
  aba: FileSpreadsheet,
  colunas: Columns3,
};

// Geometria do nó/portas no canvas — mantida em constantes pra ficar em sincronia com o CSS (o
// cálculo das linhas de conexão depende de bater exatamente com onde os círculos de porta são
// desenhados; ver .fluxo-porta-linha no CSS pra a mesma matemática do lado do layout).
const NODE_WIDTH = 250;
const HEADER_H = 56;
const PORT_ROW = 28;
const EDGE_GAP = 20;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2;
const ZOOM_PASSO = 0.0012;

function alturaAreaPortas(no: NoFluxo): number {
  return Math.max(no.entradas.length, 1) * PORT_ROW;
}
// Altura extra do botão ".fluxo-no-acao-simples" (Seletor de Abas/Filtros API) — não faz parte
// do header nem da área de portas, mas ocupa espaço real no card. Sem somar aqui, "Ajustar
// Layout" empilhava o próximo nó da coluna colado nesse botão em vez de manter o espaçamento
// vertical padrão (LAYOUT_LINHA_GAP).
const ACAO_SIMPLES_H = 36;
function alturaNo(no: NoFluxo): number {
  const extra = resolverTipoComponente(no)?.semEngrenagem ? ACAO_SIMPLES_H : 0;
  return HEADER_H + extra + alturaAreaPortas(no) + 12;
}

const LAYOUT_MARGEM = 40;
const LAYOUT_COLUNA_GAP = 100;
const LAYOUT_LINHA_GAP = 40;

/** "Ajustar Layout" — reorganiza os nós em colunas da esquerda pra direita seguindo o sentido das
    conexões (cada nó fica 1 coluna à direita do mais distante que alimenta ele; sem entrada
    nenhuma = coluna 0), empilhados verticalmente dentro de cada coluna. Não muda nada estrutural
    (conexões continuam as mesmas) — só reposiciona. Guarda de ciclo defensiva (nunca deveria
    acontecer num grafo válido) evita recursão infinita num grafo malformado. */
function calcularLayoutAutomatico(nos: NoFluxo[], conexoesGrafo: ConexaoFluxo[]): Map<string, { x: number; y: number }> {
  const origensPorNo = new Map<string, string[]>();
  const consumidoresPorNo = new Map<string, string[]>();
  for (const c of conexoesGrafo) {
    if (!origensPorNo.has(c.para)) origensPorNo.set(c.para, []);
    origensPorNo.get(c.para)!.push(c.de);
    if (!consumidoresPorNo.has(c.de)) consumidoresPorNo.set(c.de, []);
    consumidoresPorNo.get(c.de)!.push(c.para);
  }

  const colunaPorNo = new Map<string, number>();
  function colunaDe(id: string, emAndamento: Set<string>): number {
    if (colunaPorNo.has(id)) return colunaPorNo.get(id)!;
    if (emAndamento.has(id)) return 0;
    emAndamento.add(id);
    const origens = (origensPorNo.get(id) ?? []).filter((o) => nos.some((n) => n.id === o));
    const coluna = origens.length === 0 ? 0 : Math.max(...origens.map((o) => colunaDe(o, emAndamento))) + 1;
    colunaPorNo.set(id, coluna);
    emAndamento.delete(id);
    return coluna;
  }
  for (const no of nos) colunaDe(no.id, new Set());

  // "Dado real" (Conexão/Estratégia/Consulta/Spark soltos — sem NENHUMA porta de entrada) nunca
  // tem origem própria, então o passo acima sempre encaixa esses nós na coluna 0 — errado quando
  // o nó só alimenta algo bem mais à frente no fluxo principal (ex.: a Conexão destino de uma
  // Carga no 4º nível). O nível hierárquico de verdade desses nós vem de QUEM OS CONSOME, não de
  // onde eles nascem: reposiciona pra sempre 1 coluna antes do consumidor mais próximo (nunca
  // depois — garante que a conexão nunca precise apontar pra trás).
  for (const no of nos) {
    if (no.entradas.length > 0) continue;
    const consumidores = (consumidoresPorNo.get(no.id) ?? []).filter((id) => colunaPorNo.has(id));
    if (consumidores.length === 0) continue;
    const colunaConsumidorMaisProximo = Math.min(...consumidores.map((id) => colunaPorNo.get(id)!));
    colunaPorNo.set(no.id, Math.max(0, colunaConsumidorMaisProximo - 1));
  }

  const nosPorColuna = new Map<number, NoFluxo[]>();
  for (const no of nos) {
    const coluna = colunaPorNo.get(no.id) ?? 0;
    if (!nosPorColuna.has(coluna)) nosPorColuna.set(coluna, []);
    nosPorColuna.get(coluna)!.push(no);
  }
  // Mesma hierarquia de grupo usada pra ordenar as portas dentro de um nó (`PRIORIDADE_GRUPO`,
  // Conexão sempre primeiro) — aplicada aqui pra ordenar os NÓS verticalmente dentro da coluna.
  // Sem isso, a ordem vertical seguia a ordem crua de `nos` (insersão/criação), podendo empilhar
  // um Leitor acima de uma Conexão da mesma coluna — como a porta de Conexão de quem consome
  // também fica sempre no topo do nó (regra anterior), isso fazia a linha ziguezaguear/cruzar
  // outras à toa. Sort estável: dentro do mesmo grupo, mantém a ordem que já tinha.
  for (const nosDaColuna of nosPorColuna.values()) {
    nosDaColuna.sort((a, b) => (PRIORIDADE_GRUPO[a.grupo] ?? 1) - (PRIORIDADE_GRUPO[b.grupo] ?? 1));
  }

  const alturaColuna = (nosDaColuna: NoFluxo[]) =>
    nosDaColuna.reduce((soma, no) => soma + alturaNo(no), 0) + LAYOUT_LINHA_GAP * (nosDaColuna.length - 1);
  const alturaMaxima = Math.max(0, ...[...nosPorColuna.values()].map(alturaColuna));

  const posicoes = new Map<string, { x: number; y: number }>();
  for (const [coluna, nosDaColuna] of nosPorColuna) {
    let y = LAYOUT_MARGEM + (alturaMaxima - alturaColuna(nosDaColuna)) / 2;
    for (const no of nosDaColuna) {
      posicoes.set(no.id, { x: LAYOUT_MARGEM + coluna * (NODE_WIDTH + LAYOUT_COLUNA_GAP), y });
      y += alturaNo(no) + LAYOUT_LINHA_GAP;
    }
  }
  return posicoes;
}
function yEntrada(i: number): number {
  return HEADER_H + i * PORT_ROW + PORT_ROW / 2;
}
function ySaida(no: NoFluxo): number {
  return HEADER_H + alturaAreaPortas(no) / 2;
}
function portaEntradaXY(no: NoFluxo, i: number) {
  return { x: no.x + EDGE_GAP, y: no.y + yEntrada(i) };
}
function portaSaidaXY(no: NoFluxo) {
  return { x: no.x + NODE_WIDTH - EDGE_GAP, y: no.y + ySaida(no) };
}
function caminhoBezier(de: { x: number; y: number }, para: { x: number; y: number }): string {
  const dx = Math.max(50, Math.abs(para.x - de.x) / 2);
  return `M ${de.x} ${de.y} C ${de.x + dx} ${de.y}, ${para.x - dx} ${para.y}, ${para.x} ${para.y}`;
}
/** Grupo real da porta de saída de um nó, usado pra COMPATIBILIDADE de conexão (`data-grupo`) —
    `saidaGrupo` quando definido (Seletor de Abas → `aba`, Instrução SQL → `colunas`, Filtros API
    → `extratores`), senão o próprio `grupo` visual do nó (maioria dos casos). */
function saidaGrupoEfetivo(no: NoFluxo): GrupoComponente {
  return no.saidaGrupo ?? no.grupo;
}
/** Grupo usado só pra ÍCONE/RÓTULO exibidos na porta de saída — `saidaRotuloGrupo` quando
    definido (Escrita BD: porta continua tipo `transformacao` pra poder alimentar Exportação/
    outro Modificador, mas exibe "Carga"), senão o mesmo de `saidaGrupoEfetivo`. */
function saidaGrupoVisual(no: NoFluxo): GrupoComponente {
  return no.saidaRotuloGrupo ?? saidaGrupoEfetivo(no);
}

function FluxoGrupo({
  grupo,
  itens,
  aberto,
  onToggle,
  onDragStartItem,
}: {
  grupo: GrupoComponente;
  itens: Componente[];
  aberto: boolean;
  onToggle: () => void;
  onDragStartItem: (item: Componente) => void;
}) {
  const Icone = ICONE_GRUPO[grupo];
  return (
    <div className="fluxo-grupo card">
      <button type="button" className="fluxo-grupo-header" onClick={onToggle}>
        {aberto ? <ChevronDown size={14} strokeWidth={1.5} /> : <ChevronRight size={14} strokeWidth={1.5} />}
        <Icone size={14} strokeWidth={1.5} />
        <span className="fluxo-grupo-titulo">{TITULO_GRUPO[grupo]}</span>
        <span className="text-muted fluxo-grupo-count">{itens.length}</span>
      </button>
      {aberto && (
        <div className="fluxo-grupo-itens">
          {itens.map((item) => (
            <div
              className="fluxo-componente"
              key={item.chave}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "copy";
                onDragStartItem(item);
              }}
              title="Arraste pro canvas"
            >
              {item.ajuda && <AjudaIcone texto={item.ajuda} titulo={item.nome} className="fluxo-componente-ajuda" />}
              <div className="fluxo-componente-nome">{item.nome}</div>
              <div className="text-muted fluxo-componente-desc">{item.descricao}</div>
            </div>
          ))}
          {itens.length === 0 && <div className="text-muted fluxo-vazio">Nenhum resultado.</div>}
        </div>
      )}
    </div>
  );
}

const ROTULO_ACAO_SIMPLES: Record<string, string> = {
  seletor_abas: "Selecionar Aba",
  filtros_api: "Selecionar Campos",
};
const ICONE_ACAO_SIMPLES: Record<string, typeof FileSpreadsheet> = {
  seletor_abas: FileSpreadsheet,
  filtros_api: ListTree,
};

function NoFluxoCard({
  no,
  nos,
  conexoes,
  clienteId,
  onMouseDownNode,
  onExcluir,
  onIniciarConexao,
  onAbrirConfig,
  onAbrirAcaoSimples,
}: {
  no: NoFluxo;
  nos: NoFluxo[];
  conexoes: ConexaoFluxo[];
  clienteId: string;
  onMouseDownNode: (e: React.MouseEvent) => void;
  onExcluir: () => void;
  onIniciarConexao: (e: React.MouseEvent, ref: PortaRef) => void;
  onAbrirConfig: () => void;
  onAbrirAcaoSimples: () => void;
}) {
  const Icone = ICONE_GRUPO[no.grupo];
  const areaPortas = alturaAreaPortas(no);
  const IconeSaida = ICONE_GRUPO[saidaGrupoVisual(no)];

  const tipoComponente = resolverTipoComponente(no);
  const campos = useMemo(
    () => resolverCampos({ no, nos, conexoesGrafo: conexoes, clienteId }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [no, nos, conexoes, clienteId],
  );
  const temEngrenagem = !tipoComponente?.semEngrenagem && campos.length > 0;
  const funcaoSimples = tipoComponente?.semEngrenagem ?? false;
  const engrenagemPendente = temEngrenagem && !todosObrigatoriosPreenchidos(campos, no.config ?? {});
  const erroFatalApi = no.tipoChave === "extracao_api" && no.config?._testeApiOk === false;
  const IconeAcaoSimples = no.tipoChave ? ICONE_ACAO_SIMPLES[no.tipoChave] : undefined;
  const rotuloAcaoSimplesAtual = (() => {
    if (no.tipoChave === "seletor_abas") {
      const aba = no.config?.aba as string | undefined;
      return aba || ROTULO_ACAO_SIMPLES.seletor_abas;
    }
    if (no.tipoChave === "filtros_api") {
      const selecionados = (no.config?.camposSelecionados as string[] | undefined) ?? [];
      return selecionados.length > 0 ? `${selecionados.length} campo(s) selecionado(s)` : ROTULO_ACAO_SIMPLES.filtros_api;
    }
    return no.tipoChave ? (ROTULO_ACAO_SIMPLES[no.tipoChave] ?? "") : "";
  })();

  return (
    <div
      className="fluxo-no"
      style={{ left: no.x, top: no.y, width: NODE_WIDTH }}
      onMouseDown={onMouseDownNode}
    >
      <div className="fluxo-no-header">
        <Icone size={12} strokeWidth={1.75} />
        <span className="fluxo-no-grupo">{TITULO_GRUPO[no.grupo]}</span>
        {tipoComponente?.ajuda && <AjudaIcone texto={tipoComponente.ajuda} titulo={no.nome} className="fluxo-no-acao fluxo-no-acao--ajuda" />}
        {erroFatalApi && (
          <span className="fluxo-no-alerta" title="Falha no teste do endpoint — só pode ser salvo como Rascunho">
            <AlertTriangle size={12} strokeWidth={1.75} />
          </span>
        )}
        {temEngrenagem && (
          <button
            type="button"
            className="fluxo-no-acao fluxo-no-acao--engrenagem"
            title="Configurações do nó"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAbrirConfig();
            }}
          >
            <Settings size={12} strokeWidth={1.75} />
            {engrenagemPendente && <span className="fluxo-no-engrenagem-dot" />}
          </button>
        )}
        <button
          type="button"
          className="fluxo-no-acao fluxo-no-acao--excluir"
          title="Excluir nó"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onExcluir();
          }}
        >
          <X size={12} strokeWidth={1.75} />
        </button>
      </div>
      <div className="fluxo-no-nome-linha">
        <span className="fluxo-no-nome">{no.nome}</span>
      </div>

      {funcaoSimples && IconeAcaoSimples && (
        <button
          type="button"
          className="fluxo-no-acao-simples"
          title={rotuloAcaoSimplesAtual}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAbrirAcaoSimples();
          }}
        >
          <IconeAcaoSimples size={12} strokeWidth={1.75} />
          <span>{rotuloAcaoSimplesAtual}</span>
        </button>
      )}

      <div className="fluxo-no-portas" style={{ height: areaPortas }}>
        {no.entradas.map((porta, i) => {
          const IconePorta = ICONE_GRUPO[porta.grupo];
          const conectada = entradaConectada(no.id, i, conexoes);
          const sinaliza = portaDeveSinalizar(no, i, conexoes);
          const conflito = portaEmConflito(no, i, conexoes);
          return (
            <div
              className="fluxo-porta-linha fluxo-porta-linha--entrada"
              style={{ top: yEntrada(i) - HEADER_H - PORT_ROW / 2, height: PORT_ROW }}
              key={i}
            >
              <span className={`fluxo-porta-dot${sinaliza ? "" : " fluxo-porta-dot--oculta"}`} />
              <div
                className="fluxo-porta-alvo"
                data-no-id={no.id}
                data-tipo="entrada"
                data-indice={i}
                data-grupo={porta.grupo}
                onMouseDown={(e) => onIniciarConexao(e, { noId: no.id, tipo: "entrada", indice: i, grupo: porta.grupo })}
                title={`Entrada · ${TITULO_GRUPO[porta.grupo]}${porta.obrigatoria ? " (obrigatória)" : ""}${porta.apenasInterno ? " · só aceita Conexão interna" : ""}${conflito ? " — conflito: só uma fonte alternativa pode estar conectada" : ""}`}
              >
                <div className={`fluxo-porta${conectada ? " fluxo-porta--conectada" : ""}${conflito ? " fluxo-porta--conflito" : ""}`}>
                  <IconePorta size={10} strokeWidth={2} />
                </div>
                <span className="fluxo-porta-label">{TITULO_CURTO_GRUPO[porta.grupo]}</span>
              </div>
            </div>
          );
        })}

        {no.saida && (
          <div
            className="fluxo-porta-linha fluxo-porta-linha--saida"
            style={{ top: ySaida(no) - HEADER_H - PORT_ROW / 2, height: PORT_ROW }}
          >
            <div
              className="fluxo-porta-alvo"
              data-no-id={no.id}
              data-tipo="saida"
              data-grupo={saidaGrupoEfetivo(no)}
              onMouseDown={(e) => onIniciarConexao(e, { noId: no.id, tipo: "saida", grupo: saidaGrupoEfetivo(no) })}
              title={`Saída · ${TITULO_GRUPO[saidaGrupoVisual(no)]}`}
            >
              <span className="fluxo-porta-label">{TITULO_CURTO_GRUPO[saidaGrupoVisual(no)]}</span>
              <div className={`fluxo-porta${saidaConectada(no.id, conexoes) ? " fluxo-porta--conectada" : ""}`}>
                <IconeSaida size={10} strokeWidth={2} />
              </div>
            </div>
            <span className="fluxo-porta-dot fluxo-porta-dot--oculta" />
          </div>
        )}
      </div>
    </div>
  );
}

/** Carrega a Task real (quando `taskId` existe) E o catálogo real (Conexões/Estratégias/
    Consultas) antes de montar o canvas — `FluxoCanvas` (abaixo) assume que os dois já chegaram
    (ou não existem, pra fluxo novo), porque `dadosIniciaisRef` dentro dele só pode computar o
    estado inicial do grafo uma vez, na primeira renderização; buscar de forma assíncrona DENTRO
    do componente do canvas faria essa primeira renderização sempre acontecer com dado vazio (o
    fetch ainda não voltou), gravando um canvas em branco (ou nós com "?" no lugar do nome — bug
    real corrigido 2026-09-01, mesma causa) pra sempre no `useRef`. Esse componente wrapper existe
    só pra resolver esse problema de sequenciamento. */
export function FluxoPage() {
  const { cliente } = useOutletContext<ClienteContext>();
  const { taskId } = useParams<{ taskId?: string }>();
  const [carregando, setCarregando] = useState(true);
  const [taskInicial, setTaskInicial] = useState<Task | undefined>(undefined);
  const [conexoesIniciais, setConexoesIniciais] = useState<ConexaoApi[]>([]);
  const [estrategiasIniciais, setEstrategiasIniciais] = useState<EstrategiaApi[]>([]);
  const [consultasIniciais, setConsultasIniciais] = useState<ConsultaApi[]>([]);

  useEffect(() => {
    if (!cliente) {
      setTaskInicial(undefined);
      setCarregando(false);
      return;
    }
    let cancelado = false;
    setCarregando(true);
    Promise.all([
      taskId ? tasksApi.listar(cliente.id).then((lista) => lista.map(paraTaskMock).find((t) => t.id === taskId)) : Promise.resolve(undefined),
      conexoesApi.listar(cliente.id),
      estrategiasApi.listar(cliente.id),
      consultasApi.listar(cliente.id),
    ]).then(([task, conexoes, estrategias, consultas]) => {
      if (cancelado) return;
      setTaskInicial(task);
      setConexoesIniciais(conexoes);
      setEstrategiasIniciais(estrategias);
      setConsultasIniciais(consultas);
      setCarregando(false);
    });
    return () => {
      cancelado = true;
    };
  }, [cliente, taskId]);

  if (!cliente || carregando) return null;
  return (
    <FluxoCanvas
      cliente={cliente}
      taskInicial={taskInicial}
      conexoesIniciais={conexoesIniciais}
      estrategiasIniciais={estrategiasIniciais}
      consultasIniciais={consultasIniciais}
    />
  );
}

/** Canvas de Fluxo — biblioteca com grupos colapsáveis (dados reais do cliente + tipos genéricos
    de componente), arrastar-e-soltar de verdade, nós reposicionáveis, e conexão por porta
    interativa (arrastar de uma porta de saída até uma de entrada do mesmo grupo cria a linha; só
    mostra o traço azul temporário enquanto arrasta, comprometido só ao soltar em cima de uma
    porta compatível). Zoom por scroll do mouse. */
function FluxoCanvas({
  cliente,
  taskInicial,
  conexoesIniciais,
  estrategiasIniciais,
  consultasIniciais,
}: {
  cliente: Cliente;
  taskInicial?: Task;
  conexoesIniciais: ConexaoApi[];
  estrategiasIniciais: EstrategiaApi[];
  consultasIniciais: ConsultaApi[];
}) {
  const navigate = useNavigate();
  const [abertos, setAbertos] = useState<Record<GrupoComponente, boolean>>({
    conexoes: true,
    estrategias: true,
    consultas: true,
    seletores: true,
    extratores: true,
    transformacao: true,
    carga: true,
    exportacao: true,
    spark: true,
    controle_fluxo: true,
    instrucoes: true,
    aba: true,
    colunas: true,
  });
  const [busca, setBusca] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  // Catálogo real do cliente (Conexões/Estratégias/Consultas) — alimenta a biblioteca do canvas
  // (nós "dado real" arrastáveis) e a validação de Conexão-só-interna em `tentarConectar`. Semeado
  // já carregado pelo wrapper `FluxoPage` (ver comentário lá) — a primeira renderização já enxerga
  // o catálogo real (nunca vazio), o que `construirFluxoDaTask` (abaixo) depende pra resolver os
  // nomes reais em vez de "?". O efeito aqui só existe pra manter atualizado se algo mudar
  // enquanto o canvas está aberto (nova Conexão/Consulta/Estratégia criada em outra aba, etc.).
  const [conexoesReais, setConexoesReais] = useState<ConexaoApi[]>(conexoesIniciais);
  const [estrategiasReais, setEstrategiasReais] = useState<EstrategiaApi[]>(estrategiasIniciais);
  const [consultasReais, setConsultasReais] = useState<ConsultaApi[]>(consultasIniciais);
  useEffect(() => {
    conexoesApi.listar(cliente.id).then(setConexoesReais);
    estrategiasApi.listar(cliente.id).then(setEstrategiasReais);
    consultasApi.listar(cliente.id).then(setConsultasReais);
  }, [cliente.id]);
  function resolverConexaoReal(nome: string): ConexaoApi | undefined {
    return conexoesReais.find((c) => c.nome === nome);
  }
  function resolverEstrategiaReal(nome: string): EstrategiaApi | undefined {
    return estrategiasReais.find((e) => e.nome === nome);
  }

  interface ContextoCriarTabela {
    tipo: "consulta" | "input" | "api";
    conexaoOrigemId: string;
    conexaoDestinoId: string;
    consultaId?: string;
    estrategiaId?: string;
    aba?: string;
    camposSelecionados?: string[];
    metodo?: string;
    rota?: string;
  }

  /** Acha a primeira entrada do `grupo` pedido e devolve quem está conectado nela — resolve por
      GRUPO, nunca por índice fixo (a ordem de `entradas` muda por prioridade de exibição,
      `ordenarPorPrioridade`/`PRIORIDADE_GRUPO` em componentesFluxo.ts: Conexão sempre vira índice
      0, não importa a ordem declarada no molde do componente). Mesmo princípio de
      `etl_compiler.py::_porta_conectada_por_grupo` (backend) — bug real corrigido antes de
      validar: um índice fixo (2) pra achar o destino da Escrita BD dava errado porque a Conexão
      dela é sempre reordenada pro índice 0. */
  function noConectadoPorGrupo(noId: string, grupo: GrupoComponente): NoFluxo | undefined {
    const no = nos.find((n) => n.id === noId);
    if (!no) return undefined;
    const idx = no.entradas.findIndex((p) => p.grupo === grupo);
    if (idx < 0) return undefined;
    return noConectadoNaEntrada({ nos, conexoesGrafo }, noId, idx);
  }

  /** Sobe do nó "Escrita BD" até o Extrator (`encontrarExtratorUpstream`, já existe — usado
      também pra achar a Estratégia upstream nos campos dinâmicos da engrenagem) e resolve CADA
      peça que "Criar Tabela" precisa contra os catálogos REAIS já carregados neste componente
      (nunca os mocks) — undefined se qualquer peça obrigatória não estiver conectada/resolvida
      ainda (aí "Criar Tabela" fica bloqueado, com motivo). */
  function resolverContextoCriarTabela(noEscritaId: string): ContextoCriarTabela | undefined {
    const ctxGrafo = { nos, conexoesGrafo };
    const noDestino = noConectadoPorGrupo(noEscritaId, "conexoes");
    const conexaoDestino = noDestino ? resolverConexaoReal(noDestino.nome) : undefined;
    if (!conexaoDestino) return undefined;

    const extrator = encontrarExtratorUpstream(ctxGrafo, noEscritaId);
    if (!extrator) return undefined;

    if (extrator.tipoChave === "extracao_sql") {
      const noConexao = noConectadoPorGrupo(extrator.id, "conexoes");
      const noEstrategia = noConectadoPorGrupo(extrator.id, "estrategias");
      const noConsulta = noConectadoPorGrupo(extrator.id, "consultas");
      const conexaoOrigem = noConexao ? resolverConexaoReal(noConexao.nome) : undefined;
      const estrategiaReal = noEstrategia ? resolverEstrategiaReal(noEstrategia.nome) : undefined;
      const consultaReal = noConsulta
        ? consultasReais.find((c) => nomeInternoConsultaApi(c.categoria, c.nome) === noConsulta.nome)
        : undefined;
      if (!conexaoOrigem || !estrategiaReal || !consultaReal) return undefined;
      return {
        tipo: "consulta",
        conexaoOrigemId: conexaoOrigem.id,
        conexaoDestinoId: conexaoDestino.id,
        consultaId: consultaReal.id,
        estrategiaId: estrategiaReal.id,
      };
    }

    if (extrator.tipoChave === "extracao_planilha") {
      const noSeletor = noConectadoPorGrupo(extrator.id, "aba");
      if (!noSeletor) return undefined;
      const noConexao = noConectadoPorGrupo(noSeletor.id, "conexoes");
      const conexaoOrigem = noConexao ? resolverConexaoReal(noConexao.nome) : undefined;
      const aba = (noSeletor.config as { aba?: string } | undefined)?.aba;
      if (!conexaoOrigem || !aba) return undefined;
      return { tipo: "input", conexaoOrigemId: conexaoOrigem.id, conexaoDestinoId: conexaoDestino.id, aba };
    }

    if (extrator.tipoChave === "extracao_api") {
      const noConexao = noConectadoPorGrupo(extrator.id, "conexoes");
      const conexaoOrigem = noConexao ? resolverConexaoReal(noConexao.nome) : undefined;
      if (!conexaoOrigem) return undefined;
      const noFiltro = nos.find(
        (n) => n.tipoChave === "filtros_api" && conexoesGrafo.some((c) => c.de === extrator.id && c.para === n.id),
      );
      const campos = (noFiltro?.config as { camposSelecionados?: string[] } | undefined)?.camposSelecionados;
      const { metodo, rota } = (extrator.config as { metodo?: string; rota?: string } | undefined) ?? {};
      if (!campos || campos.length === 0 || !metodo || !rota) return undefined;
      return {
        tipo: "api",
        conexaoOrigemId: conexaoOrigem.id,
        conexaoDestinoId: conexaoDestino.id,
        camposSelecionados: campos,
        metodo,
        rota,
      };
    }

    return undefined;
  }

  function construirCriarTabelaInfo(noEscritaId: string) {
    const contexto = resolverContextoCriarTabela(noEscritaId);
    if (!contexto) {
      return {
        podeCriar: false,
        motivoBloqueio:
          "Conecte Conexão de Origem, Conexão Destino e o restante do Leitor (Estratégia/Consulta, Aba, ou Campos da API) antes de criar a tabela.",
        criarTabela: async () => {
          throw new Error("Contexto incompleto — conecte tudo antes de criar a tabela.");
        },
      };
    }
    return {
      podeCriar: true,
      criarTabela: (nomeTabela: string, onEvento: (ev: EventoLog) => void) =>
        tasksApi.criarTabela(
          clienteId,
          {
            tipo: contexto.tipo,
            nome_tabela: nomeTabela,
            conexao_destino_id: contexto.conexaoDestinoId,
            conexao_origem_id: contexto.conexaoOrigemId,
            consulta_id: contexto.consultaId,
            estrategia_id: contexto.estrategiaId,
            aba: contexto.aba,
            campos_selecionados: contexto.camposSelecionados,
            metodo: contexto.metodo,
            rota: contexto.rota,
          },
          onEvento,
        ),
    };
  }

  const [task, setTask] = useState<Task | undefined>(taskInicial);
  const ehExemplo = task?.id === TASK_ID_EXEMPLO_FLUXO;
  const [nome, setNome] = useState(task?.nome ?? "");
  // Computado uma única vez, na primeira renderização — "Editar Fluxo" numa Task feita pelo
  // formulário guiado (consulta_sql/planilha/api) precisa abrir o canvas já representando aquela
  // Task (Conexão/Estratégia/Consulta reais + o nó certo + Escrita BD), não vazio. `nos` e
  // `conexoesGrafo` referenciam ids gerados juntos nUMA chamada só — nunca recalcular em
  // useState() separados, ou os dois lados perdem a correspondência de id.
  const dadosIniciaisRef = useRef<{ nos: NoFluxo[]; conexoes: ConexaoFluxo[] } | null>(null);
  if (dadosIniciaisRef.current === null) {
    // Task já editada pelo canvas antes (qualquer tipo, INCLUSIVE o exemplo) — reabre exatamente
    // de onde parou, nunca um canvas em branco nem o exemplo hardcoded de novo (bug real: antes
    // `ehExemplo` vinha primeiro e SEMPRE resetava o exemplo pro grafo original, ignorando
    // qualquer edição salva — mover um nó e Salvar nunca "pegava" ao reabrir).
    if (task?.fluxoNos && task?.fluxoConexoes) dadosIniciaisRef.current = { nos: task.fluxoNos, conexoes: task.fluxoConexoes };
    else if (ehExemplo) dadosIniciaisRef.current = { nos: nosExemplo, conexoes: conexoesExemplo };
    else if (task && task.tipo !== "fluxo_manual")
      dadosIniciaisRef.current = construirFluxoDaTask(task, {
        conexoes: conexoesReais,
        consultas: consultasReais,
        estrategias: estrategiasReais,
      });
    else dadosIniciaisRef.current = { nos: [], conexoes: [] };
  }
  const [nos, setNos] = useState<NoFluxo[]>(() => dadosIniciaisRef.current!.nos);
  const [conexoesGrafo, setConexoesGrafo] = useState<ConexaoFluxo[]>(() => dadosIniciaisRef.current!.conexoes);
  const [zoom, setZoom] = useState(1);
  const [tamanhoViewport, setTamanhoViewport] = useState({ w: 1100, h: 640 });
  const [arrasto, setArrasto] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [arrastoConexao, setArrastoConexao] = useState<{ origem: PortaRef; x: number; y: number } | null>(null);
  const [itemArrastado, setItemArrastado] = useState<Componente | null>(null);
  const [panorama, setPanorama] = useState<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const [configAberto, setConfigAberto] = useState<string | null>(null);
  const [acaoSimplesAberta, setAcaoSimplesAberta] = useState<string | null>(null);
  const [mostrarErrosValidacao, setMostrarErrosValidacao] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [salvoAs, setSalvoAs] = useState<string | null>(null);

  function paraCoordenadasCanvas(clientX: number, clientY: number) {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left + canvasRef.current.scrollLeft) / zoom,
      y: (clientY - rect.top + canvasRef.current.scrollTop) / zoom,
    };
  }

  useEffect(() => {
    function medir() {
      if (canvasRef.current) setTamanhoViewport({ w: canvasRef.current.clientWidth, h: canvasRef.current.clientHeight });
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  // O listener de wheel do React é passivo por padrão (não dá pra chamar preventDefault nele),
  // então o zoom precisa de um listener nativo com passive:false pra poder bloquear o scroll da
  // página nesse gesto.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function aoRodar(e: WheelEvent) {
      e.preventDefault();
      setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z - e.deltaY * ZOOM_PASSO)));
    }
    el.addEventListener("wheel", aoRodar, { passive: false });
    return () => el.removeEventListener("wheel", aoRodar);
  }, []);

  useEffect(() => {
    if (!arrasto) return;
    function aoMover(e: MouseEvent) {
      const pos = paraCoordenadasCanvas(e.clientX, e.clientY);
      setNos((atual) =>
        atual.map((n) => (n.id === arrasto!.id ? { ...n, x: Math.max(0, pos.x - arrasto!.offsetX), y: Math.max(0, pos.y - arrasto!.offsetY) } : n)),
      );
    }
    function aoSoltar() {
      setArrasto(null);
    }
    window.addEventListener("mousemove", aoMover);
    window.addEventListener("mouseup", aoSoltar);
    return () => {
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("mouseup", aoSoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrasto, zoom]);

  useEffect(() => {
    if (!arrastoConexao) return;
    function aoMover(e: MouseEvent) {
      const pos = paraCoordenadasCanvas(e.clientX, e.clientY);
      setArrastoConexao((atual) => (atual ? { ...atual, x: pos.x, y: pos.y } : atual));
    }
    function aoSoltar(e: MouseEvent) {
      const alvoEl = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>(".fluxo-porta-alvo");
      if (alvoEl && alvoEl.dataset.noId) {
        const destino: PortaRef = {
          noId: alvoEl.dataset.noId,
          tipo: alvoEl.dataset.tipo as "entrada" | "saida",
          indice: alvoEl.dataset.indice !== undefined ? Number(alvoEl.dataset.indice) : undefined,
          grupo: alvoEl.dataset.grupo as GrupoComponente,
        };
        setArrastoConexao((atual) => {
          if (atual) tentarConectar(atual.origem, destino);
          return null;
        });
      } else {
        setArrastoConexao(null);
      }
    }
    window.addEventListener("mousemove", aoMover);
    window.addEventListener("mouseup", aoSoltar);
    return () => {
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("mouseup", aoSoltar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrastoConexao, zoom]);

  // Arrastar a grade com o botão do meio (clique da bolinha) — padrão de navegação de canvas.
  useEffect(() => {
    if (!panorama) return;
    function aoMover(e: MouseEvent) {
      if (!canvasRef.current) return;
      canvasRef.current.scrollLeft = panorama!.scrollLeft - (e.clientX - panorama!.x);
      canvasRef.current.scrollTop = panorama!.scrollTop - (e.clientY - panorama!.y);
    }
    function aoSoltar() {
      setPanorama(null);
    }
    window.addEventListener("mousemove", aoMover);
    window.addEventListener("mouseup", aoSoltar);
    return () => {
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("mouseup", aoSoltar);
    };
  }, [panorama]);

  const clienteId = cliente.id;

  const conexoes = conexoesReais;
  const estrategias = estrategiasReais;
  const consultas = consultasReais;

  const q = busca.trim().toLowerCase();
  const combina = (nomeItem: string) => !q || nomeItem.toLowerCase().includes(q);

  const itensPorGrupo: Record<GrupoComponente, Componente[]> = {
    conexoes: conexoes
      .filter((c) => combina(c.nome))
      .map((c) => ({ chave: c.id, grupo: "conexoes", nome: c.nome, descricao: c.tipo })),
    estrategias: estrategias
      .filter((e) => combina(e.nome))
      .map((e) => ({ chave: e.id, grupo: "estrategias", nome: e.nome, descricao: resumoEstrategiaApi(e) ?? e.tipo })),
    consultas: consultas
      .filter((c) => combina(c.nome))
      .map((c) => ({
        chave: c.id,
        grupo: "consultas",
        nome: nomeInternoConsultaApi(c.categoria, c.nome),
        descricao: `${(c.sql_texto ?? "").split("\n").length} linhas`,
      })),
    seletores: [],
    extratores: [],
    transformacao: [],
    carga: [],
    exportacao: [],
    spark: [],
    controle_fluxo: [],
    instrucoes: [],
    aba: [],
    colunas: [],
  };
  for (const t of TIPOS_COMPONENTES) {
    if (!combina(t.nome)) continue;
    itensPorGrupo[t.grupo].push({ chave: t.chave, grupo: t.grupo, nome: t.nome, descricao: resumoPortas(t), tipoChave: t.chave, ajuda: t.ajuda });
  }

  function toggleGrupo(grupo: GrupoComponente) {
    setAbertos((atual) => ({ ...atual, [grupo]: !atual[grupo] }));
  }

  function voltar() {
    if (task) navigate(`/clientes/${clienteId}/tasks/${task.rascunho ? "rascunhos" : slugTipoTask[task.tipo]}`);
    else navigate(`/clientes/${clienteId}/tasks`);
  }

  // "Salvar" (real ou rascunho) NUNCA fecha o Fluxo — só grava. A única saída do editor é o botão
  // "Tasks" (seta de voltar) já existente, clicado explicitamente pelo analista. Exceção: a
  // PRIMEIRA vez que uma Task nova é criada aqui, troca a URL "novo" pela URL real da Task
  // (`/tasks/fluxo/:taskId`, via `replace` — não empilha histórico) só pra próximos saves nessa
  // mesma sessão acharem `task` pelo `taskId` da rota; o canvas continua visualmente o mesmo
  // porque o grafo salvo é lido de volta de `task.fluxoNos`/`fluxoConexoes` de qualquer forma.
  async function salvar(rascunho: boolean) {
    setErroSalvar(null);
    try {
      if (task) {
        await tasksApi.atualizar(clienteId, task.id, {
          nome,
          rascunho,
          fluxo_nos: nos,
          fluxo_conexoes: conexoesGrafo,
        });
        setTask({ ...task, nome, rascunho, fluxoNos: nos, fluxoConexoes: conexoesGrafo });
        setSalvoAs(new Date().toLocaleTimeString("pt-BR"));
      } else {
        // Task nova nascida do canvas nunca teve Consulta/Input escolhido ainda — `tipo: "consulta"`
        // aqui é só um valor de banco temporário (a coluna é obrigatória); o compilador
        // (`etl_compiler.py`) sempre re-deriva o tipo de verdade a partir do nó Leitor conectado
        // no grafo na hora de compilar/executar, nunca confia neste campo pra Fluxo Manual.
        const nova = await tasksApi.criar(clienteId, {
          nome,
          tipo: "consulta",
          rascunho,
          fluxo_nos: nos,
          fluxo_conexoes: conexoesGrafo,
        });
        setTask(paraTaskMock(nova));
        navigate(`/clientes/${clienteId}/tasks/fluxo/${nova.id}`, { replace: true });
        setSalvoAs(new Date().toLocaleTimeString("pt-BR"));
      }
    } catch (e) {
      // Sem destino explícito (ou outro erro de estrutura), o backend recusa gravar como Task
      // "de verdade" (só rascunho=true passa incompleto) — ver
      // routers/tasks.py::_validar_destino_explicito.
      setErroSalvar(e instanceof ApiError ? e.message : "Falha ao salvar a Task.");
    }
  }

  /** Clique em "Salvar" (de verdade) — valida antes; achado nenhum salva, qualquer achado abre o
      popup listando os problemas (só "Salvar como Rascunho" continua disponível a partir dali). */
  function aoClicarSalvar() {
    if (achadosValidacao.length > 0) {
      setMostrarErrosValidacao(true);
      return;
    }
    salvar(false);
  }

  function aoSoltarNoCanvas(e: React.DragEvent) {
    e.preventDefault();
    if (!itemArrastado) return;
    const tipoComp = itemArrastado.tipoChave ? TIPOS_COMPONENTES.find((t) => t.chave === itemArrastado.tipoChave) : undefined;
    const pos = paraCoordenadasCanvas(e.clientX, e.clientY);
    const novo: NoFluxo = {
      id: `no-${Date.now()}`,
      grupo: itemArrastado.grupo,
      nome: itemArrastado.nome,
      entradas: tipoComp?.entradas ?? [],
      saida: tipoComp?.saida ?? true,
      saidaGrupo: tipoComp?.saidaGrupo,
      saidaRotuloGrupo: tipoComp?.saidaRotuloGrupo,
      tipoChave: itemArrastado.tipoChave,
      config: {},
      x: Math.max(0, pos.x - NODE_WIDTH / 2),
      y: Math.max(0, pos.y - 20),
    };
    setNos((atual) => [...atual, novo]);
    setItemArrastado(null);
  }

  function aoMouseDownNo(id: string, e: React.MouseEvent) {
    if (e.button !== 0) return;
    const no = nos.find((n) => n.id === id);
    if (!no) return;
    e.preventDefault();
    const pos = paraCoordenadasCanvas(e.clientX, e.clientY);
    setArrasto({ id, offsetX: pos.x - no.x, offsetY: pos.y - no.y });
  }

  function excluirNo(id: string) {
    setNos((atual) => atual.filter((n) => n.id !== id));
    setConexoesGrafo((atual) => atual.filter((c) => c.de !== id && c.para !== id));
  }

  function excluirConexao(id: string) {
    setConexoesGrafo((atual) => atual.filter((c) => c.id !== id));
  }

  function ajustarLayout() {
    const posicoes = calcularLayoutAutomatico(nos, conexoesGrafo);
    setNos((atual) => atual.map((n) => ({ ...n, ...(posicoes.get(n.id) ?? { x: n.x, y: n.y }) })));
  }

  function aoMouseDownCanvas(e: React.MouseEvent) {
    if (e.button !== 1 || !canvasRef.current) return;
    e.preventDefault();
    setPanorama({ x: e.clientX, y: e.clientY, scrollLeft: canvasRef.current.scrollLeft, scrollTop: canvasRef.current.scrollTop });
  }

  function iniciarConexao(e: React.MouseEvent, origem: PortaRef) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = paraCoordenadasCanvas(e.clientX, e.clientY);
    setArrastoConexao({ origem, x: pos.x, y: pos.y });
  }

  function tentarConectar(origem: PortaRef, destino: PortaRef) {
    if (origem.noId === destino.noId) return;
    if (origem.tipo === destino.tipo) return;
    if (origem.grupo !== destino.grupo) return;
    const ladoSaida = origem.tipo === "saida" ? origem : destino;
    const ladoEntrada = origem.tipo === "entrada" ? origem : destino;
    if (ladoEntrada.indice === undefined) return;

    // Componentes que MODIFICAM banco (Escrita BD, Criar/Delete/Truncate Table, AlterTable) só
    // aceitam Conexão interna na porta de destino — nunca externo do cliente (sempre só-leitura).
    const noEntrada = nos.find((n) => n.id === ladoEntrada.noId);
    const porta = noEntrada?.entradas[ladoEntrada.indice as number];
    if (porta?.apenasInterno) {
      const noSaida = nos.find((n) => n.id === ladoSaida.noId);
      const conexaoReal = noSaida ? resolverConexaoReal(noSaida.nome) : undefined;
      if (!conexaoReal || conexaoReal.organizacao !== "Interno") return;
    }

    // "Leitor Planilha" só aceita Estratégia do tipo Substituição (spec) — mesmo princípio de
    // `apenasInterno` acima: a conexão simplesmente não gruda se o tipo não bater.
    if (porta?.exigeEstrategiaTipo) {
      const noSaida = nos.find((n) => n.id === ladoSaida.noId);
      const estrategiaReal = noSaida ? resolverEstrategiaReal(noSaida.nome) : undefined;
      if (!estrategiaReal || estrategiaReal.tipo !== porta.exigeEstrategiaTipo) return;
    }

    setConexoesGrafo((atual) => [
      ...atual.filter((c) => !(c.para === ladoEntrada.noId && c.portaEntrada === ladoEntrada.indice)),
      { id: `con-${Date.now()}`, de: ladoSaida.noId, para: ladoEntrada.noId, portaEntrada: ladoEntrada.indice as number },
    ]);
  }

  function salvarConfigNo(noId: string, valores: Record<string, unknown>) {
    setNos((atual) => atual.map((n) => (n.id === noId ? { ...n, config: valores } : n)));
  }

  const nosPorId = useMemo(() => new Map(nos.map((n) => [n.id, n])), [nos]);
  const achadosValidacao = validarFluxo(nos, conexoesGrafo, clienteId);

  const largura = Math.max(tamanhoViewport.w / zoom, 1100, ...nos.map((n) => n.x + NODE_WIDTH + 100));
  const altura = Math.max(tamanhoViewport.h / zoom, 640, ...nos.map((n) => n.y + alturaNo(n) + 100));

  const noConfigAberto = configAberto ? nosPorId.get(configAberto) : undefined;
  const noAcaoSimplesAberta = acaoSimplesAberta ? nosPorId.get(acaoSimplesAberta) : undefined;

  let conexaoParaSeletorAba: { abas?: string[] } | undefined;
  if (noAcaoSimplesAberta?.tipoChave === "seletor_abas") {
    const idxConexao = noAcaoSimplesAberta.entradas.findIndex((p) => p.grupo === "conexoes");
    const noConexao = idxConexao >= 0 ? noConectadoNaEntrada({ nos, conexoesGrafo }, noAcaoSimplesAberta.id, idxConexao) : undefined;
    const conexaoReal = noConexao ? resolverConexaoReal(noConexao.nome) : undefined;
    conexaoParaSeletorAba = conexaoReal ? { abas: conexaoReal.abas_disponiveis ?? [] } : undefined;
  }

  return (
    <div className="fluxo-page">
      <div className="fluxo-header">
        <button className="fluxo-voltar" onClick={voltar}>
          <ArrowLeft size={14} strokeWidth={1.5} />
          Tasks
        </button>
        <div className="fluxo-header-titulo">
          <div className="kicker">FLUXOGRAMA{task ? ` · ${rotuloAbaTask[task.tipo]}` : ""}</div>
          <input
            className="input fluxo-nome-input"
            placeholder="Nome da task"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>
        <div className="fluxo-header-acoes-coluna">
          <div className="fluxo-header-acoes">
            <button
              className="btn btn-primary"
              onClick={aoClicarSalvar}
              disabled={!nome.trim()}
              title={achadosValidacao.length > 0 ? "O fluxo tem problemas — clique pra ver quais." : undefined}
            >
              Salvar
              {achadosValidacao.length > 0 && <span className="fluxo-salvar-badge">{achadosValidacao.length}</span>}
            </button>
            <button className="btn btn-secondary" onClick={voltar}>
              Cancelar
            </button>
            <button className="btn btn-ghost" onClick={() => salvar(true)} disabled={!nome.trim()}>
              Salvar como Rascunho
            </button>
          </div>
          {salvoAs && !erroSalvar && <div className="fluxo-salvo-as">Task salva às {salvoAs}</div>}
        </div>
      </div>
      {erroSalvar && (
        <Dialog
          title="Erro ao salvar o Fluxo"
          onClose={() => setErroSalvar(null)}
          actions={
            <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setErroSalvar(null)}>
              Fechar
            </button>
          }
        >
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6 }}>
            {erroSalvar.split("; ").map((linha, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                {linha}
              </li>
            ))}
          </ul>
        </Dialog>
      )}

      <div className="fluxo-body">
        <div className="fluxo-biblioteca-coluna">
          <div className="fluxo-busca-bloco">
            <input
              className="input fluxo-busca"
              placeholder="Buscar componente"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <aside className="fluxo-biblioteca scroll">
            {ORDEM_GRUPOS.map((grupo) => (
              <FluxoGrupo
                key={grupo}
                grupo={grupo}
                itens={itensPorGrupo[grupo]}
                aberto={abertos[grupo]}
                onToggle={() => toggleGrupo(grupo)}
                onDragStartItem={setItemArrastado}
              />
            ))}
          </aside>
        </div>

        <div className="fluxo-canvas-wrap">
          <div className="fluxo-canvas-toolbar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={ajustarLayout}
              disabled={nos.length === 0}
              title="Reorganiza os nós em colunas seguindo o sentido das conexões, sem mudar nenhuma conexão"
            >
              <LayoutGrid size={14} strokeWidth={1.5} />
              Ajustar Layout
            </button>
          </div>
          <div
            className={`fluxo-canvas${panorama ? " fluxo-canvas--arrastando" : ""}`}
            ref={canvasRef}
            onMouseDown={aoMouseDownCanvas}
            onDragOver={(e) => e.preventDefault()}
            onDrop={aoSoltarNoCanvas}
          >
          <div className="fluxo-canvas-content" style={{ width: largura * zoom, height: altura * zoom }}>
            <div className="fluxo-canvas-zoom" style={{ width: largura, height: altura, transform: `scale(${zoom})` }}>
              {nos.length === 0 && (
                <div className="fluxo-canvas-vazio">
                  <div className="fluxo-canvas-vazio-titulo">{task ? `Fluxo de "${task.nome}"` : "Task ainda não salva"}</div>
                  <p className="text-muted fluxo-canvas-vazio-texto">
                    Arraste componentes da biblioteca à esquerda pra começar a montar o fluxo, e
                    conecte arrastando de uma porta de saída até uma porta de entrada do mesmo
                    grupo.
                  </p>
                </div>
              )}

              <svg className="fluxo-svg" width={largura} height={altura}>
                {conexoesGrafo.map((c) => {
                  const de = nosPorId.get(c.de);
                  const para = nosPorId.get(c.para);
                  if (!de || !para) return null;
                  const origem = portaSaidaXY(de);
                  const destino = portaEntradaXY(para, c.portaEntrada);
                  const d = caminhoBezier(origem, destino);
                  return (
                    <g key={c.id} className="fluxo-linha-grupo" onDoubleClick={() => excluirConexao(c.id)}>
                      <path d={d} className="fluxo-linha-hit" />
                      <path d={d} className="fluxo-linha" />
                    </g>
                  );
                })}
                {arrastoConexao && (
                  <path
                    d={caminhoBezier(
                      arrastoConexao.origem.tipo === "saida"
                        ? portaSaidaXY(nosPorId.get(arrastoConexao.origem.noId)!)
                        : portaEntradaXY(nosPorId.get(arrastoConexao.origem.noId)!, arrastoConexao.origem.indice!),
                      { x: arrastoConexao.x, y: arrastoConexao.y },
                    )}
                    className="fluxo-linha fluxo-linha--temp"
                  />
                )}
              </svg>

              {nos.map((no) => (
                <NoFluxoCard
                  key={no.id}
                  no={no}
                  nos={nos}
                  clienteId={clienteId}
                  conexoes={conexoesGrafo}
                  onMouseDownNode={(e) => aoMouseDownNo(no.id, e)}
                  onExcluir={() => excluirNo(no.id)}
                  onIniciarConexao={iniciarConexao}
                  onAbrirConfig={() => setConfigAberto(no.id)}
                  onAbrirAcaoSimples={() => setAcaoSimplesAberta(no.id)}
                />
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>

      {noConfigAberto && (
        <NoConfigModal
          titulo={`Configurar — ${noConfigAberto.nome}`}
          campos={resolverCampos({ no: noConfigAberto, nos, conexoesGrafo, clienteId })}
          valores={noConfigAberto.config ?? {}}
          criarTabelaInfo={noConfigAberto.tipoChave === "escrita_bd" ? construirCriarTabelaInfo(noConfigAberto.id) : undefined}
          onClose={() => setConfigAberto(null)}
          onSalvar={(valores) => {
            salvarConfigNo(noConfigAberto.id, valores);
            setConfigAberto(null);
          }}
        />
      )}

      {noAcaoSimplesAberta?.tipoChave === "seletor_abas" && (
        <SeletorAbaModal
          conexao={conexaoParaSeletorAba}
          selecionada={noAcaoSimplesAberta.config?.aba as string | undefined}
          onClose={() => setAcaoSimplesAberta(null)}
          onSalvar={(aba) => {
            salvarConfigNo(noAcaoSimplesAberta.id, { ...noAcaoSimplesAberta.config, aba });
            setAcaoSimplesAberta(null);
          }}
        />
      )}

      {noAcaoSimplesAberta?.tipoChave === "filtros_api" && (
        <FiltrosApiModal
          selecionados={(noAcaoSimplesAberta.config?.camposSelecionados as string[]) ?? []}
          onClose={() => setAcaoSimplesAberta(null)}
          onSalvar={(sel) => {
            salvarConfigNo(noAcaoSimplesAberta.id, { ...noAcaoSimplesAberta.config, camposSelecionados: sel });
            setAcaoSimplesAberta(null);
          }}
        />
      )}

      {mostrarErrosValidacao && (
        <ValidacaoFluxoModal
          achados={achadosValidacao}
          onClose={() => setMostrarErrosValidacao(false)}
          onSalvarComoRascunho={() => {
            setMostrarErrosValidacao(false);
            salvar(true);
          }}
        />
      )}
    </div>
  );
}
