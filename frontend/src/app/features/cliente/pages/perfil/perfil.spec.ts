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

    clienteServiceSpy.buscarPorCpf.and.returnValue(
      of({
        cpf: '12345678901',
        nome: 'Pedro Eduardo',
        telefone: '41999999999',
        email: 'pedro@email.com',
        endereco: 'Rua Exemplo, 100',
        cidade: 'Curitiba',
        estado: 'PR',
        salario: 5000,
        conta: '1234567',
        saldo: 1500,
        limite: 1000,
        gerente_nome: 'Gerente Teste',
        situacao: 'APROVADO',
      })
    );

    clienteServiceSpy.alterarPerfil.and.returnValue(of({}));

    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getCpf: () => '12345678901',
            getNumeroConta: () => '1234567',
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
    expect(clienteServiceSpy.buscarPorCpf).toHaveBeenCalledWith('12345678901');
    expect(component.perfilForm.get('nome')?.value).toBe('Pedro Eduardo');
    expect(component.perfilForm.get('email')?.value).toBe('pedro@email.com');
  });

  it('deve enviar os dados atualizados ao salvar', () => {
    component.perfilForm.patchValue({
      nome: 'Pedro Atualizado',
      email: 'pedro.atualizado@email.com',
      telefone: '41988887777',
      salario: 6500,
      endereco: 'Rua Nova, 200',
      cep: '80000-000',
      cidade: 'Curitiba',
      estado: 'PR',
    });

    component.salvar();

    expect(clienteServiceSpy.alterarPerfil).toHaveBeenCalled();
  });
});
