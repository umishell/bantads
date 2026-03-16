import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-deposito',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './deposito.html',
  styleUrl: './deposito.scss',
})
export class DepositoComponent {
  valor: number | null = null;
  mensagem = '';
  erro = '';

  depositar(): void {
    this.mensagem = '';
    this.erro = '';

    if (this.valor === null || this.valor <= 0) {
      this.erro = 'Informe um valor válido para depósito.';
      return;
    }

    console.log('Depósito realizado:', this.valor);
    this.mensagem = `Depósito realizado: R$ ${this.valor.toFixed(2)}`;
    this.valor = null;
  }
}
