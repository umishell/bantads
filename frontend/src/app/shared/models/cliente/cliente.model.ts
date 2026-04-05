export interface ClienteModel {
  cpf: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  cidade: string;
  estado: string;
  salario: number;
  conta?: string;
  saldo?: number;
  limite?: number;
  gerente_nome: string;
  situacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}
export type Cliente = ClienteModel;
export interface Endereco {
  cep: string;
  logradouro: string;
  numero: number;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export interface ClienteAutocadastro {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  salario: number;
  endereco: Endereco;
}

/**
 * Corpo JSON de POST /api/clientes (ms-cliente AutocadastroRequest).
 * Campo CEP em maiúsculo por @JsonProperty no backend.
 */
export interface AutocadastroApiRequest {
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
