import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { ExtratoFiltroModel } from '../models/conta/extrato-filtro.model';
import { ExtratoResponseModel } from '../models/conta/extrato-response.model';
import { TransferenciaRequestModel } from '../models/conta/transferencia-request.model';
import { TransferenciaResponseModel } from '../models/conta/transferencia-response.model';
import { DemoBantadsStoreService } from './demo-bantads-store.service';

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
  private readonly demoStore = inject(DemoBantadsStoreService);

  public depositar(numeroConta: string, valor: number): Observable<OperacaoContaResponse> {
    return this.demoStore.depositar(numeroConta, valor);
  }

  public depositarNaMinhaConta(valor: number): Observable<OperacaoContaResponse> {
    const numeroConta = this.authService.getNumeroConta();

    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }

    return this.depositar(numeroConta, valor);
  }

  public sacar(numeroConta: string, valor: number): Observable<OperacaoContaResponse> {
    return this.demoStore.sacar(numeroConta, valor);
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
    return this.demoStore.transferir(numeroConta, payload.destino, payload.valor);
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
    return this.demoStore.consultarExtrato(numeroConta, filtro);
  }

  public consultarMeuExtrato(filtro: ExtratoFiltroModel): Observable<ExtratoResponseModel> {
    const numeroConta = this.authService.getNumeroConta();

    if (!numeroConta) {
      throw new Error('Conta do usuário logado não encontrada.');
    }

    return this.consultarExtrato(numeroConta, filtro);
  }

  public listarFavorecidos(numeroContaOrigem?: string | null): Observable<FavorecidoConta[]> {
    return this.demoStore.listarFavorecidos(numeroContaOrigem);
  }
}
