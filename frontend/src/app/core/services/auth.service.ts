import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';
import { UsuarioLogado, LoginRequest, LoginResponse } from '../../shared/models/auth/auth.model'; // Ajuste o caminho se necessário

@Injectable({
  providedIn: 'root', // Garante que o serviço seja um Singleton para toda a aplicação
})
export class AuthService {
  private readonly tokenKey = 'bantads_token';
  private readonly userKey = 'bantads_user';

  private readonly apiUrl = 'http://localhost:3000';

  private http = inject(HttpClient);

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

  // ==========================================================================
  // 4.Session management
  // ==========================================================================

  /**
   * Efetua o login comunicando-se diretamente com o API Gateway.
   * O sucesso desta operação dispara automaticamente a atualização dos Signals.
   */
  public login(credenciais: LoginRequest): Observable<LoginResponse> {
    const url = `${this.apiUrl}/login`;

    return this.http.post<LoginResponse>(url, credenciais).pipe(
      // O 'tap' é um operador de "efeito colateral".
      // Ele executa o saveSession ANTES do dado chegar no componente,
      // garantindo que os Signals já estejam atualizados.
      tap((res: LoginResponse) => {
        this.saveSession(res.usuario, res.token);
      }),
    );

    // ---- PRODUÇÃO (Descomentar para conectar ao MS-AUTH via Gateway) ----
    /*
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credenciais).pipe(
      tap(res => this.saveSession(res.usuario, res.token))
    );
    */

    // (Optional) If you want to keep the mock throw error, you need to decide
    // whether to return the http.post OR the throwError. You can't return twice in the same block.
    // return throwError(() => new Error('Usuário ou senha inválidos')).pipe(delay(500));
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
