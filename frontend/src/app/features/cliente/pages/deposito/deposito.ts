import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-deposito',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './deposito.html',
  styleUrl: './deposito.scss',
})
export class DepositoComponent {
  private readonly authService = inject(AuthService);

  public valor: number | null = null;
  public mensagem = '';
  public erro = '';
  public ultimoDeposito: number | null = null;
  public readonly numeroConta = this.authService.getNumeroConta();
  public readonly agencia = '0001';

  public selecionarValor(valor: number): void {
    this.valor = valor;
  }

  public depositar(): void {
    this.mensagem = '';
    this.erro = '';

    if (this.valor === null || this.valor <= 0) {
      this.erro = 'Informe um valor válido para depósito.';
      return;
    }

    this.ultimoDeposito = this.valor;
    this.mensagem = `Depósito registrado em modo visual: ${this.formatCurrency(this.valor)}.`;
    this.valor = null;
  }

  public formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }
}
