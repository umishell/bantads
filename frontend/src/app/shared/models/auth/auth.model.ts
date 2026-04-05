export type Perfil = 'CLIENTE' | 'GERENTE' | 'ADMIN';

export interface UsuarioLogado {
  // Obrigatórios: Se o usuário está logado, ele TEM que ter esses dados vindo do ms-auth
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  cpf: string; // Essencial para o ms-conta e ms-cliente
  numeroConta?: string;
}

export interface LoginRequest {
  login: string;
  senha: string;
}

/** Formato interno após mapear a resposta do ms-auth. */
export interface LoginResponse {
  token: string;
  usuario: UsuarioLogado;
}

/** Payload real do POST /auth/login (ms-auth, estilo OAuth2). */
export interface LoginApiResponse {
  access_token: string;
  token_type: string;
  tipo: string;
  usuario: {
    cpf: string;
    nome: string;
    email: string;
    tipo: string;
  };
}