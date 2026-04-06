import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ContaService } from '../../../../shared/services/conta.service';
import { SaqueComponent } from './saque';

describe('SaqueComponent', () => {
  let component: SaqueComponent;
  let fixture: ComponentFixture<SaqueComponent>;
  let contaServiceSpy: jasmine.SpyObj<ContaService>;

  beforeEach(async () => {
    contaServiceSpy = jasmine.createSpyObj<ContaService>('ContaService', ['sacar']);
    contaServiceSpy.sacar.and.returnValue(
      of({ conta: '1291', data: '2026-04-06T12:00:00', saldo: 700, valor: 100 }),
    );

    await TestBed.configureTestingModule({
      imports: [SaqueComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getNumeroConta: () => '1291',
            getCpf: () => '12912861012',
          },
        },
        {
          provide: ClienteService,
          useValue: {
            buscarPorCpf: () =>
              of({
                cpf: '12912861012',
                nome: 'Catharyna',
                telefone: '41999990001',
                email: 'cli1@bantads.com.br',
                endereco: 'Rua 1',
                cidade: 'Curitiba',
                estado: 'PR',
                salario: 10000,
                conta: '1291',
                saldo: 800,
                limite: 5000,
                gerente_nome: 'Geniéve',
                situacao: 'APROVADO',
              }),
          },
        },
        {
          provide: ContaService,
          useValue: contaServiceSpy,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SaqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve realizar saque e atualizar o saldo local', () => {
    component.valor = 100;
    component.sacar();

    expect(contaServiceSpy.sacar).toHaveBeenCalledWith('1291', 100);
    expect(component.saldoAtual).toBe(700);
  });
});
