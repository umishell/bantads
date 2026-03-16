export interface UsuarioLogadoModel {
  cpf: string;
  nome: string;
  email: string;
  tipo: 'CLIENTE' | 'GERENTE' | 'ADMINISTRADOR' | string;
  token?: string;
  numeroConta?: string;
}
