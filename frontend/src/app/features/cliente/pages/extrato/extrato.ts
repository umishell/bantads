import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ExtratoDiaModel } from '../../../../shared/models/conta/extrato-dia.model';
import { ExtratoMovimentacaoModel } from '../../../../shared/models/conta/extrato-movimentacao.model';
import { ExtratoResponseModel } from '../../../../shared/models/conta/extrato-response.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ContaService } from '../../../../shared/services/conta.service';

@Component({
  selector: 'app-extrato',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './extrato.html',
  styleUrl: './extrato.scss',
})
export class ExtratoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contaService = inject(ContaService);
  private readonly authService = inject(AuthService);

  public readonly numeroConta = this.authService.getNumeroConta();
  public readonly agencia = '0001';

  public readonly filtroForm = this.fb.group({
    dataInicio: ['', Validators.required],
    dataFim: ['', Validators.required],
  });

  public loading = false;
  public errorMessage = '';
  public extrato: ExtratoResponseModel | null = null;

  public ngOnInit(): void {
    this.preencherUltimos30Dias();
  }

  public consultar(): void {
    this.errorMessage = '';

    if (!this.numeroConta) {
      this.errorMessage = 'Não foi possível identificar a conta do cliente logado.';
      return;
    }

    if (this.filtroForm.invalid) {
      this.filtroForm.markAllAsTouched();
      return;
    }

    const { dataInicio, dataFim } = this.filtroForm.getRawValue();

    if ((dataInicio ?? '') > (dataFim ?? '')) {
      this.errorMessage = 'A data inicial não pode ser maior que a data final.';
      return;
    }

    this.loading = true;
    this.extrato = null;

    this.contaService
      .consultarExtrato(this.numeroConta, {
        dataInicio: dataInicio ?? '',
        dataFim: dataFim ?? '',
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) => {
          this.extrato = response;
        },
        error: (error) => {
          const apiMessage = error?.error?.message ?? error?.error?.erro ?? error?.message;
          this.errorMessage = apiMessage || 'Não foi possível consultar o extrato.';
        },
      });
  }

  public isInvalid(controlName: 'dataInicio' | 'dataFim'): boolean {
    const control = this.filtroForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  public hasDias(): boolean {
    return !!this.extrato?.dias?.length;
  }

  public isEntrada(movimentacao: ExtratoMovimentacaoModel): boolean {
    return movimentacao.natureza === 'ENTRADA';
  }

  public isSaida(movimentacao: ExtratoMovimentacaoModel): boolean {
    return movimentacao.natureza === 'SAIDA';
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public formatDate(value: string): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(`${value}T00:00:00`));
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

  public trackDia(_: number, dia: ExtratoDiaModel): string {
    return dia.data;
  }

  public trackMovimentacao(_: number, movimentacao: ExtratoMovimentacaoModel): string {
    return `${movimentacao.dataHora}-${movimentacao.operacao}-${movimentacao.valor}`;
  }

  public getPeriodoSelecionado(): string {
    const { dataInicio, dataFim } = this.filtroForm.getRawValue();

    if (!dataInicio || !dataFim) {
      return 'Período não definido';
    }

    return `${this.formatDate(dataInicio)} até ${this.formatDate(dataFim)}`;
  }

  private preencherUltimos30Dias(): void {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);

    this.filtroForm.patchValue({
      dataInicio: this.formatIsoDate(start),
      dataFim: this.formatIsoDate(today),
    });
  }

  private formatIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
