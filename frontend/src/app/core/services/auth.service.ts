import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { DemoBantadsStoreService } from '../../shared/services/demo-bantads-store.service';
import { UsuarioLogado, LoginRequest, LoginResponse } from '../../shared/models/auth/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'bantads_token';
  private readonly userKey = 'bantads_user';

  private readonly apiUrl = 'http://localhost:3000';
  private readonly demoMode = true;

  private readonly http = inject(HttpClient);
  private readonly demoStore = inject(DemoBantadsStoreService);

  private _token = signal<string | null>(sessionStorage.getItem(this.tokenKey));
  private _usuario = signal<UsuarioLogado | null>(this.getUsuarioDoStorage());

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
    const request$ = this.demoMode
      ? this.demoStore.autenticar(credenciais)
      : this.http.post<LoginResponse>(`${this.apiUrl}/login`, credenciais);

    return request$.pipe(
      tap((res: LoginResponse) => {
        this.saveSession(res.usuario, res.token);
      }),
    );
  }

  public saveSession(usuario: UsuarioLogado, token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(usuario));

    this._token.set(token);
    this._usuario.set(usuario);
  }

  public logout(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    this._token.set(null);
    this._usuario.set(null);
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
