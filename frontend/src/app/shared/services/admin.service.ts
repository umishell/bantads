import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';

import { API_BASE } from '../../core/config/api-base';
import {
  AdminRelatorioClienteDto,
  AlterarGerenteRequestDto,
  DashboardGerenteItemDto,
  GerenteResponseDto,
  InserirGerenteRequestDto,
} from '../models/api/bantads-api.models';
import {
  AdminDashboardModel,
  AdminGerenteFormModel,
  AdminGerenteModel,
  AdminGerenteMutationResponse,
  AdminGerenteRemocaoResponse,
  AdminRelatorioClienteModel,
} from '../models/admin/admin.model';
import { mapAdminRelatorioDto, mapDashboardFromStats, mergeGerentesComDashboard } from './bantads-mappers';

function mapGerenteResponseToAdminModel(g: GerenteResponseDto): AdminGerenteModel {
  return {
    cpf: g.cpf,
    nome: g.nome,
    email: g.email,
    telefone: g.telefone,
    totalClientes: 0,
    totalSaldoPositivo: 0,
    totalSaldoNegativo: 0,
  };
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  public obterDashboard(): Observable<AdminDashboardModel> {
    return this.http
      .get<DashboardGerenteItemDto[]>(`${API_BASE}/gerentes/stats`)
      .pipe(map((rows) => mapDashboardFromStats(rows)));
  }

  public listarRelatorioClientes(): Observable<AdminRelatorioClienteModel[]> {
    return this.http
      .get<AdminRelatorioClienteDto[]>(`${API_BASE}/clientes/report`)
      .pipe(map((rows) => mapAdminRelatorioDto(rows)));
  }

  public listarGerentes(): Observable<AdminGerenteModel[]> {
    return forkJoin({
      gerentes: this.http.get<GerenteResponseDto[]>(`${API_BASE}/gerentes`),
      stats: this.http.get<DashboardGerenteItemDto[]>(`${API_BASE}/gerentes/stats`),
    }).pipe(map(({ gerentes, stats }) => mergeGerentesComDashboard(gerentes, stats)));
  }

  public inserirGerente(payload: AdminGerenteFormModel): Observable<AdminGerenteMutationResponse> {
    const body: InserirGerenteRequestDto = {
      cpf: payload.cpf,
      nome: payload.nome,
      email: payload.email,
      telefone: payload.telefone,
      senha: payload.senha,
      tipo: 'GERENTE',
    };
    return this.http.post<GerenteResponseDto>(`${API_BASE}/gerentes`, body).pipe(
      map((g) => ({
        mensagem: 'Gerente cadastrado com sucesso.',
        gerente: { ...mapGerenteResponseToAdminModel(g), totalClientes: 0, totalSaldoPositivo: 0, totalSaldoNegativo: 0 },
        detalhes: [],
      })),
    );
  }

  public atualizarGerente(
    cpf: string,
    payload: Pick<AdminGerenteFormModel, 'nome' | 'email' | 'senha'>,
  ): Observable<AdminGerenteMutationResponse> {
    const body: AlterarGerenteRequestDto = {
      nome: payload.nome || null,
      email: payload.email || null,
      senha: payload.senha || null,
    };
    return this.http.put<GerenteResponseDto>(`${API_BASE}/gerentes/${cpf}`, body).pipe(
      map((g) => ({
        mensagem: 'Gerente atualizado com sucesso.',
        gerente: mapGerenteResponseToAdminModel(g),
        detalhes: [],
      })),
    );
  }

  public removerGerente(cpf: string): Observable<AdminGerenteRemocaoResponse> {
    return this.http.delete<GerenteResponseDto>(`${API_BASE}/gerentes/${cpf}`).pipe(
      map(() => ({
        mensagem: 'Gerente removido.',
        gerenteRemovido: cpf,
        gerenteDestino: '—',
        totalContasReatribuidas: 0,
        detalhes: [],
      })),
    );
  }
}
