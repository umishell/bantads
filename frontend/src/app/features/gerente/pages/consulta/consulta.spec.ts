import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GerenteConsultaComponent } from './consulta';

describe('GerenteConsultaComponent', () => {
  let component: GerenteConsultaComponent;
  let fixture: ComponentFixture<GerenteConsultaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [GerenteConsultaComponent] }).compileComponents();
    fixture = TestBed.createComponent(GerenteConsultaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
