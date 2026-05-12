import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { API_BASE } from '../../core/config/api-base';
import { AuthService } from '../../core/services/auth.service';
import { LancamentoExtratoDto, OperacaoResponseDto, ValorRequestDto } from '../models/api/bantads-api.models';
import { ExtratoFiltroModel } from '../models/conta/extrato-filtro.model';
import { ExtratoResponseModel } from '../models/conta/extrato-response.model';
import { TransferenciaRequestModel } from '../models/conta/transferencia-request.model';
import { TransferenciaResponseModel } from '../models/conta/transferencia-response.model';
import {
  favorecidosFromExtrato,
  mapExtratoLancamentos,
  mapOperacaoDepositoSaque,
  mapOperacaoTransferencia,
} from './bantads-mappers';

type OperacaoContaResponse = {
  conta: string;
  data: string;
  saldo: number;
  valor: number;
};

type FavorecidoConta = {
  cpf: string;
  nome: string;
  conta: string;
  agencia: string;
};

@Injectable({
  providedIn: 'root',
})
export class ContaService {
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);

  public depositar(numeroConta: string, valor: number): Observable<OperacaoContaResponse> {
    const body: ValorRequestDto = { valor };
    return this.http
      .post<OperacaoResponseDto>(`${API_BASE}/contas/${numeroConta}/depositar`, body)
      .pipe(map((res) => mapOperacaoDepositoSaque(numeroConta, res)));
  }

  public depositarNaMinhaConta(valor: number): Observable<OperacaoContaResponse> {
    const numeroConta = this.authService.getNumeroConta();
    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }
    return this.depositar(numeroConta, valor);
  }

  public sacar(numeroConta: string, valor: number): Observable<OperacaoContaResponse> {
    const body: ValorRequestDto = { valor };
    return this.http
      .post<OperacaoResponseDto>(`${API_BASE}/contas/${numeroConta}/sacar`, body)
      .pipe(map((res) => mapOperacaoDepositoSaque(numeroConta, res)));
  }

  public sacarDaMinhaConta(valor: number): Observable<OperacaoContaResponse> {
    const numeroConta = this.authService.getNumeroConta();
    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }
    return this.sacar(numeroConta, valor);
  }

  public transferir(
    numeroConta: string,
    payload: TransferenciaRequestModel,
  ): Observable<TransferenciaResponseModel> {
    const body = { numeroContaDestino: payload.destino, valor: payload.valor };
    return this.http
      .post<OperacaoResponseDto>(`${API_BASE}/contas/${numeroConta}/transferir`, body)
      .pipe(map((res) => mapOperacaoTransferencia(numeroConta, payload.destino, res)));
  }

  public transferirDaMinhaConta(payload: TransferenciaRequestModel): Observable<TransferenciaResponseModel> {
    const numeroConta = this.authService.getNumeroConta();
    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }
    return this.transferir(numeroConta, payload);
  }

  public consultarExtrato(
    numeroConta: string,
    filtro: ExtratoFiltroModel,
  ): Observable<ExtratoResponseModel> {
    let params = new HttpParams();
    if (filtro.dataInicio) {
      params = params.set('dataInicio', filtro.dataInicio);
    }
    if (filtro.dataFim) {
      params = params.set('dataFim', filtro.dataFim);
    }
    return this.http
      .get<LancamentoExtratoDto[]>(`${API_BASE}/contas/${numeroConta}/extrato`, { params })
      .pipe(map((rows) => mapExtratoLancamentos(numeroConta, rows)));
  }

  public consultarMeuExtrato(filtro: ExtratoFiltroModel): Observable<ExtratoResponseModel> {
    const numeroConta = this.authService.getNumeroConta();
    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }
    return this.consultarExtrato(numeroConta, filtro);
  }

  /**
   * Contrapartes deduzidas do extrato (transferências), via `GET .../extrato`.
   * Sem histórico de transferências a lista fica vazia; o destino pode ser digitado.
   */
  public listarFavorecidos(numeroContaOrigem?: string | null): Observable<FavorecidoConta[]> {
    const n = numeroContaOrigem ?? this.authService.getNumeroConta();
    if (!n) {
      return of([]);
    }
    const hoje = new Date();
    const inicio = new Date(hoje);
    inicio.setFullYear(inicio.getFullYear() - 1);
    const filtro: ExtratoFiltroModel = {
      dataInicio: inicio.toISOString().slice(0, 10),
      dataFim: hoje.toISOString().slice(0, 10),
    };
    return this.consultarExtrato(n, filtro).pipe(
      map((extrato) => favorecidosFromExtrato(n, extrato)),
      catchError(() => of([])),
    );
  }
}
