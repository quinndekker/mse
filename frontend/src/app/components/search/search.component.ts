import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { StockService } from '../../services/stock/stock.service';
import { StockListComponent } from '../stock-list/stock-list.component';
import { Stock } from '../../models/stock';
import { StockList } from '../../models/stockList';

@Component({
  selector: 'app-search',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StockListComponent
],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
  searchForm: FormGroup;
  searchQuery = '';
  stockList: StockList | null = null;
  showResults: boolean = false;
  showNoResults: boolean = false;
  constructor(private fb: FormBuilder, private stockService: StockService) {
    this.searchForm = this.fb.group({
      searchQuery: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.searchForm.valid) {
      const { searchQuery } = this.searchForm.value;
      this.searchQuery = searchQuery; 
      this.searchStocks(searchQuery, 1, 10);
    }
  }

  searchStocks(searchQuery: string, page: number = 1, limit: number = 10) {
    this.stockService.searchStocks(searchQuery, page, limit).subscribe({
      next: (results) => {
        this.stockList = {
          stocks: [],
          total: results.total,
          page: results.page,
          totalPages: results.totalPages,
          limit: results.limit
        }

        if (Array.isArray(results.stocks)) {
          results.stocks.forEach((stock: any) => {
            const stockData: Stock = {
              ticker: stock.ticker || 'N/A',
              open: Number(stock.open) || 0,
              high: Number(stock.high) || 0,
              low: Number(stock.low) || 0,
              close: Number(stock.close) || 0,
              volume: Number(stock.volume) || 0,
              change: Number(stock.change) || 0,
              price: Number(stock.price) || 0,
              changePercent: Number(stock.changePercent) || 0,
            };
          
            this.stockList?.stocks.push(stockData);
          });
        } else {
          console.warn('results.stocks is not an array:', results.stocks);
        }

        if (this.stockList.stocks.length > 0) {
          this.showResults = true;
          this.showNoResults = false;
        } else {
          this.showResults = false;
          this.showNoResults = true;
        }
      },
      error: (err) => {
        console.error('Search failed:', err);
      }
    });
  }

}
