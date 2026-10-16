import { TIPOS_COMPONENTES, type NoFluxo, type ConexaoFluxo, type GrupoComponente } from "./componentesFluxo";
import type { Task } from "./tasks";
import type { ConexaoApi } from "../api/conexoes";
import type { ConsultaApi } from "../api/consultas";
import type { EstrategiaApi } from "../api/estrategias";
import { nomeInternoConsultaApi } from "../api/consultas";

let contador = 0;
function idUnico(prefixo: string): string {
  contador += 1;
  return `${prefixo}-${contador}`;
}

function noDadoReal(grupo: GrupoComponente, nome: string, x: number, y: number): NoFluxo {
  return { id: idUnico("dr"), grupo, nome, entradas: [], saida: true, x, y };
}

/** Monta um nó genérico a partir do molde real em TIPOS_COMPONENTES (mesmas entradas/saída que o
    canvas usaria se o analista tivesse arrastado esse tipo à mão) — nunca duplica a definição do
    molde aqui. */
function noGenerico(tipoChave: string, x: number, y: number, config: Record<string, unknown> = {}): NoFluxo {
  const tipo = TIPOS_COMPONENTES.find((t) => t.chave === tipoChave);
  return {
    id: idUnico("no"),
    grupo: tipo?.grupo ?? "extratores",
    nome: tipo?.nome ?? tipoChave,
    entradas: tipo?.entradas ?? [],
    saida: tipo?.saida ?? true,
    saidaGrupo: tipo?.saidaGrupo,
    saidaRotuloGrupo: tipo?.saidaRotuloGrupo,
    tipoChave,
    config,
    x,
    y,
  };
}

function ligar(de: string, para: string, portaEntrada: number): ConexaoFluxo {
  return { id: idUnico("li"), de, para, portaEntrada };
}

export interface CatalogosReais {
  conexoes: ConexaoApi[];
  consultas: ConsultaApi[];
  estrategias: EstrategiaApi[];
}

/** Traduz uma Task feita pelo formulário guiado (consulta_sql/planilha/api) pro Fluxo que a
    representa — usado quando o analista clica "Editar Fluxo" numa Task assim, pra abrir o canvas
    já montado em vez de vazio. `processamento_as` não tem equivalente nenhum no conjunto de nós
    do Fluxo (é Analysis Services, domínio totalmente diferente) — devolve vazio, mesmo
    comportamento de antes. Só lê os campos que a Task realmente tem preenchidos; porta sem dado
    correspondente (ex.: Estratégia de uma Task tipo API, que o formulário não coleta) fica
    simplesmente desconectada — não inventa dado que não existe.

    `catalogos` precisa ser o catálogo REAL já carregado (Conexões/Consultas/Estratégias da API,
    não os mocks estáticos de antes) — quem chama (`FluxoPage.tsx`) só invoca isso depois desses
    três catálogos terem chegado, mesmo motivo/mesmo padrão do wrapper que já esperava a Task
    carregar antes de montar o canvas (ver comentário em `FluxoPage`). Bug real corrigido
    2026-09-01: antes lia de `conexoesPorCliente`/`consultasPorCliente` (mocks estáticos, nunca
    tinham as entidades reais) e de `task.estrategiaNome` (campo que `paraTaskMock` nunca preenche)
    — todo nó "dado real" saía com "?" no lugar do nome assim que a Task vinha da API de verdade. */
