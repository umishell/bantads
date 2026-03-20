import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Cliente } from '../models/cliente/cliente.model';
import { ClienteModel } from '../models/cliente/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly API_URL = 'http://localhost:3000/clientes';

  constructor(private http: HttpClient) {}

  buscarPorCpf(cpf: string) {
    return this.http.get<ClienteModel>(`${this.API_URL}/${cpf}`);
  }

  alterarPerfil(cpf: string, dados: Partial<ClienteModel>) {
    return this.http.put(`${this.API_URL}/${cpf}`, dados);
  }

  getDadosHome(cpf: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.API_URL}/${cpf}`);
  }

  atualizarPerfil(cliente: Cliente): Observable<any> {
    return this.http.put(`${this.API_URL}/${cliente.cpf}`, cliente);
  }
}
