import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { API_BASE } from '../../core/config/api-base';
import {
  AutocadastroRequestDto,
  AutocadastroResponseDto,
  ClienteDetalheDto,
  ContaResponseDto,
} from '../models/api/bantads-api.models';
import { ClienteModel } from '../models/cliente/cliente.model';
import { mapClienteDetalheAndContaToClienteModel } from './bantads-mappers';

export interface SolicitarAutocadastroPayload {
  cpf: string;
  email: string;
  nome: string;
  telefone: string;
  salario: number;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
}

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);

  public buscarPorCpf(cpf: string): Observable<ClienteModel> {
    return this.http.get<ClienteDetalheDto>(`${API_BASE}/clientes/${cpf}`).pipe(
      switchMap((det) =>
        this.http.get<ContaResponseDto>(`${API_BASE}/contas/por-cliente/${det.id}`).pipe(
          map((conta) => mapClienteDetalheAndContaToClienteModel(det, conta)),
          catchError(() => of(mapClienteDetalheAndContaToClienteModel(det, null))),
        ),
      ),
    );
  }

  public alterarPerfil(cpf: string, dados: Partial<ClienteModel>): Observable<ClienteModel> {
    const body = {
      nome: dados.nome ?? null,
      email: dados.email ?? null,
      telefone: dados.telefone ?? null,
      salario: dados.salario ?? null,
      endereco: dados.endereco ?? null,
      cidade: dados.cidade ?? null,
      estado: dados.estado ?? null,
      cep: dados.cep ?? null,
    };
    return this.http.put<ClienteDetalheDto>(`${API_BASE}/clientes/${cpf}`, body).pipe(
      switchMap((det) =>
        this.http.get<ContaResponseDto>(`${API_BASE}/contas/por-cliente/${det.id}`).pipe(
            map((conta) => mapClienteDetalheAndContaToClienteModel(det, conta)),
            catchError(() => of(mapClienteDetalheAndContaToClienteModel(det, null))),
          ),
      ),
    );
  }

  public getDadosHome(cpf: string): Observable<ClienteModel> {
    return this.buscarPorCpf(cpf);
  }

  public atualizarPerfil(cliente: ClienteModel): Observable<ClienteModel> {
    return this.alterarPerfil(cliente.cpf, cliente);
  }

  public solicitarAutocadastro(payload: SolicitarAutocadastroPayload): Observable<AutocadastroResponseDto> {
    const cpf = payload.cpf.replace(/\D/g, '');
    const cepDigits = payload.cep.replace(/\D/g, '');
    const body: AutocadastroRequestDto = {
      cpf,
      email: payload.email.trim().toLowerCase(),
      nome: payload.nome.trim(),
      telefone: payload.telefone.trim(),
      salario: Number(payload.salario),
      endereco: payload.endereco.trim(),
      CEP: cepDigits,
      cidade: payload.cidade.trim(),
      estado: payload.estado.trim().toUpperCase().slice(0, 2),
    };
    return this.http.post<AutocadastroResponseDto>(`${API_BASE}/clientes/`, body);
  }
}
