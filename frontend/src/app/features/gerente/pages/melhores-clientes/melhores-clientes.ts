import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteCarteiraModel } from '../../../../shared/models/gerente/gerente.model';
import { GerenteService } from '../../../../shared/services/gerente.service';

@Component({
  selector: 'app-gerente-melhores-clientes',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './melhores-clientes.html',
  styleUrl: './melhores-clientes.scss',
})
export class GerenteMelhoresClientesComponent implements OnInit {
  private readonly gerenteService = inject(GerenteService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public loading = false;
  public errorMessage = '';
  public clientes: ClienteCarteiraModel[] = [];

  public ngOnInit(): void {
    this.loading = true;
    this.gerenteService.listarMelhoresClientes().subscribe({
      next: (clientes) => {
        this.loading = false;
        this.clientes = clientes;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.message || 'Não foi possível carregar o ranking.';
      },
    });
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
