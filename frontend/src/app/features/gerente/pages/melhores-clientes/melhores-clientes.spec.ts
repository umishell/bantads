import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GerenteMelhoresClientesComponent } from './melhores-clientes';

describe('GerenteMelhoresClientesComponent', () => {
  let component: GerenteMelhoresClientesComponent;
  let fixture: ComponentFixture<GerenteMelhoresClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GerenteMelhoresClientesComponent] }).compileComponents();
    fixture = TestBed.createComponent(GerenteMelhoresClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
