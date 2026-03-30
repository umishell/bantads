import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../../../../core/services/auth.service';
import { SaqueComponent } from './saque';

describe('SaqueComponent', () => {
  let component: SaqueComponent;
  let fixture: ComponentFixture<SaqueComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SaqueComponent],
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

    fixture = TestBed.createComponent(SaqueComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
