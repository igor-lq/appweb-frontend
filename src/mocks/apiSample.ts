/** Amostra fixa de retorno de API, usada só para alimentar a árvore de seleção de campos
    (Configuração de Campos) no formulário de Task do tipo API. Não varia por conexão/cliente —
    é só o suficiente para demonstrar a interação no protótipo. */
export const amostraRespostaApi = {
  data: [
    {
      id: 1,
      name: "Distribuidora Central",
      status: "ativo",
      address: {
        city: "Curitiba",
        uf: "PR",
      },
    },
  ],
  meta: {
    page: 1,
    total: 42,
  },
};
