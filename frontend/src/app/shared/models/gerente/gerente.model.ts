import { Cliente } from '../cliente/cliente.model';

/**
 * Representa a entidade base do Gerente conforme o esquema 'DadoGerente' do Swagger.
 */
export interface Gerente {
  cpf: string;
  nome: string;
  email: string;
  tipo?: string; // Normalmente "GERENTE" ou "ADMINISTRADOR"
}

/**
 * Contrato para a inserção ou atualização de um Gerente (geralmente feito pelo Admin).
 * Conforme o esquema 'DadoGerente_Insercao' do Swagger.
 */
export interface GerenteInsercao {
  nome: string;
  email: string;
  cpf: string;
  tipo: string;
}

/**
 * Representa a ação do Gerente ao avaliar o autocadastro de um cliente (R2/R3).
 */
export interface AvaliacaoCadastroRequest {
  idCliente: string; // ID interno do cliente no ms-cliente
  situacao: 'APROVADO' | 'REJEITADO';
  motivoRejeicao?: string; // Opcional, útil caso o cliente seja rejeitado
}

/**
 * Estrutura de dados para alimentar a tela inicial (Dashboard) do Gerente.
 * Facilita a vinculação dos dados aos gráficos ou cartões informativos.
 */
export interface GerenteDashboard {
  totalClientes: number;
  saldosPositivos: number;
  saldosNegativos: number;
  cadastrosPendentes: number;
}

/**
 * Representa o retorno da listagem de clientes ("Top 3", "Todos", etc.)
 * O Gerente precisa ver o cliente atrelado a um saldo ou situação.
 */
export interface ClienteResumoGerente extends Cliente {
  // Estendemos de Cliente (importado acima) para ter os dados base (nome, cpf, etc.)
  saldoAtual?: number;
  limiteDisponivel?: number;
}