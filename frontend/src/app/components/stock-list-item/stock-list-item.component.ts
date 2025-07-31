import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InfoComponent } from '../info/info.component';
import { ListService, List } from '../../services/list/list.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-stock-list-item',
  imports: [
    CommonModule,
    MatTooltipModule,
    InfoComponent,
    FormsModule
  ],
  templateUrl: './stock-list-item.component.html',
  styleUrl: './stock-list-item.component.css'
})
export class StockListItemComponent {
  @Input() stock: Stock | null = null;

  userLists: List[] = [];
  selectedListId: string | null = null;

  definitions = {
    ticker: 'Ticker: The stock symbol used to identify the company. Example: AAPL for Apple Inc.',
    open: 'Open: The price at which the stock started trading for the day. Example: $198.37 on 07/18/2025',
    high: 'High: The highest trading price for the stock during the day. Example: $201.70 on 07/18/2025',
    low: 'Low: The lowest trading price during the day. Example: $196.85 on 07/18/2025',
    close: 'Close: The final trading price of the day. Example: $196.58 on 07/18/2025',
    price: 'Price: The current or most recent trading price. Example: $201.29 on 07/18/2025',
    change: 'Change: The difference between the previous close and current price. Example: +4.42 on 07/18/2025',
    volume: 'Volume: Total number of shares traded in the day. Example: 96,813,485 on 07/18/2025',
    changePercent: 'Change %: Percentage change from the previous close. Example: +2.25% on 07/18/2025'
  };

  constructor(
    private listService: ListService
  ) { }

  ngOnInit() {
    this.getUserLists();
  }

  addToList() {
    if (!this.stock || !this.selectedListId) {
      console.warn('Missing stock or list selection.');
      return;
    }

    this.listService.addTickerToList(this.selectedListId, this.stock.ticker).subscribe({
      next: updatedList => {
        console.log(`Ticker ${this.stock!.ticker} added to list ${updatedList.name}`);
      },
      error: err => {
        console.error('Error adding ticker to list:', err);
      }
    });
  }

  getUserLists() {
    // Ensure stock is defined before making the API call
    if (this.stock === null) {
      return;
    }

    this.listService.getUserLists().subscribe({
      next: lists => {
        this.userLists = lists;
      },
      error: err => {
        console.error('Error fetching user lists:', err);
      }
    });
  }
}
