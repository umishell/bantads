/*
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

  public buscarCep(): void {
    const cepControl = this.cadastroForm.get('endereco.cep');
    if (cepControl?.invalid || !cepControl?.value) return;

    const cep = cepControl.value;
    this.http.get<any>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (dados) => {
        if (!dados.erro) {
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

    const novoCliente: ClienteAutocadastro = this.cadastroForm.value;
    const apiUrl = 'http://localhost:3000/autocadastro';

    this.http.post(apiUrl, novoCliente).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.cadastroSucesso.set(true);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.mensagemErro.set('Ocorreu um erro ao enviar seu cadastro. Tente novamente mais tarde.');
        console.error(err);
      }
    });
  }
}
*/

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { ClienteAutocadastro } from '../../../shared/models/cliente/cliente.model';
import { DemoBantadsStoreService } from '../../../shared/services/demo-bantads-store.service';

type GerenteDisponivel = {
  cpf: string;
  nome: string;
  email: string;
};

type SolicitarCadastroResponse = {
  cpf: string;
  nome: string;
  gerenteCpf: string;
  gerenteNome: string;
  gerenteEmail: string;
  dataSolicitacao: string;
};

@Component({
  selector: 'app-autocadastro',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './autocadastro.component.html',
  styleUrls: ['./autocadastro.component.scss'],
})
export class AutocadastroComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly demoStore = inject(DemoBantadsStoreService);

  public readonly isLoading = signal<boolean>(false);
  public readonly buscandoCep = signal<boolean>(false);
  public readonly mensagemErro = signal<string | null>(null);
  public readonly cadastroSucesso = signal<boolean>(false);
  public readonly gerentes = signal<GerenteDisponivel[]>([]);
  public readonly resultadoCadastro = signal<SolicitarCadastroResponse | null>(null);

  public readonly cadastroForm: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    telefone: ['', [Validators.required, Validators.minLength(10)]],
    salario: [null, [Validators.required, Validators.min(0)]],
    gerenteCpf: ['', [Validators.required]],
    endereco: this.fb.group({
      cep: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      logradouro: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],
      bairro: ['', Validators.required],
      cidade: ['', Validators.required],
      estado: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]],
    }),
  });

  public readonly gerenteSelecionado = computed(() => {
    const gerenteCpf = this.cadastroForm.getRawValue().gerenteCpf ?? '';
    return this.gerentes().find((gerente) => gerente.cpf === gerenteCpf) ?? null;
  });

  public ngOnInit(): void {
    this.carregarGerentes();
  }

  public carregarGerentes(): void {
    this.demoStore.listarGerentesDisponiveis().subscribe({
      next: (gerentes) => {
        this.gerentes.set(gerentes);
        if (!this.cadastroForm.getRawValue().gerenteCpf && gerentes.length > 0) {
          this.cadastroForm.patchValue({ gerenteCpf: gerentes[0].cpf });
        }
      },
      error: () => {
        this.mensagemErro.set('Não foi possível carregar a lista de gerentes para análise.');
      },
    });
  }

  public buscarCep(): void {
    const cepControl = this.cadastroForm.get('endereco.cep');
    if (cepControl?.invalid || !cepControl?.value) return;

    const cep = String(cepControl.value).replace(/\D/g, '');
    this.buscandoCep.set(true);

    this.http.get<any>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (dados) => {
        this.buscandoCep.set(false);
        if (!dados?.erro) {
          this.cadastroForm.get('endereco')?.patchValue({
            logradouro: dados.logradouro ?? '',
            bairro: dados.bairro ?? '',
            cidade: dados.localidade ?? '',
            estado: dados.uf ?? '',
          });
        }
      },
      error: () => {
        this.buscandoCep.set(false);
      },
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

    const raw = this.cadastroForm.getRawValue();
    const enderecoForm = raw.endereco ?? {};
    const novoCliente: ClienteAutocadastro = {
      nome: String(raw.nome ?? '').trim(),
      email: String(raw.email ?? '')
        .trim()
        .toLowerCase(),
      cpf: String(raw.cpf ?? '').replace(/\D/g, ''),
      telefone: String(raw.telefone ?? '').trim(),
      salario: Number(raw.salario ?? 0),
      endereco: {
        cep: String(enderecoForm.cep ?? '').replace(/\D/g, ''),
        logradouro: String(enderecoForm.logradouro ?? '').trim(),
        numero: Number(enderecoForm.numero ?? 0),
        complemento: String(enderecoForm.complemento ?? '').trim(),
        bairro: String(enderecoForm.bairro ?? '').trim(),
        cidade: String(enderecoForm.cidade ?? '').trim(),
        estado: String(enderecoForm.estado ?? '')
          .trim()
          .toUpperCase(),
      },
    };

    const enderecoLinha = [
      novoCliente.endereco.logradouro,
      novoCliente.endereco.numero ? String(novoCliente.endereco.numero) : '',
      novoCliente.endereco.complemento,
      novoCliente.endereco.bairro,
    ]
      .filter(Boolean)
      .join(', ');

    this.demoStore
      .solicitarAutocadastro({
        nome: novoCliente.nome,
        email: novoCliente.email,
        cpf: novoCliente.cpf,
        telefone: novoCliente.telefone,
        salario: novoCliente.salario,
        endereco: enderecoLinha,
        cidade: novoCliente.endereco.cidade,
        estado: novoCliente.endereco.estado,
        cep: novoCliente.endereco.cep,
        gerenteCpf: String(raw.gerenteCpf ?? ''),
      })
      .subscribe({
        next: (resultado) => {
          this.isLoading.set(false);
          this.resultadoCadastro.set(resultado);
          this.cadastroSucesso.set(true);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.mensagemErro.set(
            err?.message || 'Ocorreu um erro ao enviar seu cadastro. Tente novamente mais tarde.',
          );
        },
      });
  }

  public novoCadastro(): void {
    this.cadastroSucesso.set(false);
    this.resultadoCadastro.set(null);
    this.mensagemErro.set(null);
    this.cadastroForm.reset({ gerenteCpf: this.gerentes()[0]?.cpf ?? '' });
  }

  public voltarLogin(): void {
    void this.router.navigate(['/auth/login']);
  }

  public isInvalid(path: string): boolean {
    const control = this.cadastroForm.get(path);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
