import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { DepositoComponent } from './deposito';

describe('DepositoComponent', () => {
  let component: DepositoComponent;
  let fixture: ComponentFixture<DepositoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepositoComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getNumeroConta: () => '1234567',
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DepositoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