export function construirFluxoDaTask(task: Task, catalogos: CatalogosReais): { nos: NoFluxo[]; conexoes: ConexaoFluxo[] } {
  const nomeConexao = (id?: string) => catalogos.conexoes.find((c) => c.id === id)?.nome;
  const nomeEstrategia = (id?: string) => catalogos.estrategias.find((e) => e.id === id)?.nome;

  if (task.tipo === "consulta_sql") {
    const consulta = catalogos.consultas.find((c) => c.id === task.consultaId);
    const nOrigem = noDadoReal("conexoes", nomeConexao(task.conexaoOrigemId) ?? "?", 40, 40);
    const nEstrategia = noDadoReal("estrategias", nomeEstrategia(task.estrategiaId) ?? "?", 40, 150);
    const nConsulta = noDadoReal("consultas", consulta ? nomeInternoConsultaApi(consulta.categoria, consulta.nome) : "?", 40, 260);
    const nLeitor = noGenerico("extracao_sql", 340, 150);
    const nDestino = noDadoReal("conexoes", nomeConexao(task.conexaoDestinoId) ?? "?", 640, 40);
    const nCarga = noGenerico("escrita_bd", 640, 220, { tabelaDestino: task.tabelaDestino ?? "" });

    return {
      nos: [nOrigem, nEstrategia, nConsulta, nLeitor, nDestino, nCarga],
      conexoes: [
        ligar(nOrigem.id, nLeitor.id, 0),
        ligar(nEstrategia.id, nLeitor.id, 1),
        ligar(nConsulta.id, nLeitor.id, 2),
        ligar(nLeitor.id, nCarga.id, 1),
        ligar(nDestino.id, nCarga.id, 0),
      ],
    };
  }

  if (task.tipo === "planilha") {
    const nOrigem = noDadoReal("conexoes", nomeConexao(task.conexaoOrigemId) ?? "?", 40, 40);
    const nSeletor = noGenerico("seletor_abas", 40, 150, { aba: task.aba ?? "" });
    const nEstrategia = noDadoReal("estrategias", nomeEstrategia(task.estrategiaId) ?? "?", 340, 260);
    const nLeitor = noGenerico("extracao_planilha", 640, 150);
    const nDestino = noDadoReal("conexoes", nomeConexao(task.conexaoDestinoId) ?? "?", 940, 40);
    const nCarga = noGenerico("escrita_bd", 940, 220, { tabelaDestino: task.tabelaDestino ?? "" });

    return {
      nos: [nOrigem, nSeletor, nEstrategia, nLeitor, nDestino, nCarga],
      conexoes: [
        ligar(nOrigem.id, nSeletor.id, 0),
        ligar(nSeletor.id, nLeitor.id, 0),
        ligar(nEstrategia.id, nLeitor.id, 1),
        ligar(nLeitor.id, nCarga.id, 1),
        ligar(nDestino.id, nCarga.id, 0),
      ],
    };
  }

  if (task.tipo === "api") {
    const temFiltro = (task.camposSelecionados?.length ?? 0) > 0;
    const xCarga = temFiltro ? 940 : 640;

    const nOrigem = noDadoReal("conexoes", nomeConexao(task.conexaoOrigemId) ?? "?", 40, 40);
    const nEstrategia = noDadoReal("estrategias", nomeEstrategia(task.estrategiaId) ?? "?", 40, 150);
    const nLeitor = noGenerico("extracao_api", 340, 100, { metodo: task.metodo ?? "", rota: task.rota ?? "" });
    const nFiltro = temFiltro ? noGenerico("filtros_api", 640, 100, { camposSelecionados: task.camposSelecionados }) : undefined;
    const nDestino = noDadoReal("conexoes", nomeConexao(task.conexaoDestinoId) ?? "?", xCarga, 40);
    const nCarga = noGenerico("escrita_bd", xCarga, 220, { tabelaDestino: task.tabelaDestino ?? "" });

    const nos = [nOrigem, nEstrategia, nLeitor, nDestino, nCarga];
    const conexoes = [ligar(nOrigem.id, nLeitor.id, 0), ligar(nEstrategia.id, nLeitor.id, 1), ligar(nDestino.id, nCarga.id, 0)];
    if (nFiltro) {
      nos.splice(3, 0, nFiltro);
      conexoes.push(ligar(nLeitor.id, nFiltro.id, 0), ligar(nFiltro.id, nCarga.id, 1));
    } else {
      conexoes.push(ligar(nLeitor.id, nCarga.id, 1));
    }
    return { nos, conexoes };
  }

  return { nos: [], conexoes: [] };
}

