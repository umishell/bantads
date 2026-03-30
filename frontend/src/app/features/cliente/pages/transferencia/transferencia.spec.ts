import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ContaService } from '../../../../shared/services/conta.service';
import { TransferenciaComponent } from './transferencia';

describe('TransferenciaComponent', () => {
  let component: TransferenciaComponent;
  let fixture: ComponentFixture<TransferenciaComponent>;
  let contaServiceSpy: jasmine.SpyObj<ContaService>;

  beforeEach(async () => {
    contaServiceSpy = jasmine.createSpyObj<ContaService>('ContaService', ['transferir']);
    contaServiceSpy.transferir.and.returnValue(
      of({
        conta: '1234567',
        destino: '0950',
        data: '2026-03-24T12:00:00',
        saldo: 1200,
        valor: 100,
      })
    );

    await TestBed.configureTestingModule({
      imports: [TransferenciaComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getNumeroConta: () => '1234567',
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
});
