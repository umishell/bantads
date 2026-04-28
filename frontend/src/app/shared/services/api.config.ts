/**
 * Configuração central da API BANTADS.
 *
 * O Swagger oficial do professor expõe paths como /login, /clientes e /gerentes.
 * No frontend usamos /api/... porque o Angular deve conversar somente com o API Gateway.
 */
export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  reboot: `${API_BASE_URL}/reboot`,

  login: `${API_BASE_URL}/login`,
  logout: `${API_BASE_URL}/logout`,

  clientes: `${API_BASE_URL}/clientes`,
  clientesParaAprovar: `${API_BASE_URL}/clientes?filtro=para_aprovar`,
  relatorioClientes: `${API_BASE_URL}/clientes?filtro=adm_relatorio_clientes`,
  melhoresClientes: `${API_BASE_URL}/clientes?filtro=melhores_clientes`,
  clientePorCpf: (cpf: string) => `${API_BASE_URL}/clientes/${encodeURIComponent(cpf)}`,
  aprovarCliente: (cpf: string) => `${API_BASE_URL}/clientes/${encodeURIComponent(cpf)}/aprovar`,
  rejeitarCliente: (cpf: string) => `${API_BASE_URL}/clientes/${encodeURIComponent(cpf)}/rejeitar`,

  saldo: (numero: string) => `${API_BASE_URL}/contas/${encodeURIComponent(numero)}/saldo`,
  depositar: (numero: string) => `${API_BASE_URL}/contas/${encodeURIComponent(numero)}/depositar`,
  sacar: (numero: string) => `${API_BASE_URL}/contas/${encodeURIComponent(numero)}/sacar`,
  transferir: (numero: string) => `${API_BASE_URL}/contas/${encodeURIComponent(numero)}/transferir`,
  extrato: (numero: string) => `${API_BASE_URL}/contas/${encodeURIComponent(numero)}/extrato`,

  gerentes: `${API_BASE_URL}/gerentes`,
  dashboardGerentes: `${API_BASE_URL}/gerentes?numero=dashboard`,
  gerentePorCpf: (cpf: string) => `${API_BASE_URL}/gerentes/${encodeURIComponent(cpf)}`,
};
