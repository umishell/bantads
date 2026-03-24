/**
 * Interface base que representa a entidade Cliente.
 */
export interface Cliente {
  cpf: string;
  nome: string;
  email: string;
  telefone?: string;
  salario: number;
  
  // Dados de localização exigidos no cadastro e perfil
  endereco: string;
  numero?: string;
  complemento?: string;
  cep: string;
  cidade: string;
  estado: string;

  // Informações da conta (geradas após aprovação do gerente)
  conta?: string; 
  saldo?: number;
  limite?: number;
  
  // Dados do gerente atrelado à conta do cliente
  gerente_cpf?: string;
  gerente_nome?: string;
  gerente_email?: string;
  
  // Controle de fluxo de aprovação
  situacao?: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  dataCriacao?: string;
}

/**
 * Contém os campos necessários para o primeiro envio de dados.
 */
export interface AutocadastroRequest {
  cpf: string;
  nome: string;
  email: string;
  telefone: string;
  salario: number;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
}

/**
 * Reflete os campos editáveis pelo cliente logado.
 */
export interface PerfilUpdateRequest {
  nome: string;
  email: string;
  salario: number;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
}