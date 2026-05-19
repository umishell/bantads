import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ClienteModel } from '../../../../shared/models/cliente/cliente.model';
import { mensagemErroHttp } from '../../../../shared/utils/http-error.util';

type ClientePerfil = ClienteModel & {
  gerente_email?: string;
  cep?: string;
  agencia?: string;
};

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public loading = false;
  public salvando = false;
  public errorMessage = '';
  public successMessage = '';
  public securityErrorMessage = '';
  public securitySuccessMessage = '';
  public clienteResumo: ClientePerfil | null = null;
  /** Troca de senha pelo cliente ainda não exposta na API. */
  public readonly trocaSenhaDisponivel = false;

  private readonly agenciaPadrao = '0001';

  public readonly perfilForm = this.fb.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    cpf: [{ value: '', disabled: true }],
    telefone: ['', [Validators.required]],
    salario: [0, [Validators.required, Validators.min(0)]],
    endereco: ['', [Validators.required]],
    cep: ['', [Validators.required]],
    cidade: ['', [Validators.required]],
    estado: ['', [Validators.required]],
  });

  public readonly senhaForm = this.fb.group({
    senhaAtual: ['', [Validators.required, Validators.minLength(4)]],
    novaSenha: ['', [Validators.required, Validators.minLength(4)]],
    confirmarNovaSenha: ['', [Validators.required, Validators.minLength(4)]],
  });

  public ngOnInit(): void {
    this.carregarDados();
  }

  public carregarDados(): void {
    const cpf = this.authService.getCpf();

    if (!cpf) {
      this.errorMessage = 'Não foi possível identificar o usuário logado.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.clienteService
      .buscarPorCpf(cpf)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (cliente: ClienteModel) => {
          this.aplicarCliente(cliente as ClientePerfil);
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = mensagemErroHttp(error, 'Não foi possível carregar o perfil.');
        },
      });
  }

  public salvar(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    const cpf = this.authService.getCpf();
    if (!cpf) {
      this.errorMessage = 'Não foi possível identificar o usuário logado.';
      return;
    }

    const raw = this.perfilForm.getRawValue();
    const dadosAtualizados: Partial<ClienteModel> = {
      nome: raw.nome ?? undefined,
      email: raw.email ?? undefined,
      telefone: raw.telefone ?? undefined,
      salario: raw.salario ?? undefined,
      endereco: raw.endereco ?? undefined,
      cidade: raw.cidade ?? undefined,
      estado: raw.estado ?? undefined,
      cep: raw.cep ?? undefined,
    };

    this.salvando = true;

    this.clienteService
      .alterarPerfil(cpf, dadosAtualizados)
      .pipe(finalize(() => (this.salvando = false)))
      .subscribe({
        next: (clienteAtualizado) => {
          this.aplicarCliente(clienteAtualizado as ClientePerfil);
          this.successMessage = 'Perfil atualizado com sucesso.';
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = mensagemErroHttp(error, 'Não foi possível atualizar o perfil.');
        },
      });
  }

  public salvarSenha(): void {
    this.securityErrorMessage =
      'A troca de senha pelo cliente ainda não está disponível na API. Utilize a senha enviada por e-mail ou contate seu gerente.';
    this.securitySuccessMessage = '';
  }

  public isInvalid(controlName: string): boolean {
    const control = this.perfilForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  public isSenhaInvalid(controlName: string): boolean {
    const control = this.senhaForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  public getErrorMessage(controlName: string): string {
    const control = this.perfilForm.get(controlName);

    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Campo obrigatório.';
    if (control.errors['email']) return 'Informe um e-mail válido.';
    if (control.errors['min']) return 'Informe um valor válido.';

    return 'Valor inválido.';
  }

  public getSenhaErrorMessage(controlName: string): string {
    const control = this.senhaForm.get(controlName);

    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'Campo obrigatório.';
    if (control.errors['minlength']) return 'Use pelo menos 4 caracteres.';

    return 'Valor inválido.';
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
    switch (this.clienteResumo?.situacao) {
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
    switch (this.clienteResumo?.situacao) {
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

  public getAgencia(): string {
    return this.clienteResumo?.agencia ?? this.agenciaPadrao;
  }

  private aplicarCliente(cliente: ClientePerfil): void {
    const clienteFormatado = {
      ...cliente,
      agencia: cliente.agencia ?? this.agenciaPadrao,
    };

    this.clienteResumo = clienteFormatado;
    this.preencherFormulario(clienteFormatado);
  }

  private preencherFormulario(cliente: ClientePerfil): void {
    this.perfilForm.patchValue({
      nome: cliente.nome ?? '',
      email: cliente.email ?? '',
      cpf: cliente.cpf ?? '',
      telefone: cliente.telefone ?? '',
      salario: cliente.salario ?? 0,
      endereco: cliente.endereco ?? '',
      cep: cliente.cep ?? '',
      cidade: cliente.cidade ?? '',
      estado: cliente.estado ?? '',
    });
  }

  public logout(): void {
    this.authService.sair(this.router);
  }
}
