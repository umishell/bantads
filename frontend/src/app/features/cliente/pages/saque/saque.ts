import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-saque',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './saque.html',
  styleUrl: './saque.scss',
})
export class SaqueComponent {
  private readonly authService = inject(AuthService);

  public valor: number | null = null;
  public mensagem = '';
  public erro = '';
  public ultimoSaque: number | null = null;
  public readonly numeroConta = this.authService.getNumeroConta();
  public readonly agencia = '0001';

  public selecionarValor(valor: number): void {
    this.valor = valor;
  }

  public sacar(): void {
    this.mensagem = '';
    this.erro = '';

    if (this.valor === null || this.valor <= 0) {
      this.erro = 'Informe um valor válido para saque.';
      return;
    }

    this.ultimoSaque = this.valor;
    this.mensagem = `Saque registrado em modo visual: ${this.formatCurrency(this.valor)}.`;
    this.valor = null;
  }

  public formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }
}
