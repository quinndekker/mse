import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Prediction, Timeframe } from '../../models/prediction';
import { RouterLink } from '@angular/router';
import { InfoComponent } from '../info/info.component';
import { FormsModule } from '@angular/forms'; 

type SortKey = 'ticker' | 'modelType' | 'predictionTimeline';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-prediction-list',
  imports: [CommonModule, DatePipe, RouterLink, InfoComponent, FormsModule],
  templateUrl: './prediction-list.component.html',
  styleUrl: './prediction-list.component.css'
})
export class PredictionsListComponent {
  @Input() set predictions(value: Prediction[] | null | undefined) {
    this._predictions.set(value ?? []);
    this.page.set(1)
  }
  private _predictions = signal<Prediction[]>([]);

  // Tooltips content
  definitions = {
    ticker: "The stock ticker symbol (e.g., AAPL for Apple, MSFT for Microsoft). This tells the model which stock you're interested in predicting.",
    modelType: "The type of machine learning model used for the prediction:\n- LSTM: Good for learning long-term patterns\n- GRU: Faster to train, handles short-term trends well\n- RNN: A simpler, more general-purpose model",
    predictionTimeline: "The time frame for the prediction:\n- 1 Day: Predicts the price for the next trading day\n- 2 Weeks: Predicts the price two weeks from now\n- 2 Months: Predicts the price two months into the future",
    predictedPrice: "The forecasted future price of the stock, based on the model and timeline you selected. For example, if you selected 'AAPL', 'LSTM', and '2 Weeks', this is what the model thinks AAPL will be worth two weeks from now.",
    status: "The state of the prediction request:\n- Completed: The model has finished processing\n- Pending: Still running (or failed silently)",
    startDate: "The date on which the prediction was requested and the input data was pulled. For example, a Monday morning prediction uses data from that date.",
    endDate: "The future date corresponding to the selected timeline. For instance, a 2-week prediction from August 1st will show an end date around August 15th.",
    priceDifference: "The difference between the actual price at the end date and the model's predicted price. Useful to assess how close the model was.",
    predictionAccuracy: "A score or percentage that shows how accurate the prediction was, calculated based on the real price vs predicted price after the time period passed.",
    actualPrice: "The real market opening price on the end date (first trade of that session), fetched from Alpha Vantage once the end date has passed. This value is used to evaluate the model’s prediction. Before the end date, it will show as Pending.",
    insuffientData: "Indicates whether the model had enough historical data to make a prediction. If true, it means the model could not find enough data points to generate a reliable forecast.",
    sector: "The market sector the stock belongs to, such as Technology, Healthcare, Financials, etc. This helps categorize stocks based on their industry and economic function.",
    mse: "Measures how far the predicted percentage change differs from the actual percentage change in stock price. Lower values indicate more accurate predictions, with zero meaning a perfect match."
  };

  sortKey = signal<SortKey>('ticker');
  sortDir = signal<SortDir>('asc');

  private timelineOrder: Record<Timeframe, number> = { '1d': 0, '2w': 1, '2m': 2 };

  sortedPredictions = computed(() => {
    const data = [...this._predictions()];
    const key = this.sortKey();
    const dir = this.sortDir();

    data.sort((a, b) => {
      let cmp = 0;
      if (key === 'predictionTimeline') {
        cmp = (this.timelineOrder[a.predictionTimeline] ?? 99) - (this.timelineOrder[b.predictionTimeline] ?? 99);
      } else {
        const av = (a[key] ?? '').toString().toUpperCase();
        const bv = (b[key] ?? '').toString().toUpperCase();
        cmp = av.localeCompare(bv);
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return data;
  });

  setSort(key: SortKey) {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
    this.page.set(1);
  }

  sortIcon(key: SortKey) {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  trackByRow = (_: number, p: Prediction) =>
    p._id || p.id || `${p.ticker}-${p.modelType}-${p.predictionTimeline}-${p.startDate}`;

  page = signal(1);
  pageSize = signal(10); 
  pageSizeOptions = [5, 10, 25, 50];

  totalItems = computed(() => this.sortedPredictions().length);
  totalPages = computed(() => {
    const n = this.totalItems();
    const sz = this.pageSize();
    return Math.max(1, Math.ceil(n / Math.max(1, sz)));
  });

  pagedPredictions = computed(() => {
    const data = this.sortedPredictions();
    const sz = this.pageSize();
    const maxPage = Math.max(1, Math.ceil(data.length / Math.max(1, sz)));
    // clamp page if pageSize changed or data shrank
    const p = Math.min(this.page(), maxPage);
    if (p !== this.page()) this.page.set(p);

    const start = (p - 1) * sz;
    return data.slice(start, start + sz);
  });

  // for UI footer: "x–y of N"
  pageBounds = computed(() => {
    const n = this.totalItems();
    if (n === 0) return { from: 0, to: 0, total: 0 };
    const p = this.page();
    const sz = this.pageSize();
    const from = (p - 1) * sz + 1;
    const to = Math.min(p * sz, n);
    return { from, to, total: n };
  });

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.page();
    const windowSize = 5; // how many buttons to show
    const half = Math.floor(windowSize / 2);
    let start = Math.max(1, current - half);
    let end = Math.min(total, start + windowSize - 1);
    if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  goToPage(n: number) {
    const clamped = Math.max(1, Math.min(this.totalPages(), Math.trunc(n)));
    this.page.set(clamped);
  }
  nextPage() { this.goToPage(this.page() + 1); }
  prevPage() { this.goToPage(this.page() - 1); }
  changePageSize(sz: number) {
    this.pageSize.set(Math.max(1, Math.trunc(sz)));
    this.page.set(1); // reset to first page when size changes
  }
}