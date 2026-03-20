import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ClienteModel } from '../../../../shared/models/cliente/cliente.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);

  protected readonly cpfUsuario = this.authService.getCpf();

  protected loading = false;
  protected errorMessage = '';
  protected cliente: ClienteModel | null = null;

  ngOnInit(): void {
    this.carregarDashboard();
  }

  protected carregarDashboard(): void {
    if (!this.cpfUsuario) {
      this.errorMessage = 'Sessão inválida. Por favor, realize o login novamente.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.clienteService
      .buscarPorCpf(this.cpfUsuario)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: ClienteModel) => {
          this.cliente = response;
        },
        error: (error: HttpErrorResponse) => {
          const payload = error.error as { message?: string; erro?: string } | null;
          const apiMessage = payload?.message ?? payload?.erro ?? error.message;
          this.errorMessage = apiMessage || 'Erro ao carregar dados do cliente.';
        },
      });
  }

  protected isSaldoNegativo(): boolean {
    return (this.cliente?.saldo ?? 0) < 0;
  }

  protected formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }
}
