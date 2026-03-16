import { Injectable } from '@angular/core';

import { UsuarioLogadoModel } from '../models/auth/usuario-logado.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'bantads_token';
  private readonly userKey = 'bantads_user';

  getToken(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  getUsuarioLogado(): UsuarioLogadoModel | null {
    const rawUser = sessionStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UsuarioLogadoModel;
    } catch {
      this.clearSessao();
      return null;
    }
  }

  getNumeroConta(): string | null {
    return this.getUsuarioLogado()?.numeroConta ?? null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(expectedRole: string): boolean {
    const role = this.getUsuarioLogado()?.tipo?.toUpperCase();
    return role === expectedRole.toUpperCase();
  }

  setSessao(usuario: UsuarioLogadoModel, token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify({ ...usuario, token }));
  }

  clearSessao(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
  }
}
