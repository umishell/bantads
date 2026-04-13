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

export interface LoginResponse {
  // Obrigatórios: Se a resposta é 200 OK, esses campos devem vir preenchidos
  token: string;
  usuario: UsuarioLogado;
}