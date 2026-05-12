import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ClienteService } from '../../../shared/services/cliente.service';

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './autocadastro.component.html',
  styleUrl: './autocadastro.component.scss',
})
export class AutocadastroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);

  public readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(200)]],
    cpf: ['', [Validators.required, Validators.pattern(/^[\d.\-\s]{11,14}$/)]],
    telefone: ['', [Validators.required, Validators.maxLength(20)]],
    salario: [null as number | null, [Validators.required, Validators.min(0.01)]],
    endereco: ['', [Validators.required, Validators.maxLength(255)]],
    cep: ['', [Validators.required, Validators.pattern(/^[\d]{5}-?[\d]{3}$|^\d{8}$/)]],
    cidade: ['', [Validators.required, Validators.maxLength(120)]],
    estado: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
  });

  public erro = '';
  public sucesso = '';
  public carregando = false;

  public enviar(): void {
    this.erro = '';
    this.sucesso = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const cpfDigits = v.cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      this.erro = 'CPF deve ter 11 dígitos.';
      return;
    }

    this.carregando = true;
    this.clienteService
      .solicitarAutocadastro({
        cpf: cpfDigits,
        email: v.email,
        nome: v.nome,
        telefone: v.telefone,
        salario: Number(v.salario),
        endereco: v.endereco,
        cep: v.cep.replace(/\D/g, ''),
        cidade: v.cidade,
        estado: v.estado,
      })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (res) => {
          this.sucesso = [res.message, ...(res.avisos ?? [])].filter(Boolean).join(' ');
          this.form.reset();
        },
        error: (err) => {
          const msg = err?.error?.message ?? err?.error?.erro ?? err?.message;
          this.erro = typeof msg === 'string' ? msg : 'Não foi possível enviar o cadastro.';
        },
      });
  }
}
