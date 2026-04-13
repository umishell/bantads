import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ClienteService } from '../../../../shared/services/cliente.service';
import { ContaService } from '../../../../shared/services/conta.service';
import { TransferenciaComponent } from './transferencia';

describe('TransferenciaComponent', () => {
  let component: TransferenciaComponent;
  let fixture: ComponentFixture<TransferenciaComponent>;
  let contaServiceSpy: jasmine.SpyObj<ContaService>;

  beforeEach(async () => {
    contaServiceSpy = jasmine.createSpyObj<ContaService>('ContaService', ['transferir', 'listarFavorecidos']);
    contaServiceSpy.transferir.and.returnValue(
      of({
        conta: '1291',
        destino: '0950',
        data: '2026-04-06T12:00:00',
        saldo: 700,
        valor: 100,
      }),
    );
    contaServiceSpy.listarFavorecidos.and.returnValue(
      of([{ cpf: '09506382000', nome: 'Cleuddônio', conta: '0950', agencia: '0001' }]),
    );

    await TestBed.configureTestingModule({
      imports: [TransferenciaComponent],
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

    fixture = TestBed.createComponent(TransferenciaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar a lista de favorecidos', () => {
    expect(component.favorecidos.length).toBe(1);
    expect(component.favorecidos[0].conta).toBe('0950');
  });
});
