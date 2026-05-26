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
import { ProcessandoButtonComponent } from '../../../../shared/components/processando-button/processando-button.component';

@Component({
  selector: 'app-gerente-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProcessandoButtonComponent],
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
  public processandoAcaoId: string | null = null;
  public processandoAcaoTipo: 'aprovar' | 'recusar' | null = null;

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

  public aprovar(solicitacao: SolicitacaoClienteModel): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.aprovacaoRecente = null;

    this.processandoAcaoId = solicitacao.id;
    this.processandoAcaoTipo = 'aprovar';

    this.gerenteService
      .aprovarCliente(solicitacao.id)
      .pipe(finalize(() => {
        this.processandoAcaoId = null;
        this.processandoAcaoTipo = null;
      }))
      .subscribe({
      next: (response) => {
        this.aprovacaoRecente = {
          ...response,
          nome: solicitacao.nome,
          cpf: solicitacao.cpf,
          email: solicitacao.email,
        };
        this.successMessage = `Solicitação de ${solicitacao.nome} enviada para aprovação. A conta será criada de forma assíncrona; a senha provisória será enviada por e-mail quando concluída.`;
        this.carregarTela();
      },
      error: (error) => {
        this.errorMessage = error?.message || 'Não foi possível aprovar a solicitação.';
      },
    });
  }

  public recusar(solicitacao: SolicitacaoClienteModel): void {
    this.errorMessage = '';
    this.successMessage = '';
    const motivo = (this.motivosRecusa[solicitacao.cpf] ?? '').trim();

    if (!motivo) {
      this.errorMessage = 'Informe um motivo para recusar a solicitação.';
      return;
    }

    this.processandoAcaoId = solicitacao.id;
    this.processandoAcaoTipo = 'recusar';

    this.gerenteService
      .rejeitarCliente(solicitacao.id, motivo, { cpf: solicitacao.cpf, nome: solicitacao.nome })
      .pipe(finalize(() => {
        this.processandoAcaoId = null;
        this.processandoAcaoTipo = null;
      }))
      .subscribe({
        next: (response) => {
          this.successMessage = `Solicitação de ${response.nome} recusada em ${this.formatDateTime(response.dataHora)}.`;
          delete this.motivosRecusa[solicitacao.cpf];
          this.carregarTela();
        },
        error: (error) => {
          this.errorMessage = error?.message || 'Não foi possível recusar a solicitação.';
        },
      });
  }

  public isProcessando(solicitacaoId: string, tipo: 'aprovar' | 'recusar'): boolean {
    return this.processandoAcaoId === solicitacaoId && this.processandoAcaoTipo === tipo;
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
    this.authService.sair(this.router);
  }
}
