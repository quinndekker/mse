import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModelDetailsService } from '../../services/modelDetails/model-details.service';
import { ModelDetails } from '../../models/modelDetails';
import { FormsModule } from '@angular/forms';
import { Prediction } from '../../models/prediction';
import { PredictionService } from '../../services/prediction/prediction.service';
import { PredictionsListComponent } from '../prediction-list/prediction-list.component';
import { ModelState } from '../../models/modelState';

type ModelType = 'lstm' | 'gru' | 'rnn';
type Timeframe = '1d' | '2w' | '2m';

@Component({
  selector: 'app-models',
  imports: [
    CommonModule,
    FormsModule,
    PredictionsListComponent
  ],
  templateUrl: './models.component.html',
  styleUrl: './models.component.css'
})
export class ModelsComponent implements AfterViewInit {

  constructor(
    private predictionSvc: PredictionService,
  ) {}

  private route = inject(ActivatedRoute);
  private scroller = inject(ViewportScroller);
  private modelSvc = inject(ModelDetailsService);

  // Select options
  sectors = [
    { value: 'general', label: 'General' },
    { value: 'xlk', label: 'Technology (XLK)' },
    { value: 'xly', label: 'Consumer Discretionary (XLY)' },
    { value: 'xlv', label: 'Health Care (XLV)' },
    { value: 'xlp', label: 'Consumer Staples (XLP)' },
    { value: 'xlf', label: 'Financials (XLF)' },
    { value: 'xle', label: 'Energy (XLE)' },
    { value: 'xlb', label: 'Materials (XLB)' },
    { value: 'xli', label: 'Industrials (XLI)' },
    { value: 'xlu', label: 'Utilities (XLU)' },
    { value: 'xlre', label: 'Real Estate (XLRE)' },
    { value: 'xlc', label: 'Communication Services (XLC)' },
  ];

  timeframes: { value: Timeframe; label: string }[] = [
    { value: '1d', label: '1 Day' },
    { value: '2w', label: '2 Weeks' },
    { value: '2m', label: '2 Months' },
  ];

  // Per-model UI state
  state: Record<ModelType, ModelState> = {
    lstm: { sector: 'general', timeframe: '1d', loading: false, data: null, error: null },
    gru:  { sector: 'general', timeframe: '1d', loading: false, data: null, error: null },
    rnn:  { sector: 'general', timeframe: '1d', loading: false, data: null, error: null },
  };

  ngAfterViewInit(): void {
    const initialFragment = this.route.snapshot.fragment;
    if (initialFragment) this.scrollTo(initialFragment);
    this.route.fragment.subscribe((frag) => { if (frag) this.scrollTo(frag); });

    // Initial loads
    this.refresh('lstm');
    this.refresh('gru');
    this.refresh('rnn');
  }

  scrollTo(fragment: string) {
    const el = document.getElementById(fragment);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    else this.scroller.scrollToAnchor(fragment);
  }

  onSelectChanged(model: ModelType) {
    this.refresh(model);
  }

  private sectorTickerFor(value: string): string {
    return value && value.toLowerCase() !== 'general' ? value.toUpperCase() : 'general';
  }  

  private refresh(model: ModelType) {
    const s = this.state[model];
  
    // reset metrics state
    s.loading = true;
    s.error = null;
    s.data = null;
  
    // reset predictions state
    s.predLoading = true;
    s.predError = null;
    s.predictions = null;
  
    // Load model details
    this.modelSvc.getModelDetails(model, s.timeframe, s.sector).subscribe({
      next: (doc) => { s.data = doc; s.loading = false; },
      error: (err) => {
        s.error = (err?.error?.error) || 'Failed to load model details';
        s.loading = false;
      }
    });
  

    const sectorTicker = this.sectorTickerFor(s.sector);
    this.predictionSvc.getPredictionsByFilter(
      model,            // modelType: 'lstm' | 'gru' | 'rnn'
      s.timeframe,      // predictionTimeline: '1d' | '2w' | '2m'
      sectorTicker      // sectorTicker: 'general' or 'XLK' etc.
    ).subscribe({
      next: (preds) => {
        s.predictions = Array.isArray(preds) ? preds : (preds?.predictions ?? []);
        s.predLoading = false;
      },
      error: (err) => {
        s.predError = (err?.error?.error) || 'Failed to load predictions';
        s.predLoading = false;
      }
    });
  }
  
}
