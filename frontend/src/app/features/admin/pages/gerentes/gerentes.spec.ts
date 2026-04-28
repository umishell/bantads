import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminGerentesComponent } from './gerentes';

describe('AdminGerentesComponent', () => {
  let component: AdminGerentesComponent;
  let fixture: ComponentFixture<AdminGerentesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGerentesComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGerentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
