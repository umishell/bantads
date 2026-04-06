import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteCarteiraModel } from '../../../../shared/models/gerente/gerente.model';
import { GerenteService } from '../../../../shared/services/gerente.service';

@Component({
  selector: 'app-gerente-consulta',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './consulta.html',
  styleUrl: './consulta.scss',
})
export class GerenteConsultaComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly gerenteService = inject(GerenteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly consultaForm = this.fb.group({
    cpf: ['', [Validators.required, Validators.minLength(11)]],
  });

  public loading = false;
  public errorMessage = '';
  public cliente: ClienteCarteiraModel | null = null;

  public ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const cpf = params.get('cpf') ?? '';
      if (cpf) {
        this.consultaForm.patchValue({ cpf });
        this.consultar();
      }
    });
  }

  public consultar(): void {
    this.errorMessage = '';
    this.cliente = null;

    if (this.consultaForm.invalid) {
      this.consultaForm.markAllAsTouched();
      return;
    }

    const gerenteCpf = this.authService.getCpf();
    if (!gerenteCpf) {
      this.errorMessage = 'Não foi possível identificar o gerente logado.';
      return;
    }

    const cpf = this.consultaForm.getRawValue().cpf ?? '';
    this.loading = true;

    this.gerenteService.consultarClienteDaCarteira(gerenteCpf, cpf).subscribe({
      next: (cliente) => {
        this.loading = false;
        this.cliente = cliente;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.message || 'Cliente não encontrado.';
      },
    });
  }

  public isInvalid(): boolean {
    const control = this.consultaForm.get('cpf');
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
