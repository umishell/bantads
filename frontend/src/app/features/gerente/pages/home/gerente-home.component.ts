import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClientePendenteListItem } from '../../../../shared/models/gerente/gerente.model';

@Component({
  selector: 'app-gerente-home',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gerente-home.component.html',
  styleUrl: './gerente-home.component.scss',
})
export class GerenteHomeComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly pendentes = signal<ClientePendenteListItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly erro = signal<string | null>(null);
  /** Linha em aprovação/rejeição HTTP (evita cliques duplicados). */
  protected readonly acaoClienteId = signal<string | null>(null);
  /** Abre o painel de motivo para rejeição (R11). */
  protected readonly rejeitarClienteId = signal<string | null>(null);
  protected readonly motivoRejeicao = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)],
  });

  public ngOnInit(): void {
    this.carregarPendentes();
  }

  protected carregarPendentes(): void {
    this.loading.set(true);
    this.erro.set(null);
    this.http
      .get<ClientePendenteListItem[]>('/api/clientes/pendentes')
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (lista) => this.pendentes.set(lista ?? []),
        error: (err: HttpErrorResponse) => this.erro.set(this.mensagemHttp(err)),
      });
  }

  protected aprovar(p: ClientePendenteListItem): void {
    this.erro.set(null);
    this.acaoClienteId.set(p.id);
    this.http
      .post<void>(`/api/clientes/${p.id}/aprovar`, {})
      .pipe(finalize(() => this.acaoClienteId.set(null)))
      .subscribe({
        next: () => this.carregarPendentes(),
        error: (err: HttpErrorResponse) => this.erro.set(this.mensagemAcao(err)),
      });
  }

  protected abrirRejeitar(p: ClientePendenteListItem): void {
    this.erro.set(null);
    this.rejeitarClienteId.set(p.id);
    this.motivoRejeicao.reset('');
  }

  protected cancelarRejeitar(): void {
    this.rejeitarClienteId.set(null);
    this.motivoRejeicao.reset('');
  }

  protected confirmarRejeitar(p: ClientePendenteListItem): void {
    if (this.rejeitarClienteId() !== p.id) return;
    this.motivoRejeicao.markAsTouched();
    if (this.motivoRejeicao.invalid) {
      this.motivoRejeicao.markAllAsTouched();
      this.erro.set('Informe o motivo da rejeição (obrigatório).');
      return;
    }
    this.erro.set(null);
    this.acaoClienteId.set(p.id);
    const motivo = this.motivoRejeicao.value.trim();
    this.http
      .post<void>(`/api/clientes/${p.id}/rejeitar`, { motivo })
      .pipe(finalize(() => this.acaoClienteId.set(null)))
      .subscribe({
        next: () => {
          this.cancelarRejeitar();
          this.carregarPendentes();
        },
        error: (err: HttpErrorResponse) => this.erro.set(this.mensagemAcao(err)),
      });
  }

  protected sair(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }

  private mensagemHttp(err: HttpErrorResponse): string {
    const body = err.error as { message?: string } | null;
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
    if (err.status === 403) {
      return 'Acesso restrito a gerentes. Verifique se você entrou com perfil GERENTE.';
    }
    if (err.status === 401) {
      return 'Sessão expirada ou token inválido. Entre novamente.';
    }
    return 'Não foi possível carregar os autocadastros pendentes.';
  }

  private mensagemAcao(err: HttpErrorResponse): string {
    const body = err.error as { message?: string } | null;
    if (body && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
    if (err.status === 409) {
      return 'Não é possível concluir a ação neste pedido (estado alterado ou conflito). Atualize a lista.';
    }
    if (err.status === 403) {
      return 'Acesso restrito a gerentes.';
    }
    if (err.status === 401) {
      return 'Sessão expirada ou token inválido. Entre novamente.';
    }
    return 'Não foi possível processar a solicitação. Tente novamente.';
  }
}
