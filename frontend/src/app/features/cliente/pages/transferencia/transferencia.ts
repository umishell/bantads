import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ContaService } from '../../../../shared/services/conta.service';

@Component({
  selector: 'app-transferencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './transferencia.html',
  styleUrl: './transferencia.scss',
})
export class TransferenciaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contaService = inject(ContaService);
  private readonly authService = inject(AuthService);

  public readonly numeroConta = this.authService.getNumeroConta();
  public readonly agencia = '0001';

  public readonly transferenciaForm = this.fb.group({
    destino: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  public loading = false;
  public errorMessage = '';
  public successMessage = '';

  public selecionarValor(valor: number): void {
    this.transferenciaForm.patchValue({ valor });
  }

  public submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.numeroConta) {
      this.errorMessage = 'Não foi possível identificar a conta do cliente logado.';
      return;
    }

    if (this.transferenciaForm.invalid) {
      this.transferenciaForm.markAllAsTouched();
      return;
    }

    const { destino, valor } = this.transferenciaForm.getRawValue();

    if (destino === this.numeroConta) {
      this.errorMessage = 'Você não pode transferir para a sua própria conta.';
      return;
    }

    this.loading = true;

    this.contaService
      .transferir(this.numeroConta, {
        destino: destino ?? '',
        valor: Number(valor ?? 0),
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.successMessage = `Transferência realizada com sucesso em ${this.formatDateTime(response.data)}. Saldo atual: ${this.formatCurrency(response.saldo)}.`;
          this.transferenciaForm.reset();
        },
        error: (error) => {
          const apiMessage = error?.error?.message ?? error?.error?.erro ?? error?.message;
          this.errorMessage = apiMessage || 'Não foi possível realizar a transferência.';
        },
      });
  }

  public isInvalid(controlName: 'destino' | 'valor'): boolean {
    const control = this.transferenciaForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
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
}
