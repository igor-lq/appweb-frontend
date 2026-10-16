import { api } from "./client";

export interface ConfigApi {
  airflow_url: string;
}

export const configApi = {
  obter: () => api.get<ConfigApi>("/config"),
};
