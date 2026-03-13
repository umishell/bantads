import { Endereco } from './endereco.model';

export interface Cliente {
  id?: number; // Gerado pelo backend
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  salario: number;
  endereco: Endereco;
}