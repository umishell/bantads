import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { PerfilComponent } from './perfil';

describe('PerfilComponent', () => {
  let component: PerfilComponent;
  let fixture: ComponentFixture<PerfilComponent>;
  let clienteServiceSpy: jasmine.SpyObj<ClienteService>;

  beforeEach(async () => {
    clienteServiceSpy = jasmine.createSpyObj<ClienteService>('ClienteService', [
      'buscarPorCpf',
      'alterarPerfil',
    ]);

    const clienteBase = {
      cpf: '12912861012',
      nome: 'Catharyna',
      telefone: '41999990001',
      email: 'cli1@bantads.com.br',
      endereco: 'Rua Exemplo, 100',
      cidade: 'Curitiba',
      estado: 'PR',
      salario: 10000,
      conta: '1291',
      saldo: 800,
      limite: 5000,
      gerente_nome: 'Geniéve',
      situacao: 'APROVADO',
      agencia: '0001',
      cep: '80000-100',
    };

    clienteServiceSpy.buscarPorCpf.and.returnValue(of(clienteBase));
    clienteServiceSpy.alterarPerfil.and.returnValue(
      of({
        ...clienteBase,
        nome: 'Catharyna Atualizada',
        email: 'atualizada@bantads.com.br',
      }),
    );

    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getCpf: () => '12912861012',
            getNumeroConta: () => '1291',
          },
        },
        {
          provide: ClienteService,
          useValue: clienteServiceSpy,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve preencher o formulario ao carregar os dados', () => {
    expect(clienteServiceSpy.buscarPorCpf).toHaveBeenCalledWith('12912861012');
    expect(component.perfilForm.get('nome')?.value).toBe('Catharyna');
  });

  it('deve enviar os dados atualizados ao salvar', () => {
    component.perfilForm.patchValue({
      nome: 'Catharyna Atualizada',
      email: 'atualizada@bantads.com.br',
      telefone: '41988887777',
      salario: 12000,
      endereco: 'Rua Nova, 200',
      cep: '80000-000',
      cidade: 'Curitiba',
      estado: 'PR',
    });

    component.salvar();

    expect(clienteServiceSpy.alterarPerfil).toHaveBeenCalled();
  });
});
