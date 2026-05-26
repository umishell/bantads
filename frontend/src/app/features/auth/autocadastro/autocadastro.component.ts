import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';

import { ProcessandoButtonComponent } from '../../../shared/components/processando-button/processando-button.component';
import { ClienteService } from '../../../shared/services/cliente.service';
import { ViaCepService } from '../../../shared/services/viacep.service';
import {
  digitsOnlyCpf,
  normalizeCep,
  normalizeEmail,
  normalizeNome,
  normalizeSalario,
  normalizeTelefone,
  normalizeUf,
} from '../../../shared/utils/bantads-input.util';
import {
  digitsOnly,
  formatCepInput,
  formatCpfInput,
  formatTelefoneInput,
} from '../../../shared/utils/bantads-mask.util';
import { getFieldErrorMessage, isFieldInvalid } from '../../../shared/utils/form-field.util';
import {
  bantadsEmailValidators,
  cepValidator,
  cpfValidator,
  salarioValidator,
  telefoneValidator,
  ufValidator,
} from '../../../shared/validators/bantads-form.validators';

type AutocadastroField =
  | 'nome'
  | 'email'
  | 'cpf'
  | 'telefone'
  | 'salario'
  | 'endereco'
  | 'cep'
  | 'cidade'
  | 'estado';

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProcessandoButtonComponent],
  templateUrl: './autocadastro.component.html',
  styleUrl: './autocadastro.component.scss',
})
export class AutocadastroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly viaCepService = inject(ViaCepService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', bantadsEmailValidators],
    cpf: ['', [Validators.required, cpfValidator()]],
    telefone: ['', [Validators.required, Validators.maxLength(15), telefoneValidator()]],
    salario: ['', [Validators.required, salarioValidator()]],
    endereco: ['', [Validators.required, Validators.maxLength(255)]],
    cep: ['', [Validators.required, cepValidator()]],
    cidade: ['', [Validators.required, Validators.maxLength(120)]],
    estado: ['', [Validators.required, ufValidator()]],
  });

  public erro = '';
  public sucesso = '';
  public carregando = false;
  public buscandoCep = false;
  public cepInfo = '';
  public cepErro = '';
  private ultimoCepConsultado = '';

  public enviar(): void {
    this.erro = '';
    this.sucesso = '';
    this.aplicarMascaras();
    this.normalizarCampos();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const cpfDigits = digitsOnlyCpf(v.cpf);
    const salario = normalizeSalario(v.salario);

    this.carregando = true;
    this.clienteService
      .solicitarAutocadastro({
        cpf: cpfDigits,
        email: normalizeEmail(v.email),
        nome: normalizeNome(v.nome),
        telefone: normalizeTelefone(v.telefone),
        salario,
        endereco: v.endereco.trim(),
        cep: normalizeCep(v.cep),
        cidade: v.cidade.trim(),
        estado: normalizeUf(v.estado),
      })
      .pipe(
        timeout(60_000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.carregando = false;
        }),
      )
      .subscribe({
        next: (res) => {
          this.sucesso = [res.message, ...(res.avisos ?? [])].filter(Boolean).join(' ');
          this.form.reset();
          this.cepInfo = '';
          this.cepErro = '';
        },
        error: (err) => {
          this.erro = this.mapErroAutocadastro(err);
        },
      });
  }

  public isInvalid(controlName: AutocadastroField): boolean {
    return isFieldInvalid(this.form.get(controlName));
  }

  public getErrorMessage(controlName: AutocadastroField): string {
    const custom: Record<string, string> = {
      pattern: 'Formato inválido.',
      cpf: 'Informe um CPF válido com 11 dígitos.',
      telefone: 'Informe um telefone válido (DDD + número).',
      cep: 'Informe um CEP válido com 8 dígitos.',
      uf: 'Informe a sigla UF com 2 letras.',
      salario: 'Informe um salário maior que zero.',
    };

    if (controlName === 'email') {
      custom['pattern'] = 'Informe um e-mail válido (ex.: usuario@bantads.com.br).';
    }

    return getFieldErrorMessage(this.form.get(controlName), custom);
  }

  public onCpfInput(event: Event): void {
    this.aplicarMascaraCampo(event, 'cpf', formatCpfInput);
  }

  public onTelefoneInput(event: Event): void {
    this.aplicarMascaraCampo(event, 'telefone', formatTelefoneInput);
  }

  public onCepInput(event: Event): void {
    this.aplicarMascaraCampo(event, 'cep', formatCepInput);
    const digits = digitsOnly(this.form.controls.cep.value);
    if (digits.length === 8) {
      this.buscarEnderecoPorCep();
    } else {
      this.cepInfo = '';
      this.cepErro = '';
      this.ultimoCepConsultado = '';
    }
  }

  public onCepBlur(): void {
    this.aplicarMascaras();
    const digits = digitsOnly(this.form.controls.cep.value);
    if (digits.length === 8 && !this.buscandoCep) {
      this.buscarEnderecoPorCep();
    }
  }

  public normalizarCampos(): void {
    this.form.patchValue(
      {
        email: normalizeEmail(this.form.controls.email.value),
        estado: normalizeUf(this.form.controls.estado.value),
        nome: normalizeNome(this.form.controls.nome.value),
      },
      { emitEvent: false },
    );
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  public aplicarMascaras(): void {
    this.form.patchValue(
      {
        cpf: formatCpfInput(this.form.controls.cpf.value),
        telefone: formatTelefoneInput(this.form.controls.telefone.value),
        cep: formatCepInput(this.form.controls.cep.value),
      },
      { emitEvent: false },
    );
  }

  private aplicarMascaraCampo(
    event: Event,
    controlName: 'cpf' | 'telefone' | 'cep',
    formatter: (raw: string) => string,
  ): void {
    const input = event.target as HTMLInputElement;
    const formatted = formatter(input.value);
    this.form.controls[controlName].setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }

  private buscarEnderecoPorCep(): void {
    const cepDigits = digitsOnly(this.form.controls.cep.value);
    if (cepDigits.length !== 8 || this.buscandoCep || this.ultimoCepConsultado === cepDigits) {
      return;
    }

    this.ultimoCepConsultado = cepDigits;

    this.buscandoCep = true;
    this.cepErro = '';
    this.cepInfo = 'Buscando endereço...';

    this.viaCepService
      .buscarEndereco(cepDigits)
      .pipe(
        finalize(() => {
          this.buscandoCep = false;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((endereco) => {
        if (!endereco) {
          this.cepInfo = '';
          this.cepErro = 'CEP não encontrado. Verifique os dígitos informados.';
          return;
        }

        const logradouro = endereco.logradouro || endereco.bairro;
        this.form.patchValue(
          {
            cep: formatCepInput(endereco.cep),
            endereco: logradouro,
            cidade: endereco.localidade,
            estado: endereco.uf,
          },
          { emitEvent: false },
        );

        this.cepErro = '';
        this.cepInfo = logradouro
          ? 'Endereço preenchido automaticamente. Informe o número no campo endereço, se necessário.'
          : 'Cidade e UF preenchidas. Informe o logradouro completo no campo endereço.';
      });
  }

  private mapErroAutocadastro(err: unknown): string {
    if (err instanceof TimeoutError) {
      return 'A solicitação demorou demais. Tente novamente em instantes.';
    }

    if (err instanceof HttpErrorResponse) {
      const apiMessage = err.error?.message ?? err.error?.erro;
      if (err.status === 409) {
        if (typeof apiMessage === 'string' && apiMessage.length > 0) {
          return `Este usuário já está cadastrado (${apiMessage}). Verifique CPF e e-mail ou faça login.`;
        }
        return 'Este usuário já está cadastrado. Verifique CPF e e-mail ou faça login.';
      }
      if (typeof apiMessage === 'string' && apiMessage.length > 0) {
        return apiMessage;
      }
    }

    const fallback = (err as { message?: string })?.message;
    return typeof fallback === 'string' && fallback.length > 0
      ? fallback
      : 'Não foi possível enviar o cadastro.';
  }
}
