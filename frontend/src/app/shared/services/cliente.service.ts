import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ClienteModel } from '../models/cliente/cliente.model';
import { DemoBantadsStoreService } from './demo-bantads-store.service';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly demoStore = inject(DemoBantadsStoreService);

  public buscarPorCpf(cpf: string): Observable<ClienteModel> {
    return this.demoStore.buscarClientePorCpf(cpf);
  }

  public alterarPerfil(cpf: string, dados: Partial<ClienteModel>): Observable<ClienteModel> {
    return this.demoStore.alterarPerfil(cpf, dados);
  }

  public getDadosHome(cpf: string): Observable<ClienteModel> {
    return this.demoStore.buscarClientePorCpf(cpf);
  }

  public atualizarPerfil(cliente: ClienteModel): Observable<ClienteModel> {
    return this.demoStore.alterarPerfil(cliente.cpf, cliente);
  }

  public listarClientes(): Observable<ClienteModel[]> {
    return this.demoStore.listarClientes();
  }
}
