import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AprovacaoClienteModel,
  ClienteCarteiraModel,
  GerenteResumoModel,
  RejeicaoClienteModel,
  SolicitacaoClienteModel,
} from '../models/gerente/gerente.model';
import { DemoBantadsStoreService } from './demo-bantads-store.service';

@Injectable({ providedIn: 'root' })
export class GerenteService {
  private readonly demoStore = inject(DemoBantadsStoreService);

  public obterResumo(gerenteCpf: string): Observable<GerenteResumoModel> {
    return this.demoStore.obterResumoGerente(gerenteCpf);
  }

  public listarSolicitacoesPendentes(gerenteCpf: string): Observable<SolicitacaoClienteModel[]> {
    return this.demoStore.listarSolicitacoesPendentes(gerenteCpf);
  }

  public aprovarCliente(cpfSolicitacao: string): Observable<AprovacaoClienteModel> {
    return this.demoStore.aprovarCliente(cpfSolicitacao);
  }

  public rejeitarCliente(cpfSolicitacao: string, motivo: string): Observable<RejeicaoClienteModel> {
    return this.demoStore.rejeitarCliente(cpfSolicitacao, motivo);
  }

  public listarClientesDaCarteira(gerenteCpf: string, filtro = ''): Observable<ClienteCarteiraModel[]> {
    return this.demoStore.listarClientesDoGerente(gerenteCpf, filtro);
  }

  public consultarClienteDaCarteira(
    gerenteCpf: string,
    cpfCliente: string,
  ): Observable<ClienteCarteiraModel> {
    return this.demoStore.consultarClienteDoGerente(gerenteCpf, cpfCliente);
  }

  public listarMelhoresClientes(): Observable<ClienteCarteiraModel[]> {
    return this.demoStore.listarMelhoresClientes();
  }
}
