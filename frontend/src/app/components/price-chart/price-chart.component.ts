import { Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartOptions, ChartData } from 'chart.js';
import 'chartjs-adapter-date-fns';

type XY = { x: number; y: number };

@Component({
  selector: 'app-price-chart',
  imports: [BaseChartDirective],
  templateUrl: './price-chart.component.html',
  styleUrl: './price-chart.component.css'
})

export class PriceChartComponent {
  @Input() priceSeries: Array<{ t: string; close: number }> = [];
  @Input() predictionSeries: Array<{ t: string; close: number }> = [];

  // NEW: control the x-axis unit from parent: 'minute' | 'hour' | 'day' | 'month'
  @Input() timeUnit: 'minute' | 'hour' | 'day' | 'month' = 'day';

  get data(): ChartData<'line', XY[]> {
    const price: XY[] = this.priceSeries.map(p => ({ x: new Date(p.t).getTime(), y: p.close }));
    const preds: XY[] = this.predictionSeries.map(p => ({ x: new Date(p.t).getTime(), y: p.close }));
    return {
      datasets: [
        { label: 'Price', data: price, pointRadius: 0, borderWidth: 2, tension: 0.2, spanGaps: true, normalized: true },
        ...(preds.length ? [{
          label: 'Prediction',
          data: preds,
          pointRadius: 0,
          borderWidth: 2,
          borderDash: [6, 6],
          tension: 0.2,
          spanGaps: true,
          normalized: true
        }] : [])
      ]
    };
  }

  get options(): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false,              // we supply {x:number(ms), y}
      plugins: { legend: { display: true } },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: this.timeUnit,   // <-- key bit
            tooltipFormat: this.timeUnit === 'day' || this.timeUnit === 'month' ? 'PP' : 'PP p'
          },
          ticks: { source: 'data', maxRotation: 0, autoSkip: true }
        },
        y: {
          ticks: { callback: (v) => `$${Number(v).toFixed(2)}` }
        }
      },
      interaction: { mode: 'index', intersect: false }
    };
  }
}