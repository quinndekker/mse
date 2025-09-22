import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StockService } from '../../services/stock/stock.service';
import { ActivatedRoute } from '@angular/router';
import { InfoComponent } from '../info/info.component';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';    
import { PredictionService } from '../../services/prediction/prediction.service';
import { ViewChild, ElementRef } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { PredictionsListComponent } from '../prediction-list/prediction-list.component';
import { Prediction } from '../../models/prediction';

type ModelType = 'lstm' | 'gru' | 'rnn';
type Timeframe = '1d' | '2w' | '2m';

interface PredictionGroup {
  modelType: ModelType;
  timeframe: Timeframe;
  items: any[];
}

interface PredPoint {
  t: string;                 // day key 'YYYY-MM-DD'
  y: number;                 // predicted price
  ap?: number | null;        // actual price
  diff?: number | null;      // price difference
  acc?: number | null;       // prediction accuracy
}

type ChartDatum = { x: string; y: number; ap?: number|null; diff?: number|null; acc?: number|null };

@Component({
  selector: 'app-stock',
  imports: [
    CommonModule,
    InfoComponent,
    FormsModule,
    PredictionsListComponent,
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

  predictions: Prediction[] = [];
  predictionsLoading = false;
  predictionsError: string | null = null;


  modelType: 'lstm' | 'gru' | 'rnn' = 'lstm';
  predictionTimeline: '1d' | '2w' | '2m' = '1d';

  // create-state
  submitting = false;
  createSuccess = false;
  createError: string | null = null;
  createdPredictionPrice: number | null = null;

  readonly MODEL_TYPES: ModelType[] = ['lstm', 'gru', 'rnn'];
  readonly TIMEFRAMES: Timeframe[] = ['1d', '2w', '2m'];
  predictionGroups: PredictionGroup[] = [];

  definitions = {
    open: "The stock's price when the market opened on the latest trading day. For example, if the market opened at $150.25 on a Monday, that's the value shown here.",
    high: "The highest price the stock reached during the trading day. For example, the stock may have peaked at $153.70 before closing.",
    low: "The lowest price the stock dropped to during the trading day. For instance, it may have dipped to $147.80 before recovering.",
    price: "The most recent trading price of the stock. This is the closing price for the latest trading session, such as $151.32 on a Friday.",
    previousClose: "The price at which the stock closed during the previous trading session. For example, Friday’s close will show here on Monday morning.",
    change: "The dollar amount the stock has moved compared to the previous close. Positive means gain (e.g., +$2.50), negative means loss (e.g., -$1.75).",
    changePercent: "The percentage the stock price has changed since the previous close. For example, +1.25% means the stock gained value today.",
    volume: "The total number of shares traded during the day. High volume (e.g., 10 million) often indicates strong interest or news activity.",
    latestTradingDay: "The calendar date of the most recent trading session, usually a weekday like '2025-08-02' (a Friday).",
    modelType: "The type of machine learning model used for the prediction:\n- LSTM: Good for long-term patterns\n- GRU: Faster to train, handles short-term trends well\n- RNN: Simpler, general-purpose",
    predictionTimeline: "The time frame for the prediction:\n- 1 Day: Next trading day\n- 2 Weeks: Two weeks from now\n- 2 Months: Two months into the future",
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

  submitPredictionForTicker(form: any) {
    if (!this.ticker) return;
  
    this.submitting = true;
    this.createSuccess = false;
    this.createError = null;
    this.createdPredictionPrice = null;
  
    const t = this.ticker.toUpperCase().trim();
  
    this.predictionService.createPrediction(t, this.modelType, this.predictionTimeline).subscribe({
      next: (res: any) => {
        this.submitting = false;
        this.createSuccess = true;
        this.createdPredictionPrice = (typeof res?.predictedPrice === 'number') ? res.predictedPrice : null;
  
        // Optimistically add to the page’s prediction list
        const created = {
          ...res,
          ticker: t,
          modelType: this.modelType,
          predictionTimeline: this.predictionTimeline,
          startDate: res?.startDate ?? new Date().toISOString(),
          endDate: res?.endDate ?? this.computeEndDate(new Date(), this.predictionTimeline),
          status: res?.status ?? 'Completed'
        };
        this.predictions = [created, ...this.predictions];
        this.predictionGroups = this.buildPredictionGroups(this.predictions);
        this.updateChart();
  
      },
      error: (err) => {
        console.error('❌ Prediction error:', err);
        this.submitting = false;
        this.createError = 'Failed to create prediction. Not enough information on company';
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
        this.series = res?.data ?? [];
        this.seriesLoading = false;
        this.updateChart();
      },
      error: (err) => {
        console.error('Price series error:', err);
        this.seriesError = 'Unable to load price series';
        this.seriesLoading = false;
        this.updateChart();
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
        this.predictionGroups = this.buildPredictionGroups(list);

        // this.predictionSeries = this.normalizePredictionsToSeries(list);  
        this.predictionsLoading = false;
        this.updateChart();
      },
      error: (err) => {
        console.error('Error fetching predictions:', err);
        this.predictions = [];
        this.predictionSeries = [];
        this.predictionsError = 'Unable to load predictions';
        this.predictionsLoading = false;
        this.updateChart();
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
  
  // private normalizePredictionsToSeries(preds: any[]): Array<{ t: string; close: number }> {
  //   // keep items that have an end date (provided or computable) AND a numeric predictedPrice
  //   const points = preds
  //     .map(p => {
  //       const t = p.endDate ?? this.computeEndDate(p.startDate, p.predictionTimeline);
  //       const close = Number(p.predictedPrice);
  //       return t && Number.isFinite(close) ? { t, close } : null;
  //     })
  //     .filter((x): x is { t: string; close: number } => !!x)
  //     // de-dupe by timestamp (keep the last one)
  //     .reduce((acc, cur) => acc.set(cur.t, cur), new Map<string, { t: string; close: number }>())
  //     .values();
  
  //   return Array.from(points).sort(
  //     (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime()
  //   );
  // }

  private buildPredictionGroups(list: any[]): PredictionGroup[] {
    const groups = new Map<string, PredictionGroup>();
  
    for (const p of list) {
      const modelType = String(p?.modelType || '').toLowerCase() as ModelType;
      const timeframe = String(p?.predictionTimeline || '').toLowerCase() as Timeframe;
  
      // keep only recognized values
      if (!this.MODEL_TYPES.includes(modelType) || !this.TIMEFRAMES.includes(timeframe)) continue;
  
      const key = `${modelType}|${timeframe}`;
      if (!groups.has(key)) {
        groups.set(key, { modelType, timeframe, items: [] });
      }
      groups.get(key)!.items.push(p);
    }
  
    // sort items in each group by startDate ascending (tweak as needed)
    for (const g of groups.values()) {
      g.items.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    }
  
    // return in a stable display order: timeframe major, then model type
    const ordered: PredictionGroup[] = [];
    for (const tf of this.TIMEFRAMES) {
      for (const mt of this.MODEL_TYPES) {
        const g = groups.get(`${mt}|${tf}`);
        if (g) ordered.push(g);
      }
    }
    return ordered;
  }  

@ViewChild('comboChart', { static: false }) comboChartRef!: ElementRef<HTMLCanvasElement>;
private chart?: Chart;

// UI state
selectedActual = true;                                // toggle for actual price
selectedKeys: Record<string, boolean> = {};           // toggle per prediction group

// unchanged
keyOf(g: PredictionGroup): string {
  return `${g.modelType}|${g.timeframe}`;
}

private dayKeyUTC(iso: string): string {
  return String(iso).slice(0, 10); // 'YYYY-MM-DD'
}

private labelForDayKey(ymd: string): string {
  const [Y, M, D] = ymd.split('-').map(Number);
  return new Date(Date.UTC(Y, M - 1, D)).toLocaleDateString();
}

private colorForKey(key: string): string {
  const palette = ['#2563eb','#16a34a','#dc2626','#7c3aed','#ea580c','#0ea5e9','#15803d','#b91c1c','#6d28d9','#c2410c','#0891b2','#166534'];
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

private alignToLabels(labels: string[], pts: Array<{ t: string; y: number }>): (number | null)[] {
  const map = new Map(pts.map(p => [p.t, p.y])); // keys are 'YYYY-MM-DD'
  return labels.map(t => (map.has(t) ? map.get(t)! : null));
}

private buildLabels(): string[] {
  const set = new Set<string>();
  if (this.selectedActual && this.series?.length) {
    for (const p of this.series) set.add(this.dayKeyUTC(p.t));
  }
  for (const g of this.predictionGroups) {
    const k = this.keyOf(g);
    if (!this.selectedKeys[k]) continue;
    for (const p of g.items) {
      const t = p.endDate ?? this.computeEndDate(p.startDate, p.predictionTimeline);
      if (t) set.add(this.dayKeyUTC(t));
    }
  }
  return Array.from(set).sort();
}

private pointsForActual(): Array<{ t: string; y: number }> {
  const byDay = new Map<string, number>();
  for (const p of [...(this.series ?? [])].sort(
    (a, b) => new Date(a.t).getTime() - new Date(b.t).getTime()
  )) {
    const y = Number(p.close);
    if (!Number.isFinite(y)) continue;
    byDay.set(this.dayKeyUTC(p.t), y); // keep last close that day
  }
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([t, y]) => ({ t, y }));
}

private pointsForGroup(g: PredictionGroup): PredPoint[] {
  const byDay = new Map<string, PredPoint>();

  for (const p of g.items) {
    const tISO = p.endDate ?? this.computeEndDate(p.startDate, p.predictionTimeline);
    const y = Number(p.predictedPrice);
    if (!tISO || !Number.isFinite(y)) continue;

    const key = this.dayKeyUTC(tISO);
    const ap   = (p.actualPrice ?? null);
    const diff = (p.priceDifference ?? null);
    const acc  = (p.predictionAccuracy ?? null);

    byDay.set(key, { t: key, y, ap, diff, acc }); // keep last for that day
  }

  return Array.from(byDay.values()).sort((a, b) => a.t.localeCompare(b.t));
}

// Build/update the chart using {x: label, y: number} data
updateChart(): void {
  if (!this.comboChartRef) return;

  const dayKeys = this.buildLabels();                 // ['YYYY-MM-DD', ...]
  const labels  = dayKeys.map(d => this.labelForDayKey(d)); // display labels

  const datasets: any[] = [];

  if (this.selectedActual) {
    const pts = this.pointsForActual();              // [{t:'YYYY-MM-DD', y}]
    datasets.push({
      label: 'Actual Price',
      data: pts.map(p => ({ x: this.labelForDayKey(p.t), y: p.y })), // <—
      borderColor: '#111827',
      backgroundColor: '#111827',
      borderWidth: 2,
      pointRadius: 0,
      spanGaps: true
    });
  }

  for (const g of this.predictionGroups) {
    const key = this.keyOf(g);
    if (!this.selectedKeys[key]) continue;
    const pts: PredPoint[] = this.pointsForGroup(g);
const data: ChartDatum[] = pts.map(p => ({
  x: this.labelForDayKey(p.t),
  y: p.y,
  ap: p.ap ?? null,
  diff: p.diff ?? null,
  acc: p.acc ?? null
}));

datasets.push({
  label: `${g.modelType.toUpperCase()} • ${g.timeframe}`,
  modelType: g.modelType,                // for tooltip
  timeframe: g.timeframe,                // for tooltip
  data,                                  // typed objects with metadata
  borderColor: this.colorForKey(key),
  backgroundColor: this.colorForKey(key),
  borderDash: g.timeframe === '1d' ? [] : g.timeframe === '2w' ? [6, 4] : [2, 3],
  borderWidth: 2,
  pointRadius: 0,
  spanGaps: true
} as any);
  }

  const ctx = this.comboChartRef.nativeElement.getContext('2d')!;

  if (this.chart) {
    this.chart.data.labels = labels;
    this.chart.data.datasets = datasets;
    this.chart.update();
  } else {
    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        parsing: false,                 // we provide {x,label,y} objects already
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        elements: { line: { tension: 0 }, point: { radius: 0 } },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              title: (items) => (items?.[0]?.label ?? ''),
              label: (ctx) => {
                const raw: any = ctx.raw || {};
                const ds: any = ctx.dataset || {};
                const isActual = (ds.label || '').toLowerCase().includes('actual');
        
                const y = typeof ctx.parsed?.y === 'number' ? ctx.parsed.y : raw.y;
                const lines: string[] = [];
        
                if (isActual) {
                  // Actual series
                  lines.push(`Actual: $${Number(y).toFixed(2)}`);
                } else {
                  // Prediction series
                  const mt = (ds.modelType ?? '').toString().toUpperCase();
                  const tf = (ds.timeframe ?? '').toString();
                  // NEW: show model/timeframe
                  lines.push(`${mt} • ${tf}`);
                  lines.push(`Predicted: $${Number(y).toFixed(2)}`);
        
                  if (Number.isFinite(raw.ap))   lines.push(`Actual: $${Number(raw.ap).toFixed(2)}`);
                  if (Number.isFinite(raw.diff)) lines.push(`Δ: $${Number(raw.diff).toFixed(2)}`);
                  if (Number.isFinite(raw.acc))  lines.push(`Accuracy: ${Number(raw.acc).toFixed(2)}%`);
                }
        
                return lines;
              }
            }
          }
        }, 
        scales: {
          x: {
            type: 'category',          // evenly spaced labels
            ticks: { maxTicksLimit: 8, autoSkip: true }
          },
          y: {
            beginAtZero: false,
            ticks: { callback: (v) => `$${v}` }
          }
        }
      }
    });
  }

  // quick sanity: first few labels and first dataset points
  if (labels.length) console.log('[chart] labels:', labels.slice(0, 8));
  if (datasets.length) console.log('[chart] sample points:', datasets[0].data.slice(0, 8));
}
}


