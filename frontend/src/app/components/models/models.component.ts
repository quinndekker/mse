import { Component, AfterViewInit, inject } from '@angular/core';
import { CommonModule, ViewportScroller } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ModelDetailsService } from '../../services/modelDetails/model-details.service';
import { ModelDetails } from '../../models/modelDetails';
import { FormsModule } from '@angular/forms';

type ModelType = 'lstm' | 'gru' | 'rnn';
type Timeframe = '1d' | '2w' | '2m';

interface ModelState {
  sector: string;
  timeframe: Timeframe;
  loading: boolean;
  error?: string | null;
  data?: ModelDetails | null;
}


@Component({
  selector: 'app-models',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './models.component.html',
  styleUrl: './models.component.css'
})
export class ModelsComponent implements AfterViewInit {
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

  private refresh(model: ModelType) {
    const s = this.state[model];
    s.loading = true;
    s.error = null;
    s.data = null;

    this.modelSvc.getModelDetails(model, s.timeframe, s.sector).subscribe({
      next: (doc) => { s.data = doc; s.loading = false; },
      error: (err) => {
        s.error = (err?.error?.error) || 'Failed to load model details';
        s.loading = false;
      }
    });
  }
}
