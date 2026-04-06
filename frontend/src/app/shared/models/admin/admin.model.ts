export interface AdminDashboardGerenteItem {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  totalClientes: number;
  totalSaldoPositivo: number;
  totalSaldoNegativo: number;
}

export interface AdminDashboardModel {
  totalGerentes: number;
  totalClientes: number;
  totalSaldoPositivo: number;
  totalSaldoNegativo: number;
  gerentes: AdminDashboardGerenteItem[];
}

export interface AdminRelatorioClienteModel {
  cpfCliente: string;
  nomeCliente: string;
  emailCliente: string;
  salario: number;
  numeroConta: string;
  saldo: number;
  limite: number;
  cpfGerente: string;
  nomeGerente: string;
}

export interface AdminGerenteModel {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  totalClientes: number;
  totalSaldoPositivo: number;
  totalSaldoNegativo: number;
}

export interface AdminGerenteFormModel {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
}

export interface AdminGerenteMutationResponse {
  mensagem: string;
  gerente: AdminGerenteModel;
  detalhes?: string[];
}

export interface AdminGerenteRemocaoResponse {
  mensagem: string;
  gerenteRemovido: string;
  gerenteDestino: string;
  totalContasReatribuidas: number;
  detalhes?: string[];
}
