import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  AdminDashboardModel,
  AdminGerenteFormModel,
  AdminGerenteModel,
  AdminGerenteMutationResponse,
  AdminGerenteRemocaoResponse,
  AdminRelatorioClienteModel,
} from '../models/admin/admin.model';
import { DemoBantadsStoreService } from './demo-bantads-store.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly demoStore = inject(DemoBantadsStoreService);

  public obterDashboard(): Observable<AdminDashboardModel> {
    return this.demoStore.obterDashboardAdmin();
  }

  public listarRelatorioClientes(): Observable<AdminRelatorioClienteModel[]> {
    return this.demoStore.listarRelatorioClientesAdmin();
  }

  public listarGerentes(): Observable<AdminGerenteModel[]> {
    return this.demoStore.listarGerentesAdmin();
  }

  public inserirGerente(payload: AdminGerenteFormModel): Observable<AdminGerenteMutationResponse> {
    return this.demoStore.inserirGerenteAdmin(payload);
  }

  public atualizarGerente(
    cpf: string,
    payload: Pick<AdminGerenteFormModel, 'nome' | 'email' | 'senha'>,
  ): Observable<AdminGerenteMutationResponse> {
    return this.demoStore.atualizarGerenteAdmin(cpf, payload);
  }

  public removerGerente(cpf: string): Observable<AdminGerenteRemocaoResponse> {
    return this.demoStore.removerGerenteAdmin(cpf);
  }
}