/** Inversa de `construirFluxoDaTask` — dado um grafo já salvo, diz se ele ainda bate
    ESTRUTURALMENTE (grupo/tipoChave de cada nó + topologia das conexões — nunca posição x/y, nunca
    `nome`/config de cada nó) com um dos moldes guiados conhecidos ("consulta_sql"/"planilha"), ou
    `null` se não bate com nenhum (aí sim é Fluxo Manual de verdade).

    Existe porque `api/tasks.ts::paraTaskMock` decidia isso sozinho, olhando só se `fluxo_nos` está
    vazio — qualquer Task salva pelo menos uma vez dentro do canvas (mesmo só reposicionando nós,
    ex.: botão "Ajustar Layout") virava "Fluxo Manual" pra sempre, mesmo sem nenhuma mudança
    estrutural real. Mesmo princípio do motor real (`ETL_Classes/classificacao.py::classificar_task`
    — "editar só o SQL de uma Consulta não muda as chaves da entrada TASKS, continua batendo com o
    checklist, continua aparecendo como formulário"), só que expresso em cima da FORMA do grafo do
    canvas em vez das chaves do dicionário compilado (o motor opera sobre esse dicionário, que o
    front não tem sem chamar `POST /tasks/{id}/compilar` — comparar a forma do grafo direto evita
    essa chamada extra e já é suficiente: trocar qual Conexão/Consulta/Estratégia um nó representa,
    ou mover nós de lugar, nunca muda grupo/tipoChave/topologia). Qualquer nó a mais/a menos, ou
    ligação fora do padrão esperado, já não bate com nenhum molde e cai em Fluxo Manual — igual o
    motor real faz com qualquer chave fora do checklist. */
