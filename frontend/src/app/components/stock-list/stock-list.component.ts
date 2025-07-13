import { Component, Input } from '@angular/core';
import { PageSelectorComponent } from '../page-selector/page-selector.component';
import { StockList } from '../../models/stockList';
import { Stock } from '../../models/stock';
import { CommonModule } from '@angular/common';
import { StockListItemComponent } from '../stock-list-item/stock-list-item.component';

@Component({
  selector: 'app-stock-list',
  imports: [
    PageSelectorComponent,
    CommonModule,
    StockListItemComponent
  ],
  templateUrl: './stock-list.component.html',
  styleUrl: './stock-list.component.css'
})
export class StockListComponent {
  @Input() stockList: StockList | null = null;

  constructor() { }

}
