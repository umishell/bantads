import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AutocadastroService } from './services/autocadastro.service';
import { Cliente } from '../../../../shared/models/cliente.model';

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './autocadastro.component.html',
  styleUrl: './autocadastro.component.scss'
})
export class AutocadastroComponent {
  authForm: FormGroup;
  loading = false;
  success = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private autocadastroService: AutocadastroService
  ) {
    this.authForm = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      telefone: ['', Validators.required],
      salario: [null, [Validators.required, Validators.min(0)]],
      endereco: this.fb.group({
        cep: ['', Validators.required],
        rua: ['', Validators.required],
        numero: [null, Validators.required],
        complemento: [''],
        cidade: ['', Validators.required],
        estado: ['', [Validators.required, Validators.maxLength(2)]]
      })
    });
  }

  onSubmit() {
    if (this.authForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      const novoCliente: Cliente = this.authForm.value;

      this.autocadastroService.cadastrar(novoCliente).subscribe({
        next: (res) => {
          this.loading = false;
          this.success = true;
          this.authForm.reset();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = 'Erro ao realizar cadastro. Verifique os dados ou tente mais tarde.';
          console.error(err);
        }
      });
    }
  }
}