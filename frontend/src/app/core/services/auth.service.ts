import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { DemoBantadsStoreService } from '../../shared/services/demo-bantads-store.service';
import {
  LoginApiResponse,
  LoginRequest,
  LoginResponse,
  Perfil,
  PerfilApi,
  UsuarioLogado,
} from '../../shared/models/auth/auth.model';
import { API_ENDPOINTS } from '../../shared/services/api.config';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'bantads_token';
  private readonly userKey = 'bantads_user';

  /**
   * Etapa atual:
   * - true  = mantém o frontend funcionando com dados em memória.
   * - false = passa a usar o API Gateway no contrato oficial do Swagger.
   */
  private readonly useDemoMode = true;

  private readonly http = inject(HttpClient);
  private readonly demoStore = inject(DemoBantadsStoreService);

  private readonly _token = signal<string | null>(sessionStorage.getItem(this.tokenKey));
  private readonly _usuario = signal<UsuarioLogado | null>(this.getUsuarioDoStorage());

  public readonly token = this._token.asReadonly();
  public readonly currentUser = this._usuario.asReadonly();

  public readonly isAuthenticated = computed(() => !!this._token());
  public readonly userRole = computed(() => this._usuario()?.perfil ?? null);
  public readonly numeroConta = computed(() => this._usuario()?.numeroConta ?? null);

  public readonly isCliente = computed(() => this.userRole() === 'CLIENTE');
  public readonly isGerente = computed(() => this.userRole() === 'GERENTE');
  public readonly isAdmin = computed(() => this.userRole() === 'ADMIN');
  public readonly isBackoffice = computed(() => this.isGerente() || this.isAdmin());

  public hasRole(expectedRole: string): boolean {
    return this.userRole()?.toUpperCase() === expectedRole.toUpperCase();
  }

  public getToken(): string | null {
    return this.token?.() ?? null;
  }

  public getNumeroConta(): string | null {
    return this.numeroConta?.() ?? null;
  }

  public getCpf(): string | null {
    return this._usuario()?.cpf ?? null;
  }

  public login(credenciais: LoginRequest): Observable<LoginResponse> {
    const request$ = this.useDemoMode
      ? this.demoStore.autenticar(credenciais)
      : this.http.post<LoginApiResponse>(API_ENDPOINTS.login, credenciais).pipe(
          map((response) => this.mapLoginApiResponse(response)),
        );

    return request$.pipe(
      tap((res: LoginResponse) => {
        this.saveSession(res.usuario, res.token);
      }),
    );
  }

  /**
   * Logout local. Quando o backend real estiver ligado, podemos criar também um logout remoto
   * chamando POST /api/logout antes de limpar a sessão.
   */
  public logout(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    this._token.set(null);
    this._usuario.set(null);
  }

  public saveSession(usuario: UsuarioLogado, token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(usuario));

    this._token.set(token);
    this._usuario.set(usuario);
  }

  private mapLoginApiResponse(response: LoginApiResponse): LoginResponse {
    const perfil = this.mapPerfil(response.usuario.tipo ?? response.tipo);
    const cpf = response.usuario.cpf;

    return {
      token: response.access_token,
      tokenType: response.token_type,
      usuario: {
        id: cpf,
        cpf,
        nome: response.usuario.nome,
        email: response.usuario.email,
        perfil,
        numeroConta: response.usuario.numeroConta ?? response.usuario.conta,
      },
    };
  }

  private mapPerfil(perfilApi: PerfilApi | string | undefined): Perfil {
    const normalizado = String(perfilApi ?? '').trim().toUpperCase();

    if (normalizado === 'ADMINISTRADOR' || normalizado === 'ADMIN') {
      return 'ADMIN';
    }

    if (normalizado === 'GERENTE') {
      return 'GERENTE';
    }

    return 'CLIENTE';
  }

  private getUsuarioDoStorage(): UsuarioLogado | null {
    const rawUser = sessionStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UsuarioLogado;
    } catch {
      this.logout();
      return null;
    }
  }
}
