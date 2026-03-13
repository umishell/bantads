import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente } from '../../../../shared/models/cliente.model';

@Injectable({
  providedIn: 'root'
})
export class AutocadastroService {
  // A URL deve apontar para o Gateway, nunca para o microsserviço direto
  private readonly API = 'http://localhost:3000/clientes'; 

  constructor(private http: HttpClient) { }

  cadastrar(cliente: Cliente): Observable<Cliente> {
    return this.http.post<Cliente>(this.API, cliente);
  }
}