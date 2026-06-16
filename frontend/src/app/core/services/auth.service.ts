import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, finalize, map, Observable, of, switchMap, tap } from 'rxjs';

import { API_BASE } from '../config/api-base';
import { ClienteDetalheDto, ContaResponseDto } from '../../shared/models/api/bantads-api.models';
import {
  LoginApiResponse,
  LoginRequest,
  LoginResponse,
  Perfil,
  UsuarioLogado,
} from '../../shared/models/auth/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly tokenKey = 'bantads_token';
  private readonly userKey = 'bantads_user';

  private readonly http = inject(HttpClient);

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

  public getHomeUrl(perfil?: Perfil | null): string {
    const p = perfil ?? this._usuario()?.perfil ?? null;
    switch (p) {
      case 'CLIENTE':
        return '/cliente/home';
      case 'GERENTE':
        return '/gerente/home';
      case 'ADMIN':
        return '/admin/home';
      default:
        return '/auth/login';
    }
  }

  public login(credenciais: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginApiResponse>(`${API_BASE}/auth/login`, credenciais).pipe(
      map((res) => this.mapLoginApiToLoginResponse(res)),
      tap((lr) => this.persistToken(lr.token)),
      switchMap((lr) => this.enriquecerClienteComConta(lr)),
      tap((lr) => {
        this.saveSession(lr.usuario, lr.token);
      }),
    );
  }

  private persistToken(token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
    this._token.set(token);
  }

  private enriquecerClienteComConta(lr: LoginResponse): Observable<LoginResponse> {
    if (lr.usuario.perfil !== 'CLIENTE') {
      return of(lr);
    }
    const cpf = lr.usuario.cpf;
    return this.http.get<ClienteDetalheDto>(`${API_BASE}/clientes/${cpf}`).pipe(
      switchMap((det) =>
        this.http.get<ContaResponseDto>(`${API_BASE}/contas/por-cliente/${det.id}`).pipe(
          map((conta) => ({
            ...lr,
            usuario: {
              ...lr.usuario,
              clienteId: det.id,
              numeroConta: conta.numero,
              telefone: det.telefone,
            },
          })),
          catchError(() =>
            of({
              ...lr,
              usuario: {
                ...lr.usuario,
                clienteId: det.id,
                telefone: det.telefone,
              },
            }),
          ),
        ),
      ),
      catchError(() => of(lr)),
    );
  }

  private mapLoginApiToLoginResponse(res: LoginApiResponse): LoginResponse {
    const tipoRaw = (res.usuario?.tipo ?? res.tipo ?? '').toUpperCase();
    const perfil = this.normalizarPerfil(tipoRaw);
    const u = res.usuario;
    const usuario: UsuarioLogado = {
      id: u.cpf,
      cpf: u.cpf,
      nome: u.nome,
      email: u.email,
      perfil,
    };
    return { token: res.access_token, usuario };
  }

  private normalizarPerfil(tipo: string): Perfil {
    if (tipo === 'ADMINISTRADOR') {
      return 'ADMIN';
    }
    if (tipo === 'GERENTE' || tipo === 'CLIENTE') {
      return tipo;
    }
    return 'CLIENTE';
  }

  public saveSession(usuario: UsuarioLogado, token: string): void {
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(usuario));

    this._token.set(token);
    this._usuario.set(usuario);
  }

  public clearSessionLocal(): void {
    sessionStorage.removeItem(this.tokenKey);
    sessionStorage.removeItem(this.userKey);
    this._token.set(null);
    this._usuario.set(null);
  }

  public logout(): Observable<void> {
    const token = this.getToken();
    if (!token) {
      this.clearSessionLocal();
      return of(undefined);
    }
    return this.http.post(`${API_BASE}/auth/logout`, {}).pipe(
      catchError(() => of(null)),
      finalize(() => this.clearSessionLocal()),
      map(() => undefined),
    );
  }

  public encerrarSessao(): Observable<void> {
    return this.logout();
  }

  public sair(router: { navigate: (commands: string[]) => unknown }): void {
    this.logout().subscribe(() => {
      void router.navigate(['/auth/login']);
    });
  }

  private getUsuarioDoStorage(): UsuarioLogado | null {
    const rawUser = sessionStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UsuarioLogado;
    } catch {
      this.clearSessionLocal();
      return null;
    }
  }
}
