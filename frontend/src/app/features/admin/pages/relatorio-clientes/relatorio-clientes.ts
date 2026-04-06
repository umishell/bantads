import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { AdminRelatorioClienteModel } from '../../../../shared/models/admin/admin.model';
import { AdminService } from '../../../../shared/services/admin.service';

@Component({
  selector: 'app-admin-relatorio-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './relatorio-clientes.html',
  styleUrl: './relatorio-clientes.scss',
})
export class AdminRelatorioClientesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  public readonly loading = signal(false);
  public readonly errorMessage = signal('');
  public readonly filtro = signal('');
  public readonly clientes = signal<AdminRelatorioClienteModel[]>([]);

  public readonly filtrados = computed(() => {
    const termo = this.filtro().trim().toLowerCase();
    const rows = this.clientes();
    if (!termo) return rows;
    return rows.filter((item) =>
      [
        item.nomeCliente,
        item.cpfCliente,
        item.emailCliente,
        item.nomeGerente,
        item.cpfGerente,
        item.numeroConta,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  });

  public ngOnInit(): void {
    this.carregar();
  }

  public carregar(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminService.listarRelatorioClientes().subscribe({
      next: (clientes) => {
        this.clientes.set(clientes);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Não foi possível carregar o relatório de clientes.');
        this.loading.set(false);
      },
    });
  }

  public limparFiltro(): void {
    this.filtro.set('');
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public imprimirRelatorio(): void {
    window.print();
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
