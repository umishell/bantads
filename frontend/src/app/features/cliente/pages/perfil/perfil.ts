import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ClienteModel } from '../../../../shared/models/cliente/cliente.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class PerfilComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly clienteService = inject(ClienteService);
  private readonly authService = inject(AuthService);

  protected readonly cpfUsuario = this.authService.getCpf();

  protected readonly perfilForm = this.fb.group({
    nome: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    salario: [0, [Validators.required, Validators.min(0)]],
    cpf: [{ value: '', disabled: true }],
    endereco: ['', Validators.required],
    cep: ['', Validators.required],
    cidade: ['', Validators.required],
    estado: ['', Validators.required],
  });

  protected loading = false;
  protected salvando = false;
  protected errorMessage = '';
  protected successMessage = '';

  ngOnInit(): void {
    this.carregarDados();
  }

  protected carregarDados(): void {
    if (!this.cpfUsuario) {
      this.errorMessage = 'Não foi possível identificar o usuário logado.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.clienteService
      .buscarPorCpf(this.cpfUsuario)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (cliente: ClienteModel) => {
          this.perfilForm.patchValue({
            nome: cliente.nome ?? '',
            email: cliente.email ?? '',
            salario: cliente.salario ?? 0,
            cpf: cliente.cpf ?? '',
            endereco: cliente.endereco ?? '',
            cep: (cliente as ClienteModel & { cep?: string }).cep ?? '',
            cidade: cliente.cidade ?? '',
            estado: cliente.estado ?? '',
          });
        },
        error: (error: HttpErrorResponse) => {
          const payload = error.error as { message?: string; erro?: string } | null;

          this.errorMessage =
            payload?.message ??
            payload?.erro ??
            error.message ??
            'Erro ao carregar dados do perfil.';
        },
      });
  }

  protected salvar(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.cpfUsuario) {
      this.errorMessage = 'Não foi possível identificar o usuário logado.';
      return;
    }

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      return;
    }

    this.salvando = true;

    const raw = this.perfilForm.getRawValue();

    const dadosAtualizados: Partial<ClienteModel> = {
      nome: raw.nome ?? undefined,
      email: raw.email ?? undefined,
      salario: raw.salario ?? undefined,
      endereco: raw.endereco ?? undefined,
      cidade: raw.cidade ?? undefined,
      estado: raw.estado ?? undefined,
    };

    this.clienteService
      .alterarPerfil(this.cpfUsuario, dadosAtualizados)
      .pipe(finalize(() => (this.salvando = false)))
      .subscribe({
        next: () => {
          this.successMessage =
            'Perfil atualizado com sucesso! O limite será recalculado se houve alteração salarial.';
        },
        error: (error: HttpErrorResponse) => {
          const payload = error.error as { message?: string; erro?: string } | null;
          const apiMessage = payload?.message ?? payload?.erro ?? error.message;

          this.errorMessage = apiMessage || 'Não foi possível atualizar o perfil.';
        },
      });
  }

  protected isInvalid(controlName: string): boolean {
    const control = this.perfilForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
