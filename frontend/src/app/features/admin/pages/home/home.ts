import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  AdminDashboardGerenteItem,
  AdminDashboardModel,
} from '../../../../shared/models/admin/admin.model';
import { AdminService } from '../../../../shared/services/admin.service';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class AdminHomeComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  public readonly loading = signal(false);
  public readonly errorMessage = signal('');
  public readonly dashboard = signal<AdminDashboardModel | null>(null);

  public readonly maxSaldoPositivo = computed(() => {
    const gerentes = this.dashboard()?.gerentes ?? [];
    return gerentes.reduce((max, item) => Math.max(max, item.totalSaldoPositivo), 0);
  });

  public readonly maxSaldoNegativo = computed(() => {
    const gerentes = this.dashboard()?.gerentes ?? [];
    return gerentes.reduce((max, item) => Math.max(max, Math.abs(item.totalSaldoNegativo)), 0);
  });

  public readonly melhorGerente = computed<AdminDashboardGerenteItem | null>(() => {
    return this.dashboard()?.gerentes?.[0] ?? null;
  });

  public ngOnInit(): void {
    this.carregarDashboard();
  }

  public carregarDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminService.obterDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Não foi possível carregar o dashboard do administrador.');
        this.loading.set(false);
      },
    });
  }

  public percentualPositivo(valor: number): number {
    const max = this.maxSaldoPositivo();
    if (max <= 0) return 0;
    return Math.max(6, Math.round((valor / max) * 100));
  }

  public percentualNegativo(valor: number): number {
    const max = this.maxSaldoNegativo();
    if (max <= 0) return 0;
    return Math.max(6, Math.round((Math.abs(valor) / max) * 100));
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public imprimirDashboard(): void {
    window.print();
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
