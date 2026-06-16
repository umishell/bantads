export type Perfil = 'CLIENTE' | 'GERENTE' | 'ADMIN';

export interface UsuarioLogado {

  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cpf: string; 
  numeroConta?: string;
  clienteId?: string;
  telefone?: string;
}

export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {

  token: string;
  usuario: UsuarioLogado;
}
export interface LoginApiUsuarioResponse {
  cpf: string;
  nome: string;
  email: string;
  tipo: string;
}

export interface LoginApiResponse {
  access_token: string;
  token_type: string;
  tipo: string;
  usuario: LoginApiUsuarioResponse;
}
