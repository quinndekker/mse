import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock/stock.service';
import { ActivatedRoute } from '@angular/router';
import { InfoComponent } from '../info/info.component';

@Component({
  selector: 'app-stock',
  imports: [
    CommonModule,
    InfoComponent
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.css'
})

export class StockComponent {
  ticker: string | null = null;
  companyName: string | null = null;
  quote: any = null; // You can create a type/interface later if needed
  errorMessage: string | null = null;

  definitions = {
    open: "The stock's price when the market opened on the latest trading day. For example, if the market opened at $150.25 on a Monday, that's the value shown here.",
    high: "The highest price the stock reached during the trading day. For example, the stock may have peaked at $153.70 before closing.",
    low: "The lowest price the stock dropped to during the trading day. For instance, it may have dipped to $147.80 before recovering.",
    price: "The most recent trading price of the stock. This is the closing price for the latest trading session, such as $151.32 on a Friday.",
    previousClose: "The price at which the stock closed during the previous trading session. For example, Friday’s close will show here on Monday morning.",
    change: "The dollar amount the stock has moved compared to the previous close. Positive means gain (e.g., +$2.50), negative means loss (e.g., -$1.75).",
    changePercent: "The percentage the stock price has changed since the previous close. For example, +1.25% means the stock gained value today.",
    volume: "The total number of shares traded during the day. High volume (e.g., 10 million) often indicates strong interest or news activity.",
    latestTradingDay: "The calendar date of the most recent trading session, usually a weekday like '2025-08-02' (a Friday)."
  };
  
  

  constructor(
    private stockService: StockService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = params.get('ticker');
      if (this.ticker) {
        this.getData(this.ticker);
      } else {
        this.errorMessage = 'Ticker is missing in route.';
      }
    });
  }

  getData(ticker: string) {
    this.errorMessage = null;
    this.companyName = null;
    this.quote = null;

    this.stockService.getQuoteByTicker(ticker).subscribe({
      next: (data) => {
        this.companyName = data.name;
        this.quote = data.quote;
      },
      error: (err) => {
        console.error(`Error fetching stock data for ${ticker}:`, err);
        this.errorMessage = `Failed to load data for ${ticker}`;
      }
    });
  }

  isPositive(value: string): boolean {
    return !value.startsWith('-');
  }
}


