import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Stock } from '../../models/stock';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InfoComponent } from '../info/info.component';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  @Input() sector?: string; 

  // userLists: List[] = [];
  selectedListId: string | null = null;

  definitions = {
    ticker: 'Ticker: The stock symbol used to identify the company. Example: AAPL for Apple Inc.',
    name: 'Name: The full name of the company associated with the stock. Example: Apple Inc.'
  };

  constructor(
    private router: Router
  ) { }

  ngOnInit() {
    // this.getUserLists();
  }

  addToList() {
    if (!this.stock || !this.selectedListId) {
      console.warn('Missing stock or list selection.');
      return;
    }

    // this.listService.addTickerToList(this.selectedListId, this.stock.ticker).subscribe({
    //   next: updatedList => {
    //     console.log(`Ticker ${this.stock!.ticker} added to list ${updatedList.name}`);
    //   },
    //   error: err => {
    //     console.error('Error adding ticker to list:', err);
    //   }
    // });
  }

  // getUserLists() {
  //   // Ensure stock is defined before making the API call
  //   if (this.stock === null) {
  //     return;
  //   }

  //   this.listService.getUserLists().subscribe({
  //     next: lists => {
  //       this.userLists = lists;
  //     },
  //     error: err => {
  //       console.error('Error fetching user lists:', err);
  //     }
  //   });
  // }

  navigateToStock() {
    if (this.stock && this.stock.ticker) {
      if (this.sector) {
        this.router.navigate(['/stock', this.stock.ticker, this.sector]);
        return;
      }
      this.router.navigate(['/stock', this.stock.ticker]);
    } else {
      console.warn('Stock ticker is not defined, cannot navigate.');
    }
  }
}
