import { Component, inject, signal } from '@angular/core';
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
  styleUrls: ['./login.component.scss'] // Crie um arquivo SCSS vazio ou adicione seus estilos
})
export class LoginComponent {
  // Injeções modernas
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Estados reativos da tela
  public isLoading = signal<boolean>(false);
  public mensagemErro = signal<string | null>(null);

  // Construção do Formulário Reativo com validações síncronas
  public loginForm: FormGroup = this.fb.group({
    login: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]]
  });

  /**
   * Método disparado ao submeter o formulário.
   */
  public onSubmit(): void {
    // 1. Barreira de Segurança: Se o form for inválido, não fazemos a requisição
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched(); // Destaca os campos com erro em vermelho
      return;
    }

    // 2. Prepara o estado da tela
    this.isLoading.set(true);
    this.mensagemErro.set(null);

    // 3. Extrai os dados validados conforme a nossa interface
    const credenciais: LoginRequest = this.loginForm.value;

    // 4. Chama o serviço de autenticação
    this.authService.login(credenciais).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.redirecionarPorPerfil();
      },
      error: (err) => {
        this.isLoading.set(false);
        // Exibe o erro retornado pelo Gateway ou uma mensagem padrão
        this.mensagemErro.set(err.message || 'Erro ao efetuar login. Tente novamente.');
      }
    });
  }

  /**
   * Lê o Signal do AuthService para descobrir para onde mandar o usuário
   */
  private redirecionarPorPerfil(): void {
    if (this.authService.isCliente()) {
      this.router.navigate(['/cliente/home']);
    } else if (this.authService.isGerente()) {
      this.router.navigate(['/gerente/home']);
    } else if (this.authService.isAdmin()) {
      this.router.navigate(['/admin/home']);
    } else {
      this.mensagemErro.set('Perfil não reconhecido pelo sistema.');
      this.authService.logout(); // Desloga por segurança se o perfil for inválido
    }
  }
}