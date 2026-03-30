import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ContaService } from '../../../../shared/services/conta.service';
import { ExtratoComponent } from './extrato';

describe('ExtratoComponent', () => {
  let component: ExtratoComponent;
  let fixture: ComponentFixture<ExtratoComponent>;
  let contaServiceSpy: jasmine.SpyObj<ContaService>;

  beforeEach(async () => {
    contaServiceSpy = jasmine.createSpyObj<ContaService>('ContaService', ['consultarExtrato']);
    contaServiceSpy.consultarExtrato.and.returnValue(
      of({
        conta: '1234567',
        saldo: 1200,
        dias: [],
      })
    );

    await TestBed.configureTestingModule({
      imports: [ExtratoComponent],
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

    fixture = TestBed.createComponent(ExtratoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
