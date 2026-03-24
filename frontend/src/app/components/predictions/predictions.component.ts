import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionService } from '../../services/prediction/prediction.service';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap, tap, takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { Prediction } from '../../models/prediction';
import { PredictionsListComponent } from '../prediction-list/prediction-list.component';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-predictions',
  imports: [
    CommonModule,
    FormsModule,
    PredictionsListComponent
  ],
  templateUrl: './predictions.component.html',
  styleUrl: './predictions.component.css'
})
export class PredictionsComponent {
  private destroy$ = new Subject<void>();

  predictions: Prediction[] = [];
  loading = true;
  error: string | null = null;

  ticker = '';

  constructor(private predictionService: PredictionService,
              private activatedRoute: ActivatedRoute) {}

    ngOnInit(): void {
      // Load (and react to) the optional :ticker route param
      this.activatedRoute.paramMap
        .pipe(
          map(pm => (pm.get('ticker') || '').trim().toUpperCase()),
          distinctUntilChanged(),
          tap(t => {
            this.ticker = t;
            this.loading = true;
            this.error = null;
          }),
          switchMap(t =>
            this.predictionService.getUserPredictions(t || undefined)
          ),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (predictions) => {
            this.predictions = predictions ?? [];
            this.loading = false;
          },
          error: (err) => {
            console.error('Error fetching user predictions:', err);
            this.predictions = [];
            this.error = 'Failed to load predictions.';
            this.loading = false;
          }
        });
    }

    ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
    }
}
