import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ExtratoDiaModel } from '../models/conta/extrato-dia.model';
import { ExtratoFiltroModel } from '../models/conta/extrato-filtro.model';
import {
  ExtratoMovimentacaoModel,
  NaturezaLancamento,
} from '../models/conta/extrato-movimentacao.model';
import { ExtratoResponseModel } from '../models/conta/extrato-response.model';
import { TransferenciaRequestModel } from '../models/conta/transferencia-request.model';
import { TransferenciaResponseModel } from '../models/conta/transferencia-response.model';
import { AuthService } from '../../core/services/auth.service';

type RawExtratoMovimentacao = {
  dataHora?: string;
  data_hora?: string;
  data?: string;
  operacao?: string;
  tipo?: string;
  origem?: string | null;
  clienteOrigem?: string | null;
  cliente_origem?: string | null;
  destino?: string | null;
  clienteDestino?: string | null;
  cliente_destino?: string | null;
  valor?: number | string;
  natureza?: string;
};

type RawExtratoDia = {
  data?: string;
  saldoConsolidado?: number | string;
  saldo_consolidado?: number | string;
  saldo?: number | string;
  movimentacoes?: RawExtratoMovimentacao[];
};

type RawExtratoResponse = {
  conta?: string;
  saldo?: number | string;
  dias?: RawExtratoDia[];
  movimentacoes?: RawExtratoMovimentacao[];
};

@Injectable({
  providedIn: 'root',
})
export class ContaService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  /**
   * Ajuste para a URL real do API Gateway do grupo.
   * Exemplo: http://localhost:8080
   */
  private readonly apiUrl = 'http://localhost:8080';

  transferir(
    numeroConta: string,
    payload: TransferenciaRequestModel,
  ): Observable<TransferenciaResponseModel> {
    return this.http.post<TransferenciaResponseModel>(
      `${this.apiUrl}/contas/${numeroConta}/transferir`,
      payload,
    );
  }

  transferirDaMinhaConta(payload: TransferenciaRequestModel): Observable<TransferenciaResponseModel> {
    const numeroConta = this.authService.getNumeroConta();

    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }

    return this.transferir(numeroConta, payload);
  }

  consultarExtrato(
    numeroConta: string,
    filtro: ExtratoFiltroModel,
  ): Observable<ExtratoResponseModel> {
    const params = new HttpParams()
      .set('dataInicio', filtro.dataInicio)
      .set('dataFim', filtro.dataFim);

    return this.http
      .get<RawExtratoResponse>(`${this.apiUrl}/contas/${numeroConta}/extrato`, { params })
      .pipe(map((response) => this.normalizarExtrato(response, numeroConta)));
  }

  consultarMeuExtrato(filtro: ExtratoFiltroModel): Observable<ExtratoResponseModel> {
    const numeroConta = this.authService.getNumeroConta();

    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }

    return this.consultarExtrato(numeroConta, filtro);
  }

  private normalizarExtrato(
    response: RawExtratoResponse,
    numeroConta: string,
  ): ExtratoResponseModel {
    if (response?.dias?.length) {
      return {
        conta: response.conta ?? numeroConta,
        saldo: this.toNumber(response.saldo),
        dias: response.dias.map((dia) => this.normalizarDia(dia)),
      };
    }

    if (response?.movimentacoes?.length) {
      return {
        conta: response.conta ?? numeroConta,
        saldo: this.toNumber(response.saldo),
        dias: this.agruparMovimentacoesPorDia(response.movimentacoes, this.toNumber(response.saldo)),
      };
    }

    return {
      conta: response?.conta ?? numeroConta,
      saldo: this.toNumber(response?.saldo),
      dias: [],
    };
  }

  private normalizarDia(dia: RawExtratoDia): ExtratoDiaModel {
    return {
      data: dia.data ?? '',
      saldoConsolidado:
        this.toNumber(dia.saldoConsolidado) ??
        this.toNumber(dia.saldo_consolidado) ??
        this.toNumber(dia.saldo) ??
        0,
      movimentacoes: (dia.movimentacoes ?? []).map((mov) => this.normalizarMovimentacao(mov)),
    };
  }

  private normalizarMovimentacao(mov: RawExtratoMovimentacao): ExtratoMovimentacaoModel {
    const operacao = String(mov.operacao ?? mov.tipo ?? '').toUpperCase();

    return {
      dataHora: mov.dataHora ?? mov.data_hora ?? mov.data ?? '',
      operacao,
      origem: mov.origem ?? mov.clienteOrigem ?? mov.cliente_origem ?? null,
      destino: mov.destino ?? mov.clienteDestino ?? mov.cliente_destino ?? null,
      valor: this.toNumber(mov.valor) ?? 0,
      natureza: this.normalizarNatureza(mov.natureza, operacao),
    };
  }

  private normalizarNatureza(
    rawNatureza: string | undefined,
    operacao: string,
  ): NaturezaLancamento {
    const natureza = String(rawNatureza ?? '').toUpperCase();

    if (natureza === 'ENTRADA' || natureza === 'SAIDA') {
      return natureza;
    }

    if (operacao === 'DEPOSITO') {
      return 'ENTRADA';
    }

    if (operacao === 'SAQUE') {
      return 'SAIDA';
    }

    return 'SAIDA';
  }

  private agruparMovimentacoesPorDia(
    movimentacoes: RawExtratoMovimentacao[],
    saldoFallback?: number,
  ): ExtratoDiaModel[] {
    const grouped = new Map<string, ExtratoMovimentacaoModel[]>();

    for (const rawMov of movimentacoes) {
      const mov = this.normalizarMovimentacao(rawMov);
      const key = mov.dataHora.slice(0, 10);
      const current = grouped.get(key) ?? [];
      current.push(mov);
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, items]) => ({
        data,
        saldoConsolidado: saldoFallback ?? 0,
        movimentacoes: items.sort((a, b) => a.dataHora.localeCompare(b.dataHora)),
      }));
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace('.', '').replace(',', '.').trim();
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  }
}
