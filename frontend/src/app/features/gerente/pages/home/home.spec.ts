import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GerenteHomeComponent } from './home';

describe('GerenteHomeComponent', () => {
  let component: GerenteHomeComponent;
  let fixture: ComponentFixture<GerenteHomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GerenteHomeComponent],
      providers: [provideHttpClient(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(GerenteHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
