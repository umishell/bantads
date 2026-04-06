export interface SolicitacaoClienteModel {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: number;
  endereco: string;
  cidade: string;
  estado: string;
  cep?: string;
  gerenteCpf: string;
  gerenteNome: string;
  dataSolicitacao: string;
}

export interface GerenteResumoModel {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  totalClientes: number;
  totalSaldoPositivo: number;
  totalSaldoNegativo: number;
  totalPendencias: number;
}

export interface ClienteCarteiraModel {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  estado: string;
  endereco: string;
  salario: number;
  conta: string;
  agencia: string;
  saldo: number;
  limite: number;
  situacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  gerenteCpf: string;
  gerenteNome: string;
  gerenteEmail?: string;
  cep?: string;
}

export interface AprovacaoClienteModel {
  cpf: string;
  nome: string;
  email: string;
  numeroConta: string;
  agencia: string;
  senhaTemporaria: string;
  gerenteNome: string;
}

export interface RejeicaoClienteModel {
  cpf: string;
  nome: string;
  motivo: string;
  dataHora: string;
}
