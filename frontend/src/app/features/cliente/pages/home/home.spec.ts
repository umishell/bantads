import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteModel } from '../../../../shared/models/cliente/cliente.model';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let clienteServiceSpy: jasmine.SpyObj<ClienteService>;

  beforeEach(async () => {
    clienteServiceSpy = jasmine.createSpyObj<ClienteService>('ClienteService', ['buscarPorCpf']);

    const clienteMock: ClienteModel = {
      cpf: '12345678901',
      nome: 'Pedro Eduardo',
      telefone: '41999999999',
      email: 'pedro@email.com',
      endereco: 'Rua Exemplo, 100',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '80000-000',
      salario: 5000,
      conta: '1234567',
      saldo: 1500,
      limite: 1000,
      gerente_nome: 'Gerente Teste',
      situacao: 'APROVADO',
    };

    clienteServiceSpy.buscarPorCpf.and.returnValue(of(clienteMock));

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
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

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar os dados do cliente ao iniciar', () => {
    expect(clienteServiceSpy.buscarPorCpf).toHaveBeenCalledWith('12345678901');
    expect(component.cliente?.nome).toBe('Pedro Eduardo');
  });

  it('deve calcular o saldo disponivel corretamente', () => {
    expect(component.getSaldoDisponivel()).toBe(2500);
  });
});
