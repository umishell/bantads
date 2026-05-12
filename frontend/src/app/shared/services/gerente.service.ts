import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { API_BASE } from '../../core/config/api-base';
import { AuthService } from '../../core/services/auth.service';
import {
  ClienteCarteiraDto,
  ClientePendenteDto,
} from '../models/api/bantads-api.models';
import {
  AprovacaoClienteModel,
  ClienteCarteiraModel,
  GerenteResumoModel,
  RejeicaoClienteModel,
  SolicitacaoClienteModel,
} from '../models/gerente/gerente.model';
import {
  mapClienteCarteiraDto,
  mapGerenteResumo,
  mapPendenteDto,
} from './bantads-mappers';

@Injectable({ providedIn: 'root' })
export class GerenteService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  public obterResumo(gerenteCpf: string): Observable<GerenteResumoModel> {
    const u = this.auth.currentUser();
    const nome = u?.nome ?? '';
    const email = u?.email ?? '';
    const telefone = u?.telefone ?? '';
    return forkJoin({
      carteira: this.http.get<ClienteCarteiraDto[]>(`${API_BASE}/clientes`),
      pendentes: this.http.get<ClientePendenteDto[]>(`${API_BASE}/clientes/pendentes`),
    }).pipe(
      map(({ carteira, pendentes }) =>
        mapGerenteResumo(gerenteCpf, nome, email, telefone, carteira, pendentes.length),
      ),
    );
  }

  public listarSolicitacoesPendentes(gerenteCpf: string): Observable<SolicitacaoClienteModel[]> {
    const u = this.auth.currentUser();
    const gCpf = u?.cpf ?? gerenteCpf;
    const gNome = u?.nome ?? 'Gerente';
    return this.http
      .get<ClientePendenteDto[]>(`${API_BASE}/clientes/pendentes`)
      .pipe(map((rows) => rows.map((p) => mapPendenteDto(p, gCpf, gNome))));
  }

  public aprovarCliente(clienteId: string): Observable<AprovacaoClienteModel> {
    return this.http.post<void>(`${API_BASE}/clientes/${clienteId}/aprovar`, {}).pipe(
      map(() => ({
        cpf: '',
        nome: '',
        email: '',
        numeroConta: '—',
        agencia: '0001',
        senhaTemporaria: 'Será enviada por e-mail após a saga.',
        gerenteNome: this.auth.currentUser()?.nome ?? 'Gerente',
      })),
    );
  }

  public rejeitarCliente(
    clienteId: string,
    motivo: string,
    meta: { cpf: string; nome: string },
  ): Observable<RejeicaoClienteModel> {
    return this.http.post<void>(`${API_BASE}/clientes/${clienteId}/rejeitar`, { motivo }).pipe(
      map(() => ({
        cpf: meta.cpf,
        nome: meta.nome,
        motivo,
        dataHora: new Date().toISOString(),
      })),
    );
  }

  public listarClientesDaCarteira(gerenteCpf: string, filtroTexto = ''): Observable<ClienteCarteiraModel[]> {
    const needle = filtroTexto.trim().toLowerCase();
    const digitsNeedle = needle.replace(/\D/g, '');
    return this.http.get<ClienteCarteiraDto[]>(`${API_BASE}/clientes`).pipe(
      map((rows) => {
        let list = rows
          .filter((c) => c.gerenteCpf === gerenteCpf)
          .map((c) => mapClienteCarteiraDto(c));
        if (needle) {
          list = list.filter((c) => {
            const matchNome = c.nome.toLowerCase().includes(needle);
            const cpfDigits = c.cpf.replace(/\D/g, '');
            const matchCpf = digitsNeedle.length > 0 && cpfDigits.includes(digitsNeedle);
            return matchNome || matchCpf;
          });
        }
        return list;
      }),
    );
  }

  public consultarClienteDaCarteira(
    gerenteCpf: string,
    cpfCliente: string,
  ): Observable<ClienteCarteiraModel> {
    return this.listarClientesDaCarteira(gerenteCpf).pipe(
      map((list) => {
        const found = list.find((c) => c.cpf === cpfCliente);
        if (!found) {
          throw new Error('Cliente não encontrado na carteira.');
        }
        return found;
      }),
    );
  }

  public listarMelhoresClientes(gerenteCpf: string): Observable<ClienteCarteiraModel[]> {
    return this.http
      .get<ClienteCarteiraDto[]>(`${API_BASE}/clientes?filtro=melhores_clientes`)
      .pipe(
        map((rows) =>
          rows.filter((c) => c.gerenteCpf === gerenteCpf).map((c) => mapClienteCarteiraDto(c)),
        ),
      );
  }
}
