import { Component, Input, ViewChild } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { ChartOptions, ChartData, Chart } from 'chart.js';
import 'chartjs-adapter-date-fns';

type XY = { x: number; y: number };

@Component({
  selector: 'app-price-chart',
  imports: [BaseChartDirective],
  templateUrl: './price-chart.component.html',
  styleUrl: './price-chart.component.css'
})

export class PriceChartComponent {
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;
  @Input() priceSeries: Array<{ t: string; close: number }> = [];
  @Input() predictionSeries: Array<{ t: string; close: number }> = [];

  // NEW: control the x-axis unit from parent: 'minute' | 'hour' | 'day' | 'month'
  @Input() timeUnit: 'minute' | 'hour' | 'day' | 'month' = 'day';

  get data(): ChartData<'line', XY[]> {
    const price: XY[] = this.priceSeries.map(p => ({ x: new Date(p.t).getTime(), y: p.close }));
    const preds: XY[] = this.predictionSeries.map(p => ({ x: new Date(p.t).getTime(), y: p.close }));
    return {
      datasets: [
        {
          label: 'Price',
          data: price,
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.2,
          spanGaps: true,
          normalized: true
        },
        ...(preds.length
          ? [{
              label: 'Prediction',
              data: preds,
              pointRadius: 0,
              borderWidth: 2,
              borderDash: [6, 6],
              tension: 0.2,
              spanGaps: true,
              normalized: true
            }]
          : [])
      ]
    };
  }

  private recomputeXAxisRange(): void {
    const chart = this.chart?.chart;
    if (!chart) return;

    const visibleXs: number[] = [];

    chart.data.datasets.forEach((ds, idx) => {
      const meta = chart.getDatasetMeta(idx);
      if (meta.hidden) return; // dataset hidden
      const data = ds.data as XY[];
      for (const p of data) {
        if (p && typeof p.x === 'number' && Number.isFinite(p.x)) {
          visibleXs.push(p.x);
        }
      }
    });

    const xScale: any = chart.options.scales?.['x'];
    if (!xScale) return;

    if (!visibleXs.length) {
      // no visible data: let chart auto-range
      xScale.min = undefined;
      xScale.max = undefined;
    } else {
      visibleXs.sort((a, b) => a - b);
      xScale.min = visibleXs[0];
      xScale.max = visibleXs[visibleXs.length - 1];
    }

    chart.update();
  }

  get options(): ChartOptions<'line'> {
    const self = this;
  
    return {
      responsive: true,
      maintainAspectRatio: false,
      parsing: false, // we supply {x:number(ms), y}
      plugins: {
        legend: {
          display: true,
          onClick(event, legendItem, legend) {
            const chart = legend.chart as Chart;
            const datasetIndex = legendItem.datasetIndex ?? 0;
  
            const meta = chart.getDatasetMeta(datasetIndex);
  
            // Toggle boolean explicitly; avoid null
            const currentlyHidden = !!meta.hidden;
            meta.hidden = !currentlyHidden;
  
            // Now recompute x-range using the new hidden flags
            self.recomputeXAxisRange();
  
            // Finally, update the chart (no extra logic here)
            chart.update();
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: this.timeUnit,
            tooltipFormat:
              this.timeUnit === 'day' || this.timeUnit === 'month'
                ? 'PP'
                : 'PP p'
          },
          ticks: { source: 'data', maxRotation: 0, autoSkip: true }
        },
        y: {
          ticks: {
            callback: (v) => `$${Number(v).toFixed(2)}`
          }
        }
      },
      interaction: { mode: 'index', intersect: false }
    };
  }
}