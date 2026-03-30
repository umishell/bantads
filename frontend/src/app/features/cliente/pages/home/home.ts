import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ClienteModel } from '../../../../shared/models/cliente/cliente.model';

type ClienteDashboard = ClienteModel & {
  gerente_email?: string;
  cep?: string;
  agencia?: string;
};

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

  public loading = false;
  public errorMessage = '';
  public cliente: ClienteDashboard | null = null;
  public readonly numeroConta = this.authService.getNumeroConta();

  private usandoMock = false;
  private readonly agenciaPadrao = '0001';

  public ngOnInit(): void {
    this.carregarDashboard();
  }

  public carregarDashboard(): void {
    const cpf = this.authService.getCpf();

    if (!cpf) {
      this.carregarMock();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.clienteService
      .buscarPorCpf(cpf)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response: ClienteModel) => {
          this.cliente = {
            ...(response as ClienteDashboard),
            agencia: (response as ClienteDashboard).agencia ?? this.agenciaPadrao,
          };
          this.usandoMock = false;
        },
        error: (_error: HttpErrorResponse) => {
          this.carregarMock();
        },
      });
  }

  public get saudacao(): string {
    const hora = new Date().getHours();

    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  public get primeiroNome(): string {
    const nome = this.cliente?.nome?.trim() ?? 'Cliente';
    return nome.split(' ')[0] || 'Cliente';
  }

  public isSaldoNegativo(): boolean {
    return (this.cliente?.saldo ?? 0) < 0;
  }

  public formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public formatCpf(cpf: string | null | undefined): string {
    const digits = (cpf ?? '').replace(/\D/g, '');

    if (digits.length !== 11) return cpf ?? 'Não informado';

    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  public formatConta(conta: string | null | undefined): string {
    if (!conta) return 'Não informada';

    const limpa = conta.replace(/\s/g, '');

    if (limpa.includes('-')) return limpa;

    if (limpa.length > 1) {
      return `${limpa.slice(0, -1)}-${limpa.slice(-1)}`;
    }

    return limpa;
  }

  public getSituacaoLabel(): string {
    switch (this.cliente?.situacao) {
      case 'APROVADO':
        return 'Conta ativa';
      case 'PENDENTE':
        return 'Em análise';
      case 'REJEITADO':
        return 'Cadastro rejeitado';
      default:
        return 'Não informado';
    }
  }

  public getSituacaoClass(): string {
    switch (this.cliente?.situacao) {
      case 'APROVADO':
        return 'status--success';
      case 'PENDENTE':
        return 'status--warning';
      case 'REJEITADO':
        return 'status--danger';
      default:
        return 'status--neutral';
    }
  }

  public getSaldoDisponivel(): number {
    const saldo = this.cliente?.saldo ?? 0;
    const limite = this.cliente?.limite ?? 0;

    return saldo >= 0 ? saldo + limite : limite - Math.abs(saldo);
  }

  public getLimiteUtilizado(): number {
    const saldo = this.cliente?.saldo ?? 0;

    return saldo < 0 ? Math.abs(saldo) : 0;
  }

  public getPercentualLimiteUtilizado(): number {
    const limite = this.cliente?.limite ?? 0;

    if (limite <= 0) return 0;

    const percentual = (this.getLimiteUtilizado() / limite) * 100;

    return Math.max(0, Math.min(100, percentual));
  }

  public getAgencia(): string {
    return this.cliente?.agencia ?? this.agenciaPadrao;
  }

  public getModoVisualLabel(): string {
    return this.usandoMock ? 'Modo visual ativo' : 'Dados sincronizados';
  }

  private carregarMock(): void {
    this.cliente = {
      cpf: '00000000000',
      nome: 'Cliente Teste',
      telefone: '(41) 99999-9999',
      email: 'cliente@teste.com',
      endereco: 'Rua Exemplo, 123',
      cidade: 'Curitiba',
      estado: 'PR',
      salario: 5000,
      conta: this.numeroConta ?? '12345-6',
      saldo: 2450.75,
      limite: 1500,
      gerente_nome: 'Marina Souza',
      gerente_email: 'marina@bantads.com',
      situacao: 'APROVADO',
      cep: '80000-000',
      agencia: this.agenciaPadrao,
    };

    this.usandoMock = true;
    this.loading = false;
    this.errorMessage = '';
  }
}
