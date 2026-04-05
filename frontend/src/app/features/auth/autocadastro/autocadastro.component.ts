import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import {
  AutocadastroApiRequest,
  ClienteAutocadastro,
} from '../../../shared/models/cliente/cliente.model';

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './autocadastro.component.html',
  styleUrls: ['./autocadastro.component.scss']
})
export class AutocadastroComponent {
  private fb = inject(FormBuilder);
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
    salario: ['', [Validators.required, Validators.min(0.01)]], // ms-cliente: DecimalMin 0.01
    
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

    const form: ClienteAutocadastro = this.cadastroForm.value;
    const payload = this.toAutocadastroApiPayload(form);

    /** Mesma origem do gateway ao acessar via http://localhost (docker: porta 80 → gateway). */
    this.http.post<unknown>('/api/clientes', payload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cadastroSucesso.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.mensagemErro.set(this.mensagemErroCadastro(err));
        console.error(err);
      },
    });
  }

  /**
   * ms-cliente espera DTO plano (AutocadastroRequest), não o endereço aninhado do formulário.
   * CEP no JSON deve ser a chave `CEP` (ver @JsonProperty no Kotlin).
   */
  private toAutocadastroApiPayload(v: ClienteAutocadastro): AutocadastroApiRequest {
    const e = v.endereco;
    const comp = (e.complemento ?? '').trim();
    const enderecoLinha = [
      `${e.logradouro.trim()}, ${String(e.numero).trim()}`,
      comp ? comp : null,
      e.bairro.trim() ? `— ${e.bairro.trim()}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    const salario = Number(v.salario);
    return {
      cpf: String(v.cpf).replace(/\D/g, ''),
      email: v.email.trim().toLowerCase(),
      nome: v.nome.trim(),
      telefone: String(v.telefone).trim(),
      salario,
      endereco: enderecoLinha,
      CEP: String(e.cep).replace(/\D/g, ''),
      cidade: e.cidade.trim(),
      estado: e.estado.trim().toUpperCase(),
    };
  }

  private mensagemErroCadastro(err: HttpErrorResponse): string {
    const body = err.error;
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const m = (body as { message: unknown }).message;
      if (typeof m === 'string' && m.trim()) return m;
    }
    if (err.status === 409) return 'CPF ou dados já cadastrados.';
    if (err.status === 400) return 'Dados inválidos. Verifique os campos e tente novamente.';
    return 'Ocorreu um erro ao enviar seu cadastro. Tente novamente mais tarde.';
  }
}