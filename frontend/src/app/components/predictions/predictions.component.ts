import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PredictionService } from '../../services/prediction/prediction.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-predictions',
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './predictions.component.html',
  styleUrl: './predictions.component.css'
})
export class PredictionsComponent {
  ticker: string = '';
  modelType: string = 'lstm';
  predictionTimeline: string = '1d';

  result: any = null;

  constructor(private predictionService: PredictionService) {}

  submitPrediction() {
    this.predictionService.createPrediction(this.ticker, this.modelType, this.predictionTimeline).subscribe({
      next: (response) => {
        console.log('✅ Prediction success:', response);
        this.result = response;
      },
      error: (error) => {
        console.error('❌ Prediction error:', error);
        this.result = null;
      }
    });
  }
}
