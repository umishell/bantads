import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ContaService } from '../../../../shared/services/conta.service';

@Component({
  selector: 'app-saque',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './saque.html',
  styleUrl: './saque.scss',
})
export class SaqueComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly contaService = inject(ContaService);
  private readonly clienteService = inject(ClienteService);

  public valor: number | null = null;
  public mensagem = '';
  public erro = '';
  public ultimoSaque: number | null = null;
  public saldoAtual: number | null = null;
  public limiteAtual: number | null = null;
  public nomeTitular = '';
  public readonly numeroConta = this.authService.getNumeroConta();
  public readonly agencia = '0001';

  public ngOnInit(): void {
    const cpf = this.authService.getCpf();
    if (!cpf) {
      return;
    }

    this.clienteService.buscarPorCpf(cpf).subscribe({
      next: (cliente) => {
        this.saldoAtual = cliente.saldo ?? 0;
        this.limiteAtual = cliente.limite ?? 0;
        this.nomeTitular = cliente.nome;
      },
    });
  }

  public selecionarValor(valor: number): void {
    this.valor = valor;
  }

  public sacar(): void {
    this.mensagem = '';
    this.erro = '';

    if (!this.numeroConta) {
      this.erro = 'Não foi possível identificar a conta do cliente logado.';
      return;
    }

    if (this.valor === null || this.valor <= 0) {
      this.erro = 'Informe um valor válido para saque.';
      return;
    }

    this.contaService.sacar(this.numeroConta, this.valor).subscribe({
      next: (response) => {
        this.ultimoSaque = response.valor;
        this.saldoAtual = response.saldo;
        this.mensagem = `Saque confirmado em ${this.formatDateTime(response.data)}. Saldo atual: ${this.formatCurrency(response.saldo)}.`;
        this.valor = null;
      },
      error: (error) => {
        const apiMessage = error?.error?.message ?? error?.error?.erro ?? error?.message;
        this.erro = apiMessage || 'Não foi possível realizar o saque.';
      },
    });
  }

  public getDisponivelTotal(): number {
    return (this.saldoAtual ?? 0) + (this.limiteAtual ?? 0);
  }

  public formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public formatDateTime(value: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  }


  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
