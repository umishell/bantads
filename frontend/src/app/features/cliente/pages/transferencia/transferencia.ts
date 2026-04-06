import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ContaService } from '../../../../shared/services/conta.service';

type Favorecido = {
  cpf: string;
  nome: string;
  conta: string;
  agencia: string;
};

@Component({
  selector: 'app-transferencia',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './transferencia.html',
  styleUrl: './transferencia.scss',
})
export class TransferenciaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contaService = inject(ContaService);
  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public readonly numeroConta = this.authService.getNumeroConta();
  public readonly agencia = '0001';
  public saldoAtual: number | null = null;
  public favorecidos: Favorecido[] = [];

  public readonly transferenciaForm = this.fb.group({
    destino: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  public loading = false;
  public errorMessage = '';
  public successMessage = '';

  public ngOnInit(): void {
    const cpf = this.authService.getCpf();
    if (cpf) {
      this.clienteService.buscarPorCpf(cpf).subscribe({
        next: (cliente) => {
          this.saldoAtual = cliente.saldo ?? 0;
        },
      });
    }

    this.contaService.listarFavorecidos(this.numeroConta).subscribe({
      next: (favorecidos) => {
        this.favorecidos = favorecidos;
      },
    });
  }

  public selecionarValor(valor: number): void {
    this.transferenciaForm.patchValue({ valor });
  }

  public selecionarFavorecido(conta: string): void {
    this.transferenciaForm.patchValue({ destino: conta });
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
          this.saldoAtual = response.saldo;
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

  public getFavorecidoSelecionado(): Favorecido | null {
    const destino = this.transferenciaForm.get('destino')?.value;
    return this.favorecidos.find((item) => item.conta === destino) ?? null;
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