export function classificarFluxo(nos: NoFluxo[], conexoesGrafo: ConexaoFluxo[]): "consulta_sql" | "planilha" | "api" | null {
  function entradasDe(noId: string): { de: NoFluxo; portaEntrada: number }[] {
    return conexoesGrafo
      .filter((c) => c.para === noId)
      .map((c) => ({ de: nos.find((n) => n.id === c.de)!, portaEntrada: c.portaEntrada }))
      .filter((e) => e.de !== undefined);
  }
  function unico(tipoChave: string): NoFluxo | undefined {
    const achados = nos.filter((n) => n.tipoChave === tipoChave);
    return achados.length === 1 ? achados[0] : undefined;
  }
  function dadosReais(grupo: GrupoComponente): NoFluxo[] {
    return nos.filter((n) => n.grupo === grupo && n.tipoChave === undefined);
  }

  // --- Consulta SQL: Conexão(origem) + Estratégia + Consulta -> Leitor SQL -> Escrita BD <- Conexão(destino)
  if (nos.length === 6 && conexoesGrafo.length === 5) {
    const leitor = unico("extracao_sql");
    const carga = unico("escrita_bd");
    const conexoes = dadosReais("conexoes");
    const estrategias = dadosReais("estrategias");
    const consultas = dadosReais("consultas");
    if (leitor && carga && conexoes.length === 2 && estrategias.length === 1 && consultas.length === 1) {
      const entradasLeitor = entradasDe(leitor.id);
      const entradasCarga = entradasDe(carga.id);
      const origem = entradasLeitor.find((e) => e.portaEntrada === 0)?.de;
      const estrategiaNo = entradasLeitor.find((e) => e.portaEntrada === 1)?.de;
      const consultaNo = entradasLeitor.find((e) => e.portaEntrada === 2)?.de;
      const destino = entradasCarga.find((e) => e.portaEntrada === 0)?.de;
      const leitorNaCarga = entradasCarga.find((e) => e.portaEntrada === 1)?.de;
      if (
        entradasLeitor.length === 3 &&
        entradasCarga.length === 2 &&
        origem?.grupo === "conexoes" &&
        estrategiaNo?.grupo === "estrategias" &&
        consultaNo?.grupo === "consultas" &&
        destino?.grupo === "conexoes" &&
        destino.id !== origem.id &&
        leitorNaCarga?.id === leitor.id
      ) {
        return "consulta_sql";
      }
    }
  }

  // --- Planilha: Conexão(origem) -> Seletor de Abas -> Leitor Planilha <- Estratégia -> Escrita BD <- Conexão(destino)
  if (nos.length === 6 && conexoesGrafo.length === 5) {
    const seletor = unico("seletor_abas");
    const leitor = unico("extracao_planilha");
    const carga = unico("escrita_bd");
    const conexoes = dadosReais("conexoes");
    const estrategias = dadosReais("estrategias");
    if (seletor && leitor && carga && conexoes.length === 2 && estrategias.length === 1) {
      const entradasSeletor = entradasDe(seletor.id);
      const entradasLeitor = entradasDe(leitor.id);
      const entradasCarga = entradasDe(carga.id);
      const origem = entradasSeletor.find((e) => e.portaEntrada === 0)?.de;
      const seletorNoLeitor = entradasLeitor.find((e) => e.portaEntrada === 0)?.de;
      const estrategiaNo = entradasLeitor.find((e) => e.portaEntrada === 1)?.de;
      const destino = entradasCarga.find((e) => e.portaEntrada === 0)?.de;
      const leitorNaCarga = entradasCarga.find((e) => e.portaEntrada === 1)?.de;
      if (
        entradasSeletor.length === 1 &&
        entradasLeitor.length === 2 &&
        entradasCarga.length === 2 &&
        origem?.grupo === "conexoes" &&
        seletorNoLeitor?.id === seletor.id &&
        estrategiaNo?.grupo === "estrategias" &&
        destino?.grupo === "conexoes" &&
        destino.id !== origem.id &&
        leitorNaCarga?.id === leitor.id
      ) {
        return "planilha";
      }
    }
  }

  // --- API: Conexão(origem) + Estratégia -> Leitor API [-> Filtros API opcional] -> Escrita BD <- Conexão(destino)
  const semFiltro = nos.length === 5 && conexoesGrafo.length === 4;
  const comFiltro = nos.length === 6 && conexoesGrafo.length === 5;
  if (semFiltro || comFiltro) {
    const leitor = unico("extracao_api");
    const carga = unico("escrita_bd");
    const filtro = comFiltro ? unico("filtros_api") : undefined;
    const conexoes = dadosReais("conexoes");
    const estrategias = dadosReais("estrategias");
    if (leitor && carga && (comFiltro ? !!filtro : true) && conexoes.length === 2 && estrategias.length === 1) {
      const entradasLeitor = entradasDe(leitor.id);
      const entradasCarga = entradasDe(carga.id);
      const origem = entradasLeitor.find((e) => e.portaEntrada === 0)?.de;
      const estrategiaNo = entradasLeitor.find((e) => e.portaEntrada === 1)?.de;
      const destino = entradasCarga.find((e) => e.portaEntrada === 0)?.de;
      const dadoNaCarga = entradasCarga.find((e) => e.portaEntrada === 1)?.de;
      const baseValida =
        entradasLeitor.length === 2 &&
        entradasCarga.length === 2 &&
        origem?.grupo === "conexoes" &&
        estrategiaNo?.grupo === "estrategias" &&
        destino?.grupo === "conexoes" &&
        destino.id !== origem.id;
      if (baseValida && !comFiltro && dadoNaCarga?.id === leitor.id) {
        return "api";
      }
      if (baseValida && comFiltro && filtro) {
        const entradasFiltro = entradasDe(filtro.id);
        const leitorNoFiltro = entradasFiltro.find((e) => e.portaEntrada === 0)?.de;
        if (entradasFiltro.length === 1 && leitorNoFiltro?.id === leitor.id && dadoNaCarga?.id === filtro.id) {
          return "api";
        }
      }
    }
  }

  return null;
}
