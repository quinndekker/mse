import { Component, Input } from '@angular/core';
import { Stock } from '../../models/stock';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-stock-list-item',
  imports: [
    MatTooltipModule
  ],
  templateUrl: './stock-list-item.component.html',
  styleUrl: './stock-list-item.component.css'
})
export class StockListItemComponent {
  @Input() stock: Stock | null = null;

  tickerDescription: string = "This is a stock ticker symbol, which represents a specific publicly traded company's stock. It is used to uniquely identify the stock in financial markets.";

  constructor() { }
}
