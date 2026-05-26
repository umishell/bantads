import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TimeoutError, finalize, timeout } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { ProcessandoButtonComponent } from '../../../shared/components/processando-button/processando-button.component';
import { normalizeEmail } from '../../../shared/utils/bantads-input.util';
import { getFieldErrorMessage, isFieldInvalid } from '../../../shared/utils/form-field.util';
import {
  bantadsEmailValidators,
  bantadsSenhaValidators,
} from '../../../shared/validators/bantads-form.validators';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProcessandoButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  public readonly form = this.fb.nonNullable.group({
    login: ['', bantadsEmailValidators],
    senha: ['', bantadsSenhaValidators],
  });

  public erro = '';
  public carregando = false;

  public enviar(): void {
    this.erro = '';
    this.normalizarLogin();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { login, senha } = this.form.getRawValue();

    this.carregando = true;
    this.auth
      .login({ login: normalizeEmail(login), senha })
      .pipe(
        timeout(60_000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.carregando = false;
        }),
      )
      .subscribe({
        next: (res) => {
          void this.router.navigateByUrl(this.auth.getHomeUrl(res.usuario.perfil));
        },
        error: (err) => {
          this.erro = this.mapErroLogin(err);
        },
      });
  }

  public isInvalid(controlName: 'login' | 'senha'): boolean {
    return isFieldInvalid(this.form.get(controlName));
  }

  public getErrorMessage(controlName: 'login' | 'senha'): string {
    const custom: Record<string, string> =
      controlName === 'login'
        ? { pattern: 'Informe um e-mail válido (ex.: usuario@bantads.com.br).' }
        : { minlength: 'A senha deve ter pelo menos 4 caracteres.' };
    return getFieldErrorMessage(this.form.get(controlName), custom);
  }

  public normalizarLogin(): void {
    const control = this.form.controls.login;
    control.setValue(normalizeEmail(control.value), { emitEvent: false });
    control.updateValueAndValidity({ emitEvent: false });
  }

  private mapErroLogin(err: unknown): string {
    if (err instanceof TimeoutError) {
      return 'A solicitação demorou demais. Tente novamente em instantes.';
    }

    if (err instanceof HttpErrorResponse) {
      const apiMessage = err.error?.message ?? err.error?.erro;
      if (typeof apiMessage === 'string' && apiMessage.length > 0) {
        return apiMessage;
      }
    }

    const fallback = (err as { message?: string })?.message;
    return typeof fallback === 'string' && fallback.length > 0
      ? fallback
      : 'Não foi possível entrar. Verifique o gateway e as credenciais.';
  }
}
