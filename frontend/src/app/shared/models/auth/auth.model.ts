export type Perfil = 'CLIENTE' | 'GERENTE' | 'ADMIN';

export interface UsuarioLogado {
  // Obrigatórios: Se o usuário está logado, ele TEM que ter esses dados vindo do ms-auth
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cpf: string; // Essencial para o ms-conta e ms-cliente
  numeroConta?: string;
  /** UUID do cadastro em ms-cliente (preenchido após login para CLIENTE). */
  clienteId?: string;
  telefone?: string;
}

export interface LoginRequest {
  login: string;
  senha: string;
}

export interface LoginResponse {
  // Obrigatórios: Se a resposta é 200 OK, esses campos devem vir preenchidos
  token: string;
  usuario: UsuarioLogado;
}

/** Corpo JSON retornado por `POST /api/auth/login` (ms-auth). */
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