/** DTOs alinhados ao JSON dos microsserviços (Spring / Jackson, camelCase). */

export interface ClienteDetalheDto {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: number;
  cidade: string;
  estado: string;
  endereco: string;
  cep: string;
  status: string;
  /** R11 — motivo da rejeição (quando aplicável). */
  motivoRejeicao?: string | null;
  /** R11 — data/hora da decisão do gerente. */
  decisaoGerenteEm?: string | null;
  /** R4 — gerente responsável (quando aprovado). */
  gerenteCpf?: string | null;
  gerenteNome?: string | null;
  gerenteEmail?: string | null;
}

export interface ContaResponseDto {
  id: string;
  numero: string;
  clienteId: string;
  gerenteId: string;
  saldo: number;
  limite: number;
  ativa: boolean;
  dataCriacao: string;
}

export interface ValorRequestDto {
  valor: number;
}

export interface TransferenciaRequestDto {
  numeroContaDestino: string;
  valor: number;
}

export interface OperacaoResponseDto {
  movimentacaoId: string;
  tipo: string;
  valor: number;
  saldoOrigem: number | null;
  saldoDestino: number | null;
  dataHora: string;
}

export interface LancamentoExtratoDto {
  movimentacaoId: string;
  dataHora: string;
  tipo: string;
  natureza: string;
  valor: number;
  saldoApos: number | null;
  contraparteContaNumero: string | null;
}

export interface ClientePendenteDto {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: number;
  cidade: string;
  estado: string;
  criadoEm: string;
}

export interface ClienteCarteiraDto {
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
  situacao: string;
  gerenteCpf: string;
  gerenteNome: string;
  gerenteEmail?: string | null;
  cep?: string | null;
}

export interface AdminRelatorioClienteDto {
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

export interface GerenteResponseDto {
  id: string;
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  tipo: string;
  ativo: boolean;
}

export interface DashboardGerenteItemDto {
  gerenteId: string;
  cpf: string;
  nome: string;
  email: string;
  totalClientes: number;
  somaSaldosPositivos: number;
  somaSaldosNegativos: number;
}

export interface InserirGerenteRequestDto {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  tipo?: string;
}

export interface AlterarGerenteRequestDto {
  nome?: string | null;
  email?: string | null;
  senha?: string | null;
}

/** Corpo `POST /api/clientes` (R1 autocadastro, ms-cliente). `CEP` espelha `@JsonProperty` no backend. */
export interface AutocadastroRequestDto {
  cpf: string;
  email: string;
  nome: string;
  telefone: string;
  salario: number;
  endereco: string;
  CEP: string;
  cidade: string;
  estado: string;
}

export interface AutocadastroResponseDto {
  message: string;
  avisos: string[];
  clienteId: string;
  cpf: string;
}
