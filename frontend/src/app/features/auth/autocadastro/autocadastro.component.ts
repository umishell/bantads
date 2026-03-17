import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ClienteAutocadastro } from '../../../shared/models/cliente/cliente.model';

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './autocadastro.component.html',
  styleUrls: ['./autocadastro.component.scss']
})
export class AutocadastroComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private http = inject(HttpClient); // Usado para buscar o CEP e enviar o form

  // Signals para controle de tela
  public isLoading = signal<boolean>(false);
  public mensagemErro = signal<string | null>(null);
  public cadastroSucesso = signal<boolean>(false);

  // Construção do formulário com FormGroup aninhado para o endereço
  public cadastroForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]], // Aceita apenas 11 números
    telefone: ['', [Validators.required]],
    salario: ['', [Validators.required, Validators.min(0)]], // Salário não pode ser negativo
    
    // Sub-grupo para o endereço (reflete a interface Endereco)
    endereco: this.fb.group({
      cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      logradouro: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''], // Opcional
      bairro: ['', Validators.required],
      cidade: ['', Validators.required],
      estado: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]]
    })
  });

  /**
   * Função chamada quando o usuário sai do campo de CEP (evento blur no HTML).
   * Faz uma busca na API pública do ViaCEP para preencher os dados automaticamente.
   */
  public buscarCep(): void {
    const cepControl = this.cadastroForm.get('endereco.cep');
    if (cepControl?.invalid || !cepControl?.value) return;

    const cep = cepControl.value;
    // API pública e gratuita para busca de CEPs no Brasil
    this.http.get<any>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (dados) => {
        if (!dados.erro) {
          // patchValue atualiza apenas os campos que vieram da API
          this.cadastroForm.get('endereco')?.patchValue({
            logradouro: dados.logradouro,
            bairro: dados.bairro,
            cidade: dados.localidade,
            estado: dados.uf
          });
        }
      }
    });
  }

  public onSubmit(): void {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched();
      this.mensagemErro.set('Por favor, preencha todos os campos obrigatórios corretamente.');
      return;
    }

    this.isLoading.set(true);
    this.mensagemErro.set(null);

    // Extrai o objeto tipado e pronto para ser enviado ao Gateway
    const novoCliente: ClienteAutocadastro = this.cadastroForm.value;

    // TODO: Criar o ClienteService futuramente para centralizar esta chamada
    const apiUrl = 'http://localhost:3000/autocadastro'; // Ajuste conforme seu API Gateway

    this.http.post(apiUrl, novoCliente).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cadastroSucesso.set(true); // Muda a tela para a mensagem de sucesso
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mensagemErro.set('Ocorreu um erro ao enviar seu cadastro. Tente novamente mais tarde.');
        console.error(err);
      }
    });
  }
}