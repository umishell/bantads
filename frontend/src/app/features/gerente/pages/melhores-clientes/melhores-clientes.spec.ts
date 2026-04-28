import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GerenteMelhoresClientesComponent } from './melhores-clientes';

describe('GerenteMelhoresClientesComponent', () => {
  let component: GerenteMelhoresClientesComponent;
  let fixture: ComponentFixture<GerenteMelhoresClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GerenteMelhoresClientesComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(GerenteMelhoresClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
