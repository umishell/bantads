import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import {
  AprovacaoClienteModel,
  GerenteResumoModel,
  SolicitacaoClienteModel,
} from '../../../../shared/models/gerente/gerente.model';
import { GerenteService } from '../../../../shared/services/gerente.service';

@Component({
  selector: 'app-gerente-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class GerenteHomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly gerenteService = inject(GerenteService);
  private readonly router = inject(Router);

  public loading = false;
  public errorMessage = '';
  public successMessage = '';
  public resumo: GerenteResumoModel | null = null;
  public pendencias: SolicitacaoClienteModel[] = [];
  public motivosRecusa: Record<string, string> = {};
  public aprovacaoRecente: AprovacaoClienteModel | null = null;

  public ngOnInit(): void {
    this.carregarTela();
  }

  public carregarTela(): void {
    const gerenteCpf = this.authService.getCpf();
    if (!gerenteCpf) {
      this.errorMessage = 'Não foi possível identificar o gerente logado.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.gerenteService
      .obterResumo(gerenteCpf)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (resumo) => {
          this.resumo = resumo;
        },
        error: (error) => {
          this.errorMessage = error?.message || 'Não foi possível carregar o resumo do gerente.';
        },
      });

    this.gerenteService.listarSolicitacoesPendentes(gerenteCpf).subscribe({
      next: (pendencias) => {
        this.pendencias = pendencias;
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Não foi possível carregar as pendências.';
      },
    });
  }

  public aprovar(cpf: string): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.aprovacaoRecente = null;

    this.gerenteService.aprovarCliente(cpf).subscribe({
      next: (response) => {
        this.aprovacaoRecente = response;
        this.successMessage = `Cliente ${response.nome} aprovado com sucesso. Conta ${response.numeroConta} criada.`;
        this.carregarTela();
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Não foi possível aprovar a solicitação.';
      },
    });
  }

  public recusar(cpf: string): void {
    this.errorMessage = '';
    this.successMessage = '';
    const motivo = (this.motivosRecusa[cpf] ?? '').trim();

    if (!motivo) {
      this.errorMessage = 'Informe um motivo para recusar a solicitação.';
      return;
    }

    this.gerenteService.rejeitarCliente(cpf, motivo).subscribe({
      next: (response) => {
        this.successMessage = `Solicitação de ${response.nome} recusada em ${this.formatDateTime(response.dataHora)}.`;
        delete this.motivosRecusa[cpf];
        this.carregarTela();
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Não foi possível recusar a solicitação.';
      },
    });
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public formatDateTime(value: string): string {
    if (!value) return '-';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      new Date(value),
    );
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
