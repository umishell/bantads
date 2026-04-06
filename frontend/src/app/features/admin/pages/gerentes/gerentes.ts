import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import {
  AdminGerenteFormModel,
  AdminGerenteModel,
} from '../../../../shared/models/admin/admin.model';
import { AdminService } from '../../../../shared/services/admin.service';

@Component({
  selector: 'app-admin-gerentes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './gerentes.html',
  styleUrl: './gerentes.scss',
})
export class AdminGerentesComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  public readonly loading = signal(false);
  public readonly salvando = signal(false);
  public readonly errorMessage = signal('');
  public readonly successMessage = signal('');
  public readonly gerentes = signal<AdminGerenteModel[]>([]);
  public readonly modoEdicao = signal(false);
  public readonly gerenteEditandoCpf = signal<string | null>(null);

  public readonly gerenteForm = this.fb.group({
    cpf: ['', [Validators.required, Validators.minLength(11)]],
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required]],
    senha: ['', [Validators.required, Validators.minLength(4)]],
  });

  public ngOnInit(): void {
    this.carregarGerentes();
  }

  public carregarGerentes(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.adminService.listarGerentes().subscribe({
      next: (gerentes) => {
        this.gerentes.set(gerentes);
        this.loading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Não foi possível carregar os gerentes.');
        this.loading.set(false);
      },
    });
  }

  public iniciarCadastro(): void {
    this.modoEdicao.set(false);
    this.gerenteEditandoCpf.set(null);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.gerenteForm.reset({
      cpf: '',
      nome: '',
      email: '',
      telefone: '',
      senha: 'tads',
    });
    this.gerenteForm.get('cpf')?.enable();
    this.gerenteForm.get('telefone')?.enable();
  }

  public editarGerente(gerente: AdminGerenteModel): void {
    this.modoEdicao.set(true);
    this.gerenteEditandoCpf.set(gerente.cpf);
    this.successMessage.set('');
    this.errorMessage.set('');
    this.gerenteForm.patchValue({
      cpf: gerente.cpf,
      nome: gerente.nome,
      email: gerente.email,
      telefone: gerente.telefone,
      senha: 'tads',
    });
    this.gerenteForm.get('cpf')?.disable();
    this.gerenteForm.get('telefone')?.disable();
    this.successMessage.set(`Editando gerente ${gerente.nome}. O formulário foi levado para o topo.`);
    this.scrollToFormulario();
  }

  public cancelarEdicao(): void {
    this.iniciarCadastro();
  }

  public salvar(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.gerenteForm.invalid) {
      this.gerenteForm.markAllAsTouched();
      return;
    }

    this.salvando.set(true);
    const raw = this.gerenteForm.getRawValue();

    if (this.modoEdicao() && this.gerenteEditandoCpf()) {
      this.adminService
        .atualizarGerente(this.gerenteEditandoCpf()!, {
          nome: raw.nome ?? '',
          email: raw.email ?? '',
          senha: raw.senha ?? 'tads',
        })
        .subscribe({
          next: (response) => {
            this.successMessage.set(response.mensagem);
            this.salvando.set(false);
            this.carregarGerentes();
          },
          error: (error) => {
            this.errorMessage.set(error?.message || 'Não foi possível atualizar o gerente.');
            this.salvando.set(false);
          },
        });
      return;
    }

    const payload: AdminGerenteFormModel = {
      cpf: (raw.cpf ?? '').replace(/\D/g, ''),
      nome: raw.nome ?? '',
      email: raw.email ?? '',
      telefone: raw.telefone ?? '',
      senha: raw.senha ?? 'tads',
    };

    this.adminService.inserirGerente(payload).subscribe({
      next: (response) => {
        this.successMessage.set(response.mensagem + (response.detalhes?.length ? ` ${response.detalhes.join(' ')}` : ''));
        this.salvando.set(false);
        this.carregarGerentes();
        this.iniciarCadastro();
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Não foi possível inserir o gerente.');
        this.salvando.set(false);
      },
    });
  }

  public removerGerente(gerente: AdminGerenteModel): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    const confirmado = window.confirm(
      `Deseja remover o gerente ${gerente.nome}? As contas vinculadas serão redistribuídas automaticamente.`,
    );

    if (!confirmado) {
      return;
    }

    this.adminService.removerGerente(gerente.cpf).subscribe({
      next: (response) => {
        this.successMessage.set(response.mensagem + (response.detalhes?.length ? ` ${response.detalhes.join(' ')}` : ''));
        this.carregarGerentes();
      },
      error: (error) => {
        this.errorMessage.set(error?.message || 'Não foi possível remover o gerente.');
      },
    });
  }

  public formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value ?? 0);
  }

  public isInvalid(controlName: string): boolean {
    const control = this.gerenteForm.get(controlName);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  public getErrorMessage(controlName: string): string {
    const control = this.gerenteForm.get(controlName);
    if (!control || !control.errors) return '';
    if (control.errors['required']) return 'Campo obrigatório.';
    if (control.errors['email']) return 'Informe um e-mail válido.';
    if (control.errors['minlength']) return 'Valor inválido.';
    return 'Valor inválido.';
  }

  private scrollToFormulario(): void {
    setTimeout(() => {
      document.getElementById('gerente-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  public logout(): void {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }
}
