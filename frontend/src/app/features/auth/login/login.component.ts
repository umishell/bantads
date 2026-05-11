import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../shared/models/auth/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  public credenciais: LoginRequest = { login: '', senha: '' };
  public erro = '';
  public carregando = false;

  public enviar(): void {
    this.erro = '';
    const login = this.credenciais.login.trim().toLowerCase();
    const senha = this.credenciais.senha;
    if (!login || !senha) {
      this.erro = 'Informe e-mail e senha.';
      return;
    }
    if (senha.length < 4) {
      this.erro = 'Senha inválida.';
      return;
    }

    this.carregando = true;
    this.auth
      .login({ login, senha })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (res) => {
          void this.router.navigateByUrl(this.auth.getHomeUrl(res.usuario.perfil));
        },
        error: (err) => {
          const msg =
            err?.error?.message ??
            err?.error?.erro ??
            err?.message ??
            'Não foi possível entrar. Verifique o gateway e as credenciais.';
          this.erro = typeof msg === 'string' ? msg : 'Falha no login.';
        },
      });
  }
}
