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

  export interface Cliente extends ClienteAutocadastro {
    id: string;
    situacao: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
    gerenteResponsavel?: string;
  }