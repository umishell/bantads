import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteCarteiraModel } from '../../../../shared/models/gerente/gerente.model';
import { GerenteService } from '../../../../shared/services/gerente.service';

@Component({
  selector: 'app-gerente-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class GerenteClientesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly gerenteService = inject(GerenteService);
  private readonly router = inject(Router);

  public filtro = '';
  public loading = false;
  public errorMessage = '';
  public clientes: ClienteCarteiraModel[] = [];

  public ngOnInit(): void {
    this.carregarClientes();
  }

  public carregarClientes(): void {
    const gerenteCpf = this.authService.getCpf();
    if (!gerenteCpf) {
      this.errorMessage = 'Não foi possível identificar o gerente logado.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.gerenteService.listarClientesDaCarteira(gerenteCpf, this.filtro).subscribe({
      next: (clientes) => {
        this.clientes = clientes;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.message || 'Não foi possível carregar os clientes da carteira.';
      },
    });
  }

  public limparFiltro(): void {
    this.filtro = '';
    this.carregarClientes();
  }

  public abrirCliente(cpf: string): void {
    void this.router.navigate(['/gerente/consulta'], { queryParams: { cpf } });
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
