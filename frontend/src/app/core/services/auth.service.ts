import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  UsuarioLogado,
  LoginRequest,
  LoginResponse,
  LoginApiResponse,
  Perfil,
} from '../../shared/models/auth/auth.model';

@Injectable({
  providedIn: 'root', // Garante que o serviço seja um Singleton para toda a aplicação
})
export class AuthService {
  private readonly tokenKey = 'bantads_token';
  private readonly userKey = 'bantads_user';

  /** Mesma origem do gateway (ex.: http://localhost) quando o Angular é servido por ele. */
  private readonly http = inject(HttpClient);

  // ==========================================================================
  // 1. ESTADO REATIVO PRIVADO (A Fonte da Verdade)
  // ==========================================================================

  // Lemos do sessionStorage apenas na inicialização do serviço
  private _token = signal<string | null>(sessionStorage.getItem(this.tokenKey));
  private _usuario = signal<UsuarioLogado | null>(this.getUsuarioDoStorage());

  // ==========================================================================
  // 2. ESTADO REATIVO PÚBLICO (Somente Leitura para os Componentes)
  // ==========================================================================

  public readonly token = this._token.asReadonly();
  public readonly currentUser = this._usuario.asReadonly();

  // Computed Signals: Se atualizam automaticamente se o _usuario ou _token mudarem
  public readonly isAuthenticated = computed(() => !!this._token());
  public readonly userRole = computed(() => this._usuario()?.perfil ?? null);
  public readonly numeroConta = computed(() => this._usuario()?.numeroConta ?? null);

  // ==========================================================================
  // 3. CHECAGENS DE PERFIL (Para Lazy Loading e Guards)
  // ==========================================================================

  public readonly isCliente = computed(() => this.userRole() === 'CLIENTE');
  public readonly isGerente = computed(() => this.userRole() === 'GERENTE');
  public readonly isAdmin = computed(() => this.userRole() === 'ADMIN');

  // Checagem combinada: Útil para rotas/menus que tanto o Admin quanto o Gerente podem ver
  public readonly isBackoffice = computed(() => this.isGerente() || this.isAdmin());

  // Checagens dinâmicas, caso  precise passar o perfil como string
  public hasRole(expectedRole: string): boolean {
    return this.userRole()?.toUpperCase() === expectedRole.toUpperCase();
  }

  getToken(): string | null {
    return this.token?.() ?? null;
  }

  getNumeroConta(): string | null {
    return this.numeroConta?.() ?? null;
  }

  getCpf(): string | null {
    return this._usuario()?.cpf ?? null;
  }

  /**
   * Destino pós-login conforme perfil armazenado (JWT + sessão).
   * ADMIN cai em gerente até existir módulo `/admin`.
   */
  getHomeUrl(): string {
    if (this.isCliente()) return '/cliente/home';
    if (this.isGerente()) return '/gerente/home';
    if (this.isAdmin()) return '/gerente/home';
    return '/auth/login';
  }

  /** JWT do ms-auth: exp em segundos (UTC). Sem token ou payload inválido = expirado. */
  isAccessTokenExpired(): boolean {
    const t = this.getToken();
    if (!t) return true;
    const expSec = readJwtExpSeconds(t);
    if (expSec === null) return false;
    return expSec * 1000 <= Date.now();
  }

  // ==========================================================================
  // 4.Session management
  // ==========================================================================

  /**
   * Login via Gateway: POST /api/auth/login → ms-auth /auth/login (rota pública).
   * Mapeia access_token e usuario.tipo para o modelo do front.
   */
  public login(credenciais: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginApiResponse>('/api/auth/login', credenciais).pipe(
      tap((raw) => {
        const usuario = this.mapUsuarioLogado(raw.usuario);
        this.saveSession(usuario, raw.access_token);
      }),
      map(
        (raw): LoginResponse => ({
          token: raw.access_token,
          usuario: this.mapUsuarioLogado(raw.usuario),
        }),
      ),
    );
  }

  private mapPerfil(tipo: string): Perfil {
    const t = tipo.toUpperCase();
    if (t === 'ADMINISTRADOR') return 'ADMIN';
    if (t === 'GERENTE') return 'GERENTE';
    return 'CLIENTE';
  }

  private mapUsuarioLogado(u: LoginApiResponse['usuario']): UsuarioLogado {
    return {
      id: u.cpf,
      cpf: u.cpf,
      nome: u.nome,
      email: u.email,
      perfil: this.mapPerfil(u.tipo),
    };
  }

  public saveSession(usuario: UsuarioLogado, token: string): void {
    // 1. Salva no disco (para não perder no F5)
    sessionStorage.setItem(this.tokenKey, token);
    sessionStorage.setItem(this.userKey, JSON.stringify(usuario));

    // 2. Atualiza os Signals (avisa a aplicação inteira instantaneamente)
    this._token.set(token);
    this._usuario.set(usuario);
  }

  public logout(): void {
    // 1. Limpa o disco
    sessionStorage.clear();

    // 2. Reseta os Signals
    this._token.set(null);
    this._usuario.set(null);
  }

  // ==========================================================================
  // 5. MÉTODOS PRIVADOS DE INFRAESTRUTURA
  // ==========================================================================

  private getUsuarioDoStorage(): UsuarioLogado | null {
    const rawUser = sessionStorage.getItem(this.userKey);

    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as UsuarioLogado;
    } catch {
      // Se o JSON estiver quebrado/modificado manualmente, limpa tudo por segurança
      this.logout();
      return null;
    }
  }
}

function readJwtExpSeconds(jwt: string): number | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}
