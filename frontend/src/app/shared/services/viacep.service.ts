import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { digitsOnly } from '../utils/bantads-mask.util';

export interface ViaCepEndereco {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ViaCepService {
  private readonly http = inject(HttpClient);

  public buscarEndereco(cepRaw: string): Observable<ViaCepEndereco | null> {
    const cep = digitsOnly(cepRaw);
    if (cep.length !== 8) {
      return of(null);
    }

    return this.http.get<ViaCepResponse>(`https:
      map((res) => {
        if (res.erro || !res.localidade || !res.uf) {
          return null;
        }
        return {
          cep: res.cep ?? cep,
          logradouro: (res.logradouro ?? '').trim(),
          complemento: (res.complemento ?? '').trim(),
          bairro: (res.bairro ?? '').trim(),
          localidade: res.localidade.trim(),
          uf: res.uf.trim().toUpperCase(),
        };
      }),
      catchError(() => of(null)),
    );
  }
}
