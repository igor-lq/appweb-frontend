export type StatusCliente = "ativo" | "atenção" | "pausado";

export interface Cliente {
  id: string;
  nome: string;
  label: string;
  labelInterna: string;
  fluxosAtivos: number;
  ultimaExecucao: string;
  status: StatusCliente;
  ambiente: string;
  criadoEm: string;
  gitUrl: string | null;
  lockPor?: { id: string; nome: string } | null;
  lockDataHora?: string | null;
}

export const clientes: Cliente[] = [
  { id: "cooperativa-vale-norte", nome: "Cooperativa Vale Norte", label: "Cooperativa_Vale_Norte", labelInterna: "cooperativa_vale_norte", fluxosAtivos: 12, ultimaExecucao: "há 8 min", status: "ativo", ambiente: "Produção", criadoEm: "12/02/2025", gitUrl: "git@gitlab.internal:etl/cooperativa-vale-norte.git" },
  { id: "industria-meridional", nome: "Indústria Meridional", label: "Industria_Meridional", labelInterna: "industria_meridional", fluxosAtivos: 7, ultimaExecucao: "há 41 min", status: "ativo", ambiente: "Produção", criadoEm: "03/04/2025", gitUrl: "git@gitlab.internal:etl/industria-meridional.git" },
  { id: "log-transportes", nome: "Log Transportes", label: "Log_Transportes", labelInterna: "log_transportes", fluxosAtivos: 4, ultimaExecucao: "há 3 h", status: "atenção", ambiente: "Homologação", criadoEm: "19/05/2025", gitUrl: null },
  { id: "rede-farma-sul", nome: "Rede Farma Sul", label: "Rede_Farma_Sul", labelInterna: "rede_farma_sul", fluxosAtivos: 19, ultimaExecucao: "há 12 min", status: "ativo", ambiente: "Produção", criadoEm: "27/11/2024", gitUrl: "git@gitlab.internal:etl/rede-farma-sul.git" },
  { id: "agro-planalto", nome: "Agro Planalto", label: "Agro_Planalto", labelInterna: "agro_planalto", fluxosAtivos: 3, ultimaExecucao: "ontem", status: "pausado", ambiente: "Produção", criadoEm: "08/01/2025", gitUrl: null },
  { id: "metalcamp", nome: "Metalcamp", label: "Metalcamp", labelInterna: "metalcamp", fluxosAtivos: 9, ultimaExecucao: "há 1 h", status: "ativo", ambiente: "Produção", criadoEm: "14/07/2025", gitUrl: "git@gitlab.internal:etl/metalcamp.git" },
];
