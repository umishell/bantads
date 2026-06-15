import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  AdminGerenteFormModel,
  AdminGerenteModel,
} from '../../../../shared/models/admin/admin.model';
import { AdminService } from '../../../../shared/services/admin.service';
import { ProcessandoButtonComponent } from '../../../../shared/components/processando-button/processando-button.component';
import {
  digitsOnlyCpf,
  normalizeEmail,
  normalizeTelefone,
} from '../../../../shared/utils/bantads-input.util';
import { formatCpfInput, formatTelefoneInput } from '../../../../shared/utils/bantads-mask.util';
import { getFieldErrorMessage, isFieldInvalid } from '../../../../shared/utils/form-field.util';
import { mensagemErroHttp } from '../../../../shared/utils/http-error.util';
import {
  bantadsEmailValidators,
  bantadsSenhaValidators,
  cpfValidator,
  telefoneValidator,
} from '../../../../shared/validators/bantads-form.validators';

type GerenteFormField = 'cpf' | 'nome' | 'email' | 'telefone' | 'senha';

@Component({
  selector: 'app-admin-gerentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProcessandoButtonComponent],
  templateUrl: './gerentes.html',
  styleUrl: './gerentes.scss',
})
export class AdminGerentesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  public readonly loading = signal(false);
  public readonly salvando = signal(false);
  public readonly errorMessage = signal('');
  public readonly successMessage = signal('');
  public readonly gerentes = signal<AdminGerenteModel[]>([]);
  public readonly modoEdicao = signal(false);
  public readonly gerenteEditandoCpf = signal<string | null>(null);

  public readonly gerenteForm = this.fb.group({
    cpf: ['', [Validators.required, cpfValidator()]],
    nome: ['', [Validators.required]],
    email: ['', bantadsEmailValidators],
    telefone: ['', [Validators.required, Validators.maxLength(15), telefoneValidator()]],
    senha: ['', bantadsSenhaValidators],
  });

  public ngOnInit(): void {
    this.carregarGerentes();
  }

  public carregarGerentes(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminService.listarGerentes().subscribe({
      next: (gerentes) => {
        this.gerentes.set(gerentes);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Não foi possível carregar os gerentes.');
        this.loading.set(false);
      },
    });
  }

  public iniciarCadastro(): void {
    this.modoEdicao.set(false);
    this.gerenteEditandoCpf.set(null);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.gerenteForm.reset({
      cpf: '',
      nome: '',
      email: '',
      telefone: '',
      senha: '',
    });
    this.configurarValidacaoSenha(false);
    this.gerenteForm.get('cpf')?.enable();
    this.gerenteForm.get('telefone')?.enable();
  }

  public editarGerente(gerente: AdminGerenteModel): void {
    this.modoEdicao.set(true);
    this.gerenteEditandoCpf.set(digitsOnlyCpf(gerente.cpf));
    this.successMessage.set('');
    this.errorMessage.set('');
    this.gerenteForm.patchValue({
      cpf: formatCpfInput(gerente.cpf),
      nome: gerente.nome,
      email: gerente.email,
      telefone: formatTelefoneInput(gerente.telefone),
      senha: '',
    });
    this.configurarValidacaoSenha(true);
    this.gerenteForm.get('cpf')?.disable();
    this.gerenteForm.get('telefone')?.disable();
    this.successMessage.set(`Editando gerente ${gerente.nome}. O formulário foi levado para o topo.`);
    this.scrollToFormulario();
  }

  public cancelarEdicao(): void {
    this.iniciarCadastro();
  }

  public salvar(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.aplicarMascaras();
    this.normalizarCampos();

    if (this.gerenteForm.invalid) {
      this.gerenteForm.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    const raw = this.gerenteForm.getRawValue();
    const senhaInformada = (raw.senha ?? '').trim();

    if (this.modoEdicao() && this.gerenteEditandoCpf()) {
      this.adminService
        .atualizarGerente(this.gerenteEditandoCpf()!, {
          nome: raw.nome ?? '',
          email: normalizeEmail(raw.email ?? ''),
          senha: senhaInformada.length > 0 ? senhaInformada : undefined,
        })
        .subscribe({
          next: (response) => {
            this.successMessage.set(response.mensagem);
            this.salvando.set(false);
            this.carregarGerentes();
            this.gerenteForm.patchValue({ senha: '' }, { emitEvent: false });
          },
          error: (error) => {
            this.errorMessage.set(error?.message || 'Não foi possível atualizar o gerente.');
            this.salvando.set(false);
          },
        });
      return;
    }

    const payload: AdminGerenteFormModel = {
      cpf: digitsOnlyCpf(raw.cpf ?? ''),
      nome: raw.nome ?? '',
      email: normalizeEmail(raw.email ?? ''),
      telefone: normalizeTelefone(raw.telefone ?? ''),
      senha: senhaInformada,
    };

    this.adminService.inserirGerente(payload).subscribe({
      next: (response) => {
        this.successMessage.set(response.mensagem + (response.detalhes?.length ? ` ${response.detalhes.join(' ')}` : ''));
        this.salvando.set(false);
        this.carregarGerentes();
        this.iniciarCadastro();
      },
          error: (error) => {
            this.errorMessage.set(mensagemErroHttp(error, 'Não foi possível inserir o gerente.'));
            this.salvando.set(false);
          },
    });
  }

  public removerGerente(gerente: AdminGerenteModel): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const confirmado = window.confirm(
      `Deseja remover o gerente ${gerente.nome}? As contas vinculadas serão redistribuídas automaticamente.`,
    );

    if (!confirmado) {
      return;
    }

    this.adminService.removerGerente(gerente.cpf).subscribe({
      next: (response) => {
        this.successMessage.set(response.mensagem + (response.detalhes?.length ? ` ${response.detalhes.join(' ')}` : ''));
        this.carregarGerentes();
      },
      error: (error) => {
        this.errorMessage.set(mensagemErroHttp(error, 'Não foi possível remover o gerente.'));
      },
    });
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public onCpfInput(event: Event): void {
    this.aplicarMascaraCampo(event, 'cpf', formatCpfInput);
  }

  public onTelefoneInput(event: Event): void {
    this.aplicarMascaraCampo(event, 'telefone', formatTelefoneInput);
  }

  public aplicarMascaras(): void {
    this.gerenteForm.patchValue(
      {
        cpf: formatCpfInput(this.gerenteForm.controls.cpf.value ?? ''),
        telefone: formatTelefoneInput(this.gerenteForm.controls.telefone.value ?? ''),
      },
      { emitEvent: false },
    );
  }

  public normalizarCampos(): void {
    this.gerenteForm.patchValue(
      {
        email: normalizeEmail(this.gerenteForm.controls.email.value ?? ''),
      },
      { emitEvent: false },
    );
    this.gerenteForm.updateValueAndValidity({ emitEvent: false });
  }

  public isInvalid(controlName: GerenteFormField): boolean {
    return isFieldInvalid(this.gerenteForm.get(controlName));
  }

  public getErrorMessage(controlName: GerenteFormField): string {
    const custom: Record<string, string> = {
      cpf: 'Informe um CPF válido com 11 dígitos.',
      telefone: 'Informe um telefone válido (DDD + número).',
      pattern: 'Formato inválido.',
    };

    if (controlName === 'email') {
      custom['pattern'] = 'Informe um e-mail válido (ex.: gerente@bantads.com.br).';
    }

    if (controlName === 'senha') {
      custom['minlength'] = 'A senha deve ter pelo menos 4 caracteres.';
    }

    return getFieldErrorMessage(this.gerenteForm.get(controlName), custom);
  }

  private configurarValidacaoSenha(edicao: boolean): void {
    const senhaCtrl = this.gerenteForm.controls.senha;
    senhaCtrl.setValidators(edicao ? [Validators.minLength(4)] : bantadsSenhaValidators);
    senhaCtrl.updateValueAndValidity({ emitEvent: false });
  }

  private aplicarMascaraCampo(
    event: Event,
    controlName: 'cpf' | 'telefone',
    formatter: (raw: string) => string,
  ): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatter(input.value);
    this.gerenteForm.controls[controlName].setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  private scrollToFormulario(): void {
    setTimeout(() => {
      document.getElementById('gerente-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  public logout(): void {
    this.authService.sair(this.router);
  }
}
