import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGerentesComponent } from './gerentes';

describe('AdminGerentesComponent', () => {
  let component: AdminGerentesComponent;
  let fixture: ComponentFixture<AdminGerentesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGerentesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminGerentesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
