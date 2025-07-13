import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockListItemComponent } from './stock-list-item.component';

describe('StockListItemComponent', () => {
  let component: StockListItemComponent;
  let fixture: ComponentFixture<StockListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockListItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockListItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
