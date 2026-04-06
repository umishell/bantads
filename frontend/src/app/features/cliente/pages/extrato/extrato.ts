import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  private readonly router = inject(Router);

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
    this.consultar();
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

  public gerarPdf(): void {
    if (!this.extrato) {
      return;
    }

    const janela = window.open('', '_blank', 'width=1024,height=768');
    if (!janela) {
      this.errorMessage = 'Não foi possível abrir a janela de impressão do PDF.';
      return;
    }

    const linhas = this.extrato.dias
      .map((dia) => {
        const movimentos = dia.movimentacoes.length
          ? dia.movimentacoes
              .map((mov) => {
                const classe = mov.natureza === 'ENTRADA' ? 'entrada' : 'saida';
                return `
                  <tr class="${classe}">
                    <td>${this.escapeHtml(this.formatDateTime(mov.dataHora))}</td>
                    <td>${this.escapeHtml(mov.operacao)}</td>
                    <td>${this.escapeHtml(mov.origem || '-')}</td>
                    <td>${this.escapeHtml(mov.destino || '-')}</td>
                    <td>${this.escapeHtml(this.formatCurrency(mov.valor))}</td>
                  </tr>
                `;
              })
              .join('')
          : `<tr><td colspan="5">Nenhuma movimentação neste dia.</td></tr>`;

        return `
          <section class="dia-bloco">
            <h2>${this.escapeHtml(this.formatDate(dia.data))}</h2>
            <p>Saldo consolidado do dia: <strong>${this.escapeHtml(this.formatCurrency(dia.saldoConsolidado))}</strong></p>
            <table>
              <thead>
                <tr>
                  <th>Data/hora</th>
                  <th>Operação</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>${movimentos}</tbody>
            </table>
          </section>
        `;
      })
      .join('');

    janela.document.write(`
      <html>
        <head>
          <title>Extrato BANTADS - Conta ${this.numeroConta}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1, h2 { margin: 0 0 12px; }
            .meta { margin-bottom: 20px; color: #475569; }
            .dia-bloco { margin-top: 24px; page-break-inside: avoid; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #f8fafc; }
            .entrada td { color: #2563eb; }
            .saida td { color: #c53030; }
          </style>
        </head>
        <body>
          <h1>Extrato BANTADS</h1>
          <div class="meta">
            <div>Agência ${this.agencia}</div>
            <div>Conta ${this.numeroConta}</div>
            <div>Período ${this.getPeriodoSelecionado()}</div>
            <div>Saldo atual ${this.formatCurrency(this.extrato.saldo)}</div>
          </div>
          ${linhas}
        </body>
      </html>
    `);
    janela.document.close();
    janela.focus();
    janela.print();
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

  private escapeHtml(value: string): string {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }


  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
