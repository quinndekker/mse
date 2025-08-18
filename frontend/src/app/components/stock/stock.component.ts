import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock/stock.service';
import { ActivatedRoute } from '@angular/router';
import { InfoComponent } from '../info/info.component';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';    
import { PriceChartComponent } from '../price-chart/price-chart.component';
import { PredictionService } from '../../services/prediction/prediction.service'; // <-- add



@Component({
  selector: 'app-stock',
  imports: [
    CommonModule,
    InfoComponent,
    FormsModule,
    PriceChartComponent
  ],
  templateUrl: './stock.component.html',
  styleUrl: './stock.component.css'
})

export class StockComponent {
  ticker: string | null = null;
  companyName: string | null = null;
  quote: any = null; // You can create a type/interface later if needed
  errorMessage: string | null = null;

  timeframes: string[] = ['1d','5d','1m','3m','6m','1y','5y','max'];
  selectedTimeframe: string = '6m';
  points = 30;
  series: Array<{ t: string; close: number }> = [];
  seriesLoading = false;
  seriesError: string | null = null;
  predictionSeries: Array<{ t: string; close: number }> = [];

  predictions: any[] = [];
  predictionsLoading = false;
  predictionsError: string | null = null;

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
    private route: ActivatedRoute,
    private router: Router,
    private predictionService: PredictionService 
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.ticker = params.get('ticker');
      if (this.ticker) {
        this.getData(this.ticker);
        this.fetchPriceSeries();       
        this.fetchPredictions(this.ticker);  
      } else {
        this.errorMessage = 'Ticker is missing in route.';
      }
    });
  }

  get chartUnit(): 'minute' | 'hour' | 'day' | 'month' {
    switch (this.selectedTimeframe) {
      case '1d':
      case '5d':
        return 'hour';
      case '5y':
      case 'max':
        return 'month';
      default:
        return 'day';
    }
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

  navigateToPredictions() {
    if (this.ticker) {
      this.router.navigate(['/predictions', this.ticker]);
    } else {
      console.error('Ticker is not defined, cannot navigate to predictions.');
    }
  }

  fetchPriceSeries() {
    if (!this.ticker) return;
    this.seriesLoading = true;
    this.seriesError = null;
    this.stockService.getPriceSeries(this.ticker, this.selectedTimeframe, this.points).subscribe({
      next: (res) => {
        console.log('price-series points:', res?.data?.length, res);
        this.series = res?.data ?? [];
        this.seriesLoading = false;
      },
      error: (err) => {
        console.error('Price series error:', err);
        this.seriesError = 'Unable to load price series';
        this.seriesLoading = false;
      }
    });
  }

  fetchPredictions(ticker: string) {
    this.predictionsLoading = true;
    this.predictionsError = null;
  
    this.predictionService.getUserPredictions(ticker).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res?.predictions ?? []);
        this.predictions = list;
        this.predictionSeries = this.normalizePredictionsToSeries(list);  // ← feed chart
        this.predictionsLoading = false;
      },
      error: (err) => {
        console.error('Error fetching predictions:', err);
        this.predictions = [];
        this.predictionSeries = [];
        this.predictionsError = 'Unable to load predictions';
        this.predictionsLoading = false;
      }
    });
  }
  

  private computeEndDate(startDate: string | Date, timeline: string): string | null {
    if (!startDate) return null;
    const d = new Date(startDate);
  
    switch ((timeline || '').toLowerCase()) {
      case '1d': d.setDate(d.getDate() + 1); break;
      case '2w': d.setDate(d.getDate() + 14); break;
      case '2m': d.setMonth(d.getMonth() + 2); break;
      default: return null; // unknown code
    }
  
    // Optional: align to ~market open (13:30Z); skip if you don't care
    d.setUTCHours(13, 30, 0, 0);
    return d.toISOString();
  }
  
  private normalizePredictionsToSeries(preds: any[]): Array<{ t: string; close: number }> {
    // keep items that have an end date (provided or computable) AND a numeric predictedPrice
    const points = preds
      .map(p => {
        const t = p.endDate ?? this.computeEndDate(p.startDate, p.predictionTimeline);
        const close = Number(p.predictedPrice);
        return t && Number.isFinite(close) ? { t, close } : null;
      })
      .filter((x): x is { t: string; close: number } => !!x)
      // de-dupe by timestamp (keep the last one)
      .reduce((acc, cur) => acc.set(cur.t, cur), new Map<string, { t: string; close: number }>())
      .values();
  
    return Array.from(points).sort(
      (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime()
    );
  }
  
}


