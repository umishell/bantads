import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-saque',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './saque.html',
  styleUrl: './saque.scss',
})
export class SaqueComponent {
  valor: number | null = null;
  mensagem = '';
  erro = '';

  sacar(): void {
    this.mensagem = '';
    this.erro = '';

    if (this.valor === null || this.valor <= 0) {
      this.erro = 'Informe um valor válido para saque.';
      return;
    }

    console.log('Saque realizado:', this.valor);
    this.mensagem = `Saque realizado: R$ ${this.valor.toFixed(2)}`;
    this.valor = null;
  }
}
