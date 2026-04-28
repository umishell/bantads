import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GerenteClientesComponent } from './clientes';

describe('GerenteClientesComponent', () => {
  let component: GerenteClientesComponent;
  let fixture: ComponentFixture<GerenteClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GerenteClientesComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(GerenteClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
