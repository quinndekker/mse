import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PredictionListComponent } from './prediction-list.component';

describe('PredictionListComponent', () => {
  let component: PredictionListComponent;
  let fixture: ComponentFixture<PredictionListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PredictionListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PredictionListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
