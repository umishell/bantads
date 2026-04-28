import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AdminRelatorioClientesComponent } from './relatorio-clientes';

describe('AdminRelatorioClientesComponent', () => {
  let component: AdminRelatorioClientesComponent;
  let fixture: ComponentFixture<AdminRelatorioClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRelatorioClientesComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRelatorioClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
