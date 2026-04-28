export type Perfil = 'CLIENTE' | 'GERENTE' | 'ADMIN';
export type PerfilApi = Perfil | 'ADMINISTRADOR';

export interface UsuarioLogado {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cpf: string;
  numeroConta?: string;
}

export interface LoginRequest {
  login: string;
  senha: string;
}

/**
 * Resposta oficial interna usada pelo frontend depois do mapeamento.
 */
export interface LoginResponse {
  token: string;
  tokenType?: string;
  usuario: UsuarioLogado;
}

/**
 * Resposta no formato oficial do Swagger do professor.
 */
export interface LoginApiResponse {
  access_token: string;
  token_type: string;
  tipo: PerfilApi;
  usuario: {
    nome: string;
    cpf: string;
    email: string;
    tipo?: PerfilApi;
    conta?: string;
    numeroConta?: string;
  };
}

export interface LogoutResponse {
  cpf: string;
  nome: string;
  email: string;
  tipo: PerfilApi;
}
