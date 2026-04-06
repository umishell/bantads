import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GerenteClientesComponent } from './clientes';

describe('GerenteClientesComponent', () => {
  let component: GerenteClientesComponent;
  let fixture: ComponentFixture<GerenteClientesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GerenteClientesComponent] }).compileComponents();
    fixture = TestBed.createComponent(GerenteClientesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
