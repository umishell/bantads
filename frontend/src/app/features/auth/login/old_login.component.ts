/*import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../shared/models/auth/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  public readonly isLoading = signal<boolean>(false);
  public readonly mensagemErro = signal<string | null>(null);

  public readonly loginForm: FormGroup = this.fb.group({
    login: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(4)]],
  });

  public onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.mensagemErro.set(null);

    const credenciais: LoginRequest = this.loginForm.getRawValue();

    this.authService.login(credenciais).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.redirecionarPorPerfil();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mensagemErro.set(err?.message || 'Erro ao efetuar login. Tente novamente.');
      },
    });
  }

  private redirecionarPorPerfil(): void {
    if (this.authService.isCliente()) {
      this.router.navigate(['/cliente/home']);
      return;
    }

    if (this.authService.isGerente()) {
      this.router.navigate(['/gerente']);
      return;
    }

    if (this.authService.isAdmin()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.mensagemErro.set('Perfil não reconhecido pelo sistema.');
    this.authService.logout();
  }
}
*/
